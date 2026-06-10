# Prompt 186: Pattern Application Preview

## Summary

Add a read-only pattern application preview to schedule period detail. The
preview shows which draft `CrewScheduleEntry` rows would be generated from an
active `CrewRotationPattern`, but it does not save rows, publish schedules,
review requests, or mutate aircraft assignments.

## Key Changes

- Add a URL-driven preview form on `/crew/scheduling/periods/[periodId]`.
- Select active crew member.
- Select active rotation pattern.
- Select start date.
- Select optional end date or number of days.
- Generate preview rows from pattern day rows.
- Show duty status, time window, station, and cycle day for each preview row.
- Show warning-only conflicts for:
  - existing schedule entry duplicate,
  - other same-day schedule entry,
  - pending/approved time-off overlap,
  - existing `CrewSchedule` overlap,
  - aircraft-block assignment overlap,
  - missing qualifications,
  - out-of-period dates.

## Boundaries

- No rows are written.
- No `CrewScheduleEntry` rows are created.
- No `CrewSchedule` bridge rows are created.
- No period or entry publish behavior is changed.
- No `AircraftCrewAssignment` rows are created, replaced, or ended.
- No request review, duty/rest enforcement, auth changes, imports, provider
  integrations, or release behavior changes.

## Prompt 187 Target

Add the explicit generate-drafts action after preview:

- Require admin/ops.
- Validate selected period, active crew member, active pattern, date window, and
  pattern day rows.
- Create only `DRAFT` `CrewScheduleEntry` rows.
- Link generated rows to `rotationPatternId`.
- Skip exact duplicates and report count if practical, otherwise fail cleanly
  before partial writes.
- Do not publish.
- Do not create `CrewSchedule` bridge rows.
- Do not mutate aircraft assignments.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local browser smoke when Docker Desktop is available.

## Status

Implemented in Prompt 186. Static validation passed. DB-backed runtime/browser
smoke is pending when Docker Desktop is available.
