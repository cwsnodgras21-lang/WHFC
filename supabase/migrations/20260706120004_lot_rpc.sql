-- =============================================================================
-- WHFC Inventory — lot-aware public RPCs (receive / consume / transfer) and
-- lot quick-action RPCs (dispose / adjust). Replaces the earlier signatures.
--
-- Data-entry stays simple: lot / expiration params are optional and only
-- required when the item opts in. Non-tracked items behave exactly as before.
-- FEFO (first-expiring, first-out) is applied automatically for tracked items.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- receive_inventory — optional lot number / expiration / vendor.
-- ---------------------------------------------------------------------------
drop function if exists public.receive_inventory(
  uuid, uuid, numeric, public.reason_code, timestamptz
);

create function public.receive_inventory(
  p_item_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_reason_code public.reason_code,
  p_transaction_date timestamptz default now(),
  p_lot_number text default null,
  p_expiration_date date default null,
  p_vendor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_track_exp boolean;
  v_track_lot boolean;
  v_lot_number text;
  v_lot_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);
  perform public.assert_active_item(p_item_id);
  perform public.assert_active_location(p_location_id);
  perform inventory_ops.assert_location_not_under_count(p_location_id);

  select i.track_expiration, i.track_lot_number
  into v_track_exp, v_track_lot
  from public.items i
  where i.id = p_item_id;

  v_lot_number := nullif(trim(coalesce(p_lot_number, '')), '');

  if v_track_exp and p_expiration_date is null then
    raise exception 'expiration_date_required';
  end if;

  if v_track_lot and v_lot_number is null then
    raise exception 'lot_number_required';
  end if;

  -- Attribute to a lot when the item tracks it OR the user supplied lot detail.
  if v_track_exp or v_track_lot
     or p_expiration_date is not null or v_lot_number is not null then
    v_lot_id := inventory_ops.find_or_create_lot(
      p_item_id,
      p_location_id,
      v_lot_number,
      p_expiration_date,
      p_transaction_date::date,
      p_vendor_id
    );
  end if;

  v_id := inventory_ops.insert_ledger_row(
    p_item_id => p_item_id,
    p_location_id => p_location_id,
    p_transaction_type => 'RECEIVE',
    p_quantity => p_quantity,
    p_reason_code => p_reason_code,
    p_transaction_date => p_transaction_date,
    p_performed_by => auth.uid(),
    p_inventory_lot_id => v_lot_id
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- consume_inventory — FEFO across lots, optional manual lot, expired override.
-- Returns jsonb: { transaction_group_id, lots_affected }.
-- ---------------------------------------------------------------------------
drop function if exists public.consume_inventory(
  uuid, uuid, numeric, public.reason_code, timestamptz
);

create function public.consume_inventory(
  p_item_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_reason_code public.reason_code,
  p_transaction_date timestamptz default now(),
  p_lot_id uuid default null,
  p_allow_expired boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid := gen_random_uuid();
  v_remaining numeric := p_quantity;
  v_take numeric;
  v_affected integer := 0;
  v_allow_expired boolean;
  v_had_expired boolean := false;
  v_has_lots boolean;
  v_lot record;
  v_lot_expiration date;
  v_lot_avail numeric;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);
  perform public.assert_active_item(p_item_id);
  perform public.assert_active_location(p_location_id);
  perform inventory_ops.assert_location_not_under_count(p_location_id);

  if p_quantity <= 0 then
    raise exception 'quantity_must_be_positive';
  end if;

  -- Disposal reasons implicitly permit consuming expired stock.
  v_allow_expired := p_allow_expired
    or p_reason_code in ('expired_disposal', 'damaged_disposal');

  -- Manual lot selection: consume from exactly one lot.
  if p_lot_id is not null then
    select l.id, l.expiration_date, inventory_ops.get_lot_on_hand(l.id)
    into v_lot
    from public.inventory_lots l
    where l.id = p_lot_id
      and l.item_id = p_item_id
      and l.location_id = p_location_id;

    if not found then
      raise exception 'lot_not_found';
    end if;

    v_lot_expiration := v_lot.expiration_date;
    if not v_allow_expired and v_lot_expiration is not null
       and v_lot_expiration < current_date then
      raise exception 'lot_expired_override_required';
    end if;

    perform inventory_ops.insert_ledger_row(
      p_item_id => p_item_id,
      p_location_id => p_location_id,
      p_transaction_type => 'CONSUME',
      p_quantity => p_quantity,
      p_reason_code => p_reason_code,
      p_transaction_date => p_transaction_date,
      p_performed_by => auth.uid(),
      p_transaction_group_id => v_group_id,
      p_inventory_lot_id => p_lot_id
    );

    return jsonb_build_object(
      'transaction_group_id', v_group_id,
      'lots_affected', 1
    );
  end if;

  -- Any lot with stock at this location? If so, consume by FEFO.
  select exists (
    select 1
    from public.inventory_lots l
    where l.item_id = p_item_id
      and l.location_id = p_location_id
      and inventory_ops.get_lot_on_hand(l.id) > 0
  ) into v_has_lots;

  if v_has_lots then
    for v_lot in
      select l.id, l.expiration_date,
             inventory_ops.get_lot_on_hand(l.id) as qty
      from public.inventory_lots l
      where l.item_id = p_item_id
        and l.location_id = p_location_id
        and inventory_ops.get_lot_on_hand(l.id) > 0
      order by l.expiration_date asc nulls last, l.received_date asc, l.id asc
    loop
      exit when v_remaining <= 0;

      if not v_allow_expired and v_lot.expiration_date is not null
         and v_lot.expiration_date < current_date then
        v_had_expired := true;
        continue;
      end if;

      v_take := least(v_remaining, v_lot.qty);
      perform inventory_ops.insert_ledger_row(
        p_item_id => p_item_id,
        p_location_id => p_location_id,
        p_transaction_type => 'CONSUME',
        p_quantity => v_take,
        p_reason_code => p_reason_code,
        p_transaction_date => p_transaction_date,
        p_performed_by => auth.uid(),
        p_transaction_group_id => v_group_id,
        p_inventory_lot_id => v_lot.id
      );
      v_remaining := v_remaining - v_take;
      v_affected := v_affected + 1;
    end loop;

    if v_remaining > 0 then
      if v_had_expired then
        raise exception 'lot_expired_override_required';
      end if;
      raise exception 'insufficient_lot_stock';
    end if;

    return jsonb_build_object(
      'transaction_group_id', v_group_id,
      'lots_affected', v_affected
    );
  end if;

  -- Non-tracked item (no lots): single ledger row, unchanged behavior.
  perform inventory_ops.insert_ledger_row(
    p_item_id => p_item_id,
    p_location_id => p_location_id,
    p_transaction_type => 'CONSUME',
    p_quantity => p_quantity,
    p_reason_code => p_reason_code,
    p_transaction_date => p_transaction_date,
    p_performed_by => auth.uid(),
    p_transaction_group_id => v_group_id
  );

  return jsonb_build_object(
    'transaction_group_id', v_group_id,
    'lots_affected', 0
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- transfer_inventory — FEFO from source lots into matching destination lots.
-- Signature unchanged (already returns jsonb); body is now lot-aware.
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
  v_group_id uuid := gen_random_uuid();
  v_remaining numeric := p_quantity;
  v_take numeric;
  v_affected integer := 0;
  v_has_lots boolean;
  v_lot record;
  v_dest_lot_id uuid;
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

  if p_from_location_id = p_to_location_id then
    raise exception 'transfer_requires_distinct_locations';
  end if;

  if p_quantity <= 0 then
    raise exception 'quantity_must_be_positive';
  end if;

  select exists (
    select 1
    from public.inventory_lots l
    where l.item_id = p_item_id
      and l.location_id = p_from_location_id
      and inventory_ops.get_lot_on_hand(l.id) > 0
  ) into v_has_lots;

  if v_has_lots then
    for v_lot in
      select l.id, l.lot_number, l.expiration_date, l.vendor_id,
             inventory_ops.get_lot_on_hand(l.id) as qty
      from public.inventory_lots l
      where l.item_id = p_item_id
        and l.location_id = p_from_location_id
        and inventory_ops.get_lot_on_hand(l.id) > 0
      order by l.expiration_date asc nulls last, l.received_date asc, l.id asc
    loop
      exit when v_remaining <= 0;

      v_take := least(v_remaining, v_lot.qty);

      perform inventory_ops.insert_ledger_row(
        p_item_id => p_item_id,
        p_location_id => p_from_location_id,
        p_transaction_type => 'TRANSFER_OUT',
        p_quantity => v_take,
        p_reason_code => 'location_transfer',
        p_transaction_date => p_transaction_date,
        p_performed_by => auth.uid(),
        p_transaction_group_id => v_group_id,
        p_inventory_lot_id => v_lot.id
      );

      v_dest_lot_id := inventory_ops.find_or_create_lot(
        p_item_id,
        p_to_location_id,
        v_lot.lot_number,
        v_lot.expiration_date,
        p_transaction_date::date,
        v_lot.vendor_id
      );

      perform inventory_ops.insert_ledger_row(
        p_item_id => p_item_id,
        p_location_id => p_to_location_id,
        p_transaction_type => 'TRANSFER_IN',
        p_quantity => v_take,
        p_reason_code => 'location_transfer',
        p_transaction_date => p_transaction_date,
        p_performed_by => auth.uid(),
        p_transaction_group_id => v_group_id,
        p_inventory_lot_id => v_dest_lot_id
      );

      v_remaining := v_remaining - v_take;
      v_affected := v_affected + 1;
    end loop;

    if v_remaining > 0 then
      raise exception 'insufficient_lot_stock';
    end if;

    return jsonb_build_object(
      'transaction_group_id', v_group_id,
      'lots_affected', v_affected
    );
  end if;

  -- Non-tracked item: single out/in pair, unchanged behavior.
  perform inventory_ops.insert_ledger_row(
    p_item_id => p_item_id,
    p_location_id => p_from_location_id,
    p_transaction_type => 'TRANSFER_OUT',
    p_quantity => p_quantity,
    p_reason_code => 'location_transfer',
    p_transaction_date => p_transaction_date,
    p_performed_by => auth.uid(),
    p_transaction_group_id => v_group_id
  );

  perform inventory_ops.insert_ledger_row(
    p_item_id => p_item_id,
    p_location_id => p_to_location_id,
    p_transaction_type => 'TRANSFER_IN',
    p_quantity => p_quantity,
    p_reason_code => 'location_transfer',
    p_transaction_date => p_transaction_date,
    p_performed_by => auth.uid(),
    p_transaction_group_id => v_group_id
  );

  return jsonb_build_object(
    'transaction_group_id', v_group_id,
    'lots_affected', 0
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- dispose_lot — write off part or all of a lot (expired / damaged disposal).
-- Defaults to the full remaining quantity. Returns jsonb.
-- ---------------------------------------------------------------------------
create or replace function public.dispose_lot(
  p_lot_id uuid,
  p_quantity numeric default null,
  p_reason_code public.reason_code default 'expired_disposal'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot record;
  v_avail numeric;
  v_quantity numeric;
  v_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);

  if p_reason_code not in ('expired_disposal', 'damaged_disposal') then
    raise exception 'invalid_disposal_reason';
  end if;

  select l.id, l.item_id, l.location_id
  into v_lot
  from public.inventory_lots l
  where l.id = p_lot_id;

  if not found then
    raise exception 'lot_not_found';
  end if;

  perform inventory_ops.assert_location_not_under_count(v_lot.location_id);

  v_avail := inventory_ops.get_lot_on_hand(p_lot_id);
  v_quantity := coalesce(p_quantity, v_avail);

  if v_quantity <= 0 then
    raise exception 'nothing_to_dispose';
  end if;

  v_id := inventory_ops.insert_ledger_row(
    p_item_id => v_lot.item_id,
    p_location_id => v_lot.location_id,
    p_transaction_type => 'CONSUME',
    p_quantity => v_quantity,
    p_reason_code => p_reason_code,
    p_transaction_date => now(),
    p_performed_by => auth.uid(),
    p_inventory_lot_id => p_lot_id
  );

  return jsonb_build_object('transaction_id', v_id, 'quantity', v_quantity);
end;
$$;

-- ---------------------------------------------------------------------------
-- adjust_lot — correct a specific lot's quantity up or down.
-- ---------------------------------------------------------------------------
create or replace function public.adjust_lot(
  p_lot_id uuid,
  p_quantity numeric,
  p_increase boolean,
  p_reason_code public.reason_code,
  p_transaction_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot record;
  v_type public.transaction_type;
  v_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role
  ]);

  select l.id, l.item_id, l.location_id
  into v_lot
  from public.inventory_lots l
  where l.id = p_lot_id;

  if not found then
    raise exception 'lot_not_found';
  end if;

  perform inventory_ops.assert_location_not_under_count(v_lot.location_id);

  v_type := case
    when p_increase then 'ADJUSTMENT_INCREASE'::public.transaction_type
    else 'ADJUSTMENT_DECREASE'::public.transaction_type
  end;

  v_id := inventory_ops.insert_ledger_row(
    p_item_id => v_lot.item_id,
    p_location_id => v_lot.location_id,
    p_transaction_type => v_type,
    p_quantity => p_quantity,
    p_reason_code => p_reason_code,
    p_transaction_date => p_transaction_date,
    p_performed_by => auth.uid(),
    p_inventory_lot_id => p_lot_id
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only (matches the existing RPC boundary).
-- ---------------------------------------------------------------------------
grant execute on function public.receive_inventory(
  uuid, uuid, numeric, public.reason_code, timestamptz, text, date, uuid
) to authenticated;

grant execute on function public.consume_inventory(
  uuid, uuid, numeric, public.reason_code, timestamptz, uuid, boolean
) to authenticated;

grant execute on function public.transfer_inventory(
  uuid, uuid, uuid, numeric, timestamptz
) to authenticated;

grant execute on function public.dispose_lot(
  uuid, numeric, public.reason_code
) to authenticated;

grant execute on function public.adjust_lot(
  uuid, numeric, boolean, public.reason_code, timestamptz
) to authenticated;
