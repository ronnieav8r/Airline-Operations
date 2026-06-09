# Prompt 120: Crew Availability Hints On Aircraft Assignment Workflow

## Summary

Add read-only crew availability hints to `/aircraft/[aircraftId]/crew` so an
operator can see schedule, time-off, duty, employment, qualification, and
active-assignment context before creating aircraft-block assignments.

## Scope

- Extend the aircraft crew workflow query with existing `CrewSchedule`,
  `TimeOffRequest`, `AircraftCrewAssignment`, duty/employment, and
  qualification context.
- Add a warning-only availability hints panel near the create assignment form.
- Add availability status to crew selector labels.
- Link back to `/crew/scheduling` for the full read-only planner.
- Preserve existing create, edit, and Relieve Now behavior.

## Guardrails

- Do not add schema.
- Do not block saves based on availability hints.
- Do not mutate `CrewSchedule` or `TimeOffRequest`.
- Do not replace `AircraftCrewAssignment` as the operational coverage source.
- Do not add duty/rest enforcement, auth/signatures, hard release blocking,
  imports, provider integrations, file uploads, or automated recommendations.

## Test Plan

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke-check `/aircraft/[aircraftId]/crew`, `/crew/scheduling`, `/crew`,
  `/aircraft`, `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.

## Status

Implementation complete. Availability hints are display-only and assignment
save rules remain unchanged.
