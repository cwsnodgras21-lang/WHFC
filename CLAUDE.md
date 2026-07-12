@AGENTS.md

# White House Family Care Inventory

Consumable supplies inventory for a single White House Family Care clinic location.

## Stack (locked)

- Next.js 16 (App Router) + TypeScript strict — `proxy.ts` replaces `middleware.ts`
- Supabase (Postgres, Auth, RLS, RPC)
- Tailwind CSS v4 — tokens in `src/app/globals.css` and `src/lib/theme/tokens.ts`
- Zod, React Hook Form, Vitest

## Commands

- `npm run dev` — local development
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run test` — Vitest

## Documentation

See `docs/` for PRD, architecture, data model, inventory rules, security, roles, decisions, and setup.
