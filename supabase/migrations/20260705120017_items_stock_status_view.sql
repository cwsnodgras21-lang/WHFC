-- =============================================================================
-- WHFC Inventory — dashboard stock-status view
--
-- Read-only, security_invoker = true so RLS on the underlying tables applies
-- per role. Returns one row per ACTIVE item with its total on-hand across all
-- locations plus its reorder point / par level. This is the only source that
-- covers healthy items too (items_below_reorder_point is filtered to
-- total_on_hand <= reorder_point), so it powers both the stock-health donut and
-- the replenishment-priority chart on the dashboard.
--
-- No ledger rules, RPCs, RLS write permissions, or inventory math are changed.
-- =============================================================================

create or replace view public.items_stock_status
with (security_invoker = true)
as
select
  i.id as item_id,
  i.item_name,
  i.internal_sku,
  u.abbreviation as unit_abbreviation,
  i.reorder_point,
  i.par_level,
  coalesce(totals.total_on_hand, 0::numeric) as total_on_hand,
  greatest(
    i.par_level - coalesce(totals.total_on_hand, 0::numeric),
    0::numeric
  ) as suggested_order_quantity
from public.items i
join public.units_of_measure u on u.id = i.unit_of_measure_id
left join (
  select oh.item_id, sum(oh.quantity_on_hand) as total_on_hand
  from public.inventory_on_hand oh
  group by oh.item_id
) totals on totals.item_id = i.id
where i.active = true;

grant select on public.items_stock_status to authenticated;
