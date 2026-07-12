-- =============================================================================
-- WHFC Inventory — extensions, enums, shared utilities
-- Single-clinic consumable inventory. No organization tenancy.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Private schema for internal inventory helpers (not exposed via PostgREST).
create schema if not exists inventory_ops;
revoke all on schema inventory_ops from public;
revoke all on schema inventory_ops from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'administrator',
  'inventory_manager',
  'staff',
  'read_only'
);

create type public.transaction_type as enum (
  'RECEIVE',
  'CONSUME',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADJUSTMENT_INCREASE',
  'ADJUSTMENT_DECREASE',
  'PHYSICAL_COUNT_CORRECTION'
);

create type public.physical_count_status as enum (
  'in_progress',
  'completed',
  'cancelled'
);

create type public.reason_code as enum (
  'vendor_delivery',
  'internal_restock',
  'initial_stock',
  'clinic_use',
  'expired_disposal',
  'damaged_disposal',
  'location_transfer',
  'found_stock',
  'data_correction_increase',
  'damaged_stock',
  'data_correction_decrease',
  'shrinkage',
  'count_surplus',
  'count_shortage'
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Append-only guard for inventory ledger
-- ---------------------------------------------------------------------------
create or replace function public.prevent_inventory_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'inventory_transactions is append-only';
end;
$$;
