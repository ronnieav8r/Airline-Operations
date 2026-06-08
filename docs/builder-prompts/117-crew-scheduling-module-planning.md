# Prompt 117: Crew Scheduling Module Planning

## Summary

Plan the broader Crew Scheduling module as a crew availability and planning
system, not as the active flight coverage source.

`AircraftCrewAssignment` remains the operational source of truth for aircraft
staffing and FlightLeg coverage. Crew Scheduling helps determine which crew
members are available and suitable for aircraft-block assignments.

Prompt 117 is docs/planning only.

## Key Decisions

- `AircraftCrewAssignment` remains the active coverage source for flights.
- Crew Scheduling manages crew availability, duty status, time off, training,
  reserve, and planning context.
- Crew Scheduling should feed recommendations or visibility for aircraft-block
  staffing, but should not automatically create, replace, or silently mutate
  aircraft assignments.
- `CrewLegAssignment` remains FlightLeg snapshot/evidence.
- Existing `CrewSchedule` and `TimeOffRequest` are planning primitives, not
  coverage truth.
- Qualification, duty/rest, and time-off conflicts remain warning-only until
  later policy slices.
- Use `/crew/scheduling` for the future crew availability planner to avoid
  confusing it with the existing FlightLeg `/scheduling` board.

## Prompt 118 Target

Implement a read-only `/crew/scheduling` planner board.

Minimum behavior:

- Show crew availability by day/window.
- Show crew member, base, duty status, scheduled duty block, time off, current
  aircraft-block assignment, and upcoming FlightLeg coverage.
- Surface warning-only planning conflicts: no schedule, time-off overlap,
  sick/vacation/training state, qualification warning, and aircraft-block
  coverage gaps.
- Link to `/aircraft/[aircraftId]/crew` for actual assignment changes.
- Do not mutate `CrewSchedule`, `TimeOffRequest`, `AircraftCrewAssignment`, or
  `CrewLegAssignment`.
- Do not add schema.

## Docs

- Add `docs/CREW_SCHEDULING_MODULE_PLAN.md`.
- Update `docs/PROJECT_STATUS.md`.
- Update `docs/SCHEMA_DECISIONS.md`.
- Update `docs/RELEASE_EVIDENCE_WORKFLOW_REVIEW.md`.

## Test Plan

Prompt 117 is docs/planning only.

For Prompt 118:

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/crew/scheduling`.
- Smoke-check `/crew`.
- Smoke-check `/scheduling`.
- Smoke-check `/aircraft`.
- Smoke-check `/operations-control`.
- Smoke-check `/api/health`.
- Smoke-check `/internal/flightleg-parity`.
- Smoke-check `/internal/flightleg-write-readiness`.

## Assumptions

- Crew Scheduling is a planning and availability module.
- Aircraft-block assignments remain the operational staffing record.
- Future automation may suggest or prefill `AircraftCrewAssignment` changes, but
  should not silently apply them.
- Legacy import work remains deferred.
