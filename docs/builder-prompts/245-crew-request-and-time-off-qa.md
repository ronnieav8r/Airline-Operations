# Prompt 245: Crew Request And Time-Off QA

## Summary

Complete DB-backed runtime QA for schedule request review and time-off review.
This slice adds a focused developer smoke that verifies review metadata,
statuses, and absence of schedule/assignment side effects.

## Implementation

- Added `npm run smoke:crew-requests-time-off`.

## Runtime QA Coverage

- Create submitted `CrewScheduleRequest` rows.
- Approve and deny schedule requests.
- Verify reviewed metadata and status persistence.
- Create pending `TimeOffRequest` rows.
- Approve, deny, and cancel time-off requests.
- Verify reviewed metadata and status persistence.
- Verify no `CrewSchedule`, `CrewScheduleEntry`, or
  `AircraftCrewAssignment` rows are created or changed by these review actions.

## Boundaries

- No schema changes.
- No new UI behavior.
- No schedule publishing.
- No pattern generation.
- No automatic aircraft assignment.
- No duty/rest hard enforcement.
- No provider integrations, imports, signatures, or frontend polish.
