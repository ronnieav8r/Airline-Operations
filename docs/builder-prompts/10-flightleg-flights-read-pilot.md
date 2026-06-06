# Builder Prompt 10: FlightLeg Flights Read Pilot

## Status

Implemented as a read-only flights-board query migration pilot.

## Objective

Move `/flights` display reads through the additive `FlightLeg` foundation while
preserving legacy `Flight` IDs for current crew coverage APIs and fallback
behavior.

## Implemented Scope

- Updated `getFlightListData()` to normalize rows from `FlightLeg` when bridged.
- Kept `getFlightList()` available for existing callers.
- Preserved current crew coverage behavior by resolving coverage from the legacy
  `Flight` ID.
- Updated `/flights` to show read-source summary counts and row badges:
  - `FlightLeg read`
  - `Fallback Flight read`
- Preserved existing route, aircraft, schedule, crew coverage, and
  control/release display patterns.

## Safety Rules

- No schema changes.
- No migrations.
- No seed or backfill changes.
- No CRUD or mutations.
- Existing crew and coverage APIs still use legacy `Flight` IDs.
- Legacy `Flight` remains available as fallback for unbridged rows.

## Validation

Expected commands:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/flights`
- `/operations-control`
- `/internal/flightleg-parity`
- `/`
- `/aircraft`
- `/crew`
- `/scheduling`
- `/api/health`
- `/api/flights/[id]/coverage`
- `/api/flights/[id]/crew`

## Next Builder Slice Guidance

If `/flights` and `/operations-control` stay clean on Render and the parity
diagnostic remains green, the next low-risk read migration is the dashboard
summary/cards.
