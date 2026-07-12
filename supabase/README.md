# Supabase Database

Migrations, seed data, and RPC functions for WHFC Inventory.

## Layout

```
supabase/
  config.toml           Local Supabase CLI configuration
  migrations/           Ordered SQL migrations (apply in filename order)
  seed/
    demo_seed.sql       Demonstration reference data (local dev only)
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

## Demo seed

`seed/demo_seed.sql` loads **DEMO —** labeled categories, units, vendors, locations, and items. It does **not** create auth users, profiles, administrators, or inventory transactions.

## Apply to remote Supabase

Use the Supabase SQL editor or CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each migration file in order into the SQL editor.

See [docs/SETUP.md](../docs/SETUP.md) for full setup.
