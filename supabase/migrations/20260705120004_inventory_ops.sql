-- =============================================================================
-- WHFC Inventory — private inventory_ops helpers
-- Not callable from PostgREST clients. Used by public SECURITY DEFINER RPCs.
-- =============================================================================

-- Signed ledger effect for on-hand calculations (quantity is always stored positive).
create or replace function inventory_ops.signed_quantity(
  p_type public.transaction_type,
  p_reason public.reason_code,
  p_quantity numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type in ('RECEIVE', 'TRANSFER_IN', 'ADJUSTMENT_INCREASE') then p_quantity
    when p_type in ('CONSUME', 'TRANSFER_OUT', 'ADJUSTMENT_DECREASE') then -p_quantity
    when p_type = 'PHYSICAL_COUNT_CORRECTION' and p_reason = 'count_surplus' then p_quantity
    when p_type = 'PHYSICAL_COUNT_CORRECTION' and p_reason = 'count_shortage' then -p_quantity
    else null::numeric
  end;
$$;

create or replace function inventory_ops.is_valid_reason_for_type(
  p_type public.transaction_type,
  p_reason public.reason_code
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type = 'RECEIVE' and p_reason in (
      'vendor_delivery', 'internal_restock', 'initial_stock'
    ) then true
    when p_type = 'CONSUME' and p_reason in (
      'clinic_use', 'expired_disposal', 'damaged_disposal'
    ) then true
    when p_type in ('TRANSFER_IN', 'TRANSFER_OUT') and p_reason = 'location_transfer' then true
    when p_type = 'ADJUSTMENT_INCREASE' and p_reason in (
      'found_stock', 'data_correction_increase'
    ) then true
    when p_type = 'ADJUSTMENT_DECREASE' and p_reason in (
      'damaged_stock', 'data_correction_decrease', 'shrinkage'
    ) then true
    when p_type = 'PHYSICAL_COUNT_CORRECTION' and p_reason in (
      'count_surplus', 'count_shortage'
    ) then true
    else false
  end;
$$;

create or replace function inventory_ops.get_on_hand(
  p_item_id uuid,
  p_location_id uuid
)
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
  where t.item_id = p_item_id
    and t.location_id = p_location_id;
$$;

create or replace function inventory_ops.assert_non_negative_after(
  p_item_id uuid,
  p_location_id uuid,
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
  v_projected := inventory_ops.get_on_hand(p_item_id, p_location_id) + p_delta;
  if v_projected < 0 then
    raise exception 'negative_inventory_not_allowed'
      using errcode = 'P0001',
        detail = format(
          'item %s at location %s would become %s',
          p_item_id,
          p_location_id,
          v_projected
        );
  end if;
end;
$$;

create or replace function inventory_ops.insert_ledger_row(
  p_item_id uuid,
  p_location_id uuid,
  p_transaction_type public.transaction_type,
  p_quantity numeric,
  p_reason_code public.reason_code,
  p_transaction_date timestamptz,
  p_performed_by uuid,
  p_related_transaction_id uuid default null,
  p_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta numeric;
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

  insert into public.inventory_transactions (
    id,
    item_id,
    location_id,
    transaction_type,
    quantity,
    transaction_date,
    reason_code,
    performed_by,
    related_transaction_id
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
    p_related_transaction_id
  );

  return p_id;
end;
$$;

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
    v_in_id,
    v_out_id
  );

  perform inventory_ops.insert_ledger_row(
    p_item_id,
    p_to_location_id,
    'TRANSFER_IN',
    p_quantity,
    'location_transfer',
    p_transaction_date,
    p_performed_by,
    v_out_id,
    v_in_id
  );

  transfer_out_id := v_out_id;
  transfer_in_id := v_in_id;
  return next;
end;
$$;

create or replace function inventory_ops.write_audit_log(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before_state jsonb,
  p_after_state jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state
  )
  values (
    p_actor_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_before_state,
    p_after_state
  );
end;
$$;
