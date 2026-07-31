-- =============================================================================
-- WHFC Inventory — medication samples module
--
-- Mirrors the items/inventory_lots/inventory_transactions pattern: quantity on
-- hand is never stored directly, only derived from an append-only ledger.
-- sample_products is master data (admin/manager CRUD like items). sample_lots
-- identifies a received batch (RPC-only writes, like inventory_lots).
-- sample_transactions is the append-only ledger (RPC-only writes, like
-- inventory_transactions). patient_reference on dispense rows follows the
-- imaging_log convention: a short, length-bounded operational label (MRN or
-- initials) — never a full patient name.
-- =============================================================================

create type public.sample_transaction_type as enum (
  'RECEIVE',
  'DISPENSE',
  'ADJUSTMENT_INCREASE',
  'ADJUSTMENT_DECREASE'
);

-- ---------------------------------------------------------------------------
-- sample_products
-- ---------------------------------------------------------------------------
create table public.sample_products (
  id                      uuid primary key default gen_random_uuid(),
  product_name            text not null,
  manufacturer_vendor     text,
  strength                text,
  dosage_form             text,
  unit_of_measure_id      uuid not null references public.units_of_measure (id),
  reorder_threshold       numeric(12,3) not null default 0,
  expiration_warning_days integer,
  active                  boolean not null default true,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint sample_products_name_not_blank check (char_length(trim(product_name)) > 0),
  constraint sample_products_reorder_threshold_non_negative check (reorder_threshold >= 0),
  constraint sample_products_expiration_warning_days_positive
    check (expiration_warning_days is null or expiration_warning_days > 0),
  constraint sample_products_notes_length check (notes is null or char_length(notes) <= 500)
);

create unique index sample_products_name_active_unique
  on public.sample_products (lower(trim(product_name)))
  where active = true;

create trigger sample_products_set_updated_at
  before update on public.sample_products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sample_lots — one received batch of a sample product.
-- ---------------------------------------------------------------------------
create table public.sample_lots (
  id                  uuid primary key default gen_random_uuid(),
  sample_product_id   uuid not null references public.sample_products (id) on delete restrict,
  lot_number          text,
  expiration_date     date,
  received_date       date not null default current_date,
  vendor_id           uuid references public.vendors (id) on delete set null,
  representative_name text,
  notes               text,
  created_by          uuid not null references public.profiles (id) on delete restrict,
  created_at          timestamptz not null default now(),
  constraint sample_lots_lot_number_not_blank
    check (lot_number is null or char_length(trim(lot_number)) > 0),
  constraint sample_lots_representative_name_length
    check (representative_name is null or char_length(representative_name) <= 120),
  constraint sample_lots_notes_length
    check (notes is null or char_length(notes) <= 280)
);

create unique index sample_lots_identity_unique
  on public.sample_lots (
    sample_product_id,
    coalesce(lot_number, ''),
    coalesce(expiration_date, '0001-01-01'::date)
  );

create index sample_lots_sample_product_id_idx
  on public.sample_lots (sample_product_id);

create index sample_lots_expiration_date_idx
  on public.sample_lots (expiration_date);

-- ---------------------------------------------------------------------------
-- sample_transactions — append-only ledger. patient_reference set for
-- DISPENSE rows only; never a full name.
-- ---------------------------------------------------------------------------
create table public.sample_transactions (
  id                  uuid primary key default gen_random_uuid(),
  sample_product_id   uuid not null references public.sample_products (id) on delete restrict,
  sample_lot_id       uuid references public.sample_lots (id) on delete restrict,
  transaction_type    public.sample_transaction_type not null,
  quantity            numeric(12,3) not null,
  patient_reference   text,
  performed_by        uuid not null references public.profiles (id) on delete restrict,
  transaction_date    timestamptz not null default now(),
  notes               text,
  created_at          timestamptz not null default now(),
  constraint sample_transactions_quantity_positive check (quantity > 0),
  constraint sample_transactions_patient_reference_scope check (
    (transaction_type = 'DISPENSE' and patient_reference is not null
      and char_length(trim(patient_reference)) > 0
      and char_length(patient_reference) <= 64)
    or (transaction_type <> 'DISPENSE' and patient_reference is null)
  ),
  constraint sample_transactions_notes_length
    check (notes is null or char_length(notes) <= 280)
);

