# Architecture

## Overview

WHFC Inventory is a single-clinic Next.js application backed by Supabase PostgreSQL. All inventory mutations flow through a transaction ledger. The application does not store mutable quantity-on-hand columns.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  React (App Router) · Tailwind · React Hook Form + Zod      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Next.js 16                                                  │
│  Server Components (reads) · Server Actions (writes)         │
│  src/proxy.ts — session refresh only                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ Supabase client (anon + user JWT)
┌───────────────────────────▼─────────────────────────────────┐
│  Supabase                                                    │
│  Auth · Postgres · RLS · public RPC functions                │
│  inventory_ops (private) — internal helpers                  │
└─────────────────────────────────────────────────────────────┘
```

## Clinic scope

Single White House Family Care clinic. **No** `organization_id`, multi-clinic support, or tenant switching. **Locations** are internal storage places (room, cabinet, shelf, bin).

## Layer responsibilities

### Proxy (`src/proxy.ts`)

Next.js 16 replacement for middleware. Used only for:

- Supabase session refresh
- Route-boundary behavior as needed

**Not** used for authorization decisions.

### Server Components

Read inventory views, lists, and dashboard aggregates. Use the server Supabase client with the user's session. RLS applies.

### Server Actions

Validate input with Zod, verify the authenticated user and role in application code, then call **approved public RPC functions**. Never use the service-role key for normal inventory operations.

### Database

- **Tables and views** in `public` with RLS enabled
- **Application RPC entry points** in `public` (or a deliberately exposed `api` schema)
- **Internal helpers** in private `inventory_ops` schema
- Direct `INSERT`/`UPDATE`/`DELETE` on `inventory_transactions` revoked from application roles
- `EXECUTE` granted only on approved RPCs to `authenticated` — not `anon`

## Exposed API boundary

| Surface | Access |
|---|---|
| `inventory_transactions` | SELECT via RLS; writes only through RPC |
| `inventory_on_hand` (view) | SELECT via RLS |
| `items_below_reorder_point` (view) | SELECT via RLS |
| `public.receive_inventory(...)` etc. | EXECUTE for `authenticated` with role checks inside |
| `inventory_ops.*` | No direct client access |

Documented in detail in [SECURITY.md](./SECURITY.md).

## Audit model

| Event type | Store |
|---|---|
| Receipts, consumption, transfers, adjustments, count corrections | `inventory_transactions` ledger (authoritative) |
| Item/location/category/UoM changes, reorder/par changes, user/role changes | `audit_log` with structured before/after JSON |

No duplicate audit rows for inventory movements.

## Theming

Design tokens live in `src/app/globals.css` (`@theme`) and `src/lib/theme/tokens.ts`. Components reference CSS variables so clinic branding can be applied later without rewrites.

## Folder layout

```
src/
  app/                 Routes and layouts
  components/
    ui/                Reusable primitives (Stage 4)
    shell/             Sidebar, topbar (Stage 4)
    inventory/         Domain forms and tables (Stage 4+)
  lib/
    supabase/          Server, browser clients (Stage 4)
    auth/              Session and role helpers (Stage 4)
    actions/           Server Actions (Stage 5+)
    validation/        Zod schemas (Stage 5+)
    theme/             Token references
  proxy.ts
supabase/
  migrations/          Stage 3
  seed/                Demo seed — Stage 3
tests/
docs/
```

## Deployment target

Vercel (planned). Environment variables documented in [SETUP.md](./SETUP.md).

## Related documents

- [DATA_MODEL.md](./DATA_MODEL.md)
- [INVENTORY_RULES.md](./INVENTORY_RULES.md)
- [SECURITY.md](./SECURITY.md)
- [USER_ROLES.md](./USER_ROLES.md)
