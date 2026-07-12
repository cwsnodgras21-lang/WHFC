-- =============================================================================
-- WHFC Inventory — read-only transaction history view for ledger browsing
-- security_invoker = true so RLS on inventory_transactions applies per role.
-- =============================================================================

create or replace view public.inventory_transaction_history
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
  l.room,
  l.cabinet,
  u.abbreviation as unit_abbreviation,
  t.performed_by,
  p.full_name as performed_by_name
from public.inventory_transactions t
join public.items i on i.id = t.item_id
join public.locations l on l.id = t.location_id
join public.units_of_measure u on u.id = i.unit_of_measure_id
join public.profiles p on p.id = t.performed_by;

grant select on public.inventory_transaction_history to authenticated;
