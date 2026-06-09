# Prompt 126: Crew Planner Cross-Link Polish

## Summary

Add consistent navigation links into the read-only crew planner and aircraft
crew assignment workflow.

## Scope

- Add planner shortcut links from `/crew`, `/aircraft`,
  `/aircraft/[aircraftId]`, and `/aircraft/[aircraftId]/crew`.
- Use aircraft-filtered planner URLs where the source page has aircraft
  context.
- Keep existing aircraft crew assignment workflow links visible.
- Use consistent labels: `Crew planner` for the read-only planner and
  `Manage crew` or `Crew assignment` for the aircraft-block write workflow.

## Guardrails

- Do not add schema.
- Do not add schedule writes or time-off writes.
- Do not mutate aircraft crew assignments or FlightLeg crew snapshots.
- Do not add duty/rest enforcement, assignment automation, auth/signatures,
  release blocking, imports, provider integrations, or file uploads.

## Test Plan

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke-check `/crew`, `/crew/scheduling`, `/aircraft`,
  `/aircraft/[aircraftId]`, `/aircraft/[aircraftId]/crew`,
  `/operations-control`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.
- Browser-check the new planner links.

## Status

Implementation complete. Cross-links are navigation-only.
