-- =============================================================================
-- WHFC Inventory — promote demo accounts to non-default roles
--
-- New signups always land as 'read_only' (see handle_new_user() in
-- 20260705120003_auth_profile.sql) — this repo deliberately does not seed
-- auth.users/profiles directly (see supabase/README.md). To build out a demo
-- environment with an administrator and a medic:
--
--   1. Sign up two accounts through the app's normal auth flow (e.g.
--      admin@example.clinic and medic@example.clinic).
--   2. Edit the emails below to match, then run this script once
--      (Supabase SQL editor, or `psql < demo_promote_roles.sql`).
--
-- Idempotent — re-running just re-asserts the same role.
-- =============================================================================

update public.profiles p
set role = 'administrator'
from auth.users u
where u.id = p.id
  and u.email = 'admin@example.clinic';

update public.profiles p
set role = 'medic'
from auth.users u
where u.id = p.id
  and u.email = 'medic@example.clinic';
