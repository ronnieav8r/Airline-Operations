# Builder Prompt 38: Airworthiness Discrepancy Mutation Foundation

## Summary

Add the first aircraft-level airworthiness write workflow. Create
`/aircraft/[aircraftId]/airworthiness`, link it from `/aircraft`, and support
create/edit for `Discrepancy` records only.

This slice does not add schema, deferral mutation, maintenance-event mutation,
airworthiness release signing, auth/signatures, provider integrations, or
release blocking.

## Key Changes

- Added aircraft-level airworthiness workflow route.
- Added plain server actions for discrepancy create/edit.
- Added auto-generation for discrepancy numbers when the field is blank.
- Show current active configuration, capabilities, discrepancies, active
  deferrals, maintenance events, and released airworthiness context.
- Keep deferrals read-only.
- Keep Operations Control airworthiness readiness warning-only.

## Data Policy

- `title` is required.
- `discrepancyNumber` is optional on the form and auto-generated if blank.
- New discrepancies default to `OPEN` unless another status is selected.
- Supported statuses are `OPEN`, `DEFERRED`, `CLEARED`, and `CANCELLED`.
- `CLEARED` status sets `clearedAt` when the field is blank.
- Non-`CLEARED` statuses clear `clearedAt`.
- `reportedById` remains null until auth/user attribution exists.

## Boundary

- No Prisma schema changes.
- No migration.
- No seed/backfill changes.
- No deferral create/edit.
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

- Open `/aircraft`.
- Open `/aircraft/[aircraftId]/airworthiness`.
- Create a discrepancy.
- Edit the discrepancy.
- Mark the discrepancy `CLEARED`.
- Confirm `/aircraft` warning counts update.
- Confirm `/operations-control/[flightLegId]` reflects warning-only
  airworthiness readiness for a FlightLeg assigned to that aircraft.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return successfully.

## Next Slice

```text
Prompt 39: Airworthiness deferral mutation foundation
```

Prompt 39 should add deferral create/edit from existing `OPEN` or `DEFERRED`
discrepancies while keeping hard release blocking deferred.
