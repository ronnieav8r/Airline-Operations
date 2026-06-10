# Prompt 155: Crew Schedule Entry Planner Visibility Foundation

## Summary

Surface `CrewScheduleEntry` rows on `/crew/scheduling` as read-only planning
availability context. This makes manual draft schedule entries visible beside
existing simple `CrewSchedule` blocks without changing operational coverage
truth.

## Implemented Scope

- Added draft/published `CrewScheduleEntry` rows to the crew scheduling planner
  query for the active planner window.
- Added a planner summary count for crew members with schedule-period entries.
- Added a per-crew "Period Entries" panel showing date, duty status, entry
  status, station, optional rotation pattern, and a link back to the schedule
  period detail.
- Updated the no-schedule warning so schedule-period entries count as planning
  context.

## Boundaries Preserved

- `AircraftCrewAssignment` remains operational coverage truth.
- Existing `CrewSchedule` blocks remain visible.
- Schedule entries remain planning records.
- No schedule publishing.
- No generated `CrewSchedule` bridge rows.
- No rotation-pattern expansion.
- No request approval workflow.
- No aircraft assignment writes.
- No auth/signatures, release blocking, imports, provider integrations, or
  positioning/logistics implementation.

## Prompt 156 QA Target

- Confirm `/crew/scheduling` renders schedule-period entries when present.
- Confirm planner filters/grouping continue to work.
- Confirm planner links back to schedule-period detail.
- Confirm aircraft assignment and coverage behavior is unchanged.
