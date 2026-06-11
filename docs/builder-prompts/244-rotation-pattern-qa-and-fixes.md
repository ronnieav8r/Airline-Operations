# Prompt 244: Rotation Pattern QA And Fixes

## Summary

Complete DB-backed runtime QA for rotation pattern draft generation. This slice
adds a focused developer smoke that uses the same generation helper as the app
action and verifies draft-only generation, duplicate skipping, and unchanged
aircraft assignment counts.

## Implementation

- Extracted rotation-pattern draft generation into
  `lib/crew-schedule-pattern-generation.ts`.
- Updated the existing app action to use the shared helper.
- Added `npm run smoke:rotation-patterns`.

## Runtime QA Coverage

- Create a schedule period.
- Create a two-day rotation pattern.
- Generate four draft `CrewScheduleEntry` rows.
- Verify generated rows stay `DRAFT`, link to the pattern, and do not create
  `CrewSchedule` bridge rows before publish.
- Run generation again and verify exact duplicates are skipped.
- Verify `AircraftCrewAssignment` row count does not change.

## Boundaries

- No schema changes.
- No new UI behavior.
- No schedule publishing in this smoke.
- No automatic aircraft assignment.
- No duty/rest hard enforcement.
- No provider integrations, imports, signatures, or frontend polish.
