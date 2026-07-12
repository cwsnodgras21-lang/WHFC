-- =============================================================================
-- WHFC Inventory — optional physical counting by lot
--
-- Tracked items can be counted lot-by-lot when needed; every other item is
-- counted exactly as before (one whole-item line). A count line with a null
-- inventory_lot_id is a whole-item line; a non-null one counts that single lot.
-- =============================================================================

alter table public.physical_count_lines
  add column inventory_lot_id uuid references public.inventory_lots (id);

-- Replace the single-line-per-item constraint with two partial rules:
--   • at most one whole-item (null lot) line per item, and
--   • at most one line per (item, lot).
alter table public.physical_count_lines
  drop constraint physical_count_lines_unique_item;

create unique index physical_count_lines_item_whole_unique
  on public.physical_count_lines (physical_count_id, item_id)
  where inventory_lot_id is null;

create unique index physical_count_lines_item_lot_unique
  on public.physical_count_lines (physical_count_id, item_id, inventory_lot_id)
  where inventory_lot_id is not null;

-- ---------------------------------------------------------------------------
-- upsert_physical_count_line — whole-item line (unchanged behavior, but the
-- conflict target now points at the partial null-lot index).
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
    inventory_lot_id,
    system_quantity,
    counted_quantity
  )
  values (
    p_physical_count_id,
    p_item_id,
    null,
    v_system_qty,
    p_counted_quantity
  )
  on conflict (physical_count_id, item_id) where inventory_lot_id is null
  do update set
    counted_quantity = excluded.counted_quantity,
    system_quantity = excluded.system_quantity,
    updated_at = now()
  returning id into v_line_id;

  return v_line_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- upsert_physical_count_line_lot — count one specific lot.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_physical_count_line_lot(
  p_physical_count_id uuid,
  p_item_id uuid,
  p_inventory_lot_id uuid,
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

  if not exists (
    select 1 from public.inventory_lots l
    where l.id = p_inventory_lot_id
      and l.item_id = p_item_id
      and l.location_id = v_count.location_id
  ) then
    raise exception 'lot_item_location_mismatch';
  end if;

  v_system_qty := inventory_ops.get_lot_on_hand(p_inventory_lot_id);

  if p_counted_quantity < 0 then
    raise exception 'counted_quantity_must_be_non_negative';
  end if;

  insert into public.physical_count_lines (
    physical_count_id,
    item_id,
    inventory_lot_id,
    system_quantity,
    counted_quantity
  )
  values (
    p_physical_count_id,
    p_item_id,
    p_inventory_lot_id,
    v_system_qty,
    p_counted_quantity
  )
  on conflict (physical_count_id, item_id, inventory_lot_id)
    where inventory_lot_id is not null
  do update set
    counted_quantity = excluded.counted_quantity,
    system_quantity = excluded.system_quantity,
    updated_at = now()
  returning id into v_line_id;

  return v_line_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_physical_count — post corrections, attributing lot lines to lots.
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
      p_item_id => v_line.item_id,
      p_location_id => v_count.location_id,
      p_transaction_type => v_type,
      p_quantity => abs(v_line.variance),
      p_reason_code => v_reason,
      p_transaction_date => now(),
      p_performed_by => auth.uid(),
      p_inventory_lot_id => v_line.inventory_lot_id
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

grant execute on function public.upsert_physical_count_line_lot(
  uuid, uuid, uuid, numeric
) to authenticated;
