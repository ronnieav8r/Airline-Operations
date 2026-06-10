# Prompt 152: Crew Schedule Entry Planning

## Summary

Plan the first controlled workflow for `CrewScheduleEntry`. Use the existing
additive schedule-entry table to let ops/admin users manually create and edit
draft schedule rows inside a schedule period. This remains crew availability
planning only. It must not publish schedules, apply rotation patterns, create
legacy `CrewSchedule` rows, or change aircraft assignments.

## Key Decisions

- First workflow location: `/crew/scheduling/periods/[periodId]`.
- First write scope: manual `DRAFT` `CrewScheduleEntry` create/edit/cancel for
  one schedule period.
- `CrewScheduleEntry` remains future schedule-building data, not operational
  aircraft coverage truth.
- `AircraftCrewAssignment` remains the operational source for aircraft staffing
  and FlightLeg coverage.
- `CrewSchedule` remains the current simple planner/availability row until a
  separate publish/finalize workflow decides how generated rows should bridge
  back to it.
- `rotationPatternId` and `sourceRequestId` may be selected manually when
  helpful, but pattern expansion and request approval remain deferred.
- `generatedCrewScheduleId`, `publishedAt`, and `publishedById` remain null in
  this first workflow.
- Schedule-entry conflicts are warning-only: overlapping entries, approved or
  pending time off, existing simple `CrewSchedule` blocks, aircraft-block crew
  assignments, and qualification issues should not block saves.

## Prompt 153 Target

- Add schedule-entry create controls to the existing schedule-period detail
  route.
- Add edit and cancel controls for existing draft schedule entries.
- Validate required period, crew member, date, and duty status.
- Validate optional station, source request, and rotation pattern IDs.
- Validate optional start/end datetimes and require end after start when both
  are provided.
- Reject duplicate entries that conflict with the existing unique key:
  `[periodId, crewMemberId, date, dutyStatus]`.
- Restrict edits to `DRAFT` entries. Do not edit `PUBLISHED`,
  `SUPERSEDED`, or `CANCELLED` entries in this workflow.
- Cancel by setting status to `CANCELLED`; do not delete schedule entries.
- Keep `createdById`, `publishedById`, and `publishedAt` null until auth and
  publishing are separately planned.
- Show warning-only context for overlapping schedule entries, time off, simple
  schedule blocks, aircraft-block assignments, and qualification gaps.
- Preserve existing schedule-period summary, requests, patterns, and entry
  read-only context.

## Prompt 154 QA Target

- Create a draft schedule entry inside a schedule period.
- Edit its crew member, duty status, station, date/time, source request,
  rotation pattern, and notes.
- Cancel a draft entry and confirm it remains visible as cancelled history.
- Confirm duplicate entries produce readable errors.
- Confirm warning-only conflicts display but do not block valid saves.
- Confirm no `CrewSchedule`, `AircraftCrewAssignment`, `CrewLegAssignment`,
  FlightLeg, release, import, auth, or provider behavior changes.

## Boundaries

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

## Test Plan For Prompt 153

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local workflow smoke on `/crew/scheduling/periods/[periodId]`.
- Route smoke for `/crew/scheduling/periods`, `/crew/scheduling/patterns`,
  `/crew/scheduling`, `/crew`, `/aircraft`, `/operations-control`,
  `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.

## Assumptions

- The current schema is sufficient for the first draft-entry workflow.
- Draft schedule entries are planning records only.
- Published schedules and generated simple planner rows require a later
  publish/finalize planning slice.
- Schedule entries may inform aircraft staffing decisions, but they must not
  silently create or replace aircraft-block assignments.
