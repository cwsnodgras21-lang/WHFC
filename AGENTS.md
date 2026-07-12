<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WHFC Inventory — Agent Instructions

Read NolTurn standards before coding:

- `.ai/AGENTS.md` — agent roles
- `.ai/PROJECT_RULES.md` — stack and preferences
- `.ai/NOLTURN_WORKFLOW.md` — workflow
- `.ai/DEFINITION_OF_DONE.md` — completion criteria
- `.cursor/rules/nolturn.mdc` — always-on rules

## Application

**White House Family Care Inventory** (`whfc-inventory`) tracks ordinary consumable clinic supplies. It is **not** a patient, medication, pharmacy, or medical-record system.

## Strict data boundary

Do **not** collect, store, display, transmit, or infer protected health information or patient information. Do not add unrestricted notes or attachment fields. Consumption is recorded only as aggregate inventory quantity changes.

## Stack

- Next.js 16 App Router + TypeScript (strict)
- Tailwind CSS v4
- Supabase (Auth, Postgres, RLS)
- Zod + React Hook Form
- Vitest for tests

## Conventions

- **Proxy** (`src/proxy.ts`): Supabase session refresh and route-boundary behavior only — not authorization.
- **Reads**: Server Components via `src/lib/supabase/server.ts` (Stage 4).
- **Writes**: Server Actions calling approved **public RPC functions** — never direct `inventory_transactions` inserts from the app.
- **No service-role key** for normal inventory operations.
- **Single clinic** — no organization tenancy or multi-clinic architecture.
- **Negative inventory** is prohibited for all roles at the database level.
- Handle loading, empty, error, and success states on every screen.

## Before coding

Provide affected files, implementation plan, database impact, security concerns, and assumptions.

## Before finishing

Provide changed files, verification steps, risks, and rollback notes.
