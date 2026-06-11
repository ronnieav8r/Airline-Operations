# Prompt 249: Crew Logistics Workflow QA

## Summary

Complete DB-backed runtime QA for the crew-scoped logistics workflow. This
slice adds a focused developer smoke for location and logistics-need
create/update behavior and verifies no schedule, assignment, release, or
duty/rest side effects.

## Implementation

- Added `npm run smoke:crew-logistics-workflow`.

## Runtime QA Coverage

- Create and update a `CrewLocationRecord`.
- Create and update one `CrewLogisticsNeed` for each MVP type:
  - positioning,
  - deadhead,
  - airline ticket,
  - hotel,
  - ground transport,
  - other.
- Verify status transitions and provider/confirmation placeholders persist.
- Verify context links can reference crew, station, aircraft, and FlightLeg
  rows when available.
- Verify logistics writes do not mutate `CrewSchedule`, `CrewScheduleEntry`,
  `AircraftCrewAssignment`, `FlightRelease`, `CrewDutyPeriod`, or
  `CrewRestPeriod` counts.

## Boundaries

- No schema changes.
- No new UI behavior.
- No provider integration or live booking.
- No expense workflow.
- No crew self-service logistics writes.
- No schedule mutation.
- No aircraft assignment mutation.
- No release behavior changes.
- No duty/rest hard enforcement.
