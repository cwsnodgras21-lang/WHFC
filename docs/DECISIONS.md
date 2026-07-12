# Architecture Decision Log

Decisions are recorded with context and consequences. New decisions are appended — do not silently change prior entries.

---

## ADR-001: Single-clinic scope

**Status**: Accepted

**Context**: White House Family Care needs inventory for one clinic location.

**Decision**: No `organization_id`, multi-clinic tenancy, or tenant switching.

**Consequences**: Simpler RLS and data model. Multi-clinic would require a future ADR and migration.

---

## ADR-002: Transaction ledger for quantity on hand

**Status**: Accepted

**Context**: Inventory must be auditable and resistant to silent quantity corruption.

**Decision**: All quantity changes append rows to `inventory_transactions`. On-hand is computed, not stored mutably.

**Consequences**: Slightly more complex reads; strong audit trail and consistency.

---

## ADR-003: Prohibit negative inventory for all roles

**Status**: Accepted

**Context**: Clinic consumables should not show negative stock.

**Decision**: Database RPC functions reject any mutation that would result in on-hand &lt; 0. Administrators use adjustments or physical counts.

**Consequences**: Cannot "borrow" stock temporarily; corrections must be explicit.

---

## ADR-004: Public RPC + private inventory_ops schema

**Status**: Accepted

**Context**: `supabase.rpc()` requires exposed functions; internal helpers should not be callable from the client.

**Decision**:

- Application RPC entry points in `public` (or exposed `api` schema)
- Internal helpers in private `inventory_ops`
- Revoke direct ledger writes; grant EXECUTE on approved RPCs to `authenticated` only
- No service-role key for normal inventory operations

**Consequences**: Clear API boundary documented in SECURITY.md and ARCHITECTURE.md.

---

## ADR-005: Separate audit_log from inventory ledger

**Status**: Accepted

**Context**: MVP requires audit history for inventory and administration.

**Decision**:

- `inventory_transactions` = authoritative audit for all inventory movements
- `audit_log` = master-data and administration changes with before/after JSON
- No duplicate audit entries for inventory movements

**Consequences**: Two audit surfaces with distinct purposes; queries must use the correct table.

---

## ADR-006: Single stocking unit per item (MVP)

**Status**: Accepted

**Context**: Unit conversion adds complexity and error risk for MVP.

**Decision**: One `unit_of_measure_id` per item. All transactions, counts, reorder points, and par levels use that unit. No `pack_quantity` in MVP.

**Consequences**: Items stocked in multiple unit types need separate item records or a future ADR.

---

## ADR-007: Next.js 16 proxy.ts

**Status**: Accepted

**Context**: Next.js 16 renames middleware to proxy.

**Decision**: Use `src/proxy.ts` with `proxy()` and `export const config` for session refresh only.

**Consequences**: Authorization remains in Server Actions, RPC, and RLS — not in proxy.

---

## ADR-008: PHI exclusion by design

**Status**: Accepted

**Context**: Application tracks clinic consumables, not patients.

**Decision**: No PHI fields, no unrestricted notes, no attachments, constrained reason codes.

**Consequences**: Some operational detail must be encoded in enums rather than free text.

---

## ADR-009: Neutral clinical UI theme

**Status**: Accepted

**Context**: No clinic logo or brand package yet.

**Decision**: White/light gray surfaces, dark text, teal accent (`#0d7c8c`), tokens in CSS variables.

**Consequences**: Branding update is a token change, not a component rewrite.

---

## ADR-010: Manual first administrator

**Status**: Accepted

**Context**: Production admin must not come from seed scripts.

**Decision**: First user provisioned via Supabase Auth; role set manually in dashboard or SQL.

**Consequences**: Documented bootstrap step in SETUP.md.

---

## ADR-011: Hand-rolled UI primitives

**Status**: Accepted

**Context**: NolTurn preference for minimal dependencies; operational UI over decoration.

**Decision**: Tailwind + small local components in `src/components/ui`. No shadcn/ui in foundation.

**Consequences**: More initial component work in Stage 4; full control and smaller bundle.

---

## ADR-012: Vitest for unit tests

**Status**: Accepted

**Context**: Need automated tests for validation and actions without heavy E2E setup in early stages.

**Decision**: Vitest + Testing Library. Playwright/webapp-testing for E2E when workflows exist.

**Consequences**: Fast unit tests; browser E2E added per vertical slice.

---

## ADR-013: Lot & expiration tracking is ledger-derived

**Status**: Accepted

**Context**: The clinic's real supply sheet is largely an expiration tracker. We
need lot/expiration support without a second, drifting source of stock truth and
without adding friction for items that don't expire (office/cleaning supplies).

**Decision**: `inventory_lots` stores only immutable lot identity (item,
location, lot number, expiration date, received date, vendor). Per-lot quantity
on hand is **derived** from the ledger via a new nullable
`inventory_transactions.inventory_lot_id`, summed in the `inventory_lot_stock`
view — the same pattern as item/location on-hand. Negative stock is now blocked
at the lot level too. Tracking is opt-in per item via `items.track_expiration` /
`track_lot_number`; the app reveals expiration/lot fields only when set
(progressive disclosure). Consume and transfer apply FEFO (first-expiring,
first-out) automatically.

**Assumption (folded flags)**: The brief listed `default_expiration_required`
and a separate "lot required" flag. These are folded into the two boolean flags:
`track_expiration` gates "expiration required on receive" and `track_lot_number`
gates "lot required" (matches validation rule 11). This keeps data entry simple;
per-item nuance can be added later if a clinic needs it.

**Scope note**: Counting by lot exists at the DB/RPC level
(`upsert_physical_count_line_lot`, lot-attributed corrections in
`complete_physical_count`); surfacing it in the Physical Counts UI is deferred.

**Consequences**: One source of truth preserved; non-tracked flows are
behavior-identical; `consume_inventory` / `transfer_inventory` now return JSONB
(they may touch multiple lots).
