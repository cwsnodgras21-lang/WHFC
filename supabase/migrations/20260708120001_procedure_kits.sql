-- =============================================================================
-- WHFC Inventory — procedure kits, dispense events, EMR-ready mappings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.dispense_event_source as enum (
  'manual',
  'emr',
  'import',
  'api'
);

-- ---------------------------------------------------------------------------
-- procedure_kits
-- ---------------------------------------------------------------------------
create table public.procedure_kits (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  description          text,
  category_id          uuid references public.categories (id) on delete set null,
  active               boolean not null default true,
  default_location_id  uuid references public.locations (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint procedure_kits_name_not_blank check (char_length(trim(name)) > 0)
);

create unique index procedure_kits_name_active_unique
  on public.procedure_kits (lower(trim(name)))
  where active = true;

create trigger procedure_kits_set_updated_at
  before update on public.procedure_kits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- procedure_kit_components
-- ---------------------------------------------------------------------------
create table public.procedure_kit_components (
  id                          uuid primary key default gen_random_uuid(),
  procedure_kit_id            uuid not null references public.procedure_kits (id) on delete cascade,
  item_id                     uuid not null references public.items (id) on delete restrict,
  quantity                    numeric not null default 1,
  unit                        text not null default 'EA',
  is_variable_quantity        boolean not null default false,
  variable_quantity_label     text,
  variable_quantity_unit      text,
  calculation_type            text,
  multiplier                  numeric,
  concentration_amount        numeric,
  concentration_unit          text,
  concentration_volume        numeric,
  concentration_volume_unit   text,
  required                    boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint procedure_kit_components_quantity_positive
    check (quantity > 0),
  constraint procedure_kit_components_unit_not_blank
    check (char_length(trim(unit)) > 0),
  constraint procedure_kit_components_calculation_type_valid
    check (
      calculation_type is null
      or calculation_type in ('concentration', 'multiplier')
    ),
  constraint procedure_kit_components_variable_fields
    check (
      (not is_variable_quantity)
      or (
        variable_quantity_label is not null
        and char_length(trim(variable_quantity_label)) > 0
        and variable_quantity_unit is not null
        and char_length(trim(variable_quantity_unit)) > 0
      )
    ),
  constraint procedure_kit_components_concentration_fields
    check (
      calculation_type is distinct from 'concentration'
      or (
        concentration_amount is not null and concentration_amount > 0
        and concentration_unit is not null
        and char_length(trim(concentration_unit)) > 0
        and concentration_volume is not null and concentration_volume > 0
        and concentration_volume_unit is not null
        and char_length(trim(concentration_volume_unit)) > 0
      )
    ),
  constraint procedure_kit_components_multiplier_fields
    check (
      calculation_type is distinct from 'multiplier'
      or (multiplier is not null and multiplier > 0)
    )
);

create unique index procedure_kit_components_kit_item_unique
  on public.procedure_kit_components (procedure_kit_id, item_id);

create trigger procedure_kit_components_set_updated_at
  before update on public.procedure_kit_components
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dispense_events
-- ---------------------------------------------------------------------------
create table public.dispense_events (
  id                  uuid primary key default gen_random_uuid(),
  procedure_kit_id    uuid not null references public.procedure_kits (id) on delete restrict,
  location_id         uuid not null references public.locations (id) on delete restrict,
  source              public.dispense_event_source not null default 'manual',
  external_source     text,
  external_event_id   text,
  idempotency_key     text,
  performed_at        timestamptz not null default now(),
  notes               text,
  created_by          uuid not null references public.profiles (id) on delete restrict,
  created_at          timestamptz not null default now(),
  transaction_group_id uuid not null default gen_random_uuid()
);

create unique index dispense_events_idempotency_key_unique
  on public.dispense_events (idempotency_key)
  where idempotency_key is not null;

create index dispense_events_procedure_kit_id_idx
  on public.dispense_events (procedure_kit_id);

create index dispense_events_location_id_idx
  on public.dispense_events (location_id);

create index dispense_events_performed_at_idx
  on public.dispense_events (performed_at desc);

-- ---------------------------------------------------------------------------
-- dispense_event_lines
-- ---------------------------------------------------------------------------
create table public.dispense_event_lines (
  id                  uuid primary key default gen_random_uuid(),
  dispense_event_id   uuid not null references public.dispense_events (id) on delete cascade,
  item_id             uuid not null references public.items (id) on delete restrict,
  quantity_consumed   numeric not null,
  unit                text not null,
  inventory_lot_id    uuid references public.inventory_lots (id) on delete set null,
  transaction_id      uuid references public.inventory_transactions (id) on delete set null,
  created_at          timestamptz not null default now(),
  constraint dispense_event_lines_quantity_positive
    check (quantity_consumed > 0),
  constraint dispense_event_lines_unit_not_blank
    check (char_length(trim(unit)) > 0)
);

create index dispense_event_lines_dispense_event_id_idx
  on public.dispense_event_lines (dispense_event_id);

-- ---------------------------------------------------------------------------
-- procedure_mappings (future EMR integration)
-- ---------------------------------------------------------------------------
create table public.procedure_mappings (
  id                   uuid primary key default gen_random_uuid(),
  source_system        text not null,
  external_code        text not null,
  external_description text,
  procedure_kit_id     uuid not null references public.procedure_kits (id) on delete cascade,
  active               boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint procedure_mappings_source_not_blank
    check (char_length(trim(source_system)) > 0),
  constraint procedure_mappings_code_not_blank
    check (char_length(trim(external_code)) > 0)
);

create unique index procedure_mappings_source_code_active_unique
  on public.procedure_mappings (lower(trim(source_system)), lower(trim(external_code)))
  where active = true;

create trigger procedure_mappings_set_updated_at
  before update on public.procedure_mappings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit triggers (master data)
-- ---------------------------------------------------------------------------
create or replace function public.audit_procedure_kits_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform inventory_ops.write_audit_log(
      auth.uid(), 'procedure_kit.created', 'procedure_kit', new.id, null, to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform inventory_ops.write_audit_log(
      auth.uid(), 'procedure_kit.updated', 'procedure_kit', new.id, to_jsonb(old), to_jsonb(new)
    );
    return new;
  end if;
  return null;
end;
$$;

create trigger procedure_kits_audit
  after insert or update on public.procedure_kits
  for each row execute function public.audit_procedure_kits_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.procedure_kits enable row level security;
alter table public.procedure_kit_components enable row level security;
alter table public.dispense_events enable row level security;
alter table public.dispense_event_lines enable row level security;
alter table public.procedure_mappings enable row level security;

-- procedure_kits — read all active users; write manager+
create policy procedure_kits_select
  on public.procedure_kits for select to authenticated
  using (public.is_active_user());

create policy procedure_kits_write
  on public.procedure_kits for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

-- procedure_kit_components — same as kits
create policy procedure_kit_components_select
  on public.procedure_kit_components for select to authenticated
  using (public.is_active_user());

create policy procedure_kit_components_write
  on public.procedure_kit_components for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

-- dispense_events — SELECT for elevated + staff own; INSERT via RPC only
create policy dispense_events_select_elevated
  on public.dispense_events for select to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() in (
      'administrator', 'inventory_manager', 'read_only'
    )
  );

create policy dispense_events_select_staff_own
  on public.dispense_events for select to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() = 'staff'
    and created_by = auth.uid()
  );

-- dispense_event_lines — mirror parent visibility
create policy dispense_event_lines_select_elevated
  on public.dispense_event_lines for select to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() in (
      'administrator', 'inventory_manager', 'read_only'
    )
  );

create policy dispense_event_lines_select_staff_own
  on public.dispense_event_lines for select to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() = 'staff'
    and exists (
      select 1
      from public.dispense_events de
      where de.id = dispense_event_id
        and de.created_by = auth.uid()
    )
  );

-- procedure_mappings — read all; write manager+
create policy procedure_mappings_select
  on public.procedure_mappings for select to authenticated
  using (public.is_active_user());

create policy procedure_mappings_write
  on public.procedure_mappings for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.procedure_kits to authenticated;
grant select, insert, update, delete on public.procedure_kit_components to authenticated;
grant select on public.dispense_events to authenticated;
grant select on public.dispense_event_lines to authenticated;
grant select, insert, update, delete on public.procedure_mappings to authenticated;

revoke insert, update, delete on public.dispense_events from anon, authenticated;
revoke insert, update, delete on public.dispense_event_lines from anon, authenticated;
