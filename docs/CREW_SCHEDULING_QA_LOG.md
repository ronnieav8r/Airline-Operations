# Crew Scheduling QA Log

Last updated: 2026-06-10

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
