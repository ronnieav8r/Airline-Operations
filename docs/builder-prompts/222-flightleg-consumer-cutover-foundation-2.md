# Prompt 222: FlightLeg Consumer Cutover Foundation 2

## Summary

Move remaining safe Flight-first internal read consumers to FlightLeg-primary
coverage reads while preserving legacy fallback and public API compatibility.

## Implemented Scope

- Added a shared FlightLeg-primary upcoming coverage helper for crew-facing
  planning surfaces.
- Updated crew roster, crew member context, crew scheduling planner, time-off
  conflict warnings, and scheduling board reads to prefer FlightLeg records.
- Preserved explicit legacy `Flight` fallback for unbridged rows.
- Preserved `/api/flights/[id]` compatibility paths and response fields.

## Boundaries

- No schema changes.
- No public API path changes.
- No legacy table removal.
- No reinterpretation of compatibility `flightId` fields.
- No changes to seed/backfill, bridge writes, parity diagnostics, or archive
  tables.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Next Slice

Prompt 223 should QA the cutover and document legacy `Flight` as
compatibility/archive for MVP, without destructive removal.
