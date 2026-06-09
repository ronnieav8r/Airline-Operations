# Prompt 121: Crew Availability Hints QA

## Summary

Validate the warning-only crew availability hints added to
`/aircraft/[aircraftId]/crew` in Prompt 120.

Prompt 121 is QA/docs only unless a defect is found.

## QA Scope

- Confirm `/aircraft/[aircraftId]/crew` renders the availability hints panel.
- Confirm the panel states that availability hints are warning-only.
- Confirm the page links to `/crew/scheduling` for the full planner.
- Confirm the crew selector shows availability status context.
- Confirm create assignment, edit assignment, and Relieve Now controls still
  render.
- Confirm `/crew/scheduling`, `/crew`, `/aircraft`, `/operations-control`,
  `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness` still load.
- Confirm no schema, save-rule, release-behavior, duty/rest, auth/signature,
  import, provider, or coverage-source changes were added.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local route smoke checks.
- Browser check for the aircraft crew assignment workflow.

## Status

QA complete. Local validation, route smoke, and browser checks passed. The
availability hints render, the full planner link works, and existing assignment
controls still render.
