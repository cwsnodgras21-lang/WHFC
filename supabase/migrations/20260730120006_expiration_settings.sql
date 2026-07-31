-- =============================================================================
-- WHFC Inventory — configurable expiration warning settings
--
-- Precedence: item/sample-product override > category override (items only) >
-- organization default > hard fallback of 90 days. items.expiration_warning_days
-- becomes nullable — null means "inherit". sample_products.expiration_warning_days
-- was already nullable. Views resolve the precedence once so every consumer
-- (dashboard, expiration center, reorder logic, alerts) reads the same value.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Organization-level defaults
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column default_expiration_warning_days integer not null default 90,
  add column default_sample_expiration_warning_days integer not null default 90;

alter table public.organizations
  add constraint organizations_default_expiration_warning_days_positive
    check (default_expiration_warning_days > 0),
  add constraint organizations_default_sample_expiration_warning_days_positive
    check (default_sample_expiration_warning_days > 0);

-- ---------------------------------------------------------------------------
-- Category-level override (items only — samples have no category concept)
-- ---------------------------------------------------------------------------
alter table public.categories
  add column expiration_warning_days integer;

alter table public.categories
  add constraint categories_expiration_warning_days_positive
    check (expiration_warning_days is null or expiration_warning_days > 0);

-- ---------------------------------------------------------------------------
-- items.expiration_warning_days becomes optional (null = inherit)
-- ---------------------------------------------------------------------------
alter table public.items
  alter column expiration_warning_days drop not null,
  alter column expiration_warning_days drop default;

-- ---------------------------------------------------------------------------
-- inventory_lot_stock — resolve item > category > org default > 90
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
  coalesce(
    i.expiration_warning_days,
    c.expiration_warning_days,
    (select o.default_expiration_warning_days from public.organizations o limit 1),
    90
  ) as expiration_warning_days,
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
      and l.expiration_date <= current_date + coalesce(
        i.expiration_warning_days,
        c.expiration_warning_days,
        (select o.default_expiration_warning_days from public.organizations o limit 1),
        90
      )
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
-- sample_lot_stock / sample_product_stock — resolve product > org default > 90
-- ---------------------------------------------------------------------------
create or replace view public.sample_lot_stock
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
      and l.expiration_date <= current_date + coalesce(
        p.expiration_warning_days,
        (select o.default_sample_expiration_warning_days from public.organizations o limit 1),
        90
      )
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

grant select on public.sample_lot_stock to authenticated;

create or replace view public.sample_product_stock
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
  coalesce(
    p.expiration_warning_days,
    (select o.default_sample_expiration_warning_days from public.organizations o limit 1),
    90
  ) as expiration_warning_days,
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

grant select on public.sample_product_stock to authenticated;
