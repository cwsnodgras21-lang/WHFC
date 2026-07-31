-- =============================================================================
-- WHFC Inventory — add 'samples' to activity_module enum
-- Own migration: a new enum value cannot be referenced in the same
-- transaction that adds it.
-- =============================================================================

alter type public.activity_module add value 'samples';
