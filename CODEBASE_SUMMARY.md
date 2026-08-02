# WHFC Codebase Summary

## 1) Features / User-Facing Functions

### Pages/routes
- Dashboard (KPIs, charts, today's tasks)
- Item catalog + item detail + vendor sourcing per item
- Locations + location detail + printable QR codes
- Receive inventory / Consume inventory / Transfer inventory
- Transactions ledger (full audit trail)
- Physical counts (start, count lines, complete/cancel)
- Expiration Center + expiration history (lot-based, FEFO)
- Reorder report + reorder suggestions (dismiss/review workflow)
- Purchase order drafts (review, approve, order)
- Procedure kits (bundle-based multi-item dispensing, FEFO-aware)
- Dispense workflow + dispense history
- Medication samples module (receive, dispense, history, product catalog)
- Imaging Log (order tracking, status, authorization — non-clinical scheduling tracker)
- Administration: categories, units of measure, vendors, expiration settings, billing
- Admin > Modules (organization-level feature toggle admin)
- Auth: login (Supabase session)
- API routes: `/api/feedback` (posts to NolTurn Ops Hub), `/api/health`, Stripe checkout/portal/webhook

### Server Actions / RPCs (write path)
All writes go through Server Actions calling SECURITY DEFINER Postgres RPCs — never direct table inserts: `receive_inventory`, `consume_inventory`, `transfer_inventory`, `adjust_lot`, `dispose_lot`, `dispense_kit`, `start/upsert/complete/cancel_physical_count`, `receive_sample`, `dispense_sample`, `adjust_sample`, `create/update/set_status/set_authorization` for imaging orders, `record_activity`.

### Roles
administrator, inventory_manager, staff, medic, read_only — enforced via RLS.

---

## 2) Hardcoded / Client-Specific Items

- **"White House Family Care" name/branding** hardcoded in: `src/lib/constants.ts` (`APP_NAME`, `APP_SHORT_NAME`, `PACKAGE_NAME = "whfc-inventory"`), `brand-logo.tsx`, `sidebar.tsx`, landing page copy, layout metadata, login page comment.
- **Branding image assets** baked into `public/branding/` (WHFC logo, banner, mark).
- **Hardcoded single-tenant seed row**: `organizations` table seeded with fixed UUID `00000000-0000-0000-0000-000000000001`, `name = 'White House Family Care'`, `slug = 'default'` — despite the schema being multi-tenant-shaped (`organizations` / `organization_module_settings`), it's used as one hardcoded tenant.
- **Feedback route**: `APP_SLUG = "white-house-family-care"` hardcoded in `src/app/api/feedback/route.ts`, plus a default NolTurn URL.
- **Vendor coupling**: hard dependency on NolTurn's own infra (`nolturn.io`) for feedback and billing-events — not clinic-specific, but a baked-in third-party coupling.
- **Demo/seed data**: placeholder emails (`admin@example.clinic`, `medic@example.clinic`) and fixed demo UUIDs in `supabase/seed/*.sql`.
- **Default deployment URL**: `.env.example` defaults `NEXT_PUBLIC_SITE_URL=https://whfc-inventory.vercel.app`.
- Design docs explicitly frame this as single-clinic ("Five roles for a single White House Family Care clinic" in `docs/USER_ROLES.md`), even though the `organizations` tables exist.
- No hardcoded personal names, addresses, phone numbers, or PHI found — schema explicitly avoids free-form clinical notes per the data boundary rules.

---

## 3) Data Models

- **profiles** — extends `auth.users`; name, role, active flag
- **categories**, **units_of_measure**, **vendors** — reference/master data
- **items** — catalog: SKU, category, UOM, preferred vendor, reorder point, par level, expiration/lot tracking flags, pack quantity
- **locations** — internal storage locations (no room/shelf granularity after later migration)
- **inventory_transactions** — append-only ledger; type enum (RECEIVE/CONSUME/TRANSFER_IN/OUT/ADJUSTMENT_INC/DEC/PHYSICAL_COUNT_CORRECTION), qty, reason, actor, lot ref
- **audit_log** — admin/master-data change audit (before/after jsonb)
- **inventory_lots** + **inventory_lot_stock** (view) — lot/batch tracking, expiration status, derived on-hand qty
- **procedure_kits** / kit items — bundle definitions
- **dispense_events** — kit dispensing records
- **reorder_suggestions** — below-par workflow state
- **purchase_order_drafts** / draft lines — PO review/approve/order workflow
- **item_vendors** — per-item vendor pricing/lead-time ("vendor intelligence")
- **activity_events** — unified activity/audit log across modules
- **imaging_log** — imaging order tracking (status, authorization; no PHI — bounded `patient_reference`, no DOB/diagnosis)
- **sample_products**, **sample_events/transactions** — medication sample tracking
- **expiration_settings** — configurable expiration warning windows
- **organizations**, **organization_module_settings** — multi-tenant scaffold, per-org module capability toggles (currently single hardcoded org)
- **health_check** — healthcheck table
- Billing tables — app vendor's own Stripe subscription state (not clinic patient billing)
- Views: `inventory_on_hand`, `items_below_reorder_point`, `recent_inventory_transactions`, `reorder_report`, `items_stock_status`
- Key enums: `user_role`, `transaction_type`, `physical_count_status`, `reason_code`, `lot_status`, `activity_module`

> Note: `docs/DATA_MODEL.md` predates several later migrations (samples, imaging, organizations, billing, medic role) — the raw SQL migrations under `supabase/migrations/` are the current source of truth.

---

## 4) Tech Stack & Deployment

- **Framework**: Next.js 16.2.10 (App Router), React 19.2.4, TypeScript strict (`^5`), Tailwind CSS v4
- **Backend**: Supabase (Postgres 15, Auth, RLS, RPC/SECURITY DEFINER functions), `@supabase/supabase-js`, `@supabase/ssr`; 55 sequential migrations in `supabase/migrations`
- **Payments**: Stripe (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`) — vendor's own SaaS billing, not clinic billing
- **Other libs**: Zod (validation), React Hook Form, Recharts (dashboard charts), `qrcode` (location QR codes), Lucide icons, clsx/tailwind-merge
- **Testing**: Vitest + Testing Library + jsdom, extensive test suite mirroring `src/lib`
- **CI**: `.github/workflows/ci.yml` — lint → typecheck → test on PR/push to main; also automerge and branch-cleanup workflows. No deploy step in CI.
- **Deployment**: No Dockerfile/vercel.json in repo; implied Vercel deployment via `.env.example` default site URL, likely configured through Vercel's dashboard/project linking rather than IaC.
- **Required env vars**: Supabase URL/anon key/service role key, site URL, NolTurn feedback token/URL, Stripe keys (secret/webhook/publishable/price ID), NolTurn billing token/URL.
