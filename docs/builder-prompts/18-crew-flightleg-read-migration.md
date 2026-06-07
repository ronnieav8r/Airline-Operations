# Builder Prompt 18: Crew FlightLeg Read Migration

## Summary

Move Crew upcoming flight coverage context to the FlightLeg-backed read pattern
with legacy `Flight` fallback. This slice is read-only.

## Implemented Scope

- `/crew` upcoming coverage rows now normalize through linked `FlightLeg` data
  when present.
- Legacy `Flight` fallback remains for rows without a linked FlightLeg.
- Crew coverage still resolves through existing legacy Flight IDs.
- Crew roster, duty status, aircraft-block assignments, qualification warnings,
  and upcoming coverage displays are preserved.
- Added Crew summary counts for FlightLeg reads and fallback reads.
- Added row-level read-source badges on upcoming coverage rows.

## Boundaries

- Crew remains read-only.
- No schema, seed, migration, or Render environment changes are included.
- Aircraft-block assignment remains the active crew assignment source.
- `CrewLegAssignment` remains a FlightLeg snapshot/foundation table until a
  later crew workflow slice deliberately promotes it.

## Validation

Use the standard validation set:

```powershell
npm run typecheck
npm run lint
npm run prisma:validate
npm run build
```

Runtime checks:

- `/crew` returns 200.
- `/crew` shows FlightLeg read and fallback read counts.
- `/api/health` still returns nonzero FlightLeg and release-evidence counts.
- `/internal/flightleg-parity` still reports no mismatches.
