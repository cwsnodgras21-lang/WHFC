-- =============================================================================
-- WHFC Inventory — vendor & reorder configuration gaps
--
-- item_vendors.active: per-relationship active flag (independent of
-- vendors.active — a vendor stays active while one specific sourcing
-- relationship is retired). item_vendors.minimum_order_quantity: vendor's
-- minimum order constraint, distinct from typical_order_quantity (historical/
-- descriptive). vendors.shipping_minimum: free-shipping / minimum-order
-- threshold for the whole vendor.
-- =============================================================================

alter table public.item_vendors
  add column active boolean not null default true,
  add column minimum_order_quantity numeric(12,3);

alter table public.item_vendors
  add constraint item_vendors_minimum_order_quantity_non_negative
    check (minimum_order_quantity is null or minimum_order_quantity >= 0);

alter table public.vendors
  add column shipping_minimum numeric(12,2);

alter table public.vendors
  add constraint vendors_shipping_minimum_non_negative
    check (shipping_minimum is null or shipping_minimum >= 0);
