# Prompt 151: Rotation Pattern Admin QA

## Summary

Validate the Prompt 150 rotation pattern admin foundation. This QA slice is
documentation and verification only unless a defect is found.

## Scope

- Validate `/crew/scheduling/patterns` route generation and static build
  coverage.
- Validate pattern header create/edit, active toggle, and day-row
  add/update/delete behavior when local runtime QA is available.
- Confirm the workflow mutates only `CrewRotationPattern` and
  `CrewRotationPatternDay`.
- Confirm pattern application, schedule generation, schedule publishing,
  schedule requests, crew portal behavior, aircraft assignment automation,
  duty/rest enforcement, auth/signatures, imports, provider integrations, and
  positioning/logistics remain deferred.

## Validation Results

- `npm run prisma:validate`: passed.
- `npm run lint`: passed.
- `npm run build`: passed and included `/crew/scheduling/patterns` in the
  generated route list.
- `npm run typecheck`: passed after `npm run build` regenerated missing Next.js
  route metadata.
- `npm run db:local:up`: blocked because Docker Desktop was not running and the
  Docker Linux engine pipe was unavailable.

## Runtime QA Status

Runtime database and browser workflow QA is pending. The local Docker database
could not be started in this session because Docker Desktop was not running.

When Docker is available, complete these checks:

- Open `/crew/scheduling/patterns`.
- Create a rotation pattern.
- Edit the pattern name, description, cycle length, notes, and active state.
- Add, edit, and delete pattern day rows.
- Confirm duplicate keys and duplicate day numbers show readable errors.
- Confirm invalid day numbers, invalid duty statuses, invalid stations, and
  invalid time ranges are rejected.
- Confirm `/crew/scheduling`, `/crew/scheduling/periods`, and one
  `/crew/scheduling/periods/[periodId]` still link to rotation patterns.
- Confirm no `CrewSchedulePeriod`, `CrewScheduleEntry`, `CrewSchedule`,
  `CrewScheduleRequest`, `AircraftCrewAssignment`, or `CrewLegAssignment` rows
  are changed by the pattern admin workflow.

## Decision

Prompt 151 is a static QA pass with runtime QA pending. No product decision is
needed; the remaining gap is local Docker availability.
