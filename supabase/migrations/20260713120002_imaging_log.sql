-- =============================================================================
-- WHFC Inventory — Imaging Log module
--
-- An operational workflow that replaces the spreadsheet used to track imaging
-- orders through scheduling, completion, results, and insurance authorization.
-- This is NOT an EHR and deliberately avoids protected health information:
--   * patient_reference is a short operational label (MRN or initials), not a
--     full name, and is length-bounded.
--   * No date of birth or clinical detail is stored.
--   * notes is a short, non-clinical scheduling field (bounded length).
--
-- Writes flow exclusively through SECURITY DEFINER RPCs (the app never writes
-- imaging_orders directly), matching the platform's write-boundary convention.
-- =============================================================================

create type public.imaging_status as enum (
  'ordered',
  'scheduled',
  'completed',
  'results_received',
  'cancelled'
);

-- Authorization is tracked independently of scheduling status so "pending
-- authorization" and "scheduled" are not mutually exclusive states.
create type public.imaging_authorization_status as enum (
  'not_required',
  'required',
  'pending',
  'approved',
  'denied'
);

create table public.imaging_orders (
  id                   uuid primary key default gen_random_uuid(),
  patient_reference    text not null,
  ordering_provider    text not null,
  imaging_type         text not null,
  imaging_location     text,
  date_ordered         date not null default (now() at time zone 'utc')::date,
  appointment_date     date,
  appointment_time     time,
  status               public.imaging_status not null default 'ordered',
  authorization_status public.imaging_authorization_status not null default 'not_required',
  authorization_number text,
  notes                text,
  created_by           uuid not null references public.profiles (id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint imaging_orders_patient_reference_not_blank
    check (char_length(trim(patient_reference)) > 0),
  constraint imaging_orders_patient_reference_len
    check (char_length(patient_reference) <= 64),
  constraint imaging_orders_provider_not_blank
    check (char_length(trim(ordering_provider)) > 0),
  constraint imaging_orders_type_not_blank
    check (char_length(trim(imaging_type)) > 0),
  constraint imaging_orders_auth_number_len
    check (authorization_number is null or char_length(authorization_number) <= 64),
  constraint imaging_orders_notes_len
    check (notes is null or char_length(notes) <= 280)
);

create index imaging_orders_status_idx on public.imaging_orders (status);
create index imaging_orders_appointment_idx on public.imaging_orders (appointment_date);
create index imaging_orders_authorization_idx on public.imaging_orders (authorization_status);
create index imaging_orders_provider_idx on public.imaging_orders (lower(ordering_provider));

create trigger imaging_orders_set_updated_at
  before update on public.imaging_orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — all active users read; writes are RPC-only.
-- ---------------------------------------------------------------------------
alter table public.imaging_orders enable row level security;

create policy imaging_orders_select
  on public.imaging_orders for select to authenticated
  using (public.is_active_user());

-- ---------------------------------------------------------------------------
-- RPCs — write boundary. Manager/admin/staff may manage imaging orders.
-- ---------------------------------------------------------------------------
create or replace function public.create_imaging_order(
  p_patient_reference    text,
  p_ordering_provider    text,
  p_imaging_type         text,
  p_imaging_location     text default null,
  p_date_ordered         date default null,
  p_appointment_date     date default null,
  p_appointment_time     time default null,
  p_status               public.imaging_status default 'ordered',
  p_authorization_status public.imaging_authorization_status default 'not_required',
  p_authorization_number text default null,
  p_notes                text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);

  insert into public.imaging_orders (
    patient_reference, ordering_provider, imaging_type, imaging_location,
    date_ordered, appointment_date, appointment_time, status,
    authorization_status, authorization_number, notes, created_by
  )
  values (
    p_patient_reference, p_ordering_provider, p_imaging_type, p_imaging_location,
    coalesce(p_date_ordered, (now() at time zone 'utc')::date),
    p_appointment_date, p_appointment_time, p_status,
    p_authorization_status, p_authorization_number, p_notes, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_imaging_order(
  p_id                   uuid,
  p_patient_reference    text,
  p_ordering_provider    text,
  p_imaging_type         text,
  p_imaging_location     text default null,
  p_date_ordered         date default null,
  p_appointment_date     date default null,
  p_appointment_time     time default null,
  p_status               public.imaging_status default 'ordered',
  p_authorization_status public.imaging_authorization_status default 'not_required',
  p_authorization_number text default null,
  p_notes                text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);

  update public.imaging_orders
  set
    patient_reference    = p_patient_reference,
    ordering_provider    = p_ordering_provider,
    imaging_type         = p_imaging_type,
    imaging_location     = p_imaging_location,
    date_ordered         = coalesce(p_date_ordered, date_ordered),
    appointment_date     = p_appointment_date,
    appointment_time     = p_appointment_time,
    status               = p_status,
    authorization_status = p_authorization_status,
    authorization_number = p_authorization_number,
    notes                = p_notes
  where id = p_id;

  if not found then
    raise exception 'imaging_order_not_found';
  end if;

  return p_id;
end;
$$;

-- Inline quick status update (no full record edit).
create or replace function public.set_imaging_order_status(
  p_id     uuid,
  p_status public.imaging_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);

  update public.imaging_orders
  set status = p_status
  where id = p_id;

  if not found then
    raise exception 'imaging_order_not_found';
  end if;

  return p_id;
end;
$$;

-- Inline authorization update (status + optional number).
create or replace function public.set_imaging_authorization(
  p_id                   uuid,
  p_authorization_status public.imaging_authorization_status,
  p_authorization_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);

  update public.imaging_orders
  set
    authorization_status = p_authorization_status,
    authorization_number = coalesce(p_authorization_number, authorization_number)
  where id = p_id;

  if not found then
    raise exception 'imaging_order_not_found';
  end if;

  return p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — read the table; writes only via the RPCs above.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.imaging_orders from anon, authenticated;
grant select on public.imaging_orders to authenticated;

grant execute on function public.create_imaging_order(
  text, text, text, text, date, date, time,
  public.imaging_status, public.imaging_authorization_status, text, text
) to authenticated;

grant execute on function public.update_imaging_order(
  uuid, text, text, text, text, date, date, time,
  public.imaging_status, public.imaging_authorization_status, text, text
) to authenticated;

grant execute on function public.set_imaging_order_status(
  uuid, public.imaging_status
) to authenticated;

grant execute on function public.set_imaging_authorization(
  uuid, public.imaging_authorization_status, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Register the module capability toggle.
-- ---------------------------------------------------------------------------
alter table public.organization_module_settings
  drop constraint organization_module_settings_module_key_check;

alter table public.organization_module_settings
  add constraint organization_module_settings_module_key_check
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
      'integrations',
      'imaging_log'
    )
  );

insert into public.organization_module_settings (organization_id, module_key, enabled)
values ('00000000-0000-0000-0000-000000000001', 'imaging_log', true)
on conflict (organization_id, module_key) do nothing;
