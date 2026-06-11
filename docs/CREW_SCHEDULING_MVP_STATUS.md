# Crew Scheduling MVP Status

Last updated: 2026-06-11

## Status

Crew Scheduling backend is MVP-complete for the current planning/availability
product boundary.

Implemented backend capabilities:

- Read-only crew availability planner at `/crew/scheduling`.
- URL-driven planner filters, grouping, and date-window controls.
- Crew detail scheduling context at `/crew/[crewMemberId]`.
- Schedule period admin list and detail routes.
- Schedule period create, edit, and archive workflows.
- Manual draft `CrewScheduleEntry` create, edit, and cancel workflows.
- Rotation pattern admin with reusable header and ordered day rows.
- Rotation pattern preview and draft-entry generation.
- Schedule period publish/finalize workflow that creates linked
  `CrewSchedule` bridge rows.
- Period-scoped `CrewScheduleRequest` review workflow.
- Approved request-to-draft generation support.
- Admin/ops time-off request create/review workflow.
- Crew portal request submission for linked crew users.
- Runtime smoke coverage for:
  - schedule publishing,
  - rotation pattern generation,
  - request and time-off review,
  - crew portal backend boundaries.

## MVP Boundaries

- Crew Scheduling answers who appears available, where, and under what schedule
  constraints.
- `AircraftCrewAssignment` remains the operational aircraft staffing record.
- `CrewScheduleEntry` and `CrewSchedule` are planning/availability records.
- Published schedules may inform aircraft crew assignment, but do not create,
  replace, or end aircraft assignments.
- Conflict handling remains warning-only.
- Crew portal users may submit requests but may not approve requests, publish
  schedules, mutate aircraft assignments, or manage logistics/compliance.

## Current Validation

Runtime QA passed for:

- `npm run smoke:schedule-publishing`
- `npm run smoke:rotation-patterns`
- `npm run smoke:crew-requests-time-off`
- `npm run smoke:crew-portal-backend`
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

Static validation passed:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Deferred Post-MVP

- Schedule import/apply execution.
- Pairing/trip construction.
- Automated assignment recommendations.
- Silent aircraft assignment creation or replacement.
- Duty/rest hard enforcement.
- Legal signatures.
- Provider integrations.
- Crew logistics automation.
- File uploads.
- Major frontend/UI polish.
