-- =============================================================================
-- WHFC Inventory — remove demonstration data + safe tracking backfill
--
-- 1. Removes the DEMO- catalog seeded for local development. The inventory
--    ledger is append-only, so anything that already has history (transactions,
--    lots, or count lines) CANNOT be hard-deleted without destroying audit
--    records. Such rows are DEACTIVATED instead (hidden from every pick list and
--    active view); demo rows with no history are hard-deleted. This is safe on a
--    fresh database (everything deletes) and on a used dev database alike.
-- 2. req-10 backfill: turns on expiration tracking for any existing items whose
--    category clearly expires (medications, lab supplies, tests, IV supplies,
--    syringes, needles). Idempotent and additive — never disables tracking.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1a. Demo items — delete the unused, deactivate the rest.
-- ---------------------------------------------------------------------------
delete from public.items i
where i.internal_sku like 'DEMO-%'
  and not exists (
    select 1 from public.inventory_transactions t where t.item_id = i.id
  )
  and not exists (
    select 1 from public.inventory_lots l where l.item_id = i.id
  )
  and not exists (
    select 1 from public.physical_count_lines pcl where pcl.item_id = i.id
  );

update public.items
set active = false
where internal_sku like 'DEMO-%' and active = true;

-- ---------------------------------------------------------------------------
-- 1b. Demo locations — delete the unused, deactivate the rest.
-- ---------------------------------------------------------------------------
delete from public.locations loc
where loc.location_name like 'DEMO —%'
  and not exists (
    select 1 from public.inventory_transactions t where t.location_id = loc.id
  )
  and not exists (
    select 1 from public.inventory_lots l where l.location_id = loc.id
  )
  and not exists (
    select 1 from public.physical_counts pc where pc.location_id = loc.id
  );

update public.locations
set active = false
where location_name like 'DEMO —%' and active = true;

-- ---------------------------------------------------------------------------
-- 1c. Demo vendors — FK references (items, lots) are ON DELETE SET NULL, so a
--     straight delete is always safe.
-- ---------------------------------------------------------------------------
delete from public.vendors where name like 'DEMO —%';

-- ---------------------------------------------------------------------------
-- 1d. Demo categories — delete when no item still references them, else
--     deactivate (a deactivated demo item may still hold the reference).
-- ---------------------------------------------------------------------------
delete from public.categories c
where c.name like 'DEMO —%'
  and not exists (select 1 from public.items i where i.category_id = c.id);

update public.categories
set active = false
where name like 'DEMO —%' and active = true;

-- ---------------------------------------------------------------------------
-- 2. Enable expiration tracking for obviously perishable categories.
-- ---------------------------------------------------------------------------
update public.items i
set track_expiration = true
from public.categories c
where c.id = i.category_id
  and i.track_expiration = false
  and (
    c.name ilike '%medication%'
    or c.name ilike '%med%'
    or c.name ilike '%lab%'
    or c.name ilike '%test%'
    or c.name ilike '%iv %'
    or c.name ilike '%iv supplies%'
    or c.name ilike '%syringe%'
    or c.name ilike '%needle%'
  );