create index sample_transactions_sample_product_id_idx
  on public.sample_transactions (sample_product_id);

create index sample_transactions_sample_lot_id_idx
  on public.sample_transactions (sample_lot_id)
  where sample_lot_id is not null;

create index sample_transactions_performed_by_idx
  on public.sample_transactions (performed_by, created_at);

create index sample_transactions_patient_reference_idx
  on public.sample_transactions (patient_reference)
  where patient_reference is not null;

-- Append-only guard, mirroring inventory_transactions.
create or replace function public.prevent_sample_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'sample_transactions is append-only';
end;
$$;

create trigger sample_transactions_no_update
  before update on public.sample_transactions
  for each row execute function public.prevent_sample_ledger_mutation();

create trigger sample_transactions_no_delete
  before delete on public.sample_transactions
  for each row execute function public.prevent_sample_ledger_mutation();

-- ---------------------------------------------------------------------------
-- inventory_ops helpers
-- ---------------------------------------------------------------------------
create or replace function inventory_ops.sample_signed_quantity(
  p_type public.sample_transaction_type,
  p_quantity numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type in ('RECEIVE', 'ADJUSTMENT_INCREASE') then p_quantity
    when p_type in ('DISPENSE', 'ADJUSTMENT_DECREASE') then -p_quantity
    else null::numeric
  end;
$$;

create or replace function inventory_ops.get_sample_product_on_hand(p_sample_product_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(
    inventory_ops.sample_signed_quantity(t.transaction_type, t.quantity)
  ), 0::numeric)
  from public.sample_transactions t
  where t.sample_product_id = p_sample_product_id;
$$;

create or replace function inventory_ops.get_sample_lot_on_hand(p_sample_lot_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(
    inventory_ops.sample_signed_quantity(t.transaction_type, t.quantity)
  ), 0::numeric)
  from public.sample_transactions t
  where t.sample_lot_id = p_sample_lot_id;
$$;

create or replace function inventory_ops.find_or_create_sample_lot(
  p_sample_product_id uuid,
  p_lot_number text,
  p_expiration_date date,
  p_vendor_id uuid,
  p_representative_name text,
  p_received_date date,
  p_notes text,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot_id uuid;
begin
  select id into v_lot_id
  from public.sample_lots
  where sample_product_id = p_sample_product_id
    and coalesce(lot_number, '') = coalesce(p_lot_number, '')
    and coalesce(expiration_date, '0001-01-01'::date) = coalesce(p_expiration_date, '0001-01-01'::date);

  if v_lot_id is not null then
    return v_lot_id;
  end if;

  insert into public.sample_lots (
    sample_product_id, lot_number, expiration_date, vendor_id,
    representative_name, received_date, notes, created_by
  ) values (
    p_sample_product_id, p_lot_number, p_expiration_date, p_vendor_id,
    p_representative_name, coalesce(p_received_date, current_date), p_notes, p_created_by
  )
  returning id into v_lot_id;

  return v_lot_id;
end;
$$;

create or replace function inventory_ops.insert_sample_ledger_row(
  p_sample_product_id uuid,
  p_sample_lot_id uuid,
  p_transaction_type public.sample_transaction_type,
  p_quantity numeric,
  p_patient_reference text,
  p_performed_by uuid,
  p_transaction_date timestamptz,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_delta numeric;
  v_projected numeric;
begin
  if p_quantity <= 0 then
    raise exception 'quantity_must_be_positive';
  end if;

  v_delta := inventory_ops.sample_signed_quantity(p_transaction_type, p_quantity);

  if p_sample_lot_id is not null then
    v_projected := inventory_ops.get_sample_lot_on_hand(p_sample_lot_id) + v_delta;
    if v_projected < 0 then
      raise exception 'negative_sample_inventory_not_allowed';
    end if;
  end if;

  insert into public.sample_transactions (
    sample_product_id, sample_lot_id, transaction_type, quantity,
    patient_reference, performed_by, transaction_date, notes
  ) values (
    p_sample_product_id, p_sample_lot_id, p_transaction_type, p_quantity,
    p_patient_reference, p_performed_by, coalesce(p_transaction_date, now()), p_notes
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Views — quantity on hand is always derived, never stored.
-- ---------------------------------------------------------------------------
create view public.sample_lot_stock
with (security_invoker = true) as
select
  l.id as lot_id,
  l.sample_product_id,
  p.product_name,
  l.lot_number,
  l.expiration_date,
  l.received_date,
  l.vendor_id,
  v.name as vendor_name,
  l.representative_name,
  coalesce(sum(
    inventory_ops.sample_signed_quantity(t.transaction_type, t.quantity)
  ), 0) as quantity_on_hand,
  case
    when coalesce(sum(inventory_ops.sample_signed_quantity(t.transaction_type, t.quantity)), 0) <= 0
      then 'depleted'
    when l.expiration_date is not null and l.expiration_date < current_date
      then 'expired'
    when l.expiration_date is not null
      and l.expiration_date <= current_date + coalesce(p.expiration_warning_days, 90)
      then 'expiring_soon'
    else 'active'
  end::public.lot_status as status,
  case
    when l.expiration_date is null then null
    else (l.expiration_date - current_date)
  end as days_until_expiration
from public.sample_lots l
join public.sample_products p on p.id = l.sample_product_id
left join public.vendors v on v.id = l.vendor_id
left join public.sample_transactions t on t.sample_lot_id = l.id
group by l.id, p.product_name, p.expiration_warning_days, v.name;

create view public.sample_product_stock
with (security_invoker = true) as
select
  p.id as sample_product_id,
  p.product_name,
  p.manufacturer_vendor,
  p.strength,
  p.dosage_form,
  p.unit_of_measure_id,
  u.abbreviation as unit_abbreviation,
  p.reorder_threshold,
  p.expiration_warning_days,
  p.active,
  p.notes,
  inventory_ops.get_sample_product_on_hand(p.id) as quantity_on_hand,
  (
    select min(ls.expiration_date)
    from public.sample_lot_stock ls
    where ls.sample_product_id = p.id
      and ls.quantity_on_hand > 0
      and ls.expiration_date is not null
  ) as next_expiration_date,
  exists (
    select 1 from public.sample_lot_stock ls
    where ls.sample_product_id = p.id
      and ls.quantity_on_hand > 0
      and ls.status = 'expired'
  ) as has_expired_lot,
  exists (
    select 1 from public.sample_lot_stock ls
    where ls.sample_product_id = p.id
      and ls.quantity_on_hand > 0
      and ls.status = 'expiring_soon'
  ) as has_expiring_lot
from public.sample_products p
join public.units_of_measure u on u.id = p.unit_of_measure_id;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------
create or replace function public.receive_sample(
  p_sample_product_id uuid,
  p_quantity numeric,
  p_lot_number text default null,
  p_expiration_date date default null,
  p_vendor_id uuid default null,
  p_representative_name text default null,
  p_received_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot_id uuid;
  v_tx_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);

  if not exists (
    select 1 from public.sample_products sp
    where sp.id = p_sample_product_id and sp.active = true
  ) then
    raise exception 'sample_product_not_found_or_inactive';
  end if;

  v_lot_id := inventory_ops.find_or_create_sample_lot(
    p_sample_product_id,
    nullif(trim(coalesce(p_lot_number, '')), ''),
    p_expiration_date,
    p_vendor_id,
    nullif(trim(coalesce(p_representative_name, '')), ''),
    p_received_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid()
  );

  v_tx_id := inventory_ops.insert_sample_ledger_row(
    p_sample_product_id,
    v_lot_id,
    'RECEIVE',
    p_quantity,
    null,
    auth.uid(),
    now(),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return jsonb_build_object('transaction_id', v_tx_id, 'sample_lot_id', v_lot_id);
end;
$$;

create or replace function public.dispense_sample(
  p_sample_product_id uuid,
  p_quantity numeric,
  p_patient_reference text,
  p_sample_lot_id uuid default null,
  p_notes text default null,
  p_performed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot_id uuid;
  v_on_hand numeric;
  v_tx_id uuid;
  v_product_name text;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role,
    'medic'::public.user_role
  ]);

  if p_patient_reference is null or char_length(trim(p_patient_reference)) = 0 then
    raise exception 'patient_reference_required';
  end if;

  select sp.product_name into v_product_name
  from public.sample_products sp
  where sp.id = p_sample_product_id and sp.active = true;

  if v_product_name is null then
    raise exception 'sample_product_not_found_or_inactive';
  end if;

  v_lot_id := p_sample_lot_id;

  if v_lot_id is null then
    select ls.lot_id into v_lot_id
    from public.sample_lot_stock ls
    where ls.sample_product_id = p_sample_product_id
      and ls.quantity_on_hand >= p_quantity
    order by (ls.expiration_date is null), ls.expiration_date asc, ls.received_date asc
    limit 1;
  end if;

  if v_lot_id is not null then
    v_on_hand := inventory_ops.get_sample_lot_on_hand(v_lot_id);
    if v_on_hand < p_quantity then
      raise exception 'insufficient_sample_stock:item=%,available=%,requested=%',
        v_product_name, v_on_hand, p_quantity;
    end if;
  else
    v_on_hand := inventory_ops.get_sample_product_on_hand(p_sample_product_id);
    if v_on_hand < p_quantity then
      raise exception 'insufficient_sample_stock:item=%,available=%,requested=%',
        v_product_name, v_on_hand, p_quantity;
    end if;
  end if;

  v_tx_id := inventory_ops.insert_sample_ledger_row(
    p_sample_product_id,
    v_lot_id,
    'DISPENSE',
    p_quantity,
    trim(p_patient_reference),
    auth.uid(),
    coalesce(p_performed_at, now()),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return jsonb_build_object('transaction_id', v_tx_id, 'sample_lot_id', v_lot_id);
end;
$$;

create or replace function public.adjust_sample(
  p_sample_lot_id uuid,
  p_quantity numeric,
  p_increase boolean,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot record;
  v_type public.sample_transaction_type;
  v_tx_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role
  ]);

  select l.id, l.sample_product_id into v_lot
  from public.sample_lots l
  where l.id = p_sample_lot_id;

  if not found then
    raise exception 'sample_lot_not_found';
  end if;

  v_type := case when p_increase then 'ADJUSTMENT_INCREASE' else 'ADJUSTMENT_DECREASE' end;

  v_tx_id := inventory_ops.insert_sample_ledger_row(
    v_lot.sample_product_id,
    p_sample_lot_id,
    v_type,
    p_quantity,
    null,
    auth.uid(),
    now(),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return jsonb_build_object('transaction_id', v_tx_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.sample_products enable row level security;
alter table public.sample_lots enable row level security;
alter table public.sample_transactions enable row level security;

create policy sample_products_select
  on public.sample_products for select to authenticated
  using (public.is_active_user());

create policy sample_products_write
  on public.sample_products for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

create policy sample_lots_select
  on public.sample_lots for select to authenticated
  using (public.is_active_user());

create policy sample_transactions_select_elevated
  on public.sample_transactions for select to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() in ('administrator', 'inventory_manager', 'read_only')
  );

create policy sample_transactions_select_staff_own
  on public.sample_transactions for select to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() = 'staff'
    and performed_by = auth.uid()
  );

create policy sample_transactions_select_medic_own
  on public.sample_transactions for select to authenticated
  using (
    public.is_active_user()
    and public.current_user_role() = 'medic'
    and performed_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.sample_products to authenticated;

revoke insert, update, delete on public.sample_lots from anon, authenticated;
grant select on public.sample_lots to authenticated;

revoke insert, update, delete on public.sample_transactions from anon, authenticated;
grant select on public.sample_transactions to authenticated;

grant select on public.sample_lot_stock to authenticated;
grant select on public.sample_product_stock to authenticated;

grant execute on function public.receive_sample(
  uuid, numeric, text, date, uuid, text, date, text
) to authenticated;

grant execute on function public.dispense_sample(
  uuid, numeric, text, uuid, text, timestamptz
) to authenticated;

grant execute on function public.adjust_sample(
  uuid, numeric, boolean, text
) to authenticated;

revoke all on all functions in schema inventory_ops from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Module registration
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
      'imaging_log',
      'samples'
    )
  );

insert into public.organization_module_settings (organization_id, module_key, enabled)
values ('00000000-0000-0000-0000-000000000001', 'samples', true)
on conflict (organization_id, module_key) do nothing;
