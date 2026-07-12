-- =============================================================================
-- WHFC Inventory — enrich items_below_reorder_point for replenishment reporting
-- Includes items at or below reorder point (<=). security_invoker = true.
-- =============================================================================

drop view if exists public.items_below_reorder_point;

create view public.items_below_reorder_point
with (security_invoker = true)
as
select
  i.id as item_id,
  i.item_name,
  i.internal_sku,
  i.category_id,
  c.name as category_name,
  i.unit_of_measure_id,
  u.name as unit_name,
  u.abbreviation as unit_abbreviation,
  i.preferred_vendor_id,
  v.name as vendor_name,
  i.reorder_point,
  i.par_level,
  coalesce(totals.total_on_hand, 0::numeric) as total_on_hand,
  greatest(
    i.reorder_point - coalesce(totals.total_on_hand, 0::numeric),
    0::numeric
  ) as quantity_needed,
  greatest(
    i.par_level - coalesce(totals.total_on_hand, 0::numeric),
    0::numeric
  ) as suggested_order_quantity
from public.items i
join public.categories c on c.id = i.category_id
join public.units_of_measure u on u.id = i.unit_of_measure_id
left join public.vendors v on v.id = i.preferred_vendor_id
left join (
  select oh.item_id, sum(oh.quantity_on_hand) as total_on_hand
  from public.inventory_on_hand oh
  group by oh.item_id
) totals on totals.item_id = i.id
where i.active = true
  and coalesce(totals.total_on_hand, 0::numeric) <= i.reorder_point;

grant select on public.items_below_reorder_point to authenticated;
