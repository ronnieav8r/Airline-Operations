# Prompt 223: FlightLeg Cutover QA And Archive Policy

## Summary

QA the FlightLeg consumer cutover and document legacy `Flight` as
compatibility/archive for backend MVP.

## Result

Prompt 223 passed. No code fixes were required.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `/internal/flightleg-parity`
- `/internal/flightleg-write-readiness`
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Docs

- Added `docs/FLIGHTLEG_LEGACY_ARCHIVE_POLICY.md`.
- Updated FlightLeg cutover QA/status docs.

## Next Slice

Prompt 224 should plan the MVP release lifecycle while keeping release behavior
warning-only.
