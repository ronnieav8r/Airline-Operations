# Builder Prompt 11: FlightLeg Dashboard Read Pilot

## Status

Implemented as a read-only dashboard query migration pilot.

## Objective

Move dashboard flight summary and today flight board reads through the additive
`FlightLeg` foundation while preserving legacy `Flight` IDs for current crew
coverage behavior and fallback safety.

## Implemented Scope

- Added `getDashboardData()` in `lib/dashboard-queries.ts`.
- Updated `/` dashboard to use normalized FlightLeg-backed flight rows.
- Preserved current fleet, crew, alert, coverage, and board displays.
- Preserved crew coverage resolution from the legacy `Flight` ID.
- Added dashboard read-source summary counts and row badges:
  - `FlightLeg read`
  - `Fallback Flight read`

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

- `/`
- `/flights`
- `/operations-control`
- `/internal/flightleg-parity`
- `/aircraft`
- `/crew`
- `/scheduling`
- `/api/health`
- `/api/flights/[id]/coverage`
- `/api/flights/[id]/crew`

## Next Builder Slice Guidance

The next safe read-migration slice is to decide whether aircraft/crew/scheduling
pages need FlightLeg-backed context or whether the project should pause read
migration and start the release evidence schema slice.
