-- =============================================================================
-- WHFC Inventory — grants and revokes (exposed API boundary)
-- =============================================================================

-- Ledger: authenticated may read; direct writes revoked (RPC only).
revoke insert, update, delete on public.inventory_transactions from anon, authenticated;
grant select on public.inventory_transactions to authenticated;

-- audit_log: no direct client writes
revoke insert, update, delete on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- Master data: standard table grants with RLS enforcement
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.units_of_measure to authenticated;
grant select, insert, update, delete on public.vendors to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.locations to authenticated;

grant select, insert, update, delete on public.physical_counts to authenticated;
grant select, insert, update, delete on public.physical_count_lines to authenticated;

-- Auth helper functions
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.require_roles(public.user_role[]) to authenticated;

-- Application RPC entry points — authenticated only, not anon
grant execute on function public.receive_inventory(
  uuid, uuid, numeric, public.reason_code, timestamptz
) to authenticated;

grant execute on function public.consume_inventory(
  uuid, uuid, numeric, public.reason_code, timestamptz
) to authenticated;

grant execute on function public.transfer_inventory(
  uuid, uuid, uuid, numeric, timestamptz
) to authenticated;

grant execute on function public.adjust_inventory(
  uuid, uuid, numeric, boolean, public.reason_code, timestamptz
) to authenticated;

grant execute on function public.start_physical_count(uuid) to authenticated;
grant execute on function public.upsert_physical_count_line(
  uuid, uuid, numeric
) to authenticated;
grant execute on function public.complete_physical_count(uuid) to authenticated;
grant execute on function public.cancel_physical_count(uuid) to authenticated;

-- Internal helpers remain inaccessible to API roles
revoke all on all functions in schema inventory_ops from public, anon, authenticated;

-- Default privileges: do not auto-grant new inventory_ops functions
alter default privileges in schema inventory_ops
  revoke execute on functions from public, anon, authenticated;
