-- =============================================================================
-- WHFC Inventory — add 'medic' role
-- Limited-access role for part-time clinical staff. Kept in its own migration
-- because a new enum value cannot be referenced in the same transaction that
-- adds it.
-- =============================================================================

alter type public.user_role add value 'medic';
