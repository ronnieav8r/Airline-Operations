# Crew Scheduling Runtime QA Plan

Last updated: 2026-06-11

## Purpose

Run the missing DB-backed QA for Crew Scheduling now that local Docker-backed
testing is available. Earlier slices implemented the scheduling backend, but
some runtime checks were partial when Docker Desktop was unavailable.

## Permanent Boundary

Crew Scheduling answers:

```text
Who appears available, where, and under what schedule constraints?
```

Aircraft Crew Assignment answers:

```text
Who is actually assigned to this aircraft block?
```

Runtime QA must confirm that scheduling workflows do not silently create,
replace, or end `AircraftCrewAssignment` rows.

## Prompt 243: Schedule Period And Publishing QA

Status: complete.

Verify:

- Admin/ops can create or use a schedule period.
- Draft `CrewScheduleEntry` rows can be published.
- Publishing marks eligible entries `PUBLISHED`.
- Publishing marks the period `PUBLISHED`.
- Publishing creates or updates linked `CrewSchedule` bridge rows.
- Re-running publish is idempotent.
- Published schedules appear in the planner and crew detail context.
- Aircraft assignment row counts remain unchanged.

## Prompt 244: Rotation Pattern QA And Fixes

Status: complete.

Verify:

- Pattern preview is read-only and URL-driven.
- Pattern preview shows generated rows and warning-only conflicts.
- Generate-drafts creates only `DRAFT` `CrewScheduleEntry` rows.
- Generated rows link to the selected rotation pattern.
- Exact duplicate generation is skipped.
- Generated rows do not create `CrewSchedule` bridge rows before publish.
- Generated rows appear in planner and crew detail context.
- Aircraft assignment row counts remain unchanged.

Fix only clear runtime/data-integrity bugs that do not require product
decisions.

## Prompt 245: Crew Request And Time-Off QA

Verify:

- Admin/ops can approve and deny submitted `CrewScheduleRequest` rows.
- Request review updates only request status, review metadata, and notes.
- Approved pattern requests can feed preview/generate-draft behavior.
- Source-linked draft entries carry `sourceRequestId`.
- Time-off create, approve, deny, and cancel behavior works.
- Time-off review updates only `TimeOffRequest`.
- No request or time-off action publishes schedules, creates bridge rows, or
  mutates aircraft assignments.

## Prompt 246: Crew Portal Backend QA

Verify:

- Crew users can access `/crew/portal` only for their linked crew member.
- Crew users can submit allowed `CrewScheduleRequest` rows.
- Crew users can submit allowed `TimeOffRequest` rows.
- Crew users cannot approve requests.
- Crew users cannot publish schedules.
- Crew users cannot mutate aircraft assignments.
- Crew users cannot manage logistics or compliance admin workflows.
- Submitted portal requests are visible to admin/ops review surfaces.

## Prompt 247: Docs Refresh

After runtime QA:

- Update `docs/CREW_SCHEDULING_QA_LOG.md`.
- Update `docs/CREW_SCHEDULING_MODULE_PLAN.md`.
- Update `docs/CREW_SCHEDULING_SYSTEM_ARCHITECTURE.md`.
- Update `docs/PROJECT_STATUS.md`.
- Mark scheduling backend MVP-complete only if runtime QA passes or remaining
  gaps are explicitly deferred as post-MVP.

## Common Validation

Run for each implementation/QA slice:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
npm run db:local:up
npm run db:local:migrate
npm run db:local:seed
npm run smoke:workflows
npm run smoke:app
npm run smoke:browser
```

## Out Of Scope

- Schema changes.
- New scheduling product behavior.
- Schedule import/apply execution.
- Assignment automation.
- Duty/rest hard enforcement.
- Provider integrations.
- File uploads.
- Frontend/UI redesign.
