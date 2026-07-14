-- =============================================================================
-- WHFC Inventory — Unified Activity & Event platform infrastructure
--
-- A cross-module operational timeline. This is intentionally distinct from
-- public.audit_log:
--   * audit_log  = manager-only, trigger-driven, before/after forensic trail
--   * activity_events = all-active-users, app-published, human-readable feed
--     with title/description/severity/module that powers Recent Activity and,
--     in future, Notifications / Widgets / Automation.
--
-- event_type is free text (namespaced, e.g. 'inventory.received') so future
-- modules can publish new event types WITHOUT a database migration. Only the
-- broad `module` bucket is enumerated, for stable filtering.
-- =============================================================================

create type public.activity_module as enum (
  'inventory',
  'expiration',
  'vendors',
  'purchasing',
  'imaging',
  'counts',
  'system'
);

create type public.activity_severity as enum (
  'info',
  'success',
  'warning',
  'critical'
);

create table public.activity_events (
  id           uuid primary key default gen_random_uuid(),
  module       public.activity_module not null,
  event_type   text not null,
  entity_type  text,
  entity_id    uuid,
  title        text not null,
  description  text,
  severity     public.activity_severity not null default 'info',
  actor_id     uuid references public.profiles (id) on delete set null,
  metadata     jsonb,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  constraint activity_events_event_type_not_blank check (char_length(trim(event_type)) > 0),
  constraint activity_events_title_not_blank check (char_length(trim(title)) > 0)
);

create index activity_events_occurred_idx
  on public.activity_events (occurred_at desc);

create index activity_events_module_occurred_idx
  on public.activity_events (module, occurred_at desc);

create index activity_events_entity_idx
  on public.activity_events (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Read model: enrich with the actor's display name for the feed.
-- ---------------------------------------------------------------------------
create view public.activity_feed
with (security_invoker = true)
as
select
  e.id,
  e.module,
  e.event_type,
  e.entity_type,
  e.entity_id,
  e.title,
  e.description,
  e.severity,
  e.actor_id,
  p.full_name as actor_name,
  e.metadata,
  e.occurred_at
from public.activity_events e
left join public.profiles p on p.id = e.actor_id
order by e.occurred_at desc;

-- ---------------------------------------------------------------------------
-- RLS: every active user may read the feed. Direct writes are revoked; all
-- inserts flow through the SECURITY DEFINER record_activity path below.
-- ---------------------------------------------------------------------------
alter table public.activity_events enable row level security;

create policy activity_events_select
  on public.activity_events for select to authenticated
  using (public.is_active_user());

-- ---------------------------------------------------------------------------
-- Private helper — callable by other SECURITY DEFINER RPCs and triggers,
-- mirroring inventory_ops.write_audit_log. Never validates the caller; the
-- public entry point below owns authorization.
-- ---------------------------------------------------------------------------
create or replace function inventory_ops.record_activity(
  p_actor_id    uuid,
  p_module      public.activity_module,
  p_event_type  text,
  p_entity_type text,
  p_entity_id   uuid,
  p_title       text,
  p_description text,
  p_severity    public.activity_severity,
  p_metadata    jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.activity_events (
    actor_id, module, event_type, entity_type, entity_id,
    title, description, severity, metadata
  )
  values (
    p_actor_id, p_module, p_event_type, p_entity_type, p_entity_id,
    p_title, p_description, coalesce(p_severity, 'info'), p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public entry point — the single write boundary for the app-level
-- ActivityService. Any active user (i.e. any trusted server action running as
-- the user) may publish; actor is always the caller.
-- ---------------------------------------------------------------------------
create or replace function public.record_activity(
  p_module      public.activity_module,
  p_event_type  text,
  p_title       text,
  p_entity_type text default null,
  p_entity_id   uuid default null,
  p_description text default null,
  p_severity    public.activity_severity default 'info',
  p_metadata    jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_active_user() then
    raise exception 'profile_inactive';
  end if;

  return inventory_ops.record_activity(
    auth.uid(),
    p_module,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_title,
    p_description,
    p_severity,
    p_metadata
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — read the feed and the table; writes are RPC-only.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.activity_events from anon, authenticated;
grant select on public.activity_events to authenticated;
grant select on public.activity_feed to authenticated;

grant execute on function public.record_activity(
  public.activity_module, text, text, text, uuid, text,
  public.activity_severity, jsonb
) to authenticated;
