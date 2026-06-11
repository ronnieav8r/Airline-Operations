# Prompt 246: Crew Portal Backend QA

## Summary

Complete backend QA for crew portal self-service boundaries. This slice adds a
focused developer smoke that verifies linked-crew request submission and no
restricted workflow side effects.

## Implementation

- Added `npm run smoke:crew-portal-backend`.

## Runtime QA Coverage

- Ensure smoke-test crew user exists and is linked to a `CrewMember`.
- Create portal-style pending `TimeOffRequest` for the linked crew member.
- Create portal-style submitted `CrewScheduleRequest` for the linked crew
  member.
- Verify crew-created requests have no review metadata.
- Verify crew portal behavior does not create or mutate restricted workflow
  records:
  - `AircraftCrewAssignment`,
  - `CrewScheduleEntry`,
  - `CrewSchedule`,
  - logistics records,
  - compliance records.

## Boundaries

- No schema changes.
- No new UI behavior.
- No crew approval behavior.
- No schedule publishing.
- No aircraft assignment mutation.
- No logistics or compliance admin writes.
- No duty/rest hard enforcement.
- No provider integrations, imports, signatures, or frontend polish.
