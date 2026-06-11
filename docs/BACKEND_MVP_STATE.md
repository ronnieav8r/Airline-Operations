# Backend MVP State

Last updated: 2026-06-11

## Status

AeroOps is backend-MVP-ready for the current warning-first operational scope.

Prompt 252 completed the final backend smoke pass, and Prompt 253 found no
backend MVP blockers. The next step is frontend readiness planning, then major
UI/frontend polish.

## Backend Contracts Frontend Can Rely On

- Local auth and DB-backed sessions exist.
- Current roles are `ADMIN`, `OPS`, `DISPATCH`, `MAINTENANCE`, `CREW`,
  `SAFETY`, and `VIEWER`.
- `FlightLeg` is the primary operational identity for new backend work.
- Legacy `Flight` remains compatibility/archive and must not be destructively
  removed without a later plan.
- `/api/flights/[id]/crew` and `/api/flights/[id]/coverage` remain
  compatibility paths and accept FlightLeg or legacy Flight IDs.
- `FlightRelease` remains the release decision/status record.
- `ReleasePackage` provides preview/final evidence package capture around
  `FlightRelease`.
- Release readiness, duty/rest, crew compliance, and logistics signals are
  warning-first.
- `AircraftCrewAssignment` remains operational crew coverage truth.
- `CrewScheduleEntry` and `CrewSchedule` support scheduling/availability, not
  aircraft assignment automation.
- Crew portal users can submit allowed requests, but cannot approve/publish or
  mutate assignments.
- Crew Logistics is manual coordination only; provider integrations are
  deferred.

## Backend Areas In Place

- Dashboard and operations attention data.
- Operations Control FlightLeg create/edit.
- Release evidence workflows for manifest, W&B, locating, and dispatch.
- Release readiness snapshots and release-attempt snapshots.
- ReleasePackage preview and final capture.
- Aircraft context, airworthiness, discrepancy, deferral, and maintenance
  workflows.
- Aircraft-block crew assignment workflow.
- Crew compliance admin workflows for certificate, medical, training, check,
  recency, duty, and rest records.
- Duty/rest warning calculator and diagnostic scenario data.
- Crew scheduling periods, rotation patterns, draft entries, publishing,
  requests, time off, and crew portal request submission.
- Crew logistics location/travel-need workflows and central workbench.
- Smoke-test users and command-driven smoke harness.

## QA Baseline

See `docs/BACKEND_MVP_FINAL_SMOKE_QA.md`.

The latest full pass covered:

- static validation,
- local DB prep and seed,
- duty/rest scenario seed,
- focused workflow smokes,
- role/route smoke,
- browser smoke.

## Post-MVP Deferred Work

See `docs/BACKEND_MVP_GAP_REVIEW.md`.

Major deferred items include:

- hard release blocking,
- legal signatures,
- destructive legacy `Flight` retirement,
- full legal duty/rest enforcement,
- provider integrations,
- file uploads,
- expenses/payments,
- import execution,
- ADS-B integration.
