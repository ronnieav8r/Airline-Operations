# Prompt 153: Crew Schedule Entry Foundation

## Summary

Implement the first controlled `CrewScheduleEntry` workflow inside an existing
schedule period. This slice adds manual draft-entry create/edit/cancel behavior
only. Schedule entries remain planning records and do not publish schedules,
generate legacy `CrewSchedule` rows, apply rotation patterns, review requests,
or mutate aircraft assignments.

## Implemented Scope

- Added draft `CrewScheduleEntry` create controls to
  `/crew/scheduling/periods/[periodId]`.
- Added edit controls for draft entries.
- Added cancel action that sets `status = CANCELLED` instead of deleting rows.
- Added validation for period, active crew member, date inside period, duty
  status, optional station, optional source request, optional active rotation
  pattern, optional start/end times, and duplicate unique-key conflicts.
- Added warning-only context for overlapping schedule entries, time off,
  existing simple `CrewSchedule` blocks, aircraft-block assignments, and missing
  qualifications.

## Boundaries Preserved

- No schedule publishing.
- No generated `CrewSchedule` bridge rows.
- No rotation-pattern expansion.
- No request approval workflow.
- No crew self-service portal.
- No duty/rest enforcement.
- No assignment automation.
- No aircraft crew assignment writes.
- No auth/signatures, release blocking, imports, provider integrations, or
  positioning/logistics implementation.

## Prompt 154 QA Target

- Validate create/edit/cancel for draft entries.
- Confirm duplicate entries show readable errors.
- Confirm warning-only context displays without blocking valid saves.
- Confirm no `CrewSchedule`, `AircraftCrewAssignment`, `CrewLegAssignment`,
  FlightLeg, release, import, auth, or provider behavior changes.
