-- =============================================================================
-- WHFC Inventory — items.pack_quantity (individual units per stocking unit)
-- =============================================================================

alter table public.items
  add column if not exists pack_quantity integer;

alter table public.items
  drop constraint if exists items_pack_quantity_positive;

alter table public.items
  add constraint items_pack_quantity_positive
    check (pack_quantity is null or pack_quantity > 0);
