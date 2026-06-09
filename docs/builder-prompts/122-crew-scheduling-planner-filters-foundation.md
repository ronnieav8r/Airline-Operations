# Prompt 122: Crew Scheduling Planner Filters Foundation

## Summary

Add URL-driven filters to `/crew/scheduling` so the read-only crew availability
planner is easier to scan.

## Scope

- Add server-rendered filters for availability, duty status, assignment state,
  time-off overlap, base station, and aircraft.
- Keep filters encoded in URL query params.
- Add active-filter summary and filtered result count.
- Keep the existing crew planner cards and links to
  `/aircraft/[aircraftId]/crew`.
- Add an empty state with a reset link when filters match no crew.

## Guardrails

- Do not add schema.
- Do not add schedule writes or time-off writes.
- Do not mutate `AircraftCrewAssignment` or `CrewLegAssignment`.
- Do not add duty/rest enforcement, assignment automation, auth/signatures,
  release blocking, imports, provider integrations, or file uploads.

## Test Plan

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke-check `/crew/scheduling` default view and representative filtered URLs.
- Confirm `/crew`, `/aircraft`, `/aircraft/[aircraftId]/crew`,
  `/operations-control`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness` still load.

## Status

Implementation complete. Filters are read-only and server-rendered from URL
query params.
