-- =============================================================================
-- WHFC Inventory — inventory_lots table + ledger lot attribution
--
-- A "lot" is one received batch of a tracked item at a location, identified by
-- its lot number and/or expiration date. Lots hold IMMUTABLE identity only —
-- their quantity on hand is NOT stored here. Per-lot on-hand is derived from the
-- append-only ledger (SUM of signed quantities of transactions carrying this
-- lot id), exactly like item/location on-hand. This keeps a single source of
-- truth and lets the DB enforce non-negative stock at the lot level too.
-- =============================================================================

-- Derived lot lifecycle state (computed in the inventory_lot_stock view).
create type public.lot_status as enum (
  'active',
  'expiring_soon',
  'expired',
  'depleted'
);

create table public.inventory_lots (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references public.items (id),
  location_id     uuid not null references public.locations (id),
  lot_number      text,
  expiration_date date,
  received_date   date not null default current_date,
  vendor_id       uuid references public.vendors (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint inventory_lots_lot_number_not_blank
    check (lot_number is null or char_length(trim(lot_number)) > 0)
);

-- One lot row per (item, location, lot number, expiration) so receiving the
-- same batch again finds and reuses the existing lot instead of duplicating it.
-- Nulls are coalesced so "no lot number" / "no expiration" still collapse.
create unique index inventory_lots_identity_unique
  on public.inventory_lots (
    item_id,
    location_id,
    coalesce(lot_number, ''),
    coalesce(expiration_date, '0001-01-01'::date)
  );

create index inventory_lots_item_location_idx
  on public.inventory_lots (item_id, location_id);

create index inventory_lots_expiration_date_idx
  on public.inventory_lots (expiration_date);

create trigger inventory_lots_set_updated_at
  before update on public.inventory_lots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ledger gains an optional lot reference.
-- Nullable: non-tracked items and pre-existing rows keep it null. The
-- append-only guard on inventory_transactions is unaffected — lot_id is set at
-- insert time and never updated.
-- ---------------------------------------------------------------------------
alter table public.inventory_transactions
  add column inventory_lot_id uuid references public.inventory_lots (id);

create index inventory_transactions_inventory_lot_id_idx
  on public.inventory_transactions (inventory_lot_id)
  where inventory_lot_id is not null;
