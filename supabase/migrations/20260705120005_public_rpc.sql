-- =============================================================================
-- WHFC Inventory — public auth helpers and application RPC entry points
-- EXECUTE granted to authenticated only (see grants migration).
-- =============================================================================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true;
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
  );
$$;

create or replace function public.require_roles(p_roles public.user_role[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_active_user() then
    raise exception 'profile_inactive';
  end if;

  v_role := public.current_user_role();
  if v_role is null or not (v_role = any (p_roles)) then
    raise exception 'insufficient_privilege';
  end if;
end;
$$;

create or replace function public.assert_active_item(p_item_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.items i
    where i.id = p_item_id and i.active = true
  ) then
    raise exception 'item_not_found_or_inactive';
  end if;
end;
$$;

create or replace function public.assert_active_location(p_location_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.locations l
    where l.id = p_location_id and l.active = true
  ) then
    raise exception 'location_not_found_or_inactive';
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

-- ---------------------------------------------------------------------------
-- adjust_inventory
-- ---------------------------------------------------------------------------
create or replace function public.adjust_inventory(
  p_item_id uuid,
  p_location_id uuid,
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
  v_type public.transaction_type;
  v_id uuid;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role
  ]);
  perform public.assert_active_item(p_item_id);
  perform public.assert_active_location(p_location_id);

  v_type := case
    when p_increase then 'ADJUSTMENT_INCREASE'::public.transaction_type
    else 'ADJUSTMENT_DECREASE'::public.transaction_type
  end;

  v_id := inventory_ops.insert_ledger_row(
    p_item_id,
    p_location_id,
    v_type,
    p_quantity,
    p_reason_code,
    p_transaction_date,
    auth.uid()
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- start_physical_count
-- ---------------------------------------------------------------------------
create or replace function public.start_physical_count(p_location_id uuid)
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
    'inventory_manager'::public.user_role
  ]);
  perform public.assert_active_location(p_location_id);

  if exists (
    select 1
    from public.physical_counts pc
    where pc.location_id = p_location_id
      and pc.status = 'in_progress'
  ) then
    raise exception 'physical_count_already_in_progress';
  end if;

  insert into public.physical_counts (location_id, created_by)
  values (p_location_id, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- upsert_physical_count_line
-- ---------------------------------------------------------------------------
create or replace function public.upsert_physical_count_line(
  p_physical_count_id uuid,
  p_item_id uuid,
  p_counted_quantity numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line_id uuid;
  v_system_qty numeric;
  v_count record;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role
  ]);

  select pc.*
  into v_count
  from public.physical_counts pc
  where pc.id = p_physical_count_id;

  if not found then
    raise exception 'physical_count_not_found';
  end if;

  if v_count.status <> 'in_progress' then
    raise exception 'physical_count_not_editable';
  end if;

  perform public.assert_active_item(p_item_id);

  v_system_qty := inventory_ops.get_on_hand(p_item_id, v_count.location_id);

  if p_counted_quantity < 0 then
    raise exception 'counted_quantity_must_be_non_negative';
  end if;

  insert into public.physical_count_lines (
    physical_count_id,
    item_id,
    system_quantity,
    counted_quantity
  )
  values (
    p_physical_count_id,
    p_item_id,
    v_system_qty,
    p_counted_quantity
  )
  on conflict (physical_count_id, item_id)
  do update set
    counted_quantity = excluded.counted_quantity,
    system_quantity = excluded.system_quantity,
    updated_at = now()
  returning id into v_line_id;

  return v_line_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_physical_count
-- ---------------------------------------------------------------------------
create or replace function public.complete_physical_count(p_physical_count_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count record;
  v_line record;
  v_correction_count integer := 0;
  v_reason public.reason_code;
  v_type public.transaction_type := 'PHYSICAL_COUNT_CORRECTION';
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role
  ]);

  select pc.*
  into v_count
  from public.physical_counts pc
  where pc.id = p_physical_count_id
  for update;

  if not found then
    raise exception 'physical_count_not_found';
  end if;

  if v_count.status <> 'in_progress' then
    raise exception 'physical_count_not_in_progress';
  end if;

  for v_line in
    select pcl.*
    from public.physical_count_lines pcl
    where pcl.physical_count_id = p_physical_count_id
      and pcl.variance <> 0
  loop
    if v_line.variance > 0 then
      v_reason := 'count_surplus';
    else
      v_reason := 'count_shortage';
    end if;

    perform inventory_ops.insert_ledger_row(
      v_line.item_id,
      v_count.location_id,
      v_type,
      abs(v_line.variance),
      v_reason,
      now(),
      auth.uid()
    );

    v_correction_count := v_correction_count + 1;
  end loop;

  update public.physical_counts
  set
    status = 'completed',
    completed_at = now(),
    completed_by = auth.uid()
  where id = p_physical_count_id;

  return jsonb_build_object(
    'physical_count_id', p_physical_count_id,
    'corrections_posted', v_correction_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_physical_count
-- ---------------------------------------------------------------------------
create or replace function public.cancel_physical_count(p_physical_count_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count record;
begin
  perform public.require_roles(array[
    'administrator'::public.user_role,
    'inventory_manager'::public.user_role
  ]);

  select pc.*
  into v_count
  from public.physical_counts pc
  where pc.id = p_physical_count_id
  for update;

  if not found then
    raise exception 'physical_count_not_found';
  end if;

  if v_count.status <> 'in_progress' then
    raise exception 'physical_count_not_in_progress';
  end if;

  update public.physical_counts
  set status = 'cancelled', completed_at = now(), completed_by = auth.uid()
  where id = p_physical_count_id;
end;
$$;
