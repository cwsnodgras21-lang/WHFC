# NolTurn Project Rules

This project is only for NolTurn initiatives.

## Approved stack

- Node.js
- Next.js
- TypeScript
- Supabase
- Vercel

## Do not suggest or reference

- Quickbase
- DCS
- employer systems
- unrelated client systems
- Salesforce, unless explicitly requested for a NolTurn initiative

## Engineering preferences

- Keep solutions simple
- Prefer boring, readable code
- Use TypeScript intentionally
- Avoid unnecessary abstractions
- Avoid unnecessary dependencies
- Prefer server-side logic for sensitive operations
- Use environment variables for secrets
- Never expose service role keys to the browser
- Explain database/schema changes before creating them
- Prefer Supabase RLS for access control
- Handle loading, empty, and error states
- Make mobile usable by default

## Before coding

The assistant must provide:
- affected files
- proposed implementation
- database impact
- security concerns
- assumptions

## Before completion

The assistant must provide:
- changed files
- verification steps
- risks
- rollback notes
