-- =============================================================================
-- WHFC Inventory — dispense history audit fields + RPC update
-- =============================================================================

alter table public.dispense_events
  add column if not exists administered_amounts jsonb not null default '[]'::jsonb,
  add column if not exists allow_expired_consumption boolean not null default false;

comment on column public.dispense_events.administered_amounts is
  'Snapshot of variable component amounts at dispense time: [{component_id, amount, label, unit}]';

comment on column public.dispense_events.allow_expired_consumption is
  'True when the user confirmed decrementing from expired FEFO stock.';

-- Recreate dispense_kit to persist administered amounts and expired flag.
create or replace function public.dispense_kit(
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
  v_administered_snapshot jsonb := '[]'::jsonb;
  v_entry jsonb;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role,
    'staff'::public.user_role
  ]);

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

  -- Build administered snapshot with labels for history display.
  for v_component in
    select c.id, c.variable_quantity_label, c.variable_quantity_unit
    from public.procedure_kit_components c
    where c.procedure_kit_id = p_procedure_kit_id
      and c.is_variable_quantity = true
  loop
    select (elem->>'amount')::numeric
    into v_administered
    from jsonb_array_elements(v_amounts) elem
    where (elem->>'component_id')::uuid = v_component.id
    limit 1;

    if v_administered is not null and v_administered > 0 then
      v_entry := jsonb_build_object(
        'component_id', v_component.id,
        'amount', v_administered,
        'label', v_component.variable_quantity_label,
        'unit', v_component.variable_quantity_unit
      );
      v_administered_snapshot := v_administered_snapshot || jsonb_build_array(v_entry);
    end if;
  end loop;

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
    transaction_group_id,
    administered_amounts,
    allow_expired_consumption
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
    v_group_id,
    v_administered_snapshot,
    coalesce(p_allow_expired, false)
  )
  returning id into v_dispense_id;

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
