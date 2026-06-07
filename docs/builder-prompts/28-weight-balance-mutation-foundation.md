# Builder Prompt 28: Weight-And-Balance Mutation Foundation

## Summary

Add the first manual weight-and-balance mutation workflow for a FlightLeg. This
slice uses the existing `WeightBalanceRun` schema and does not add aircraft
configuration/capability models, automated calculations, approval, release
gating, file uploads, or provider integrations.

## Key Changes

- Added `/operations-control/[flightLegId]/weight-balance`.
- Added a link from the FlightLeg detail W&B card to the W&B workflow.
- Create manual `WeightBalanceRun` rows with:
  - run label
  - takeoff weight
  - landing weight
  - center of gravity
  - notes stored in `calculationSnapshot`
- Link new runs to the current FlightLeg manifest when one exists.
- Edit existing manual W&B runs.
- Mark draft/manual runs `CALCULATED`.
- Void runs that should no longer be used.
- Show warning-first readiness messages for missing manifest, empty manifest,
  missing takeoff weight, missing landing weight, or missing center of gravity.

## Boundary

This workflow is manual operational evidence only.

- New runs start as `DRAFT`.
- `CALCULATED` means a human-entered W&B run is ready for operational review.
- Editing a `CALCULATED` run returns it to `DRAFT`.
- `APPROVED` remains deferred until auth/user attribution and approval policy
  exist.
- Release actions remain warning-only and are not blocked by W&B readiness.

## Deferred

Not included:

- Aircraft configuration or capability schema.
- Automated W&B calculation logic.
- Performance-limit enforcement.
- Approval workflow.
- Release-readiness blocking.
- Manifest locking/amendments.
- File uploads or worksheet attachments.
- Provider integrations.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/operations-control/[flightLegId]/weight-balance` returns 200.
- Creating a manual W&B run succeeds.
- Editing the run succeeds and returns it to `DRAFT`.
- Marking the run `CALCULATED` succeeds.
- Voiding a run succeeds.
- `/operations-control/[flightLegId]` shows the latest W&B status and a manage
  link.
- `/operations-control`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness` still return 200.
