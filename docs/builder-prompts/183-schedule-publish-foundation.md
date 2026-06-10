# Prompt 183: Schedule Publish Foundation

## Summary

Implement the first crew schedule publishing workflow. Publishing is a planning
and availability finalization action only: it marks eligible
`CrewScheduleEntry` rows and the parent `CrewSchedulePeriod` as `PUBLISHED`,
then creates or updates linked `CrewSchedule` bridge rows so the current crew
planner can read the finalized availability.

## Scope

- Add a protected publish action on `/crew/scheduling/periods/[periodId]`.
- Require `ADMIN` or `OPS`.
- Publish only non-archived schedule periods.
- Require at least one draft or already-published schedule entry.
- Validate entry date, time order, and active crew membership before publish.
- Create one linked `CrewSchedule` row per eligible entry when none exists.
- Update the linked `CrewSchedule` row when publishing is repeated.
- Mark entries `PUBLISHED`, set `publishedAt`, set `publishedById`, and store
  `generatedCrewScheduleId`.
- Mark the period `PUBLISHED`, set `publishedAt`, and set `publishedById`.
- Keep the workflow idempotent for repeated publish attempts.
- Revalidate the schedule period, planner, period list, and affected crew
  detail pages.

## Non-Goals

- Do not create, replace, or end `AircraftCrewAssignment` rows.
- Do not hard-enforce duty/rest or qualification conflicts.
- Do not review `CrewScheduleRequest` rows.
- Do not apply rotation patterns.
- Do not add unpublish behavior.
- Do not add schema.

## Implementation Notes

Published `CrewScheduleEntry` remains the richer planning record. `CrewSchedule`
is a compatibility bridge for current planner and crew context reads until a
later planner cutover decides whether to read published entries directly.

Publishing does not mean a crew member is assigned to an aircraft. Operational
coverage remains explicit through `AircraftCrewAssignment`.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local route/workflow smoke for `/crew/scheduling/periods`,
  `/crew/scheduling/periods/[periodId]`, `/crew/scheduling`, `/crew`,
  `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.

## Status

Implemented in Prompt 183. Static validation passed. DB-backed runtime workflow
smoke is pending when Docker Desktop is available.
