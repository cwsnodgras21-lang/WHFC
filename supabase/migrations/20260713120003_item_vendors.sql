-- =============================================================================
-- WHFC Inventory — Vendor Intelligence (item_vendors)
--
-- Records where each item can be ordered. An item may have several vendor
-- sources; exactly one is the preferred source. The existing
-- items.preferred_vendor_id pointer is kept in sync by trigger, so the reorder
-- suggestion and PO-draft workflows automatically recommend the preferred
-- vendor with no changes to their code.
-- =============================================================================

create table public.item_vendors (
  id                       uuid primary key default gen_random_uuid(),
  item_id                  uuid not null references public.items (id) on delete cascade,
  vendor_id                uuid not null references public.vendors (id) on delete cascade,
  is_preferred             boolean not null default false,
  vendor_sku               text,
  manufacturer             text,
  manufacturer_part_number text,
  pack_size                text,
  typical_order_quantity   numeric(12, 3),
  lead_time_days           integer,
  typical_cost             numeric(12, 2),
  last_order_date          date,
  ordering_notes           text,
  ordering_url             text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint item_vendors_unique_pair unique (item_id, vendor_id),
  constraint item_vendors_lead_time_non_negative
    check (lead_time_days is null or lead_time_days >= 0),
  constraint item_vendors_order_qty_non_negative
    check (typical_order_quantity is null or typical_order_quantity >= 0),
  constraint item_vendors_cost_non_negative
    check (typical_cost is null or typical_cost >= 0),
  constraint item_vendors_notes_len
    check (ordering_notes is null or char_length(ordering_notes) <= 500),
  constraint item_vendors_url_len
    check (ordering_url is null or char_length(ordering_url) <= 500)
);

create index item_vendors_item_idx on public.item_vendors (item_id);
create index item_vendors_vendor_idx on public.item_vendors (vendor_id);

-- At most one preferred source per item.
create unique index item_vendors_one_preferred
  on public.item_vendors (item_id)
  where is_preferred;

create trigger item_vendors_set_updated_at
  before update on public.item_vendors
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Setting a row preferred auto-demotes the item's other sources, so callers
-- never have to clear the old preferred first (and never hit the unique index).
-- ---------------------------------------------------------------------------
create or replace function inventory_ops.item_vendors_enforce_single_preferred()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_preferred then
    update public.item_vendors
    set is_preferred = false
    where item_id = new.item_id
      and id <> new.id
      and is_preferred;
  end if;
  return new;
end;
$$;

create trigger item_vendors_single_preferred
  before insert or update on public.item_vendors
  for each row execute function inventory_ops.item_vendors_enforce_single_preferred();

-- ---------------------------------------------------------------------------
-- Keep items.preferred_vendor_id pointing at the preferred source, so existing
-- reorder / purchasing consumers recommend the right vendor automatically.
-- ---------------------------------------------------------------------------
create or replace function inventory_ops.item_vendors_sync_items_preferred()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_id uuid := coalesce(new.item_id, old.item_id);
begin
  update public.items i
  set preferred_vendor_id = (
    select iv.vendor_id
    from public.item_vendors iv
    where iv.item_id = v_item_id
      and iv.is_preferred
    limit 1
  )
  where i.id = v_item_id;
  return null;
end;
$$;

create trigger item_vendors_sync_items
  after insert or update or delete on public.item_vendors
  for each row execute function inventory_ops.item_vendors_sync_items_preferred();

-- ---------------------------------------------------------------------------
-- RLS — read for active users, write for manager/admin (master-data pattern).
-- ---------------------------------------------------------------------------
alter table public.item_vendors enable row level security;

create policy item_vendors_select
  on public.item_vendors for select to authenticated
  using (public.is_active_user());

create policy item_vendors_write
  on public.item_vendors for all to authenticated
  using (public.current_user_role() in ('administrator', 'inventory_manager'))
  with check (public.current_user_role() in ('administrator', 'inventory_manager'));

grant select, insert, update, delete on public.item_vendors to authenticated;
