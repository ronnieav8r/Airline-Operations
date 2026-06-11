# Crew Scheduling QA Log

Last updated: 2026-06-10

## Prompt 242: Runtime QA Plan

### Result

Planning complete. The DB-backed runtime QA chain is documented in
`docs/CREW_SCHEDULING_RUNTIME_QA_PLAN.md`.

### Planned Runtime QA Slices

- Prompt 243: schedule period and publishing QA.
- Prompt 244: rotation pattern preview/generate QA and clear fixes.
- Prompt 245: crew request and time-off QA.
- Prompt 246: crew portal backend QA.
- Prompt 247: docs/status refresh.

### Boundary

The QA chain must verify scheduling behavior without adding schema,
assignment automation, duty/rest hard enforcement, provider integrations,
imports, signatures, or frontend polish.

## Prompt 243: Schedule Period And Publishing QA

### Result

Runtime QA passed locally.

### Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run db:local:up`: pass.
- `npm run db:local:migrate`: pass.
- `npm run db:local:seed`: pass.
- `npm run smoke:schedule-publishing`: pass.
- `npm run smoke:workflows`: pass.
- `npm run smoke:app`: pass.
- `npm run smoke:browser`: pass.

### Verified Behavior

- A draft `CrewScheduleEntry` publishes into a linked `CrewSchedule` bridge row.
- The parent period is marked `PUBLISHED`.
- Re-running publish keeps the same bridge row and published timestamps.
- Publishing does not mutate `AircraftCrewAssignment` row counts.

## Prompt 244: Rotation Pattern QA And Fixes

### Result

Runtime QA passed locally. No runtime bug fixes beyond shared-helper extraction
were required.

### Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run db:local:up`: pass.
- `npm run db:local:migrate`: pass.
- `npm run db:local:seed`: pass.
- `npm run smoke:rotation-patterns`: pass.
- `npm run smoke:workflows`: pass.
- `npm run smoke:app`: pass.
- `npm run smoke:browser`: pass.

### Verified Behavior

- Pattern generation creates draft `CrewScheduleEntry` rows only.
- Generated rows link to the selected rotation pattern.
- Generated rows do not create `CrewSchedule` bridge rows before publish.
- Re-running generation skips exact duplicate rows.
- Pattern generation does not mutate `AircraftCrewAssignment` row counts.

## Prompt 245: Crew Request And Time-Off QA

### Result

Runtime QA passed locally.

### Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run db:local:up`: pass.
- `npm run db:local:migrate`: pass.
- `npm run db:local:seed`: pass.
- `npm run smoke:crew-requests-time-off`: pass.
- `npm run smoke:workflows`: pass.
- `npm run smoke:app`: pass.
- `npm run smoke:browser`: pass.

### Verified Behavior

- Submitted schedule requests can be approved and denied with review metadata.
- Pending time-off requests can be approved, denied, and cancelled with review
  metadata.
- Request and time-off review do not create `CrewSchedule` bridge rows.
- Request and time-off review do not create `CrewScheduleEntry` rows.
- Request and time-off review do not mutate `AircraftCrewAssignment` row counts.

## Prompt 246: Crew Portal Backend QA

### Result

Runtime QA passed locally.

### Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run db:local:up`: pass.
- `npm run db:local:migrate`: pass.
- `npm run db:local:seed`: pass.
- `npm run smoke:crew-portal-backend`: pass.
- `npm run smoke:workflows`: pass.
- `npm run smoke:app`: pass.
- `npm run smoke:browser`: pass.

### Verified Behavior

- The crew smoke user is linked to one `CrewMember`.
- Crew portal-style time-off submissions remain pending and linked to the crew
  user.
- Crew portal-style schedule requests remain submitted and linked to the crew
  user.
- Crew portal submissions do not add review metadata.
- Crew portal submissions do not mutate aircraft assignments, schedule entries,
  schedule bridge rows, logistics records, or compliance records.

## Prompt 184: Schedule Publish QA

