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
37. Release readiness guardrails planning.
38. Release readiness guardrails foundation.
39. Release evidence QA and Operations Control action discoverability.
40. Airworthiness schema planning.
41. Airworthiness additive schema foundation.
42. Airworthiness read-only summaries.
43. Airworthiness mutation planning.
44. Airworthiness discrepancy mutation foundation.
45. Airworthiness deferral mutation foundation.
46. Maintenance event mutation planning.
47. Maintenance event mutation foundation.
48. Airworthiness release planning.
49. Airworthiness release foundation.
50. Airworthiness release readiness refresh.

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

Release readiness guardrails planning is complete. The next guardrail
implementation should add a warning-only checklist to FlightLeg detail near
Release Control. It should cover manifest, W&B, locating, dispatch, weather,
NOTAM, and flight-plan evidence. It must not block release actions, mutate
evidence, add schema, or introduce `ReleasePackage`.

FlightLeg detail now shows warning-only release readiness guardrails near
Release Control. The checklist covers manifest, W&B, locating, dispatch,
weather, NOTAM, and flight-plan evidence. Release action buttons remain
available. Hard release blocking, `ReleasePackage`, audit policy, and approval
authority remain deferred.

Operations Control now has a clear Actions column for FlightLeg-backed rows.
The flight number links to detail, and row actions expose Detail, Edit,
Manifest, W&B, Locating, and Dispatch. This was added after QA showed the prior
detail/edit links were too easy to miss inside the evidence cell.

Airworthiness schema planning is complete. The next airworthiness foundation
should add additive models for aircraft configuration, capability,
discrepancies, deferrals, maintenance events, and airworthiness releases.
`Aircraft.status` remains a v1 fleet-board signal, not the airworthiness source
of truth. Component tracking, reliability analytics, hard release blocking,
file uploads, provider integrations, and maintenance work-order workflow remain
deferred.

Airworthiness additive schema foundation is implemented. Current schema now
includes `AircraftConfiguration`, `AircraftCapability`, `Discrepancy`,
`Deferral`, `MaintenanceEvent`, and `AirworthinessRelease`, with local demo
seed data, a gated `RUN_AIRWORTHINESS_BACKFILL` script, health counts, and DBML
updates. There is no airworthiness CRUD or release blocking yet.

Aircraft and FlightLeg detail now show read-only airworthiness summaries. The
FlightLeg release readiness checklist includes warning-only airworthiness
context for assigned aircraft configuration, released airworthiness record,
open/deferred discrepancies, and active deferrals. Release actions remain
available; hard blocking and airworthiness mutation remain deferred.

Airworthiness mutation planning is complete. The chosen first write surface is
`/aircraft/[aircraftId]/airworthiness`, because discrepancies and deferrals are
aircraft-level records that can affect multiple FlightLegs. The next
implementation should add discrepancy create/edit only. Deferral mutation,
maintenance events, airworthiness release signing, auth/signatures, and hard
release blocking remain deferred.

Airworthiness discrepancy mutation foundation is implemented. Aircraft cards
link to `/aircraft/[aircraftId]/airworthiness`, where users can create and edit
aircraft-level discrepancies. Deferrals, maintenance events, airworthiness
release signing, auth/signatures, and hard release blocking remain deferred.

Airworthiness deferral mutation foundation is implemented. The aircraft-level
airworthiness workflow can create/edit deferrals from existing `OPEN` or
`DEFERRED` discrepancies. Active deferrals mark the related discrepancy
`DEFERRED`; clearing a deferral can either keep the discrepancy deferred or
explicitly mark it cleared. Maintenance events, airworthiness release signing,
auth/signatures, and hard release blocking remain deferred.

Maintenance event mutation planning is complete. The next implementation should
add maintenance-event create/edit under `/aircraft/[aircraftId]/airworthiness`,
allow optional discrepancy linking, and allow a completed event to clear a
linked discrepancy only through an explicit form choice. Deferral clearing,
airworthiness release signing, auth/signatures, and hard release blocking
remain deferred.

Maintenance event mutation foundation is implemented. The aircraft-level
airworthiness workflow can create/edit maintenance events with optional
discrepancy links. Completed linked events can mark the linked discrepancy
`CLEARED` only through an explicit form choice. Deferral clearing,
airworthiness release signing, auth/signatures, and hard release blocking
remain deferred.

Airworthiness release planning is complete. `AirworthinessRelease` is treated
as maintenance/aircraft airworthiness release state, not the full FlightLeg
operational release. `FlightRelease` remains the operational FlightLeg release.
The next implementation should add aircraft-level airworthiness release
create/edit under `/aircraft/[aircraftId]/airworthiness`; new `RELEASED`
records should supersede prior current released records for that aircraft.
`AirworthinessRelease.flightLegId`, auth/signatures, and hard release blocking
remain deferred.

Airworthiness release foundation is implemented. The aircraft-level
airworthiness workflow can create/edit maintenance airworthiness releases,
auto-generate release numbers, mark records `DRAFT`, `RELEASED`, `VOIDED`, or
`SUPERSEDED`, set `releasedAt` when a record becomes `RELEASED`, and supersede
older current released aircraft records. This does not mutate operational
`FlightRelease`; `AirworthinessRelease.flightLegId`, auth/signatures, and hard
release blocking remain deferred.

Airworthiness release readiness display refresh is implemented. Aircraft and
FlightLeg detail now read recent aircraft release history and separately derive
the current non-expired `RELEASED` maintenance airworthiness release. Missing
history, latest non-current records, expired current records, discrepancies,
and deferrals remain warning-only. Operational `FlightRelease` actions remain
available.

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

Use `docs/AIRWORTHINESS_MUTATION_PLAN.md` for the airworthiness mutation
sequence. The chosen first implementation workflow is discrepancy mutation
under the aircraft-level airworthiness route.

Use `docs/MAINTENANCE_EVENT_MUTATION_PLAN.md` for maintenance-event workflow
planning.

Use `docs/AIRWORTHINESS_RELEASE_POLICY.md` for the aircraft maintenance
airworthiness release policy. `AirworthinessRelease` is not the same thing as
the full FlightLeg operational `FlightRelease`.

Use `docs/LEGACY_RECORD_IMPORT_PLAN.md` for the deferred old-record import
lane. The future goal is a safe import method for legacy operational, aircraft,
maintenance, crew, manifest, dispatch, and release records. Do not implement it
yet; source formats, staging/dry-run behavior, idempotency keys, and target
table mappings must be planned first.

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
Prompt 43: Airworthiness release foundation
```

Scope:

- Add aircraft-level `AirworthinessRelease` create/edit under
  `/aircraft/[aircraftId]/airworthiness`.
- Support `DRAFT`, `RELEASED`, `VOIDED`, and `SUPERSEDED`.
- Auto-generate `releaseNumber` when blank.
- When a record becomes `RELEASED`, set `releasedAt` if blank and supersede
  prior current released records for that aircraft.
- Keep `AirworthinessRelease.flightLegId`, `releasedById`, auth/signatures,
  `FlightRelease` mutation, and release blocking deferred.
- Do not add hard release blocking until product policy is explicitly approved.

Deferred follow-up to keep on the roadmap:

```text
Legacy record import planning
```

Scope:

- Plan import formats, staging/dry-run behavior, idempotency keys, source
  references, and target table mappings for old records.
- Start with aircraft maintenance history only after the current
  airworthiness workflows stabilize.
- Do not build import execution until source data shape is known.
