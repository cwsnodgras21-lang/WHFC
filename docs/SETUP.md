# Setup Guide

## Prerequisites

- Node.js 20+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional for Stage 3+, recommended)
- A **new** Supabase project for this application

## 1. Clone and install

```bash
cd "c:\Projects\White House Family Care"
npm install
```

## 2. Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Fill in values from your Supabase project (**Project Settings → API**):

| Variable | Required | Where used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and server Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser and server Supabase clients (publishable/anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bootstrap scripts and local demo seed only — **not** normal inventory RPCs |

**Never** commit `.env.local` or real keys.

## 3. Create a Supabase project and apply migrations

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a **new** project for WHFC Inventory
3. Copy the project URL and anon/publishable key into `.env.local`
4. Copy the service role key for server-only scripts (keep secret)
5. Apply database migrations (see below)

### Option A — Supabase CLI (recommended)

```bash
# Install CLI: https://supabase.com/docs/guides/cli/getting-started
supabase link --project-ref <your-project-ref>
supabase db push
```

For local development:

```bash
supabase start
supabase db reset    # applies migrations + demo seed
```

### Option B — SQL editor

Open the Supabase SQL editor and run each file in `supabase/migrations/` **in filename order**. See [supabase/README.md](../supabase/README.md) for the migration list.

### Demo seed (local / optional)

`supabase/seed/demo_seed.sql` loads **DEMO —** labeled reference data only. It does **not** create auth users, profiles, administrators, or inventory transactions.

With CLI: included automatically on `supabase db reset` when `[db.seed]` is enabled in `config.toml`.

To load seed on a remote project manually, run `demo_seed.sql` in the SQL editor after migrations.

### Generate TypeScript types (after migrations)

```bash
npx supabase gen types typescript --linked > src/lib/types/database.ts
```

The repository includes hand-maintained types until you regenerate.

## 4. Run locally (foundation)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The placeholder home page confirms the foundation build.

## 5. Verify tooling

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

All should pass after Stage 2.

## 6. Initial administrator (after Stage 3 migrations)

After the database schema exists:

1. Enable email auth in Supabase (**Authentication → Providers**)
2. Invite or sign up the first user
3. Confirm a `profiles` row exists for that user (created by trigger in Stage 3)
4. Set administrator role manually:

```sql
update public.profiles
set role = 'administrator', active = true
where id = '<auth-user-uuid>';
```

Run in the Supabase SQL editor. Do not commit user UUIDs.

## 7. Local Supabase (optional)

`supabase/config.toml` is included. For offline database development:

```bash
supabase start
supabase db reset   # applies migrations + demo seed
```

Local URLs and keys are printed by `supabase start`. Use them in `.env.local` for local development.

## 8. Demo seed

Demo seed data (`supabase/seed/demo_seed.sql`) is clearly labeled and separate from production migrations. It:

- Includes demonstration categories, units, vendors, locations, and items
- Does **not** include auth users, profiles, or production administrator credentials
- Does **not** include inventory transactions (those require authenticated profiles via RPC)

## 9. Cursor / AI development

Start chats with:

```text
Read all NolTurn AI standards files.

Act as the Architect agent first.

Do not code yet.

Task:
[describe task]
```

Project skills are listed in `skills-lock.json`. Plugin skills (`nextjs`, `supabase`, etc.) load automatically in Cursor.

## Troubleshooting

| Issue | Check |
|---|---|
| `npm run build` fails | Run `npm run typecheck` for TS errors |
| Supabase connection errors | Verify `.env.local` URL and anon key |
| Auth redirect loops (Stage 4+) | Verify `src/proxy.ts` session refresh wiring |
| RLS denies all rows (Stage 3+) | Confirm profile exists and `active = true` |

## Next stage

**Stage 4** adds Supabase clients, proxy session refresh, authentication UI, and the application shell. See [ARCHITECTURE.md](./ARCHITECTURE.md).
