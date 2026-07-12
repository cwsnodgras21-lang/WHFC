-- =============================================================================
-- WHFC Inventory — full ledger read access for every active role
--
-- Replaces role-split SELECT policies with a single active-user policy:
--   administrator, inventory_manager, staff, read_only → full ledger
--   inactive authenticated users → denied (is_active_user() = false)
--   anonymous → denied (no SELECT grant on inventory_transactions)
--
-- INSERT / UPDATE / DELETE and RPC permissions are unchanged.
--
-- inventory_transaction_history joins profiles for performed_by_name using
-- security_invoker. profiles_select_authenticated already allows any active
-- user to SELECT all profile rows, so performer names remain visible without
-- a narrower profiles policy change.
-- =============================================================================

drop policy if exists inventory_transactions_select_staff_own
  on public.inventory_transactions;

drop policy if exists inventory_transactions_select_elevated
  on public.inventory_transactions;

create policy inventory_transactions_select_active
  on public.inventory_transactions for select to authenticated
  using (public.is_active_user());
