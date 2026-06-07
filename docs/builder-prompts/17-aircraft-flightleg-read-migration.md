# Builder Prompt 17: Aircraft FlightLeg Read Migration

## Summary

Move Aircraft current/next flight context to the FlightLeg-backed read pattern
with legacy `Flight` fallback. This slice is read-only.

## Implemented Scope

- Added `lib/aircraft-queries.ts`.
- `/aircraft` now normalizes current/next flight cards through linked
  `FlightLeg` data when present.
- Preserved legacy `Flight` fallback for aircraft flight context without a
  linked FlightLeg.
- Preserved aircraft status, home station, crew block, qualification warnings,
  maintenance alerts, and active alerts.
- Added Aircraft summary counts for FlightLeg reads and fallback reads.
- Added row-level read-source badges on current/next flight cards.

## Boundaries

- Aircraft remains read-only.
- No schema, seed, migration, or Render environment changes are included.
- Crew block assignment remains aircraft-block based.
- No maintenance CRUD or airworthiness workflow is included.

## Validation

Use the standard validation set:

```powershell
npm run typecheck
npm run lint
npm run prisma:validate
npm run build
```

Runtime checks:

- `/aircraft` returns 200.
- `/aircraft` shows FlightLeg read and fallback read counts.
- `/api/health` still returns nonzero FlightLeg and release-evidence counts.
- `/internal/flightleg-parity` still reports no mismatches.
