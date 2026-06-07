# Project Status

Last updated: 2026-06-07

This document is the quick onboarding note for planner and builder chats. Read it
before starting a new AeroOps slice.

## Current State

AeroOps Center is a Next.js, TypeScript, Prisma, PostgreSQL, and Render app for
small airline, charter, or air taxi operations.

The app is currently an operational console backed by live Prisma reads. Most
surfaces remain read-focused, and Operations Control now has the first
controlled FlightLeg create/edit workflow.

It has:

- Dashboard at `/`
- Operations Control at `/operations-control`
- FlightLeg create/edit at `/operations-control/new` and
  `/operations-control/[flightLegId]/edit`
- Manifest management at `/operations-control/[flightLegId]/manifest`
- Flight locating management at `/operations-control/[flightLegId]/locating`
- Weight-and-balance management at
  `/operations-control/[flightLegId]/weight-balance`
- Dispatch package management at `/operations-control/[flightLegId]/dispatch`
- Flights at `/flights`
- Aircraft at `/aircraft`
- Crew at `/crew`
- Scheduling at `/scheduling`
- Health endpoint at `/api/health`
- Hidden FlightLeg parity diagnostic at `/internal/flightleg-parity`
- Hidden FlightLeg write-readiness diagnostic at
  `/internal/flightleg-write-readiness`
- Local Docker Postgres development setup
- Render deployment connected to `main`

## Completed Product Slices

1. Foundation app, Prisma schema, migrations, and seed data.
2. Crew-resolution API using aircraft-block assignments.
3. Read-only operations dashboard.
4. App shell navigation.
5. Authority and operational-control schema foundation.
6. Gated authority backfill for Render demo data.
7. Read-only Operations Control page.
8. Read-only Flights page.
9. Local Docker Desktop development setup.
10. Read-only Aircraft page.
11. Read-only Crew page.
12. Read-only Scheduling page.
13. Additive FlightLeg transition foundation.
14. Hidden Flight-to-FlightLeg parity diagnostic.
15. Operations Control FlightLeg read pilot.
16. Flights page FlightLeg read pilot.
17. Dashboard FlightLeg read pilot.
18. Release evidence schema planning.
19. Additive release evidence schema foundation.
20. Release evidence read-only summaries on Dashboard and Operations Control.
21. Release evidence read-only FlightLeg detail drilldown.
22. Scheduling FlightLeg read migration.
23. Aircraft FlightLeg read migration.
24. Crew FlightLeg read migration.
25. FlightLeg create/edit workflow foundation.
26. FlightLeg write QA guardrails.
27. FlightLeg coverage API bridge.
28. CrewLegAssignment snapshot sync on FlightLeg create/edit.
29. Release-control actions foundation.
30. Release evidence mutation planning.
31. Manifest mutation foundation.
32. Flight locating mutation foundation.
33. Weight-and-balance mutation planning.
34. Weight-and-balance mutation foundation.
35. Manual dispatch-package mutation planning.
36. Manual dispatch-package mutation foundation.

## Current Data Model Boundaries

The current `Flight` model is still the v1 table read by the UI and APIs.
Do not rename it or split it without an approved read-migration slice.

`FlightLeg` now exists as an additive foundation table. It is bridged to current
rows by `FlightLeg.legacyFlightId`. `/`, `/operations-control`, `/flights`,
`/scheduling`, `/aircraft`, and `/crew` now pilot FlightLeg reads with legacy
`Flight` fallback where needed.

Operations Control now has the first controlled FlightLeg write workflow. New
and edited FlightLeg records also create/update the legacy `Flight` bridge row
in the same transaction so current coverage APIs, fallback reads, and parity
diagnostics continue to work during the transition.

FlightLeg create/edit now snapshots resolved aircraft-block crew onto
`CrewLegAssignment`. These rows are leg-level evidence, not the active source of
truth. Aircraft-block assignment remains the source used by coverage APIs and
current crew displays.

FlightLeg detail now has minimal release controls for `FlightRelease` status:
mark released, cancel release, and void release. These actions do not mutate
release evidence or assemble dispatch packages.

FlightLeg detail now links to manual manifest management. The manifest workflow
can create a manifest, add/edit/remove manual manifest items, and mark the
manifest `READY`. Manifest locking, amendments, passenger identity redesign,
release gating, weight-and-balance, locating, and dispatch-package mutation
remain deferred.

FlightLeg detail now links to manual flight locating management. The locating
workflow can create a locating record, edit responsible party, planned route,
last known position, notes, and transition status to `FILED`, `ACTIVE`, or
`CLOSED`. Position history, overdue automation, release gating, and dispatch
mutation remain deferred.

Weight-and-balance mutation planning is complete. The next W&B workflow should
be manual entry only, should use the current `WeightBalanceRun` schema, should
link to the current manifest when present, and should store human-entered
context in `calculationSnapshot`. Approval, automated calculations, aircraft
configuration/capability schema, and release gating remain deferred.

