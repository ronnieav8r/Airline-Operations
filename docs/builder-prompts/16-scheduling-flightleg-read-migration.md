# Builder Prompt 16: Scheduling FlightLeg Read Migration

## Summary

Move Scheduling to the FlightLeg-backed read pattern with legacy `Flight`
fallback. This slice is read-only. Do not add CRUD, mutation routes, schema
changes, seed changes, or release-evidence workflow changes.

## Implemented Scope

- Added `lib/scheduling-queries.ts`.
- `/scheduling` now reads through legacy `Flight` rows with linked
  `FlightLeg` data normalized when present.
- Preserved legacy `Flight` fallback for rows without a linked `FlightLeg`.
- Preserved crew coverage through current legacy `Flight` IDs.
- Preserved control/release display through FlightLeg-linked control records
  with legacy fallback.
- Added Scheduling summary counts for FlightLeg reads and fallback reads.
- Added row-level read-source badges.

## Boundaries

- Scheduling remains read-only.
- No schema, seed, migration, or Render environment changes are included.
- Crew coverage still resolves through current `resolveFlightCoverage` and
  legacy `Flight` IDs.
- Release evidence detail remains under Operations Control.

## Validation

Use the standard validation set:

```powershell
npm run typecheck
npm run lint
npm run prisma:validate
npm run build
```

Runtime checks:

- `/scheduling` returns 200.
- `/scheduling` shows FlightLeg read and fallback read counts.
- `/api/health` still returns nonzero FlightLeg and release-evidence counts.
- `/internal/flightleg-parity` still reports no mismatches.
