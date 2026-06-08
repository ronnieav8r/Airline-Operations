# Prompt 114: Aircraft Crew Assignment Foundation

## Summary

Implement the first controlled aircraft-block crew assignment workflow.

This slice adds `/aircraft/[aircraftId]/crew` for create, limited edit, and
relieve/end actions on `AircraftCrewAssignment`. `AircraftCrewAssignment`
remains the active coverage source of truth. `CrewLegAssignment` remains a
FlightLeg snapshot/evidence table and is resynced after aircraft-block changes.

## Implemented Scope

- Added `/aircraft/[aircraftId]/crew`.
- Added create assignment form for crew member, seat role, start time, optional
  end time, and notes.
- Added limited edit forms for seat role, start/end time, and notes.
- Added Relieve Now for current active blocks.
- Added warning-only qualification and CPT/FO coverage messaging.
- Resynced future FlightLeg `CrewLegAssignment` snapshots after changes.
- Linked the workflow from `/aircraft` and `/aircraft/[aircraftId]`.

## Boundaries

- No schema changes.
- No duty/rest enforcement.
- No crew schedule import/apply behavior.
- No vacation/time-off enforcement.
- No leg-specific crew override source-of-truth change.
- No auth/signatures.
- No hard release blocking.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/aircraft`, `/aircraft/[aircraftId]`,
  `/aircraft/[aircraftId]/crew`, `/aircraft/[aircraftId]/airworthiness`,
  `/crew`, `/operations-control`, one `/operations-control/[flightLegId]`,
  `/flights`, `/scheduling`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.
- Browser-check create, edit, relieve/end, warning display, aircraft detail
  links, and coverage changes.

## Assumptions

- First crew write scope is aircraft-block staffing.
- `AircraftCrewAssignment` remains the current coverage source of truth.
- `CrewLegAssignment` remains a snapshot/evidence table.
- Qualification and coverage issues are warning-only during development.
