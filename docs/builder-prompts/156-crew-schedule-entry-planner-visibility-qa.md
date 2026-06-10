# Prompt 156: Crew Schedule Entry Planner Visibility QA

## Summary

Validate Prompt 155 planner visibility for `CrewScheduleEntry` rows on
`/crew/scheduling`.

## Static Validation

- `npm run prisma:validate`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.

The production build included `/crew/scheduling`,
`/crew/scheduling/periods`, and `/crew/scheduling/periods/[periodId]`.

## Runtime QA Status

Runtime route/browser QA is pending because Docker Desktop was not running in
this session. `npm run db:local:up` failed because the Docker Linux engine pipe
was unavailable.

When Docker is available, complete these checks:

- Open `/crew/scheduling`.
- Confirm crew with draft/published schedule-period entries show a "Period
  Entries" panel.
- Confirm the summary count for period entries reflects crew with visible
  entries.
- Confirm planner filters and grouping still work.
- Confirm period-entry links route back to
  `/crew/scheduling/periods/[periodId]#schedule-entries`.
- Confirm aircraft assignment and coverage behavior remains based on
  `AircraftCrewAssignment`, not schedule entries.

## Decision

Prompt 156 is a static QA pass with runtime QA pending. No product decision is
needed; the remaining gap is local Docker availability.
