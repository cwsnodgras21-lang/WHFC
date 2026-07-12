# Inventory Rules

## Ledger model

Quantity on hand is **never** directly overwritten by users or application code. Every change is an append-only row in `inventory_transactions`.

On-hand quantity is calculated as the sum of signed transaction quantities per item and location.

## Transaction types

| Type | Effect on quantity |
|---|---|
| RECEIVE | Increase |
| CONSUME | Decrease |
| TRANSFER_OUT | Decrease at source location |
| TRANSFER_IN | Increase at destination location |
| ADJUSTMENT_INCREASE | Increase |
| ADJUSTMENT_DECREASE | Decrease |
| PHYSICAL_COUNT_CORRECTION | Increase or decrease to reconcile count |

`quantity` is always stored as a **positive** number. The transaction type determines whether it adds or subtracts from on-hand.

## Transfers

A transfer must create a balanced **TRANSFER_OUT** and **TRANSFER_IN** pair within a **single database transaction**, linked by `related_transaction_id`.

If the source location would fall below zero, the entire transfer fails.

## Negative inventory

**Prohibited for every role, including administrators.**

- No user may consume, transfer, or adjust in a way that results in negative on-hand at any location.
- Administrators correct discrepancies through explicit **adjustment** or **physical count** workflows — not by bypassing the ledger or forcing negative balances.
- Enforcement is at the **database level** inside RPC functions before insert.

## Single stocking unit (MVP)

Every item has exactly **one** stocking unit of measure (box, roll, bottle, each, pack, case, etc.).

All of the following use that same unit:

- Inventory transactions
- Physical counts
- Reorder points and par levels
- Quantity-on-hand calculations and reports

**No purchase-unit-to-consumption-unit conversions** in MVP.

`units_per_pack` is **not** in the MVP schema. If added later for labeling convenience, it must be informational only and excluded from all inventory math.

## Reason codes

`reason_code` is a constrained enum — not free text. This prevents accidental PHI entry and keeps reporting consistent. Allowed values are defined per transaction type in database migrations.

## Physical counts

1. Start a count for a location (`physical_counts` → `in_progress`).
2. Enter counted quantities per item (`physical_count_lines`).
3. On completion, the system posts `PHYSICAL_COUNT_CORRECTION` transactions for variances.
4. Corrections respect the non-negative inventory rule.

## Reorder visibility

Items are below reorder point when:

```
sum(on_hand across locations) < items.reorder_point
```

(Exact aggregation rules for multi-location reorder will be finalized in Stage 3 migrations.)

## Audit separation

| Activity | Record location |
|---|---|
| Receive, consume, transfer, adjust, count correction | `inventory_transactions` only |
| Create/update item, location, category, UoM, reorder/par | `audit_log` |
| User activation, deactivation, role change | `audit_log` |

Do **not** duplicate inventory movements into `audit_log`.

## Application write path

1. Server Action validates with Zod.
2. Server Action verifies authenticated user, active profile, and role.
3. Server Action calls a **public RPC** (e.g. `receive_inventory`).
4. RPC calls private `inventory_ops` helpers as needed.
5. RPC inserts ledger row(s) and checks projected on-hand ≥ 0.
6. RPC returns success or a structured error.

Direct `INSERT` on `inventory_transactions` is revoked from `authenticated`.

## Lot & expiration tracking

Tracking is **opt-in per item**:

- `items.track_expiration` — when true, an expiration date is required to
  receive stock and the item is tracked by lot.
- `items.track_lot_number` — when true, a lot number is required to receive.
- `items.expiration_warning_days` (default 90) — how soon a lot is flagged
  "expiring soon".

A **lot** (`inventory_lots`) is one received batch at a location, keyed by lot
number + expiration date. Lots hold identity only; per-lot on-hand is derived
from the ledger via `inventory_transactions.inventory_lot_id` (summed in the
`inventory_lot_stock` view). Negative stock is blocked at the lot level as well
as item/location.

Movement rules for tracked items:

- **Receive** creates or reuses a lot for the item/location/lot/expiration and
  attributes the RECEIVE row to it.
- **Consume** uses **FEFO** (first-expiring, first-out) across lots
  automatically; staff may pick a lot manually. Expired lots are skipped unless
  the user confirms an override or the reason is a disposal reason.
- **Transfer** moves earliest-expiring lots first and recreates matching lots
  (same number/expiration) at the destination — invisible to the user.
- **Dispose / adjust** (`dispose_lot`, `adjust_lot`) write off or correct a
  specific lot; depleted lots (on-hand ≤ 0) never appear as available.

Non-tracked items keep the simpler item/location logic unchanged.

## What this system does not track

- Patient-specific usage
- Prescriptions or clinical orders
- Cost accounting (future enhancement)
