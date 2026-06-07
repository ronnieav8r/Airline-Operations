# Project Status

Last updated: 2026-06-06

This document is the quick onboarding note for planner and builder chats. Read it
before starting a new AeroOps slice.

## Current State

AeroOps Center is a Next.js, TypeScript, Prisma, PostgreSQL, and Render app for
small airline, charter, or air taxi operations.

The app is currently a read-only operational console backed by live Prisma reads.
It has:

- Dashboard at `/`
- Operations Control at `/operations-control`
- Flights at `/flights`
- Aircraft at `/aircraft`
- Crew at `/crew`
- Scheduling at `/scheduling`
- Health endpoint at `/api/health`
- Hidden FlightLeg parity diagnostic at `/internal/flightleg-parity`
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

## Current Data Model Boundaries

The current `Flight` model is still the v1 table read by the UI and APIs.
Do not rename it or split it without an approved read-migration slice.

`FlightLeg` now exists as an additive foundation table. It is bridged to current
rows by `FlightLeg.legacyFlightId`. `/`, `/operations-control`, `/flights`, and
`/scheduling` now pilot FlightLeg reads with legacy `Flight` fallback; aircraft,
crew, and existing APIs still read from current `Flight` paths.

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

Crew coverage uses aircraft-block assignment:

```text
Flight.aircraftId + Flight.scheduledDeparture
```

Find active `AircraftCrewAssignment` rows for that aircraft and time. Required
cockpit roles are currently `CPT` and `FO`.

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

Use the hidden parity diagnostic before adding write flows.

Preferred next slice:

```text
Prompt 17: FlightLeg read migration for Aircraft
```

Scope:

- Move `/aircraft` current/next flight context to the FlightLeg-backed pattern
  with legacy `Flight` fallback.
- Keep Aircraft read-only.
- Preserve aircraft status, crew block, coverage, and alert display.
- Keep release evidence detail read-only; do not add CRUD.

Avoid adding CRUD screens until the remaining read-only pages are on the
FlightLeg-backed read pattern.
