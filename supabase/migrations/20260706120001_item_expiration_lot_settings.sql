-- =============================================================================
-- WHFC Inventory — item-level expiration / lot tracking settings
--
-- Adds opt-in tracking flags to items. Existing items default to NOT tracking
-- so current workflows (office / cleaning supplies) stay exactly as simple as
-- they are today. Progressive disclosure in the app reveals expiration / lot
-- fields only when these flags are set.
--
--   track_expiration        — when true, an expiration date is required to
--                             receive stock and the item is tracked by lot.
--   track_lot_number        — when true, a lot number is required to receive.
--   expiration_warning_days — how many days before expiry a lot is flagged
--                             "expiring soon" (default 90).
--
-- No ledger rules or on-hand math change here.
-- =============================================================================

alter table public.items
  add column track_expiration boolean not null default false,
  add column track_lot_number boolean not null default false,
  add column expiration_warning_days integer not null default 90,
  add constraint items_expiration_warning_days_positive
    check (expiration_warning_days > 0);
