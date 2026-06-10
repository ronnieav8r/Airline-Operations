# Prompt 182: Schedule Publish/Finalize Planning

## Summary

Plan the first schedule period publish/finalize workflow before implementation.
The chosen model is conservative: publishing a period marks draft
`CrewScheduleEntry` rows as `PUBLISHED` and creates/updates linked
`CrewSchedule` bridge rows so current planner surfaces can keep reading the
simple availability table.

Publishing schedules does not create, replace, or end aircraft-block crew
assignments.

Prompt 182 is planning-only.

## Key Decisions

- Publish route stays under existing schedule period detail:
  `/crew/scheduling/periods/[periodId]`.
- Publishing is ops/admin only.
- Publishing changes planning availability records only:
  - `CrewSchedulePeriod.status = PUBLISHED`.
  - `CrewSchedulePeriod.publishedAt = now`.
  - `CrewSchedulePeriod.publishedById = current user`.
  - Eligible `CrewScheduleEntry.status = PUBLISHED`.
  - Eligible `CrewScheduleEntry.publishedAt = now`.
  - Eligible `CrewScheduleEntry.publishedById = current user`.
  - Each published entry creates or updates one linked `CrewSchedule` row.
  - `CrewScheduleEntry.generatedCrewScheduleId` stores that bridge link.
- Publishing should be idempotent:
  - If an entry already has `generatedCrewScheduleId`, update that bridge row.
  - If an entry is already `PUBLISHED`, leave it published and keep its bridge
    row aligned.
  - Do not duplicate `CrewSchedule` rows for repeated publish attempts.
- `CANCELLED` entries are ignored.
- `SUPERSEDED` entries remain historical and are ignored.
- Draft entries with missing required fields should fail with a readable error
  rather than partially publishing.

## Validation And Warning Policy

Prompt 183 should validate:

- Period exists.
- Period is not `ARCHIVED`.
- Period has at least one publishable `DRAFT` or already `PUBLISHED` entry.
- Entry dates are inside the period.
- Entry end time is after start time when both are present.
- Crew member exists and is active.

Prompt 183 should warn but not block for:

- Time-off overlap.
- Existing schedule block overlap.
- Existing aircraft-block assignment overlap.
- Missing or expired qualification/compliance evidence.
- Duty/rest candidate conflicts.

Because warnings are not blockers yet, Prompt 183 can surface warning copy on
the page and proceed with publish if the structural validation passes.

## Prompt 183 Target

Implement publish foundation:

- Add a `Publish schedule period` action on `/crew/scheduling/periods/[periodId]`.
- Protect the action with `ADMIN`/`OPS`.
- In one Prisma transaction:
  - Load the period and entries.
  - Validate publishability.
  - For each publishable entry, create or update its linked `CrewSchedule` row.
  - Mark entries `PUBLISHED`.
  - Mark the period `PUBLISHED`.
- Revalidate `/crew/scheduling`, `/crew/scheduling/periods`,
  `/crew/scheduling/periods/[periodId]`, and affected crew detail routes.
- Do not add unpublish, approval, crew portal, request review, pattern
  application, aircraft assignment mutation, duty/rest enforcement, imports, or
  provider integrations.

## Prompt 184 QA Target

- Validate idempotent publish behavior.
- Confirm `CrewSchedule` bridge rows are created/updated once.
- Confirm planner and crew detail show published availability.
- Confirm aircraft assignments are unchanged.
- Confirm warning-first behavior remains.

## Assumptions

- `CrewScheduleEntry` is the richer schedule-building record.
- `CrewSchedule` remains the compatibility/current planner availability row.
- Publishing means "finalized for planning visibility," not legal duty/rest
  compliance certification.
- Published schedules recommend availability only.

