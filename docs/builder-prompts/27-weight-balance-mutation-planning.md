# Builder Prompt 27: Weight-And-Balance Mutation Planning

## Summary

Plan the first `WeightBalanceRun` mutation workflow after manifest and flight
locating writes. This slice is planning/docs only. It does not add schema,
routes, actions, provider integrations, automated calculations, approval, or
release gating.

## Decision

Build the first weight-and-balance workflow as manual operational evidence
entry under the existing FlightLeg detail surface.

Chosen implementation slice:

```text
Prompt 28: Weight-and-balance mutation foundation
```

## Prompt 28 Scope

Prompt 28 should add a narrow workflow at:

```text
/operations-control/[flightLegId]/weight-balance
```

Minimum workflow:

- Create a manual `WeightBalanceRun` for a FlightLeg.
- Link the run to the current `Manifest` when a manifest exists.
- Edit the manual run's label, takeoff weight, landing weight, center of
  gravity, and notes.
- Mark a draft run `CALCULATED`.
- Void a run when it should no longer be used.
- Show warnings when the linked manifest is missing, the manifest has no items,
  or the run is missing takeoff weight, landing weight, or center of gravity.
- Add a link from `/operations-control/[flightLegId]` to the W&B workflow.

## Data Policy

Use the existing `WeightBalanceRun` schema only.

- `runLabel` is required and must remain unique per FlightLeg.
- `takeoffWeight` and `landingWeight` are optional decimals in this first
  workflow, but missing values should create a warning.
- `centerOfGravity` is optional text in this first workflow, but a missing value
  should create a warning.
- `manifestId` should point to the current FlightLeg manifest when one exists.
- `calculationSnapshot` should store manual-entry context, not computed
  performance data.

Recommended `calculationSnapshot` shape:

```json
{
  "method": "manual_v1",
  "notes": "Dispatcher-entered assumptions or worksheet reference.",
  "manifestItemCount": 4,
  "enteredAt": "2026-06-07T00:00:00.000Z"
}
```

## Status Policy

Use warning-first behavior.

- New runs start as `DRAFT`.
- `CALCULATED` means a human-entered W&B run is ready for operational review.
- `APPROVED` remains deferred until user attribution, approval authority, and
  release-readiness policy are planned.
- `VOIDED` is allowed for runs that should not be used.
- Release controls must not be blocked by this workflow yet.

## Deferred

Do not include these in Prompt 28:

- Aircraft configuration or capability schema.
- Automated W&B calculations.
- Performance-limit enforcement.
- Approval workflow or approver attribution.
- Release gating.
- File uploads.
- Provider integrations.
- Manifest locking or amendment logic.
- Any rewrite of the current manifest workflow.

## Validation

Prompt 28 should run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open a FlightLeg detail page.
- Open `/operations-control/[flightLegId]/weight-balance`.
- Create a manual W&B run.
- Edit the run.
- Mark it `CALCULATED`.
- Void a second draft run or confirm void action is available.
- Confirm `/operations-control/[flightLegId]` shows the latest W&B status.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return 200.

## Stop Conditions

Stop before implementation if:

- A schema migration appears necessary.
- The workflow needs aircraft configuration/capability data.
- The workflow needs automated calculations.
- Approval or release-blocking policy becomes necessary to define.
- Provider or external worksheet integration becomes tempting.
