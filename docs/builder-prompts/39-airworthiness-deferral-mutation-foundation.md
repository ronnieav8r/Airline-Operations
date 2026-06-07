# Builder Prompt 39: Airworthiness Deferral Mutation Foundation

## Summary

Extend the aircraft-level airworthiness workflow to support deferral create/edit
from existing `OPEN` or `DEFERRED` discrepancies. Keep the workflow
warning-only and aircraft-scoped.

This slice does not add schema, maintenance-event mutation, airworthiness
release signing, auth/signatures, provider integrations, or release blocking.

## Key Changes

- Add deferral create/edit actions under `/aircraft/[aircraftId]/airworthiness`.
- Create a `Deferral` from an existing `OPEN` or `DEFERRED` discrepancy.
- Auto-generate `deferralNumber` when blank.
- Mark the related discrepancy `DEFERRED` when an active deferral is created.
- Edit deferral number, category, status, due date, cleared date, and notes.
- When clearing a deferral, allow the user to keep the related discrepancy
  `DEFERRED` or explicitly mark it `CLEARED`.

## Data Policy

- Deferrals belong to aircraft and discrepancy records.
- `deferralNumber` is optional on the form and auto-generated if blank.
- Supported statuses are `ACTIVE`, `CLEARED`, `EXPIRED`, and `CANCELLED`.
- `CLEARED` status sets `clearedAt` when the field is blank.
- Non-`CLEARED` statuses clear `clearedAt`.
- `authorizedById` remains null until auth/user attribution exists.

## Boundary

- No Prisma schema changes.
- No migration.
- No seed/backfill changes.
- No maintenance-event create/edit.
- No airworthiness release signing.
- No release blocking.
- No auth, roles, signatures, or user attribution.
- No MEL/CDL enforcement.
- No file uploads.
- No vendor/provider integrations.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/aircraft/[aircraftId]/airworthiness`.
- Create an `OPEN` discrepancy if needed.
- Create an active deferral from that discrepancy.
- Confirm the related discrepancy becomes `DEFERRED`.
- Edit the deferral.
- Mark the deferral `CLEARED` and choose whether to keep or clear the related
  discrepancy.
- Confirm `/aircraft` warning counts update.
- Confirm `/operations-control/[flightLegId]` still treats airworthiness as
  warning-only.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return successfully.

## Next Slice

```text
Prompt 40: Maintenance event mutation planning
```

Prompt 40 should decide how maintenance events relate to discrepancies and
deferrals before adding maintenance-event writes.
