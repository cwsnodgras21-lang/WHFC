-- =============================================================================
-- WHFC Inventory — demo inventory reset (local / staging only)
--
-- Clears all inventory activity (transactions, lots, counts, dispense, PO
-- drafts) while keeping the catalog, locations, vendors, and module settings.
-- Run after demo_seed.sql to return to a clean “zero stock” state before a demo.
--
-- Usage (Supabase SQL editor or psql):
--   \i supabase/seed/demo_reset_inventory.sql
--
-- WARNING: Bypasses append-only ledger triggers. Do not run in production.
-- =============================================================================

begin;

set session_replication_role = replica;

-- Dispense and procedure activity
delete from public.dispense_event_lines;
delete from public.dispense_events;

-- Purchasing workflow artifacts
delete from public.purchase_order_draft_lines;
delete from public.purchase_order_drafts;
delete from public.reorder_suggestion_actions;

-- Physical counts (lines cascade)
delete from public.physical_count_lines;
delete from public.physical_counts;

-- Lot stock and ledger (order matters for self-references)
update public.inventory_transactions
set related_transaction_id = null
where related_transaction_id is not null;

delete from public.inventory_transactions;
delete from public.inventory_lots;

set session_replication_role = default;

commit;
