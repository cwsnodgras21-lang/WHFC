# White House Family Care Inventory

**WHFC Inventory** tracks ordinary consumable supplies for White House Family Care — gloves, paper products, cleaning supplies, office supplies, disposable medical supplies, and general clinic consumables.

This is **not** a patient, medication, pharmacy, clinical, or medical-record application.

---

## Protected health information boundary

**This application must not collect, store, display, transmit, or infer protected health information (PHI) or patient information.**

Do not create fields for patient names, medical record numbers, dates of birth, appointments, diagnoses, treatments, insurance information, prescriptions, or patient-specific consumption.

Do not create unrestricted notes fields or attachment fields that could encourage users to enter patient information.

Consumption is recorded only as **aggregate inventory quantity changes** through the transaction ledger.

See [docs/SECURITY.md](./docs/SECURITY.md) for the full security model.

---

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Row Level Security)
- Zod + React Hook Form

Built to [NolTurn engineering standards](https://github.com/nolturn).

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in after creating a Supabase project
npm run dev                    # http://localhost:3000
```

Full setup: [docs/SETUP.md](./docs/SETUP.md)

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |

---

## Project structure

```
src/
  app/              Next.js App Router pages and layouts
  components/       UI, shell, and domain components (Stage 4+)
  lib/              Supabase clients, validation, actions, theme
  proxy.ts          Session refresh only (Next.js 16)
supabase/           Migrations and seed (Stage 3+)
docs/               Product and engineering documentation
tests/              Vitest tests
.ai/                NolTurn agent standards
.cursor/            Cursor rules and project skills
templates/          NolTurn prompt templates
```

---

## Documentation

| Document | Description |
|---|---|
| [docs/PRD.md](./docs/PRD.md) | Product requirements |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture |
| [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) | Database entities |
| [docs/INVENTORY_RULES.md](./docs/INVENTORY_RULES.md) | Ledger and quantity rules |
| [docs/SECURITY.md](./docs/SECURITY.md) | PHI boundary, RLS, RPC API |
| [docs/USER_ROLES.md](./docs/USER_ROLES.md) | Roles and permissions |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | Architecture decision log |
| [docs/SETUP.md](./docs/SETUP.md) | Environment and Supabase setup |

---

## Initial administrator

The first user is created or invited through Supabase Auth. An administrator must manually set `profiles.role` to `administrator` in the Supabase dashboard or via documented SQL. Seed data does not create production administrator accounts.

---

## License

Private — White House Family Care / NolTurn Solutions.
