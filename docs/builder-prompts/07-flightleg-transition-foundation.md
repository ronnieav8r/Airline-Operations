# Builder Prompt 07: FlightLeg Transition Foundation

## Status

Implemented as an additive schema/backfill/docs slice.

## Objective

Add the `FlightLeg` foundation without replacing the current `Flight` table or rewiring any existing UI/API reads.

Current behavior remains:

- Dashboard, Flights, Operations Control, Aircraft, Crew, and Scheduling pages read from the current `Flight`-based model.
- Crew coverage APIs still resolve from current `Flight` IDs.
- `FlightRelease` remains attached to `OperationalControlRecord`.

New foundation behavior:

- `FlightLeg` exists as the future operational leg anchor.
- `FlightLeg.legacyFlightId` bridges each new leg to the current `Flight` row.
- `OperationalControlRecord.flightLegId` optionally links current control records to the new leg.

## Implemented Scope

- Added Prisma enums:
  - `FlightLegStatus`
  - `AssignmentStatus`
- Added Prisma models:
  - `TripOrMission`
  - `FlightLeg`
  - `AircraftAssignment`
  - `CrewLegAssignment`
  - `TurnaroundLink`
- Extended `OperationalControlRecord` with nullable unique `flightLegId`.
- Added relation arrays needed by Prisma.
- Added migration `20260606150000_flightleg_transition_foundation`.
- Added gated backfill script `scripts/backfill-flightleg-demo.ts`.
- Updated local seed to create matching FlightLeg foundation records after current flight/control seed data.
- Updated `/api/health` counts for the new tables.
- Updated maintained DBML and onboarding docs.

## Safety Rules

- Do not remove or rename `Flight`.
- Do not rewire UI reads from `Flight` to `FlightLeg` in this slice.
- Do not remove current tables:
  - `AircraftCrewAssignment`
  - `CrewFlightLog`
  - `FlightPassenger`
  - `FlightRelease`
- Do not run broad seed scripts against Render.
- Use `RUN_FLIGHTLEG_BACKFILL=1 npm run backfill:flightleg` only when intentionally backfilling demo/production-like data.

## Validation

Expected validation commands:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Local database validation, when Docker Desktop is running:

```powershell
npm run db:local:up
npm run db:local:migrate
npm run db:local:seed
$env:RUN_FLIGHTLEG_BACKFILL="1"; npm run backfill:flightleg
```

Runtime checks:

- `/api/health` should report nonzero local counts for `tripOrMissions`, `flightLegs`, `aircraftAssignments`, `crewLegAssignments`, and `turnaroundLinks` after local seed/backfill.
- Existing pages should still return 200:
  - `/`
  - `/operations-control`
  - `/flights`
  - `/aircraft`
  - `/crew`
  - `/scheduling`

## Next Builder Slice Guidance

The next schema/data slice should not immediately migrate all UI reads. A safer next step is a read-only comparison surface or internal query helper that compares current `Flight` rows against their `FlightLeg` bridge records and identifies mismatches before rewiring pages.
