# Data Model

## Design principles

- Normalized relational schema in PostgreSQL
- Single stocking unit per item for MVP — no unit conversion
- No PHI fields, no unrestricted notes, no attachments
- Quantity on hand is **not** stored as a mutable column
- `inventory_transactions` is append-only from the application's perspective

## Entity relationship (summary)

```
profiles ─────────────┐
                      ├── inventory_transactions (performed_by)
categories ── items ──┤
units_of_measure ─────┤
vendors ──────────────┤
locations ────────────┤
                      ├── physical_counts
                      └── physical_count_lines

audit_log (master-data and administration only)
```

## Tables

### profiles

Extends `auth.users` for application identity and authorization.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | FK → `auth.users(id)` |
| full_name | text | |
| role | user_role enum | See [USER_ROLES.md](./USER_ROLES.md) |
| active | boolean | Inactive users cannot perform actions |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### categories

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | Unique among active categories |
| description | text | Short operational description only — not free-form notes |
| active | boolean | |
| created_at, updated_at | timestamptz | |

### units_of_measure

Stocking units for MVP (box, roll, bottle, each, pack, case, etc.).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | e.g. "Box" |
| abbreviation | text | e.g. "BX" |
| active | boolean | |

### vendors

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| contact_email | text | Optional |
| contact_phone | text | Optional |
| active | boolean | |
| created_at, updated_at | timestamptz | |

### items

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| item_name | text | |
| internal_sku | text | Unique |
| category_id | uuid FK | → categories |
| unit_of_measure_id | uuid FK | → units_of_measure — **single stocking unit** |
| preferred_vendor_id | uuid FK | → vendors, nullable |
| reorder_point | numeric | In stocking units |
| par_level | numeric | In stocking units |
| active | boolean | |
| track_expiration | boolean | Default false — require expiration on receive; track by lot |
| track_lot_number | boolean | Default false — require a lot number on receive |
| expiration_warning_days | int | Default 90 — "expiring soon" window; check > 0 |
| created_at, updated_at | timestamptz | |

**Removed from original spec**: `pack_quantity`. MVP uses one stocking unit only. If pack labeling is needed later, an optional `units_per_pack` column may be added as **informational only** — it must not participate in inventory calculations.

### locations

Internal storage locations — not separate businesses or clinics.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| location_name | text | |
| room | text | Optional |
| cabinet | text | Optional |
| shelf | text | Optional |
| bin | text | Optional |
| active | boolean | |
| created_at, updated_at | timestamptz | |

### inventory_transactions

Authoritative ledger for all quantity changes and inventory audit history.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| item_id | uuid FK | |
| location_id | uuid FK | |
| transaction_type | transaction_type enum | See [INVENTORY_RULES.md](./INVENTORY_RULES.md) |
| quantity | numeric | Always positive; sign from type |
| transaction_date | timestamptz | Business date of movement |
| reason_code | reason_code enum | Constrained — not free text |
| performed_by | uuid FK | → profiles |
| related_transaction_id | uuid FK | Links transfer pairs |
| inventory_lot_id | uuid FK | → inventory_lots, nullable — set for tracked items |
| created_at | timestamptz | Immutable insert time |

**No** notes column.

### inventory_lots

One received batch of a tracked item at a location. Holds **identity only** —
quantity on hand is derived from the ledger, never stored here.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| item_id | uuid FK | → items |
| location_id | uuid FK | → locations |
| lot_number | text | Nullable |
| expiration_date | date | Nullable |
| received_date | date | Default current_date |
| vendor_id | uuid FK | → vendors, nullable |
| created_at, updated_at | timestamptz | |

Unique on `(item_id, location_id, coalesce(lot_number,''),
coalesce(expiration_date,'0001-01-01'))` so receiving the same batch reuses the
lot. Lifecycle status (active / expiring_soon / expired / depleted) is **derived**
in the `inventory_lot_stock` view.

### physical_counts

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| location_id | uuid FK | |
| status | physical_count_status enum | e.g. in_progress, completed, cancelled |
| started_at | timestamptz | |
| completed_at | timestamptz | Nullable |
| created_by | uuid FK | → profiles |
| completed_by | uuid FK | → profiles, nullable |

### physical_count_lines

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| physical_count_id | uuid FK | |
| item_id | uuid FK | |
| inventory_lot_id | uuid FK | → inventory_lots, nullable — null = whole-item line |
| system_quantity | numeric | Snapshot at count start |
| counted_quantity | numeric | Physical count entry |
| variance | numeric | counted − system |
| created_at, updated_at | timestamptz | |

### audit_log

Master-data and administration changes only. **Not** used for routine inventory movements.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| actor_id | uuid FK | → profiles |
| action | text | e.g. `item.updated`, `profile.role_changed` |
| entity_type | text | e.g. `item`, `location`, `profile` |
| entity_id | uuid | |
| before_state | jsonb | Nullable structured snapshot |
| after_state | jsonb | Nullable structured snapshot |
| created_at | timestamptz | |

**No** unrestricted notes column.

## Enums

- `user_role`: administrator, inventory_manager, staff, read_only
- `transaction_type`: RECEIVE, CONSUME, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT_INCREASE, ADJUSTMENT_DECREASE, PHYSICAL_COUNT_CORRECTION
- `physical_count_status`: in_progress, completed, cancelled
- `reason_code`: see [reason codes by transaction type](#reason-codes-by-transaction-type)

### Reason codes by transaction type

| Transaction type | Allowed `reason_code` values |
|---|---|
| RECEIVE | vendor_delivery, internal_restock, initial_stock |
| CONSUME | clinic_use, expired_disposal, damaged_disposal |
| TRANSFER_IN / TRANSFER_OUT | location_transfer |
| ADJUSTMENT_INCREASE | found_stock, data_correction_increase |
| ADJUSTMENT_DECREASE | damaged_stock, data_correction_decrease, shrinkage |
| PHYSICAL_COUNT_CORRECTION | count_surplus (increase), count_shortage (decrease) |

## Views

### inventory_on_hand

Aggregates signed quantities from `inventory_transactions` grouped by `item_id` and `location_id`. Uses `security_invoker = true`.

### items_below_reorder_point

Items where total on-hand across locations is below `reorder_point`.

### recent_inventory_transactions

Latest 100 ledger rows (for dashboard shell in Stage 4).

### inventory_lot_stock

One row per lot with derived `quantity_on_hand` (signed sum of ledger rows
carrying its `inventory_lot_id`), computed `status` (`lot_status` enum:
active / expiring_soon / expired / depleted), `days_until_expiration`, and
item/category/location/vendor names. Powers the Expiration Center and the
dashboard expiration card. `security_invoker = true`.

## Indexes

- `inventory_transactions (item_id, location_id, transaction_date)`
- `inventory_transactions (performed_by, created_at)`
- `items (internal_sku)` unique
- `items (active)` partial where active
- `audit_log (entity_type, entity_id, created_at)`
