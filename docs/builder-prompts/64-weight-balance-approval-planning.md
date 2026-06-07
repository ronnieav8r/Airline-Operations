# Prompt 64: Weight-and-Balance Approval Workflow Planning

## Summary

Plan the first W&B approval workflow before implementation. The chosen policy is
**Calculated only**: a W&B run must be `CALCULATED` before it can become
`APPROVED`.

This is a planning/docs slice only. Do not implement approval actions in this
prompt. Do not add schema changes, hard release blocking, auth/signatures,
provider integrations, file uploads, override workflow, `ReleasePackage`,
automatic snapshots, or `FlightRelease` behavior changes.

## Key Decisions

- Use existing `WeightBalanceRun.status`, `approvedAt`, and `approvedById`.
- Add no schema or migration for the first approval workflow.
- Approval action applies only to a run with status `CALCULATED`.
- `approvedById` remains `null` until auth exists.
- Approved runs remain locked from edit and void in the existing W&B workflow.
- Editing a non-approved run continues to reset it to `DRAFT`.
- Release readiness continues to treat `CALCULATED` or `APPROVED` as ready for
  now.

## Prompt 65 Target

Prompt 65 should implement W&B approval under
`/operations-control/[flightLegId]/weight-balance`.

Minimum behavior:

- Add an `Approve` action for `CALCULATED` runs only.
- Set `status = APPROVED` and `approvedAt = now`.
- Reject approval if required fields are missing:
  - Takeoff weight.
  - Landing weight.
  - Center of gravity.
- Reject approval if the run does not belong to the FlightLeg.
- Keep approved runs non-editable and non-voidable.
- Show approved timestamp in the W&B run card.
- Keep existing Add, Save, Mark Calculated, and Void behavior unchanged for
  non-approved runs.

## Deferred

- Auth and approver identity.
- Signatures or legal attestation.
- W&B approval audit history.
- Automated W&B calculations.
- Hard release blocking.
- Provider integrations.
- File uploads.
- `ReleasePackage`.

## Test Plan For Prompt 65

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Local smoke:
  - Create or use a W&B run.
  - Mark it `CALCULATED`.
  - Approve it and confirm `APPROVED` plus `approvedAt`.
  - Confirm approved run cannot be edited or voided.
  - Confirm DRAFT run cannot be approved.
  - Confirm FlightLeg detail action panel and Release Readiness still render.
  - Confirm `/api/health` and main routes still load.

## Assumptions

- No auth exists, so approval records timestamp only.
- Approval is a workflow state, not a legal signature.
- `CALCULATED` remains acceptable for readiness until a later release-blocking
  policy slice decides otherwise.
- Prompt 64 does not implement Prompt 65.
