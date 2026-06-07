# Builder Prompt 41: Maintenance Event Mutation Foundation

## Summary

Add maintenance-event create/edit to the aircraft-level airworthiness workflow.
Maintenance events may stand alone or link to a discrepancy. A completed event
may clear its linked discrepancy only through an explicit form choice.

This slice does not add schema, maintenance work orders, component tracking,
airworthiness release signing, auth/signatures, provider integrations, or
release blocking.

## Key Changes

- Add maintenance-event create/edit under
  `/aircraft/[aircraftId]/airworthiness`.
- Auto-generate `maintenanceNumber` when blank.
- Support event type, status, schedule/start/complete timestamps, provider,
  description, return-to-service timestamp, and notes.
- Allow optional linked discrepancy.
- Allow completed events to mark the linked discrepancy `CLEARED` through an
  explicit form choice.
- Keep active deferrals unchanged.

## Data Policy

- `maintenanceNumber` is optional on the form and auto-generated if blank.
- `eventType` is required.
- `status` defaults to `PLANNED`.
- If status is `COMPLETED` and `completedAt` is blank, set `completedAt`.
- `returnToServiceAt` is optional and warning-only.
- `approvedById` remains null until auth/user attribution exists.

## Boundary

- No Prisma schema changes.
- No migration.
- No maintenance work orders.
- No component tracking.
- No reliability analytics.
- No Service Difficulty Reports.
- No file uploads.
- No vendor/provider integrations.
- No auth, roles, signatures, or user attribution.
- No airworthiness release signing.
- No hard release blocking.

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
- Create a maintenance event without a discrepancy.
- Create or edit a maintenance event linked to a discrepancy.
- Mark a linked event `COMPLETED`.
- Confirm the explicit discrepancy-clear option marks the linked discrepancy
  `CLEARED`.
- Confirm `/aircraft` still renders.
- Confirm `/operations-control/[flightLegId]` still treats airworthiness as
  warning-only.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return successfully.

## Next Slice

```text
Prompt 42: Airworthiness release planning
```

Prompt 42 should be planning-only. It should decide how aircraft
airworthiness releases are created, superseded, voided, and used by release
readiness before adding signing/release writes.
