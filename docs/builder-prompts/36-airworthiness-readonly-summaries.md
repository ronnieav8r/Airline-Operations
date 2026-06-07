# Builder Prompt 36: Airworthiness Read-Only Summaries

## Summary

Add read-only airworthiness visibility to the aircraft board and FlightLeg
release evidence detail. This slice uses the additive Prompt 35 tables only. It
does not add airworthiness CRUD, file uploads, maintenance work-order workflow,
provider integrations, schema changes, or release blocking.

## Key Changes

- Show aircraft-level airworthiness summaries on `/aircraft`.
- Show assigned-aircraft airworthiness context on
  `/operations-control/[flightLegId]`.
- Add a warning-only airworthiness item to the FlightLeg release readiness
  checklist.
- Keep release actions available even when airworthiness warnings are present.

## Readiness Policy

Airworthiness readiness is informational only for this slice.

- Current active aircraft configuration present: ready signal.
- Latest released airworthiness release present and not expired: ready signal.
- Open discrepancies: warning signal.
- Active deferrals: warning signal.
- Missing configuration or release: warning signal.

Hard release blocking remains deferred until an explicit product decision.

## Boundary

- No Prisma schema changes.
- No migrations.
- No seed/backfill changes.
- No mutation routes or server actions.
- No maintenance discrepancy/deferral CRUD.
- No release-blocking policy enforcement.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/aircraft` shows airworthiness summary counts and per-aircraft context.
- `/operations-control/[flightLegId]` shows airworthiness context and a
  warning-only readiness item.
- `/operations-control`, `/flights`, `/scheduling`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness` still
  return successfully.
