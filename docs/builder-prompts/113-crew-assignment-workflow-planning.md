# Prompt 113: Crew Assignment Workflow Planning

## Summary

Plan the first controlled crew assignment write workflow using aircraft-block
assignments first.

Keep `AircraftCrewAssignment` as the active source of truth for coverage, keep
`CrewLegAssignment` as a FlightLeg snapshot/evidence table, and keep
qualification/duty/rest issues warning-only for now.

## Key Decisions

- Prompt 113 is docs/planning only.
- Prompt 114 should add `/aircraft/[aircraftId]/crew` as the first
  aircraft-block crew assignment write surface.
- Add links from `/aircraft/[aircraftId]` and `/aircraft` into the aircraft
  crew assignment workflow.
- Use `AircraftCrewAssignment` writes for create, limited edit, and end/relieve
  actions.
- After aircraft-block changes, resync affected future `CrewLegAssignment`
  snapshots for FlightLegs assigned to that aircraft.
- Keep qualification issues warning-only.
- Do not add schema, auth/signatures, hard release blocking, crew schedule
  imports, duty/rest enforcement, vacation/time-off enforcement, leg-specific
  crew overrides, provider integrations, file uploads, AI behavior, or new
  release policy.

## Prompt 114 Target

- Add a read/write aircraft crew workflow under `/aircraft/[aircraftId]/crew`.
- Show current and upcoming aircraft-block crew assignments by seat role.
- Create assignment fields:
  - Crew member.
  - Seat role.
  - Start time.
  - Optional end time.
  - Notes.
- Edit limited assignment fields:
  - Seat role.
  - Start time.
  - End time.
  - Notes.
- Add a Relieve Now or End Assignment action that closes an active block.
- Validate required IDs, active crew member, valid seat role, end after start,
  and no exact duplicate block.
- Warn, but do not block, for missing/expired qualification and CPT/FO coverage
  gaps.
- Resync future FlightLeg `CrewLegAssignment` snapshots for affected aircraft
  assignments.
- Keep current coverage APIs reading through the legacy Flight bridge and
  aircraft-block logic.

## Future Crew Scheduling Module

Crew Scheduling should be planned later as a broader module for:

- Crew schedules.
- Days off.
- Vacation and time-off.
- Duty/rest.
- Schedule import/apply workflows.
- Eventually feeding aircraft-block assignments and/or FlightLeg crew
  assignments.

Prompt 114 should not implement this broader scheduler. It should only add the
first narrow aircraft-block staffing workflow.

## Prompt 115 QA Target

- Confirm `/aircraft/[aircraftId]/crew` renders current and future crew blocks.
- Create a crew assignment and confirm `/aircraft`, `/aircraft/[aircraftId]`,
  `/crew`, `/flights`, `/scheduling`, and `/operations-control` reflect updated
  coverage.
- Edit and end/relieve an assignment and confirm coverage updates.
- Confirm warnings display for missing/expired qualifications but do not block
  saves.
- Confirm `CrewLegAssignment` snapshots resync for affected future FlightLegs.
- Confirm `/internal/flightleg-parity` remains clean or documents expected
  warning-only deltas.
- Confirm no duty/rest enforcement, schedule import, auth/signature, release
  blocking, or leg-specific override behavior was added.

## Test Plan

Prompt 113 is docs/planning only.

For Prompt 114 and Prompt 115:

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/aircraft`.
- Smoke-check `/aircraft/[aircraftId]`.
- Smoke-check `/aircraft/[aircraftId]/crew`.
- Smoke-check `/aircraft/[aircraftId]/airworthiness`.
- Smoke-check `/crew`.
- Smoke-check `/operations-control`.
- Smoke-check one `/operations-control/[flightLegId]`.
- Smoke-check `/flights`, `/scheduling`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.
- Browser-check create, edit, relieve/end, warning display, aircraft detail
  links, and coverage changes.

## Assumptions

- First crew write scope is aircraft-block staffing, not full crew scheduling.
- `AircraftCrewAssignment` remains the current coverage source of truth.
- `CrewLegAssignment` remains a snapshot/evidence table until a later
  read-migration or override slice.
- Warnings are acceptable during development; they are not legal/compliance
  signoff.
- Legacy import work remains deferred.
