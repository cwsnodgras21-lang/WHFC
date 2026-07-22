-- =============================================================================
-- WHFC Inventory — remove locations.room / cabinet / shelf / bin
--
-- These sub-location fields are being dropped from the data model. Two views
-- select locations.room/cabinet directly, so each must be dropped and
-- recreated without those columns before the columns themselves can be
-- dropped (create-or-replace cannot remove columns from an existing view).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. recent_inventory_transactions — drop room/cabinet columns
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
-- 2. inventory_lot_stock — drop room column
-- ---------------------------------------------------------------------------
drop view if exists public.inventory_lot_stock;

create view public.inventory_lot_stock
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

-- ---------------------------------------------------------------------------
-- 3. inventory_transaction_history — drop room/cabinet columns
-- ---------------------------------------------------------------------------
drop view if exists public.inventory_transaction_history;

create view public.inventory_transaction_history
with (security_invoker = true)
as
select
  t.id,
  t.transaction_group_id,
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
  u.abbreviation as unit_abbreviation,
  t.performed_by,
  p.full_name as performed_by_name
from public.inventory_transactions t
join public.items i on i.id = t.item_id
join public.locations l on l.id = t.location_id
join public.units_of_measure u on u.id = i.unit_of_measure_id
join public.profiles p on p.id = t.performed_by;

grant select on public.inventory_transaction_history to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Drop the columns
-- ---------------------------------------------------------------------------
alter table public.locations
  drop column if exists room,
  drop column if exists cabinet,
  drop column if exists shelf,
  drop column if exists bin;
