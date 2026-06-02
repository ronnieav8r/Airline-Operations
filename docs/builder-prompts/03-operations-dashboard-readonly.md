# Builder Prompt 03: Operations Dashboard Read-Only

You are building the third small slice of AeroOps Center.

Do not build the full app yet. This prompt is only for a read-only operations dashboard at `/`.

## Context

Read these files first:

- `README.md`
- `docs/SCHEMA_DECISIONS.md`
- `docs/builder-prompts/01-foundation-and-schema.md`
- `docs/builder-prompts/02-crew-resolution-api.md`
- `docs/builder-prompts/03-operations-dashboard-readonly.md`
- `prisma/schema.prisma`
- `lib/crew-resolution.ts`
- `app/page.tsx`

## Goal

Replace the basic database-count homepage with a practical read-only operations dashboard for Ops/Admin users.

This slice should make the first screen feel like the real app has started, while staying read-only and bounded.

## Required Work

1. Build a server-rendered dashboard at `/`.
2. Query real data through Prisma.
3. Use existing crew-resolution logic for coverage checks.
4. Show operationally useful seeded data if the database has been seeded.
5. Keep the UI quiet, dense, and ops-focused.
6. Ensure `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Dashboard Content

Include these sections:

- Top summary metrics:
  - Total flights today
  - Enroute flights
  - Delayed flights
  - Active alerts
  - Aircraft count
  - Crew count
- Today's flight board:
  - Scheduled departure time
  - Flight number
  - Route
  - Aircraft tail number
  - Status
  - Crew coverage indicator
- Coverage gaps:
  - Flights missing `CPT` or `FO`
  - Show missing roles clearly
- Active alerts:
  - Severity
  - Type
  - Title/message
  - Related flight or aircraft when available
- Fleet snapshot:
  - Counts by aircraft status

## Implementation Guidance

- Keep this as server-rendered data fetching for now.
- Mark the page dynamic so database reads happen at request time.
- Create small local helper functions if needed, but do not over-abstract.
- Prefer Prisma `select`/`include` to avoid loading unnecessary fields.
- Do not add client-side charts yet.
- Do not add mutation buttons yet.
- Do not add auth yet.
- Do not add navigation shell yet unless minimal and necessary.
- Do not add a design-system package.

## UI Direction

This is an operations app, not a marketing page.

Use:

- restrained colors
- compact cards or panels
- tabular numbers
- clear status badges
- readable tables
- mobile-friendly stacking

Avoid:

- hero sections
- decorative gradients
- large marketing copy
- placeholder feature descriptions
- fake data in UI when database data is available

## Empty Data Behavior

If the database is not seeded, show a clean empty state:

```text
No flights found for today.
Run `npm run prisma:seed` from the Render shell to load demo operations data.
```

Do not crash on empty tables.

## Acceptance Criteria

- `/` renders real dashboard data from Prisma.
- `/` still builds without needing local access to Render's private database.
- Coverage gaps use aircraft-based assignment logic from `lib/crew-resolution.ts`.
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build` passes.
- No mutation routes or forms are added.

## Final Response Expected From Builder

Report:

- files created/changed
- commands run
- validation/build/typecheck results
- assumptions made
- blockers requiring planner/user decision
