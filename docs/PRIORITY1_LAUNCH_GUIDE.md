# Priority 1 Launch Guide

Covers everything added for the Priority 1 launch enhancements: procedure kit
gaps, variable dosage presets, the Samples module, the Medic role, in-app
help, configurable expiration settings, and vendor/reorder configuration.
For the base app setup (env vars, first migration pass), see
[SETUP.md](./SETUP.md). For the full role matrix, see
[USER_ROLES.md](./USER_ROLES.md).

## 1. Environment setup

No new environment variables were introduced by this work — everything below
runs on the existing `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Email
notifications were explicitly out of scope for this pass, so there is no
email-provider configuration to set up.

## 2. Database migrations

Seven new migrations, `20260730120001` through `20260730120007` (listed with
one-line descriptions in [supabase/README.md](../supabase/README.md)). Apply
them the same way as any other migration in this repo:

```bash
# Local dev
supabase start
supabase db reset      # applies all migrations + demo seed

# Remote
supabase link --project-ref <your-project-ref>
supabase db push
```

After applying, regenerate types so the hand-maintained `database.ts` stays
in sync with the live schema:

```bash
npx supabase gen types typescript --linked > src/lib/types/database.ts
```

Two migrations (`20260730120001_medic_role_enum.sql` and
`20260730120005_samples_activity_module.sql`) each add a single Postgres enum
value in their own file — this is required because a new enum value cannot be
referenced in the same transaction that adds it. Apply them in filename
order like every other migration; nothing else to do.

## 3. Role setup — Medic

The `medic` role is a limited clinical role for part-time staff. See
[USER_ROLES.md](./USER_ROLES.md#medic) for the full capability list. To
provision one:

1. Have the person sign up through the app's normal auth flow (they land as
   `read_only` by default).
2. As an administrator, set their role in **Administration** (module
   settings screen references still route through the same `profiles.role`
   column), or directly:
   ```sql
   update public.profiles set role = 'medic' where id = '<their-auth-uuid>';
   ```

There is currently no dedicated "manage users" screen in the app (role
changes are made directly against `profiles.role`, per the note in
[USER_ROLES.md](./USER_ROLES.md)) — this predates this work and is a known
gap, not something this pass changed.

## 4. Procedure kit setup (including adjustable dosage)

1. **Administration is not required for kit editing** — any administrator or
   inventory manager can go to **Procedure Kits → New kit**.
2. Fill in name, category, default location, and optional **Instructions**
   (shown to staff before they dispense — keep it operational, no patient
   information).
3. Add components. For a fixed-quantity component, set quantity and unit.
   For an **adjustable** (variable-dose) component:
   - Set the administered-amount label and unit (e.g. "Administered amount",
     "mg")
   - Choose **concentration** (`administered / concentration_amount *
     concentration_volume`) or **multiplier** (`administered * multiplier`)
   - Optionally set up to 8 **dosage presets** (e.g. `0.25, 0.5, 1.0`) —
     staff see these as one-tap quick-select buttons on the Dispense page
4. Use **Move up / Move down** to control display order.
5. Save. The kit appears on `/dispense` immediately (no separate publish
   step).

Decimal precision: component/administered-amount columns are `numeric` with
no fixed scale, so microdoses (e.g. 0.02 mL) are stored exactly — see
`tests/dispense/calculate.test.ts` for coverage of this.

## 5. Samples module workflow

The Samples module is its own top-level nav section (Dashboard → **Samples**,
**Receive Samples**, **Give Sample**), not folded into Items.

1. An administrator or inventory manager adds sample products at
   **Samples → Manage products** (name, manufacturer/vendor, strength,
   dosage form, unit, representative-contact threshold, optional
   expiration-warning override).
2. Staff record receipts at **Receive Samples** — product, quantity, lot
   number, expiration date, vendor or representative name.
3. Any clinical role (administrator, inventory manager, staff, or medic)
   records a dispense at **Give Sample** — product, quantity, and a
   **patient reference** (MRN or initials only — the form enforces a 64
   character cap and rejects a blank value; never enter a full name).
4. **Samples → History** shows receipts and dispenses, filterable by
   product and patient reference, with a Print button (the app's existing
   `window.print()` export convention — there is no CSV export elsewhere in
   the app to match, so this was kept consistent rather than introducing a
   new export format).

Quantity math mirrors the existing item ledger exactly: `sample_transactions`
is an append-only ledger, RLS narrows staff/medic to their own rows (same
pattern as `inventory_transactions`), and `dispense_sample` is a single
`SECURITY DEFINER` RPC that validates available stock (including a specific
lot when picked, or FEFO-selects one automatically) before writing — a
dispense either fully succeeds or fails with no partial write.

## 6. Receiving / stock / count workflows

Unchanged by this work except for the Medic role's access (Medic can use
stock and dispense, but not receive, transfer, or run counts — see the
[permission matrix](./USER_ROLES.md#permission-matrix-mvp)). Each of these
pages now has a **Help** button next to its heading with page-specific
step-by-step guidance — that's the fastest way to get oriented without
reading this document.

## 7. Expiration configuration

Three-level precedence, resolved once in the database views so every
consumer (dashboard, expiration center, alerts, reorder logic) agrees:

```
item / sample-product override  →  category override (items only)  →  organization default  →  90 days (hard fallback)
```

- Organization defaults: **Administration → Expiration settings** (separate
  defaults for inventory items and for samples).
- Category override: edit a category, set **Expiration warning override**;
  leave blank to inherit the organization default.
- Item / sample-product override: same pattern on the item or sample
  product form; leave blank to inherit.

The precedence is applied inside the `inventory_lot_stock`, `sample_lot_stock`,
and `sample_product_stock` views (`coalesce(...)` chains), so no application
code recomputes it — see `resolveExpirationWarningDays` in
[src/lib/data/items-page.ts](../src/lib/data/items-page.ts) for the one place
it's also expressed in TypeScript (for display purposes) and
`tests/expiration/precedence.test.ts` for coverage.

## 8. Vendor & reorder configuration

Administrators/inventory managers can now also set, per vendor:
**free-shipping / order minimum** (`vendors.shipping_minimum`), and per
item-vendor sourcing relationship: **active/inactive** and **minimum order
quantity**. The Reorder Suggestions table's Vendor column now shows lead
time and the shipping minimum, and links to the vendor's ordering URL when
one is set.

Two separate reorder calculators still exist side by side (pre-existing,
not changed by this work): **Reorder Suggestions** (usage-based, richer) and
**Reorder Report** (simple par-vs-on-hand, supports grouping by vendor or
category in its own UI). Vendor lead-time/shipping-minimum surfacing was
added to Reorder Suggestions only.

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| New migration errors "enum value already exists" | You're re-running a migration that already applied — migrations aren't meant to be re-run individually; use `supabase db reset` (local) or check `supabase migration list` (remote) |
| Medic user can't see Dispense/Give Sample | Confirm `procedure_kits` / `samples` modules are enabled in Module settings — Medic still respects module gating |
| Samples nav item missing | Same as above — check **Administration → Module settings → Samples** |
| Expiration status doesn't reflect a new default | Confirm you edited the *organization* default (Administration → Expiration settings) and not a stale local value; the view recomputes on every read, there's no cache to bust |
| `dispense_sample` / `dispense_kit` fails with `insufficient_*_stock` | Expected — check the message for `available=` / `requested=` and adjust; this is atomic validation, not a bug |
| TypeScript errors after pulling this branch | Run `npm run typecheck`; if it's about `database.ts`, regenerate types per §2 |

## 10. Launch checklist

- [ ] Apply migrations `20260730120001`–`20260730120007` (§2)
- [ ] Regenerate `src/lib/types/database.ts` from the live schema
- [ ] Run `npm run typecheck && npm run lint && npm run test && npm run build` — all green
- [ ] Enable the `samples` module (Administration → Module settings) if it should be on for this clinic
- [ ] Set organization-level expiration defaults (Administration → Expiration settings)
- [ ] Add at least one sample product before staff try to receive samples
- [ ] Provision at least one `medic` account for part-time clinical staff, if applicable (§3)
- [ ] Spot-check the Help button on Dashboard, Items, Samples, and Give Sample
- [ ] Confirm Medic sign-in shows only: Dashboard, Items (view), Use stock, Dispense, Give sample, Transactions (own)
- [ ] Confirm a non-medic, non-admin role (Staff) still cannot reach Administration or Reorder Suggestions/Report

## Assumptions and known gaps

- **No user-administration screen exists in the app** (predates this work).
  Role changes are made directly in `profiles.role`. Building that screen
  was not in scope for this pass.
- **Vendor grouping in Reorder Suggestions** is informational (vendor name,
  lead time, shipping minimum, ordering link per row) rather than a
  sectioned/grouped table view. The Reorder Report already supports
  grouping by vendor as a UI option, pre-existing.
- **Sample export** uses the existing print-to-PDF convention
  (`window.print()`), since that is the only export pattern present
  anywhere in the app — there is no CSV export to match.
- **Configurable expiration thresholds** are resolved for the "expiring
  soon" flag and every alert/notification-adjacent consumer. The fixed
  7/30/60/90-day *display buckets* used for browsing/grouping in the
  Expiration Center and reorder-suggestion detail views were left as
  informational groupings rather than rewritten to be threshold-driven —
  they're a browsing convenience, not the expiration/alert determination
  itself.
