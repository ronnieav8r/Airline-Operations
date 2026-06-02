# Builder Prompt 04: App Shell Navigation

You are building the fourth small slice of AeroOps Center.

Do not build the full app yet. This prompt is only for a simple application shell and placeholder routes.

## Context

Read these files first:

- `README.md`
- `docs/SCHEMA_DECISIONS.md`
- `docs/builder-prompts/03-operations-dashboard-readonly.md`
- `docs/builder-prompts/04-app-shell-navigation.md`
- `app/layout.tsx`
- `app/page.tsx`

## Goal

Add a persistent operations app shell so the dashboard feels like part of a real internal tool and future page slices have stable navigation.

This slice should add navigation and route placeholders only. Do not build page functionality beyond simple read-only placeholders.

## Required Work

1. Add a persistent header or sidebar layout around the app.
2. Add navigation links for:
   - Dashboard: `/`
   - Flights: `/flights`
   - Aircraft: `/aircraft`
   - Crew: `/crew`
   - Scheduling: `/scheduling`
3. Add placeholder pages for the non-dashboard routes.
4. Preserve the existing read-only dashboard at `/`.
5. Keep the UI compact, operational, and mobile-friendly.
6. Ensure `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## UI Direction

This is an internal operations tool.

Use:

- restrained colors
- clear active or current-route styling when feasible
- compact header/sidebar spacing
- mobile-friendly wrapping or stacking
- consistent page titles

Avoid:

- marketing copy
- hero sections
- decorative gradients
- large empty cards
- fake page functionality

## Implementation Guidance

- Prefer using the existing `app/layout.tsx` for the shell.
- If active-route styling requires a client component, create a small component under `app` or `components`.
- Keep placeholder pages static and simple.
- Do not add authentication yet.
- Do not add CRUD forms.
- Do not add mutation routes.
- Do not add deployment changes.
- Do not change the Prisma schema.

## Acceptance Criteria

- Navigation is visible on all app pages.
- `/`, `/flights`, `/aircraft`, `/crew`, and `/scheduling` render.
- Dashboard data remains live and dynamic.
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build` passes.

## Final Response Expected From Builder

Report:

- files created/changed
- commands run
- validation/build/typecheck results
- assumptions made
- blockers requiring planner/user decision
