# Builder Prompt 09: FlightLeg Operations Control Read Pilot

## Status

Implemented as a read-only operations-control query migration pilot.

## Objective

Move `/operations-control` to read scheduled leg details through the additive
`FlightLeg` foundation while preserving current page behavior and keeping the
legacy `Flight` relation as a safe fallback.

## Implemented Scope

- Added `getFlightLegOperationsControlData()`.
- Updated `/operations-control` to use normalized leg data from `FlightLeg`.
- Preserved existing authority, release, operator, route, aircraft, and schedule display.
- Added read-source visibility:
  - `FlightLeg read`
  - `Fallback Flight read`
  - `Unassigned`
- Added summary counts for FlightLeg reads and fallback reads.

## Safety Rules

- No schema changes.
- No migrations.
- No seed or backfill changes.
- No CRUD or mutations.
- Existing `Flight` relation remains a fallback only.
- Existing pages and APIs must continue to work.

## Validation

Expected commands:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/operations-control`
- `/internal/flightleg-parity`
- `/`
- `/flights`
- `/aircraft`
- `/crew`
- `/scheduling`
- `/api/health`

## Next Builder Slice Guidance

If `/operations-control` stays clean on Render and the parity diagnostic remains
green, the next low-risk read migration is `/flights`, with the same fallback
pattern and parity checks.
