# Product Requirements Document

## Product name

- **Application**: White House Family Care Inventory
- **Short name**: WHFC Inventory
- **Package**: `whfc-inventory`

## Purpose

Track ordinary consumable supplies for White House Family Care clinic operations.

### In scope (examples)

- Gloves, paper products, cleaning supplies
- Office supplies, disposable medical supplies
- General clinic consumables

### Out of scope

- Patients, medications, pharmacy operations
- Medical records, prescriptions, diagnoses
- Patient-specific consumption tracking
- Barcode scanning, offline mode, purchasing integrations
- Notifications, forecasting, multi-clinic tenancy

## Strict PHI boundary

This application **must not** collect, store, display, transmit, or infer protected health information or patient information. No unrestricted notes or attachments. See [SECURITY.md](./SECURITY.md).

## Users and roles

| Role | Summary |
|---|---|
| Administrator | Full access including user administration |
| Inventory Manager | Master data, transactions, counts, reports |
| Staff | Receive and consume via controlled forms |
| Read Only | View inventory and reports |

## MVP capabilities

1. Item management
2. Inventory locations (rooms, cabinets, shelves, bins)
3. Receiving inventory
4. Consuming inventory
5. Transferring inventory between locations
6. Inventory adjustments
7. Physical inventory counts
8. Reorder-point visibility
9. Basic user roles
10. Audit history (ledger + master-data audit log)

## Dashboard (initial)

- Total active items
- Items below reorder point
- Recent inventory transactions
- Inventory by location
- Outstanding physical counts

## Design principles

- Fast inventory work over decorative dashboards
- Responsive sidebar navigation
- Accessible labels, focus states, and error messaging
- Clearly labeled demonstration seed data only — no fabricated production data

## Success criteria

- Quantity on hand is always derived from the transaction ledger
- Negative inventory is impossible for any role
- Authorization enforced by RLS and RPC — not UI hiding alone
- TypeScript strict, tested critical paths, documented setup