FlightLeg detail now links to manual weight-and-balance management. The W&B
workflow can create/edit manual `WeightBalanceRun` rows, link new runs to the
current manifest when present, store manual notes in `calculationSnapshot`,
mark runs `CALCULATED`, and void runs. Approval, automated calculations,
aircraft configuration/capability schema, and release gating remain deferred.

Manual dispatch-package mutation planning is complete. The next dispatch
workflow should save weather, NOTAM, flight-plan, and package notes in one
manual form using existing schema only. Provider integrations, `ReleasePackage`,
file uploads, aircraft performance calculations, and release gating remain
deferred.

FlightLeg detail now links to manual dispatch-package management. The dispatch
workflow can save manual weather briefing evidence, NOTAM evidence, a
flight-plan reference, and package/performance notes in one form, then link
those records to the FlightLeg `DispatchPackage`. Provider integrations,
`ReleasePackage`, file uploads, aircraft performance calculations, and release
gating remain deferred.

Use `/internal/flightleg-write-readiness` after local create/edit QA. It checks
the expected write-workflow support records: legacy Flight bridge, auto trip,
current aircraft assignment, operational-control link, release placeholder, and
basic turnaround-link order.

Render has been backfilled with FlightLeg foundation records. The
`RUN_FLIGHTLEG_BACKFILL` flag should remain `0` unless intentionally rerunning
the gated idempotent backfill.

New additive foundation tables:

- `TripOrMission`
- `FlightLeg`
- `AircraftAssignment`
- `CrewLegAssignment`
- `TurnaroundLink`

Release evidence now exists as an additive FlightLeg-attached foundation:

- `Manifest`
- `ManifestItem`
- `WeightBalanceRun`
- `FlightLocatingRecord`
- `DispatchPackage`
- `WeatherBriefingSnapshot`
- `NotamSnapshot`
- `FlightPlanReference`

Use these DBML files for schema discussions:

- `docs/schema.current.dbml`: clean current-state DBML matching the implemented Prisma schema.
- `docs/schema.planning.flightleg.dbml`: planning-only target DBML using `FlightLeg` as the operational anchor.

Use `docs/RELEASE_EVIDENCE_SCHEMA_DECISIONS.md` for the release-evidence
boundary. `ReleasePackage` and `PositionReport` remain deferred.

Use `docs/RELEASE_EVIDENCE_MUTATION_PLAN.md` for the release-evidence mutation
sequence. The chosen first implementation workflow is manifest mutation.

Crew coverage uses aircraft-block assignment:

```text
Flight.aircraftId + Flight.scheduledDeparture
```

Find active `AircraftCrewAssignment` rows for that aircraft and time. Required
cockpit roles are currently `CPT` and `FO`.

Coverage APIs accept either a legacy `Flight.id` or a `FlightLeg.id`:

- `/api/flights/[id]/coverage`
- `/api/flights/[id]/crew`

When a FlightLeg ID is provided, the resolver follows `FlightLeg.legacyFlight`
and returns the existing response shape keyed to the legacy Flight ID.

Authority/control data exists now:

- `Operator`
- `OperatingAuthority`
- `AuthorityRevision`
- `Manual`
- `ManualRevision`
- `OperationalControlRecord`
- `FlightRelease`

`OperationalControlRecord.flightLegId` is nullable and additive. It preserves
the existing `flightId` link for current UI/API behavior.

## Local Development

Use the local Docker setup for day-to-day checks:

```powershell
npm run db:local:up
npm run db:local:migrate
npm run db:local:seed
npm run dev:local
```

Local app:

```text
http://127.0.0.1:3200
```

Local Postgres:

```text
127.0.0.1:5434
```

Important: `npm run build` should be run after stopping the local dev server if
the server is holding `.next` files.

## Render Deployment

Render deploys from `origin main`.

Current Render commands:

```text
Build: npm install && npm run render-build
Start: npm run start
```

`render-build` runs migrations, generates Prisma, runs the gated authority,
FlightLeg, and release-evidence backfill scripts, then builds Next.js. Backfill
scripts skip by default unless their explicit environment flags are set.

Do not run broad seed scripts against Render unless explicitly approved.

## Validation Standard

Before committing a slice, run:

```powershell
npm run typecheck
npm run lint
npm run build
```

For local route checks, start the app with:

```powershell
npm run dev:local
```

Then verify the changed routes and `/api/health`.

## Recommended Next Step

Use the new FlightLeg create/edit workflow locally before broadening write
surface area.

Preferred next slice:

```text
Prompt 31: Release readiness guardrails planning
```

Scope:

- Decide warning-only release readiness guardrails for the FlightLeg detail
  page.
- Use existing manifest, W&B, locating, and dispatch evidence only.
- Stop before implementation if release blocking policy becomes ambiguous.
