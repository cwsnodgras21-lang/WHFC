-- =============================================================================
-- WHFC Inventory — enrich recent_inventory_transactions for dashboard display
-- Read-only view; no ledger changes.
-- =============================================================================

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
  t.related_transaction_id
from public.inventory_transactions t
join public.items i on i.id = t.item_id
join public.locations l on l.id = t.location_id
join public.units_of_measure u on u.id = i.unit_of_measure_id
order by t.created_at desc
limit 100;

grant select on public.recent_inventory_transactions to authenticated;
