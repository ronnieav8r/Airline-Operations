# Prompt 216: FlightLeg Coverage Consumer Cutover Foundation

## Summary

Implement the internal-consumer cutover planned in Prompt 214. Crew-heavy pages
and read helpers now prefer `FlightLeg.id` for coverage lookups when a bridge
exists, while keeping legacy `Flight.id` fallback for unbridged rows.

## Implemented Scope

- Added local coverage lookup normalization to crew/scheduling/time-off
  consumers.
- Preserved existing public API routes and response shape.
- Preserved legacy fallback for unbridged rows.
- Left parity diagnostics and FlightLeg backfill scripts legacy-aware because
  they intentionally compare or create bridge records.

## Boundaries

- No schema changes.
- No public API path changes.
- No response-field removals or renames.
- No reinterpretation of `flightId`.
- No removal of legacy `Flight` or bridge fields.
- No crew assignment source-of-truth change.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- `npm run smoke:app`
- `npm run smoke:browser`
