-- =============================================================================
-- WHFC Inventory — replace related_transaction_id with transaction_group_id
-- Groups linked ledger rows (e.g. transfer pairs) under one immutable UUID.
-- Existing receive/consume rows keep id = transaction_group_id (standalone).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add nullable column
-- ---------------------------------------------------------------------------
alter table public.inventory_transactions
  add column transaction_group_id uuid;

-- ---------------------------------------------------------------------------
-- 2. Backfill existing rows (briefly lift append-only guard for column fill)
-- ---------------------------------------------------------------------------
alter table public.inventory_transactions
  disable trigger inventory_transactions_prevent_update;

-- Receive and consume: each row is its own group.
update public.inventory_transactions
set transaction_group_id = id
where transaction_type in ('RECEIVE', 'CONSUME');

-- Transfer pairs: share the lexicographically smaller row id as the group id.
update public.inventory_transactions t
set transaction_group_id = least(t.id, t.related_transaction_id)
where t.transaction_type in ('TRANSFER_IN', 'TRANSFER_OUT')
  and t.related_transaction_id is not null;

-- All other standalone transaction types.
update public.inventory_transactions
set transaction_group_id = id
where transaction_group_id is null;

alter table public.inventory_transactions
  enable trigger inventory_transactions_prevent_update;

-- ---------------------------------------------------------------------------
-- 3. Require transaction_group_id on every row
-- ---------------------------------------------------------------------------
alter table public.inventory_transactions
  alter column transaction_group_id set not null;

create index inventory_transactions_transaction_group_id_idx
  on public.inventory_transactions (transaction_group_id);

-- ---------------------------------------------------------------------------
-- 4. Ledger helpers — standalone rows default group id to row id
-- ---------------------------------------------------------------------------
drop function if exists inventory_ops.insert_ledger_row(
  uuid,
  uuid,
  public.transaction_type,
  numeric,
  public.reason_code,
  timestamptz,
  uuid,
  uuid,
  uuid
);

create function inventory_ops.insert_ledger_row(
  p_item_id uuid,
  p_location_id uuid,
  p_transaction_type public.transaction_type,
  p_quantity numeric,
  p_reason_code public.reason_code,
  p_transaction_date timestamptz,
  p_performed_by uuid,
  p_id uuid default gen_random_uuid(),
  p_transaction_group_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta numeric;
  v_group_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'quantity_must_be_positive';
  end if;

  if not inventory_ops.is_valid_reason_for_type(p_transaction_type, p_reason_code) then
    raise exception 'invalid_reason_for_transaction_type';
  end if;

  v_delta := inventory_ops.signed_quantity(p_transaction_type, p_reason_code, p_quantity);
  if v_delta is null then
    raise exception 'unsupported_transaction_reason_combination';
  end if;

  perform inventory_ops.assert_non_negative_after(p_item_id, p_location_id, v_delta);

  v_group_id := coalesce(p_transaction_group_id, p_id);

  insert into public.inventory_transactions (
    id,
    item_id,
    location_id,
    transaction_type,
    quantity,
    transaction_date,
    reason_code,
    performed_by,
    transaction_group_id
  )
  values (
    p_id,
    p_item_id,
    p_location_id,
    p_transaction_type,
    p_quantity,
    p_transaction_date,
    p_reason_code,
    p_performed_by,
    v_group_id
  );

  return p_id;
end;
$$;

-- Transfer out/in share one group id; both inserts run in this single function.
create or replace function inventory_ops.execute_transfer(
  p_item_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_quantity numeric,
  p_transaction_date timestamptz,
  p_performed_by uuid
)
returns table (transfer_out_id uuid, transfer_in_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid := gen_random_uuid();
  v_out_id uuid := gen_random_uuid();
  v_in_id uuid := gen_random_uuid();
begin
  if p_from_location_id = p_to_location_id then
    raise exception 'transfer_requires_distinct_locations';
  end if;

  perform inventory_ops.insert_ledger_row(
    p_item_id,
    p_from_location_id,
    'TRANSFER_OUT',
    p_quantity,
    'location_transfer',
    p_transaction_date,
    p_performed_by,
    v_out_id,
    v_group_id
  );

  perform inventory_ops.insert_ledger_row(
    p_item_id,
    p_to_location_id,
    'TRANSFER_IN',
    p_quantity,
    'location_transfer',
    p_transaction_date,
    p_performed_by,
    v_in_id,
    v_group_id
  );

  transfer_out_id := v_out_id;
  transfer_in_id := v_in_id;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Dashboard view — expose transaction_group_id instead of related link
-- ---------------------------------------------------------------------------
drop view if exists public.recent_inventory_transactions;

create view public.recent_inventory_transactions
with (security_invoker = true)
as
select
  t.id,
  t.item_id,
  t.location_id,
  t.transaction_type,
  t.quantity,
  t.reason_code,
  t.transaction_date,
  t.created_at,
  coalesce(t.transaction_date, t.created_at) as occurred_at,
  i.item_name,
  i.internal_sku,
  l.location_name,
  l.room,
  l.cabinet,
  u.abbreviation as unit_abbreviation,
  t.performed_by,
  t.transaction_group_id
from public.inventory_transactions t
join public.items i on i.id = t.item_id
join public.locations l on l.id = t.location_id
join public.units_of_measure u on u.id = i.unit_of_measure_id
order by t.created_at desc
limit 100;

grant select on public.recent_inventory_transactions to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Drop legacy pairwise link column
-- ---------------------------------------------------------------------------
alter table public.inventory_transactions
  drop column related_transaction_id;
