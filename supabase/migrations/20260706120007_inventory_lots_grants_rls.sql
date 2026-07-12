-- =============================================================================
-- WHFC Inventory — grants + RLS for inventory_lots
--
-- inventory_lot_stock is a security_invoker view, so it reads inventory_lots as
-- the querying user. Without a SELECT grant + RLS policy, every read (Expiration
-- Center, consume lot picker, dashboard card) fails with "permission denied for
-- table inventory_lots". Writes stay RPC-only: find_or_create_lot and the lot
-- RPCs are SECURITY DEFINER (owned by postgres) and bypass RLS, so authenticated
-- needs read access only. Mirrors the model used for the other master tables.
-- =============================================================================

-- Read for active users; direct writes revoked (lots are written via RPC only).
revoke insert, update, delete on public.inventory_lots from anon, authenticated;
grant select on public.inventory_lots to authenticated;

alter table public.inventory_lots enable row level security;

create policy inventory_lots_select
  on public.inventory_lots for select to authenticated
  using (public.is_active_user());
