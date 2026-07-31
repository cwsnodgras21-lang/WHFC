# Supabase Database

Migrations, seed data, and RPC functions for WHFC Inventory.

## Layout

```
supabase/
  config.toml           Local Supabase CLI configuration
  migrations/           Ordered SQL migrations (apply in filename order)
  seed/
    demo_seed.sql          Demonstration reference data (local dev only)
    demo_reset_inventory.sql  Resets demo transactions/lots between test runs
    demo_promote_roles.sql    Promotes demo signups to administrator/medic
```

## Migrations (apply in order)

| File | Purpose |
|---|---|
| `20260705120001_extensions_enums.sql` | Extensions, `inventory_ops` schema, enums |
| `20260705120002_core_tables.sql` | Tables, indexes, ledger append-only triggers |
| `20260705120003_auth_profile.sql` | Profile bootstrap on `auth.users` insert |
| `20260705120004_inventory_ops.sql` | Private helpers, non-negative checks, transfers |
| `20260705120005_public_rpc.sql` | Public RPC entry points and auth helpers |
| `20260705120006_rls_policies.sql` | Row Level Security policies |
| `20260705120007_grants.sql` | Revokes direct ledger writes; RPC execute grants |
| `20260705120008_views.sql` | `inventory_on_hand`, `items_below_reorder_point`, recent transactions |
| `20260705120009_audit_triggers.sql` | Master-data `audit_log` triggers |

## Public RPC functions

| Function | Roles |
|---|---|
| `receive_inventory` | administrator, inventory_manager, staff |
| `consume_inventory` | administrator, inventory_manager, staff |
| `transfer_inventory` | administrator, inventory_manager |
| `adjust_inventory` | administrator, inventory_manager |
| `start_physical_count` | administrator, inventory_manager |
| `upsert_physical_count_line` | administrator, inventory_manager |
| `complete_physical_count` | administrator, inventory_manager |
| `cancel_physical_count` | administrator, inventory_manager |

Direct `INSERT`/`UPDATE`/`DELETE` on `inventory_transactions` is revoked from `authenticated`. Inventory movements use RPC only.

## Priority 1 launch migrations (2026-07-30)

| File | Purpose |
|---|---|
| `20260730120001_medic_role_enum.sql` | Adds `medic` to `user_role` enum |
| `20260730120002_medic_role_rls_rpc.sql` | Wires medic into `consume_inventory`/`dispense_kit` and own-row transaction RLS |
| `20260730120003_procedure_kit_gaps.sql` | Kit `display_order`, `instructions`, component `dosage_presets`; medic dispense own-row RLS |
| `20260730120004_samples.sql` | Medication samples module: `sample_products`, `sample_lots`, `sample_transactions`, RPCs, RLS, views |
| `20260730120005_samples_activity_module.sql` | Adds `samples` to `activity_module` enum |
| `20260730120006_expiration_settings.sql` | Org-level and category-level expiration warning defaults; view precedence resolution |
| `20260730120007_vendor_reorder_config.sql` | `item_vendors.active`/`minimum_order_quantity`, `vendors.shipping_minimum` |

## Demo seed

`seed/demo_seed.sql` loads **DEMO —** labeled categories, units, vendors, locations, items, procedure kits (including adjustable-dosage kits), and sample products. It does **not** create auth users, profiles, administrators, or inventory transactions — those require an authenticated profile via RPC. After creating demo accounts through the normal signup flow, run `seed/demo_promote_roles.sql` to assign administrator/medic roles.

## Apply to remote Supabase

Use the Supabase SQL editor or CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each migration file in order into the SQL editor.

See [docs/SETUP.md](../docs/SETUP.md) for full setup.