### Result

Partial pass. Static validation passed. DB-backed workflow and browser smoke
are pending because Docker Desktop is not available in this session.

### Static Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

### Local DB Prep

- `npm run db:local:up`: blocked.
- Reason: Docker Desktop Linux engine was not reachable at
  `npipe:////./pipe/dockerDesktopLinuxEngine`.

### Reviewed Behavior

- Publish action is protected by `ADMIN`/`OPS`.
- Publishing loads the period and eligible draft/published entries in a
  transaction.
- Publishing rejects missing periods, archived periods, periods with no
  eligible entries, out-of-period entries, invalid entry time order, and
  inactive crew members.
- Publishing creates a linked `CrewSchedule` bridge row for entries without
  one.
- Publishing updates the linked `CrewSchedule` bridge row for entries that
  already have one.
- Publishing marks entries and the parent period `PUBLISHED` and sets
  publisher metadata.
- Published period edit form is hidden on the period detail page.
- Publishing does not write `AircraftCrewAssignment`.

### Runtime Follow-Up

When Docker Desktop is available, run a DB-backed publish workflow smoke for
idempotency, linked `CrewSchedule` bridge rows, planner visibility, crew detail
visibility, and unchanged aircraft assignment counts.

## Prompt 188: Pattern Application QA

### Result

Partial pass. Static validation passed. DB-backed workflow and browser smoke
are pending because Docker Desktop is not available in this session.

### Static Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

### Local DB Prep

- `npm run db:local:up`: blocked.
- Reason: Docker Desktop Linux engine was not reachable at
  `npipe:////./pipe/dockerDesktopLinuxEngine`.

### Reviewed Behavior

- Pattern preview is URL-driven and read-only.
- Pattern preview calculates rows from active pattern day rows.
- Pattern preview shows warning-only conflicts and does not write rows.
- Generate-drafts action is protected by `ADMIN`/`OPS`.
- Generate-drafts action validates period, active crew member, active pattern,
  date window, and pattern day rows.
- Generate-drafts action creates only `DRAFT` `CrewScheduleEntry` rows.
- Generated rows link to the selected rotation pattern.
- Exact duplicates are skipped.
- Generation does not create `CrewSchedule` bridge rows.
- Generation does not publish schedule entries or periods.
- Generation does not write `AircraftCrewAssignment`.

### Runtime Follow-Up

When Docker Desktop is available, run DB-backed preview/generate QA for
generated draft rows, duplicate skipping, planner visibility, crew detail
visibility, no bridge rows before publish, and unchanged aircraft assignment
counts.

## Prompt 192: Crew Request Workflow QA

### Result

Partial pass. Static validation passed. DB-backed workflow and browser smoke
are pending because Docker Desktop is not available in this session.

### Static Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

### Local DB Prep

- `npm run db:local:up`: blocked.
- Reason: Docker Desktop Linux engine was not reachable at
  `npipe:////./pipe/dockerDesktopLinuxEngine`.

### Reviewed Behavior

- Request review action is protected by `ADMIN`/`OPS`.
- Review accepts only `SUBMITTED` requests.
- Review rejects requests that do not belong to the selected period.
- Approve/deny updates only `CrewScheduleRequest` status, notes, reviewed
  timestamp, and reviewer.
- Approved pattern requests can prefill the pattern preview/generate flow.
- Generated draft entries from approved pattern requests carry
  `sourceRequestId`.
- Request helper generation creates only `DRAFT` `CrewScheduleEntry` rows.
- Request approval does not automatically create schedule entries.
- Request helper generation does not create `CrewSchedule` bridge rows.
- Request helper generation does not publish schedules.
- Request helper generation does not write `AircraftCrewAssignment`.

### Runtime Follow-Up

When Docker Desktop is available, run DB-backed request review and
request-to-draft workflow QA for approve, deny, non-submitted rejection,
source-linked draft entries, no bridge rows before publish, and unchanged
aircraft assignment counts.
