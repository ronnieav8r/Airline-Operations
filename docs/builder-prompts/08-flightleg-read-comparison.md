# Builder Prompt 08: Flight-to-FlightLeg Read Comparison

## Status

Implemented as a hidden read-only parity diagnostic.

## Objective

Verify that the additive `FlightLeg` foundation matches the current `Flight`
source of truth before any production UI/API read migration.

## Implemented Scope

- Added hidden route `/internal/flightleg-parity`.
- Added read-only helper `getFlightLegParityReport()`.
- Compared `Flight` to bridged `FlightLeg` rows by `FlightLeg.legacyFlightId`.
- Reported row-level pass/fail and issue details for:
  - bridge presence
  - core flight fields
  - aircraft assignment
  - crew assignment snapshot
  - operational-control link
  - turnaround links

## Safety Rules

- Do not add this route to primary app navigation.
- Do not rewire `/`, `/flights`, `/operations-control`, `/aircraft`, `/crew`, or `/scheduling`.
- Treat `Flight` as the current source of truth until a later read-migration slice.
- Do not add schema, migration, seed, or backfill changes in this slice.

## Validation

Expected commands:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Local runtime checks:

- `/internal/flightleg-parity`
- `/`
- `/flights`
- `/operations-control`
- `/aircraft`
- `/crew`
- `/scheduling`
- `/api/health`

## Next Builder Slice Guidance

If parity is clean locally and on Render, the next slice can begin migrating a
small read-only query path from `Flight` to `FlightLeg`. Start with an internal
or low-risk display path before changing the main dashboard.
