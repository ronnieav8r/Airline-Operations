# Prompt 243: Schedule Period And Publishing QA

## Summary

Complete DB-backed runtime QA for schedule period publishing. This slice adds a
focused developer smoke that uses the same publish helper as the app action and
verifies idempotency, `CrewSchedule` bridge creation, and unchanged aircraft
assignment counts.

## Implementation

- Extracted schedule publishing into `lib/crew-schedule-publishing.ts`.
- Updated the existing period publish action to use the shared helper.
- Added `npm run smoke:schedule-publishing`.

## Runtime QA Coverage

- Create a schedule period.
- Create a draft `CrewScheduleEntry`.
- Publish the period through the shared publish helper.
- Verify the entry and period become `PUBLISHED`.
- Verify a linked `CrewSchedule` bridge row is created.
- Publish again and verify idempotency.
- Verify `AircraftCrewAssignment` row count does not change.

## Boundaries

- No schema changes.
- No new UI behavior.
- No automatic aircraft assignment.
- No duty/rest hard enforcement.
- No provider integrations, imports, signatures, or frontend polish.
