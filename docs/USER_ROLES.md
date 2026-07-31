# User Roles

## Overview

Five roles for a single White House Family Care clinic. Roles are stored in `profiles.role` and enforced by RLS policies and RPC function checks — not by UI alone.

Inactive users (`profiles.active = false`) cannot perform write operations regardless of role.

## Roles

### Administrator

- Full access to all features
- User administration: activate/deactivate users, assign roles
- All inventory manager capabilities
- Cannot bypass ledger or create negative inventory

### Inventory Manager

- Create and update items, categories, units of measure, vendors, locations
- Receive, consume, transfer, adjust inventory
- Start and complete physical counts
- View transactions, reorder reports, and dashboard
- Cannot change user roles or deactivate users

### Staff

- Receive and consume inventory through controlled forms
- View items, locations, on-hand quantities, and own recent activity as permitted by RLS
- Cannot manage master data, transfers, adjustments, physical counts, or administration

### Read Only

- View items, locations, on-hand quantities, transactions, reorder reports, and dashboard
- No write operations

### Medic

Limited-access role for part-time clinical staff who need to use stock and dispense procedure kits or samples, but not manage inventory master data or purchasing.

- View active items needed for clinical use and available quantities by location
- Use stock (`consume_inventory`)
- Execute procedure kits (`dispense_kit`)
- Record sample dispensing (`dispense_sample`)
- Submit feedback
- View their own recent transactions and dispense/sample history (RLS narrows to `performed_by = auth.uid()`, same pattern as Staff)
- Cannot receive inventory, transfer, adjust, run physical counts, manage vendors/locations/units/categories, view reorder suggestions or reorder report, access Administration, or view billing
- Gets a minimized navigation: Dashboard, Items (view), Use stock, Dispense, Give sample, Transactions (own)

## Permission matrix (MVP)

| Capability | Administrator | Inventory Manager | Staff | Medic | Read Only |
|---|:---:|:---:|:---:|:---:|:---:|
| View dashboard & reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| View items & locations | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage items & locations | ✓ | ✓ | | | |
| Receive inventory | ✓ | ✓ | ✓ | | |
| Consume inventory | ✓ | ✓ | ✓ | ✓ | |
| Dispense procedure kits | ✓ | ✓ | ✓ | ✓ | |
| Give samples | ✓ | ✓ | ✓ | ✓ | |
| Receive samples | ✓ | ✓ | ✓ | | |
| Manage procedure kits / sample catalog | ✓ | ✓ | | | |
| Transfer inventory | ✓ | ✓ | | | |
| Adjust inventory | ✓ | ✓ | | | |
| Physical counts | ✓ | ✓ | | | |
| Reorder suggestions / report | ✓ | ✓ | ✓ | | ✓ |
| View transaction history | ✓ | ✓ | limited | limited | ✓ |
| User administration | ✓ | | | | |

"limited" for Staff and Medic transaction/dispense/sample history: RLS restricts to their own `performed_by` rows only.

## Enum values

```text
administrator
inventory_manager
staff
read_only
medic
```

## Provisioning

| Scenario | Process |
|---|---|
| First administrator | Supabase Auth invite/signup → manual `profiles.role = 'administrator'` |
| Additional users | Administrator invites or creates → assigns role |
| Demo/local seed | May include labeled demo profiles — no real credentials, no production admin |

## RLS approach (Stage 3)

- Helper: `current_user_role()` — `SECURITY DEFINER`, reads `profiles` for `auth.uid()`
- Helper: `require_active_profile()` — fails if profile missing or inactive
- Policies keyed on role for INSERT/UPDATE/DELETE
- RPC functions re-check role before mutating inventory
