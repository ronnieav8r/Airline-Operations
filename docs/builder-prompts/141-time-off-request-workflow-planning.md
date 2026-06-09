# Prompt 141: Time-Off Request Workflow Planning

## Summary

Plan the first ops/admin time-off workflow inside Crew Scheduling. Use the
existing `TimeOffRequest` table directly, keep the workflow development/admin
only until auth exists, and keep all conflict handling warning-only.

Approval updates only `TimeOffRequest`. It must not create or mutate
`CrewSchedule`, `CrewScheduleEntry`, aircraft assignments, crew leg snapshots,
release records, or release readiness behavior.

## Key Decisions

- First route: `/crew/scheduling/time-off`.
- First data model: existing `TimeOffRequest`.
- First users: ops/admin only; crew self-service waits for auth and crew portal
  planning.
- First behavior: create requests, review pending requests, approve, deny, and
  cancel.
- Conflict policy: warning-only for overlapping approved/pending time off,
  current/future aircraft-block assignments, existing schedule blocks, and
  coverage gaps.
- Approval side effects: no schedule writes. Approved time off already appears
  in planner availability context.
- Broader `CrewScheduleRequest` remains reserved for future schedule-period
  bidding, preferences, swaps, and pattern requests.

## Prompt 142 Target

Implement the ops/admin `TimeOffRequest` workflow at
`/crew/scheduling/time-off`.

Minimum behavior:

- Add navigation links from `/crew/scheduling`, `/crew`, and
  `/crew/[crewMemberId]`.
- Show a request queue grouped by `PENDING`, `APPROVED`, `DENIED`, and
  `CANCELLED`.
- Add a create form with crew member, request type, start date/time, end
  date/time, and optional reason.
- Add review actions for pending requests: approve, deny, cancel.
- Add cancel action for approved requests entered in error or no longer valid.
- Keep `requestedById` and `reviewedById` null until auth exists.
- Set `reviewedAt` when approved, denied, or cancelled through review.
- Validate required crew member, request type, start/end dates, active crew
  member, and end after start.
- Show warning-only conflicts before create/review; do not block saves except
  invalid required data.

## Boundaries

- Do not add schema.
- Do not add auth or crew self-service.
- Do not mutate `CrewSchedule` or `CrewScheduleEntry`.
- Do not mutate `AircraftCrewAssignment` or `CrewLegAssignment`.
- Do not add assignment automation, duty/rest enforcement, imports, provider
  integrations, release blocking, or release behavior changes.

## Prompt 143 QA Target

- Create a pending vacation request and confirm it appears on
  `/crew/scheduling/time-off`, `/crew/scheduling`, and `/crew/[crewMemberId]`.
- Approve, deny, and cancel requests; confirm statuses and `reviewedAt`.
- Confirm warnings display for overlapping time off, schedule blocks, and
  aircraft assignments but do not block actions.
- Confirm no `CrewSchedule`, `CrewScheduleEntry`, `AircraftCrewAssignment`, or
  `CrewLegAssignment` rows are created or changed by time-off review.
- Smoke-check `/crew/scheduling/time-off`, `/crew/scheduling`, `/crew`, one
  `/crew/[crewMemberId]`, `/aircraft`, `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.

## Test Plan For Prompt 142/143

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local browser workflow check for create, approve, deny, cancel, warning-only
  conflict visibility, and unchanged planner/crew detail display.

## Assumptions

- Prompt 141 is planning-only.
- The first workflow is admin-entered/admin-reviewed because auth and crew login
  do not exist yet.
- `TimeOffRequest` remains simple absence tracking.
- `CrewScheduleRequest` remains reserved for future schedule-period bidding and
  preference workflows.
- Time-off conflicts remain operational warnings, not hard enforcement.
