-- =============================================================================
-- WHFC Inventory — organization module settings (tenant capability toggles)
-- =============================================================================

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

create table public.organization_module_settings (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  module_key      text not null,
  enabled         boolean not null default false,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id) on delete set null,
  primary key (organization_id, module_key),
  constraint organization_module_settings_module_key_check
    check (
      module_key in (
        'inventory_core',
        'expiration_tracking',
        'lot_tracking',
        'procedure_kits',
        'dispense_history',
        'reorder_suggestions',
        'po_drafts',
        'analytics',
        'integrations'
      )
    )
);

create trigger organization_module_settings_set_updated_at
  before update on public.organization_module_settings
  for each row execute function public.set_updated_at();

create index organization_module_settings_enabled_idx
  on public.organization_module_settings (organization_id, enabled);

-- ---------------------------------------------------------------------------
-- Seed single-clinic organization + MVP defaults
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug)
values (
  '00000000-0000-0000-0000-000000000001',
  'White House Family Care',
  'default'
);

insert into public.organization_module_settings (organization_id, module_key, enabled)
values
  ('00000000-0000-0000-0000-000000000001', 'inventory_core', true),
  ('00000000-0000-0000-0000-000000000001', 'expiration_tracking', true),
  ('00000000-0000-0000-0000-000000000001', 'lot_tracking', true),
  ('00000000-0000-0000-0000-000000000001', 'procedure_kits', false),
  ('00000000-0000-0000-0000-000000000001', 'dispense_history', false),
  ('00000000-0000-0000-0000-000000000001', 'reorder_suggestions', true),
  ('00000000-0000-0000-0000-000000000001', 'po_drafts', false),
  ('00000000-0000-0000-0000-000000000001', 'analytics', false),
  ('00000000-0000-0000-0000-000000000001', 'integrations', false);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_module_settings enable row level security;

create policy organizations_select
  on public.organizations for select to authenticated
  using (public.is_active_user());

create policy organization_module_settings_select
  on public.organization_module_settings for select to authenticated
  using (public.is_active_user());

create policy organization_module_settings_write
  on public.organization_module_settings for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

grant select on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_module_settings to authenticated;
