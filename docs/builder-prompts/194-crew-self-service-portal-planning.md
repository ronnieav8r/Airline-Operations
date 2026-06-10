# Prompt 194: Crew Self-Service Portal Planning

## Summary

Plan the first authenticated crew self-service portal. The portal should let
crew members view their own profile, published schedule context, time off,
schedule requests, assignments, and compliance warnings. Crew users must not
approve requests, publish schedules, change aircraft assignments, or mutate
logistics in this first portal chain.

## Key Decisions

- Route: `/crew/portal`.
- Required role: `CREW`.
- Crew identity source: `CrewMember.userId` linked to the current authenticated
  `User`.
- Portal scope: current crew member only.
- Admin/ops users continue using `/crew`, `/crew/scheduling`,
  `/crew/scheduling/periods`, `/crew/scheduling/time-off`, and aircraft crew
  assignment routes.
- Portal shell is read-only in Prompt 195.
- Crew request submission waits for Prompt 196.
- Crew role cannot approve or deny `CrewScheduleRequest` or `TimeOffRequest`.
- Crew role cannot publish schedule periods.
- Crew role cannot create, edit, end, or relieve `AircraftCrewAssignment`.
- Crew role cannot edit compliance records.
- Crew role cannot create logistics records in the first portal slice.

## Portal Content

Prompt 195 should show:

- Crew profile identity and employment/duty status.
- Base station and contact context.
- Published/finalized schedule context from linked `CrewSchedule` rows and
  published `CrewScheduleEntry` rows where available.
- Draft schedule entries as clearly labeled planning visibility only if shown.
- Time-off requests and statuses.
- `CrewScheduleRequest` rows and statuses.
- Current and upcoming aircraft-block assignments.
- Upcoming FlightLeg coverage inherited from aircraft-block assignments.
- Crew compliance warning summary.
- Links back to relevant read-only context where safe.

## Prompt 196 Target

Prompt 196 should add crew request submission:

- Crew can submit `CrewScheduleRequest` rows for their linked crew member.
- Crew can submit `TimeOffRequest` rows for their linked crew member.
- Crew cannot submit requests for another crew member.
- Crew cannot approve, deny, cancel, or publish.
- Submitted requests become admin/ops review inputs only.

## Boundaries

- No assignment changes by crew role.
- No request approvals by crew role.
- No schedule publishing by crew role.
- No logistics writes.
- No duty/rest hard enforcement.
- No file uploads.
- No provider integrations.
- No schema changes expected for Prompt 195.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB/browser smoke when Docker Desktop is available.
