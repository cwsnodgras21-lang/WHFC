-- =============================================================================
-- WHFC Inventory — block inventory movement during in-progress physical counts
-- Defense in depth: app layer checks first; database enforces on every RPC.
-- =============================================================================

create or replace function inventory_ops.assert_location_not_under_count(
  p_location_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.physical_counts pc
    where pc.location_id = p_location_id
      and pc.status = 'in_progress'
  ) then
    raise exception 'location_physical_count_in_progress'
      using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- receive_inventory
-- ---------------------------------------------------------------------------
create or replace function public.receive_inventory(
  p_item_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_reason_code public.reason_code,
  p_transaction_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);
  perform public.assert_active_item(p_item_id);
  perform public.assert_active_location(p_location_id);
  perform inventory_ops.assert_location_not_under_count(p_location_id);

  v_id := inventory_ops.insert_ledger_row(
    p_item_id,
    p_location_id,
    'RECEIVE',
    p_quantity,
    p_reason_code,
    p_transaction_date,
    auth.uid()
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- consume_inventory
-- ---------------------------------------------------------------------------
create or replace function public.consume_inventory(
  p_item_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_reason_code public.reason_code,
  p_transaction_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);
  perform public.assert_active_item(p_item_id);
  perform public.assert_active_location(p_location_id);
  perform inventory_ops.assert_location_not_under_count(p_location_id);

  v_id := inventory_ops.insert_ledger_row(
    p_item_id,
    p_location_id,
    'CONSUME',
    p_quantity,
    p_reason_code,
    p_transaction_date,
    auth.uid()
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- transfer_inventory
-- ---------------------------------------------------------------------------
create or replace function public.transfer_inventory(
  p_item_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_quantity numeric,
  p_transaction_date timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_out_id uuid;
  v_in_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role
  ]);
  perform public.assert_active_item(p_item_id);
  perform public.assert_active_location(p_from_location_id);
  perform public.assert_active_location(p_to_location_id);
  perform inventory_ops.assert_location_not_under_count(p_from_location_id);
  perform inventory_ops.assert_location_not_under_count(p_to_location_id);

  select t.transfer_out_id, t.transfer_in_id
  into v_out_id, v_in_id
  from inventory_ops.execute_transfer(
    p_item_id,
    p_from_location_id,
    p_to_location_id,
    p_quantity,
    p_transaction_date,
    auth.uid()
  ) t;

  return jsonb_build_object(
    'transfer_out_id', v_out_id,
    'transfer_in_id', v_in_id
  );
end;
$$;
