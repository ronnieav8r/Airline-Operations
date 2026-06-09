# Prompt 119: Crew Scheduling Planner QA

## Summary

Validate the read-only Crew Scheduling planner added in Prompt 118.

Prompt 119 is QA/docs only unless a defect is found.

## QA Scope

- Confirm `/crew/scheduling` renders the planner.
- Confirm the page shows crew availability, schedule blocks, time-off context,
  current aircraft-block assignments, upcoming FlightLeg coverage, and
  warning-only planning conflicts.
- Confirm planner links route to `/aircraft/[aircraftId]/crew` for actual
  staffing changes.
- Confirm `/crew`, `/scheduling`, `/aircraft`, `/operations-control`,
  `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness` still load.
- Confirm no schema, mutations, release behavior, coverage-source changes,
  duty/rest enforcement, auth/signatures, imports, or provider integrations were
  added.

## Validation

- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Status

QA complete. The planner renders locally, route smoke checks pass, and browser
QA confirms the main planner sections and aircraft crew workflow links.
