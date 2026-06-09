# Prompt 135: Crew Scheduling Schema Foundation Planning

## Summary

Plan the additive database foundation for the full Crew Scheduling module. Add
new future scheduling tables beside the existing `CrewSchedule`; do not replace
or mutate current planner behavior yet.

Prompt 135 is docs/planning only. Prompt 136 should implement additive schema
only.

## Key Decisions

- Keep existing `CrewSchedule` as the current simple planner/availability row.
- Add richer future schedule tables beside it:
  - `CrewSchedulePeriod`: flexible monthly, quarterly, or custom scheduling
    period.
  - `CrewScheduleRequest`: unified period-scoped request/bid table for time
    off, work/off preferences, pattern requests, swaps, and notes.
  - `CrewRotationPattern`: reusable template header such as 7-on/7-off or
    8-on/6-off.
  - `CrewRotationPatternDay`: ordered day rows defining duty/off/reserve/
    training cycle behavior.
  - `CrewScheduleEntry`: draft/published period-scoped schedule row for one
    crew member.
- Use lifecycle enum: `BID_OPEN`, `DRAFTING`, `PUBLISHED`, `ARCHIVED`.
- Use request status enum: `SUBMITTED`, `APPROVED`, `DENIED`, `WITHDRAWN`.
- Use schedule entry status enum: `DRAFT`, `PUBLISHED`, `SUPERSEDED`,
  `CANCELLED`.
- Published schedule entries recommend availability only; they must not
  auto-create `AircraftCrewAssignment`.

## Prompt 136 Target

Implement additive schema only:

- Add new Prisma enums and models.
- Add nullable relations to `CrewMember`, `Station`, and `User` where
  appropriate.
- Add optional link from `CrewScheduleEntry` to generated/current
  `CrewSchedule` only if Prisma relation design is straightforward; otherwise
  document the bridge as deferred.
- Add indexes for period date ranges, crew member/date lookups, request status,
  and pattern activity.
- Add local seed/demo rows for one schedule period, one rotation pattern, and
  sample schedule entries if safe.
- Update `/api/health` counts for the new scheduling tables.

Do not add UI, writes, schedule publishing, crew portal behavior, auth,
duty/rest enforcement, assignment automation, positioning logistics, imports,
or provider integrations.

## Test Plan For Prompt 136

- `npm run prisma:validate`
- `npx prisma migrate dev --name crew-scheduling-schema-foundation`
- `npm run db:local:seed`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Confirm `/api/health` includes nonzero local counts after seed.
- Confirm existing routes still load: `/crew/scheduling`, `/crew`,
  `/crew/[crewMemberId]`, `/aircraft`, `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.

## Assumptions

- The existing `CrewSchedule` table remains in place and continues supporting
  current planner reads.
- The new scheduling tables are the future schedule-building foundation.
- Unified request modeling is preferred over separate request tables.
- Pattern templates use header plus ordered day rows, not JSON blobs.
- Prompt 135 and Prompt 136 do not implement schedule writes, time-off review,
  publishing, auth, assignment automation, duty/rest enforcement, or
  positioning logistics.
