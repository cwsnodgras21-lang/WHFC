# Security

## Protected health information boundary

**This application must not collect, store, display, transmit, or infer protected health information (PHI) or patient information.**

### Prohibited data

- Patient names, MRNs, dates of birth
- Appointments, diagnoses, treatments
- Insurance information, prescriptions
- Patient-specific consumption

### Prohibited patterns

- Unrestricted `notes` or `comments` text fields
- File attachments on inventory records
- Free-text `reason_code` values

Consumption is aggregate quantity change only.

This boundary must appear in README, onboarding, and code review checklists.

## Authentication

- Supabase Auth (email/password for MVP)
- Session managed via `@supabase/ssr`
- `src/proxy.ts` refreshes sessions — **not** authorization

## Authorization layers

Authorization is enforced at **every** layer. UI hiding buttons is insufficient.

| Layer | Responsibility |
|---|---|
| Proxy | Session refresh only |
| Server Actions | Zod validation, active profile, role check before RPC |
| Server Components | Role-aware data fetching; rely on RLS |
| Public RPC functions | Re-validate user, active profile, role; call helpers |
| RLS policies | Row-level read/write restrictions |
| GRANT/REVOKE | Block direct ledger writes; grant EXECUTE on approved RPCs only |

## Exposed API boundary

### Public schema (client-accessible via PostgREST)

- **Tables**: RLS enabled on all tables
- **Views**: `security_invoker = true` where supported so RLS applies to view reads
- **RPC functions**: Approved inventory operations exposed in `public` (or `api`)

### Private `inventory_ops` schema

- Internal helper functions
- Not exposed to PostgREST
- Called only from public RPCs or triggers

### Grants (MVP pattern)

```sql
-- Conceptual — exact statements in Stage 3 migrations
REVOKE INSERT, UPDATE, DELETE ON inventory_transactions FROM authenticated;
REVOKE ALL ON inventory_transactions FROM anon;

GRANT EXECUTE ON FUNCTION public.receive_inventory(...) TO authenticated;
-- Repeat for each approved RPC only

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA inventory_ops FROM PUBLIC, authenticated, anon;
```

**Never** grant RPC execution to `anon`.

## SECURITY DEFINER functions

When used:

- `SET search_path = ''`
- Fully qualified object names only
- Minimal privilege — validate caller identity and role inside the function
- Prefer `SECURITY INVOKER` for RLS-respecting reads

## Service role key

`SUPABASE_SERVICE_ROLE_KEY` is **server-only** and documented for:

- Bootstrap/admin scripts
- Local demo seed (clearly labeled)

**Not** used for normal inventory receive/consume/transfer/adjust operations. Those use the authenticated user's JWT via RPC.

## Role storage

Roles live in `profiles.role` — not in user-editable `user_metadata`. RLS and RPC functions read from `profiles`, not JWT metadata claims.

## Initial administrator

Manually provisioned:

1. Create or invite user in Supabase Auth
2. Set `profiles.role = 'administrator'` via dashboard or documented SQL

No production admin in seed data.

## Audit

- Inventory movements: `inventory_transactions` (immutable ledger)
- Master data / admin: `audit_log` with `before_state` / `after_state` JSON

## Secrets

- Never commit `.env.local` or real keys
- `.env.example` documents required variables only
- No `NEXT_PUBLIC_` prefix on service role key

## Related documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system layers
- [USER_ROLES.md](./USER_ROLES.md) — role permissions
- [INVENTORY_RULES.md](./INVENTORY_RULES.md) — ledger write path
