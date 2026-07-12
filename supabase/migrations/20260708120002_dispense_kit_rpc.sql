-- =============================================================================
-- WHFC Inventory — dispense kit RPC (atomic multi-item consume with FEFO)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- consume_item_for_group — FEFO consume attributed to an existing group id.
-- Returns first ledger row id and primary lot id (if any) for audit linkage.
-- ---------------------------------------------------------------------------
create function inventory_ops.consume_item_for_group(
  p_item_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_reason_code public.reason_code,
  p_transaction_date timestamptz,
  p_performed_by uuid,
  p_transaction_group_id uuid,
  p_allow_expired boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remaining numeric := p_quantity;
  v_take numeric;
  v_first_tx_id uuid;
  v_primary_lot_id uuid;
  v_had_expired boolean := false;
  v_has_lots boolean;
  v_lot record;
  v_row_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'quantity_must_be_positive';
  end if;

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

      if not p_allow_expired and v_lot.expiration_date is not null
         and v_lot.expiration_date < current_date then
        v_had_expired := true;
        continue;
      end if;

      v_take := least(v_remaining, v_lot.qty);
      v_row_id := inventory_ops.insert_ledger_row(
        p_item_id => p_item_id,
        p_location_id => p_location_id,
        p_transaction_type => 'CONSUME',
        p_quantity => v_take,
        p_reason_code => p_reason_code,
        p_transaction_date => p_transaction_date,
        p_performed_by => p_performed_by,
        p_transaction_group_id => p_transaction_group_id,
        p_inventory_lot_id => v_lot.id
      );

      if v_first_tx_id is null then
        v_first_tx_id := v_row_id;
        v_primary_lot_id := v_lot.id;
      end if;

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      if v_had_expired then
        raise exception 'lot_expired_override_required';
      end if;
      raise exception 'insufficient_lot_stock';
    end if;

    return jsonb_build_object(
      'first_transaction_id', v_first_tx_id,
      'inventory_lot_id', v_primary_lot_id
    );
  end if;

  -- Non-lot item: single ledger row.
  v_row_id := inventory_ops.insert_ledger_row(
    p_item_id => p_item_id,
    p_location_id => p_location_id,
    p_transaction_type => 'CONSUME',
    p_quantity => p_quantity,
    p_reason_code => p_reason_code,
    p_transaction_date => p_transaction_date,
    p_performed_by => p_performed_by,
    p_transaction_group_id => p_transaction_group_id
  );

  return jsonb_build_object(
    'first_transaction_id', v_row_id,
    'inventory_lot_id', null
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- dispense_kit — create dispense event and decrement all kit components.
-- p_administered_amounts: [{ "component_id": uuid, "amount": numeric }, ...]
-- ---------------------------------------------------------------------------
create function public.dispense_kit(
  p_procedure_kit_id uuid,
  p_location_id uuid,
  p_administered_amounts jsonb default '[]'::jsonb,
  p_performed_at timestamptz default now(),
  p_notes text default null,
  p_allow_expired boolean default false,
  p_source public.dispense_event_source default 'manual',
  p_external_source text default null,
  p_external_event_id text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kit record;
  v_component record;
  v_dispense_id uuid;
  v_group_id uuid := gen_random_uuid();
  v_existing_id uuid;
  v_qty numeric;
  v_administered numeric;
  v_on_hand numeric;
  v_consume_result jsonb;
  v_first_tx_id uuid;
  v_lot_id uuid;
  v_item_name text;
  v_amounts jsonb := coalesce(p_administered_amounts, '[]'::jsonb);
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);

  -- Idempotency: return existing event without duplicating inventory.
  if p_idempotency_key is not null then
    select de.id, de.transaction_group_id
    into v_existing_id, v_group_id
    from public.dispense_events de
    where de.idempotency_key = p_idempotency_key;

    if found then
      return jsonb_build_object(
        'dispense_event_id', v_existing_id,
        'transaction_group_id', v_group_id,
        'idempotent_replay', true
      );
    end if;
  end if;

  select pk.id, pk.name, pk.active
  into v_kit
  from public.procedure_kits pk
  where pk.id = p_procedure_kit_id;

  if not found then
    raise exception 'procedure_kit_not_found';
  end if;

  if not v_kit.active then
    raise exception 'procedure_kit_inactive';
  end if;

  perform public.assert_active_location(p_location_id);
  perform inventory_ops.assert_location_not_under_count(p_location_id);

  -- Pre-validate stock for all required components before any writes.
  for v_component in
    select c.*
    from public.procedure_kit_components c
    where c.procedure_kit_id = p_procedure_kit_id
      and c.required = true
    order by c.created_at asc
  loop
    perform public.assert_active_item(v_component.item_id);

    if v_component.is_variable_quantity then
      select (elem->>'amount')::numeric
      into v_administered
      from jsonb_array_elements(v_amounts) elem
      where (elem->>'component_id')::uuid = v_component.id
      limit 1;

      if v_administered is null or v_administered <= 0 then
        raise exception 'administered_amount_required';
      end if;

      if v_component.calculation_type = 'concentration' then
        v_qty := v_administered
          / v_component.concentration_amount
          * v_component.concentration_volume;
      elsif v_component.calculation_type = 'multiplier' then
        v_qty := v_administered * v_component.multiplier;
      else
        raise exception 'invalid_calculation_type';
      end if;
    else
      v_qty := v_component.quantity;
    end if;

    if v_qty <= 0 then
      raise exception 'quantity_must_be_positive';
    end if;

    select coalesce(sum(oh.quantity_on_hand), 0)
    into v_on_hand
    from public.inventory_on_hand oh
    where oh.item_id = v_component.item_id
      and oh.location_id = p_location_id;

    if v_on_hand < v_qty then
      select i.item_name into v_item_name
      from public.items i where i.id = v_component.item_id;
      raise exception 'insufficient_stock_for_item:%', coalesce(v_item_name, v_component.item_id::text);
    end if;
  end loop;

  -- Create parent dispense event.
  insert into public.dispense_events (
    procedure_kit_id,
    location_id,
    source,
    external_source,
    external_event_id,
    idempotency_key,
    performed_at,
    notes,
    created_by,
    transaction_group_id
  ) values (
    p_procedure_kit_id,
    p_location_id,
    p_source,
    nullif(trim(coalesce(p_external_source, '')), ''),
    nullif(trim(coalesce(p_external_event_id, '')), ''),
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    p_performed_at,
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid(),
    v_group_id
  )
  returning id into v_dispense_id;

  -- Consume each component and record lines.
  for v_component in
    select c.*
    from public.procedure_kit_components c
    where c.procedure_kit_id = p_procedure_kit_id
      and c.required = true
    order by c.created_at asc
  loop
    if v_component.is_variable_quantity then
      select (elem->>'amount')::numeric
      into v_administered
      from jsonb_array_elements(v_amounts) elem
      where (elem->>'component_id')::uuid = v_component.id
      limit 1;

      if v_component.calculation_type = 'concentration' then
        v_qty := v_administered
          / v_component.concentration_amount
          * v_component.concentration_volume;
      else
        v_qty := v_administered * v_component.multiplier;
      end if;
    else
      v_qty := v_component.quantity;
    end if;

    v_consume_result := inventory_ops.consume_item_for_group(
      p_item_id => v_component.item_id,
      p_location_id => p_location_id,
      p_quantity => v_qty,
      p_reason_code => 'clinic_use',
      p_transaction_date => p_performed_at,
      p_performed_by => auth.uid(),
      p_transaction_group_id => v_group_id,
      p_allow_expired => p_allow_expired
    );

    v_first_tx_id := (v_consume_result->>'first_transaction_id')::uuid;
    v_lot_id := (v_consume_result->>'inventory_lot_id')::uuid;

    insert into public.dispense_event_lines (
      dispense_event_id,
      item_id,
      quantity_consumed,
      unit,
      inventory_lot_id,
      transaction_id
    ) values (
      v_dispense_id,
      v_component.item_id,
      v_qty,
      v_component.unit,
      v_lot_id,
      v_first_tx_id
    );
  end loop;

  return jsonb_build_object(
    'dispense_event_id', v_dispense_id,
    'transaction_group_id', v_group_id,
    'idempotent_replay', false
  );
end;
$$;

grant execute on function public.dispense_kit(
  uuid,
  uuid,
  jsonb,
  timestamptz,
  text,
  boolean,
  public.dispense_event_source,
  text,
  text,
  text
) to authenticated;
