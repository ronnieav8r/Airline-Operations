# Prompt 185: Rotation Pattern Application Planning

## Summary

Plan the first workflow that uses a `CrewRotationPattern` to generate
`CrewScheduleEntry` rows. The selected approach is **preview first, then draft
generation**. Applying a pattern creates draft schedule entries only; it does
not publish schedules, create `CrewSchedule` bridge rows, review requests, or
assign crew to aircraft.

## Key Decisions

- Pattern application lives on `/crew/scheduling/periods/[periodId]`.
- Use existing active `CrewRotationPattern` and `CrewRotationPatternDay` rows.
- Use existing `CrewScheduleEntry` as the output table.
- Generated rows must be `DRAFT`.
- Generated rows must set `rotationPatternId`.
- Generated rows may set station and duty status from the pattern day row.
- Generated rows should preserve source request linkage only when a later
  request-to-draft helper explicitly supplies it; not in the first pattern
  application workflow.
- Pattern preview must be available before writing generated rows.
- Publishing remains a separate explicit action after draft review.
- `AircraftCrewAssignment` remains the operational coverage source and must not
  be mutated.

## Prompt 186 Target: Pattern Application Preview

Add a read-only preview form on schedule period detail.

Minimum behavior:

- Select crew member.
- Select active rotation pattern.
- Select start date.
- Select optional end date or occurrence count.
- Show generated draft-entry preview rows without saving.
- Show warning-only conflicts for duplicate existing entries, time-off overlap,
  simple `CrewSchedule` overlap, aircraft-block assignment overlap, inactive
  crew, and out-of-period dates.
- Do not write any rows.
- Do not publish.
- Do not mutate aircraft assignments.

## Prompt 187 Target: Pattern Generate-Drafts Foundation

Add the explicit write action after preview.

Minimum behavior:

- Require `ADMIN` or `OPS`.
- Validate period, active crew member, active pattern, date window, and pattern
  day rows.
- Create only `DRAFT` `CrewScheduleEntry` rows.
- Skip or reject exact duplicates using a readable message; chosen policy for
  Prompt 187 should be **skip duplicates and report count** if practical,
  otherwise fail cleanly before partial writes.
- Keep conflicts warning-only except invalid input and duplicate uniqueness.
- Do not create `CrewSchedule` bridge rows.
- Do not publish the period or entries.
- Do not review requests.
- Do not mutate `AircraftCrewAssignment`.

## Prompt 188 QA Target

- Preview a pattern for a crew member and date range.
- Generate draft entries.
- Confirm generated rows are `DRAFT` and linked to the pattern.
- Confirm duplicate generation is idempotent or fails cleanly without partial
  duplicate writes.
- Confirm publish remains separate.
- Confirm planner and crew detail show draft planning context.
- Confirm no `CrewSchedule` bridge rows are created until publish.
- Confirm no `AircraftCrewAssignment` rows are created, replaced, or ended.

## Test Plan For Prompts 186-188

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB/browser smoke when Docker Desktop is available.
- Route smoke for `/crew/scheduling/periods/[periodId]`,
  `/crew/scheduling/patterns`, `/crew/scheduling`, `/crew/[crewMemberId]`,
  `/aircraft`, `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.

## Assumptions

- Pattern application is a scheduling convenience, not assignment automation.
- Generated entries are planning records until a human publishes the period.
- Duty/rest and qualification conflicts remain warning-only.
- Crew requests and swaps remain deferred until the CrewScheduleRequest
  workflow slices.
