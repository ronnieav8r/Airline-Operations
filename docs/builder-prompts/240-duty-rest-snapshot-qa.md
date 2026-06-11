# Prompt 240: Duty/Rest Snapshot QA

## Summary

Verify that duty/rest readiness is not only displayed live, but also persists
through `ReleaseReadinessSnapshot` and `ReleaseReadinessFinding` records.

## Implementation

- Added `npm run smoke:duty-rest-snapshot`.
- The smoke script requires seeded duty/rest scenarios, captures a real
  readiness snapshot from live `getReleaseReadinessItems` output, and verifies
  the persisted `duty-rest` finding includes evaluator subfindings in JSON
  details.
- The script uses existing release readiness mapping helpers and does not add
  schema, app routes, release blocking, duty/rest writes, legal signoff, or
  customer-facing API behavior.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB prep and scenario seed
- `npm run smoke:duty-rest-snapshot`
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Result

Duty/rest findings persist into readiness snapshots as warning-only findings
with evaluator subfindings stored in JSON details.
