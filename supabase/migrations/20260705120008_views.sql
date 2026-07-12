-- =============================================================================
-- WHFC Inventory — reporting views
-- Sign logic is inlined so security_invoker views do not call inventory_ops.
-- =============================================================================

create or replace view public.inventory_on_hand
with (security_invoker = true)
as
select
  t.item_id,
  t.location_id,
  coalesce(sum(
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
  ), 0::numeric) as quantity_on_hand
from public.inventory_transactions t
group by t.item_id, t.location_id
having coalesce(sum(
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
), 0::numeric) <> 0;

grant select on public.inventory_on_hand to authenticated;

create or replace view public.items_below_reorder_point
with (security_invoker = true)
as
select
  i.id as item_id,
  i.item_name,
  i.internal_sku,
  i.reorder_point,
  i.par_level,
  coalesce(totals.total_on_hand, 0::numeric) as total_on_hand,
  i.reorder_point - coalesce(totals.total_on_hand, 0::numeric) as quantity_needed
from public.items i
left join (
  select oh.item_id, sum(oh.quantity_on_hand) as total_on_hand
  from public.inventory_on_hand oh
  group by oh.item_id
) totals on totals.item_id = i.id
where i.active = true
  and coalesce(totals.total_on_hand, 0::numeric) < i.reorder_point;

grant select on public.items_below_reorder_point to authenticated;

create or replace view public.recent_inventory_transactions
with (security_invoker = true)
as
select
  t.id,
  t.item_id,
  t.location_id,
  t.transaction_type,
  t.quantity,
  t.transaction_date,
  t.reason_code,
  t.performed_by,
  t.related_transaction_id,
  t.created_at
from public.inventory_transactions t
order by t.created_at desc
limit 100;

grant select on public.recent_inventory_transactions to authenticated;
