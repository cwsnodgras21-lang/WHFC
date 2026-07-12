-- =============================================================================
-- WHFC Inventory — lot-aware ledger helpers + derived lot stock view
--
-- Extends insert_ledger_row to optionally attribute a row to a lot and enforce
-- non-negative stock at the lot level, and adds a find-or-create helper plus the
-- public inventory_lot_stock view (per-lot on hand + derived status).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Per-lot on hand: signed sum of ledger rows carrying this lot id.
-- ---------------------------------------------------------------------------
create or replace function inventory_ops.get_lot_on_hand(p_lot_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(
    inventory_ops.signed_quantity(t.transaction_type, t.reason_code, t.quantity)
  ), 0::numeric)
  from public.inventory_transactions t
  where t.inventory_lot_id = p_lot_id;
$$;

create or replace function inventory_ops.assert_lot_non_negative_after(
  p_lot_id uuid,
  p_delta numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_projected numeric;
begin
  v_projected := inventory_ops.get_lot_on_hand(p_lot_id) + p_delta;
  if v_projected < 0 then
    raise exception 'negative_lot_inventory_not_allowed'
      using errcode = 'P0001',
        detail = format('lot %s would become %s', p_lot_id, v_projected);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- insert_ledger_row — add optional lot attribution.
-- Existing positional callers (receive/consume/adjust/count) keep working; the
-- new trailing param defaults to null (non-lot rows, unchanged behavior).
-- ---------------------------------------------------------------------------
drop function if exists inventory_ops.insert_ledger_row(
  uuid, uuid, public.transaction_type, numeric, public.reason_code,
  timestamptz, uuid, uuid, uuid
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
  p_transaction_group_id uuid default null,
  p_inventory_lot_id uuid default null
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

  if p_inventory_lot_id is not null then
    -- Guard the lot belongs to this item/location before attributing stock.
    if not exists (
      select 1 from public.inventory_lots l
      where l.id = p_inventory_lot_id
        and l.item_id = p_item_id
        and l.location_id = p_location_id
    ) then
      raise exception 'lot_item_location_mismatch';
    end if;
    perform inventory_ops.assert_lot_non_negative_after(p_inventory_lot_id, v_delta);
  end if;

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
    transaction_group_id,
    inventory_lot_id
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
    v_group_id,
    p_inventory_lot_id
  );

  return p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- find_or_create_lot — reuse an existing batch row or create it.
-- ---------------------------------------------------------------------------
create or replace function inventory_ops.find_or_create_lot(
  p_item_id uuid,
  p_location_id uuid,
  p_lot_number text,
  p_expiration_date date,
  p_received_date date,
  p_vendor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot_id uuid;
  v_lot_number text;
begin
  v_lot_number := nullif(trim(coalesce(p_lot_number, '')), '');

  select l.id
  into v_lot_id
  from public.inventory_lots l
  where l.item_id = p_item_id
    and l.location_id = p_location_id
    and coalesce(l.lot_number, '') = coalesce(v_lot_number, '')
    and coalesce(l.expiration_date, '0001-01-01'::date)
      = coalesce(p_expiration_date, '0001-01-01'::date);

  if v_lot_id is not null then
    return v_lot_id;
  end if;

  insert into public.inventory_lots (
    item_id, location_id, lot_number, expiration_date, received_date, vendor_id
  )
  values (
    p_item_id,
    p_location_id,
    v_lot_number,
    p_expiration_date,
    coalesce(p_received_date, current_date),
    p_vendor_id
  )
  returning id into v_lot_id;

  return v_lot_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- inventory_lot_stock — one row per lot with derived on hand + status.
-- security_invoker so RLS on the underlying tables applies per role. Sign
-- logic is inlined (this view must not call inventory_ops helpers).
-- ---------------------------------------------------------------------------
create or replace view public.inventory_lot_stock
with (security_invoker = true)
as
select
  l.id as lot_id,
  l.item_id,
  i.item_name,
  i.internal_sku,
  i.category_id,
  c.name as category_name,
  i.expiration_warning_days,
  u.abbreviation as unit_abbreviation,
  l.location_id,
  loc.location_name,
  loc.room,
  l.lot_number,
  l.expiration_date,
  l.received_date,
  l.vendor_id,
  v.name as vendor_name,
  coalesce(oh.quantity_on_hand, 0::numeric) as quantity_on_hand,
  case
    when l.expiration_date is null then null
    else (l.expiration_date - current_date)
  end as days_until_expiration,
  case
    when coalesce(oh.quantity_on_hand, 0::numeric) <= 0 then 'depleted'
    when l.expiration_date is not null and l.expiration_date < current_date
      then 'expired'
    when l.expiration_date is not null
      and l.expiration_date <= current_date + i.expiration_warning_days
      then 'expiring_soon'
    else 'active'
  end::public.lot_status as status
from public.inventory_lots l
join public.items i on i.id = l.item_id
join public.units_of_measure u on u.id = i.unit_of_measure_id
join public.categories c on c.id = i.category_id
join public.locations loc on loc.id = l.location_id
left join public.vendors v on v.id = l.vendor_id
left join (
  select
    t.inventory_lot_id,
    sum(
      case
        when t.transaction_type in (
          'RECEIVE', 'TRANSFER_IN', 'ADJUSTMENT_INCREASE'
        ) then t.quantity
        when t.transaction_type in (
          'CONSUME', 'TRANSFER_OUT', 'ADJUSTMENT_DECREASE'
        ) then -t.quantity
        when t.transaction_type = 'PHYSICAL_COUNT_CORRECTION'
          and t.reason_code = 'count_surplus' then t.quantity
        when t.transaction_type = 'PHYSICAL_COUNT_CORRECTION'
          and t.reason_code = 'count_shortage' then -t.quantity
        else 0::numeric
      end
    ) as quantity_on_hand
  from public.inventory_transactions t
  where t.inventory_lot_id is not null
  group by t.inventory_lot_id
) oh on oh.inventory_lot_id = l.id;

grant select on public.inventory_lot_stock to authenticated;
