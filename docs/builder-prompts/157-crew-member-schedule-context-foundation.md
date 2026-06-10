# Prompt 157: Crew Member Schedule Context Foundation

## Summary

Surface `CrewScheduleEntry` rows on `/crew/[crewMemberId]` as read-only
individual crew planning context. This helps ops see a crew member's period
schedule entries beside existing schedule blocks, time off, assignments,
qualifications, and upcoming FlightLeg coverage.

## Implemented Scope

- Added draft/published schedule-period entries to the crew-member context
  query for the active planning window.
- Added a summary count for period entries.
- Added a "Schedule Period Entries" section showing period, date, duty status,
  status, station, time range, optional pattern, notes, and period-detail link.
- Updated availability warnings so either a simple `CrewSchedule` block or a
  schedule-period entry counts as planning schedule context.

## Boundaries Preserved

- `AircraftCrewAssignment` remains operational coverage truth.
- Schedule entries remain planning records.
- No crew-member schedule writes.
- No schedule publishing.
- No generated `CrewSchedule` bridge rows.
- No rotation-pattern expansion.
- No request approval workflow.
- No aircraft assignment writes.
- No auth/signatures, release blocking, imports, provider integrations, or
  positioning/logistics implementation.

## Prompt 158 QA Target

- Confirm `/crew/[crewMemberId]` renders schedule-period entries when present.
- Confirm existing schedule blocks, time off, qualifications, assignments, and
  upcoming coverage still render.
- Confirm period-detail links route correctly.
- Confirm no operational coverage behavior changed.
