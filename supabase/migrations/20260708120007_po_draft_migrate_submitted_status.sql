-- =============================================================================
-- WHFC Inventory — migrate legacy PO draft status 'submitted' -> 'approved'
--
-- Split out from 20260708120005 because Postgres forbids using an enum value in
-- the same transaction that adds it. The 'approved' value is added (and
-- committed) by 20260708120005; this migration runs afterward, so the value is
-- safe to use. No-op on databases that never had 'submitted' drafts.
-- =============================================================================

update public.purchase_order_drafts
set status = 'approved'
where status = 'submitted';
