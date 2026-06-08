# Prompt 65: Weight-and-Balance Approval Foundation

## Summary

Implement the first W&B approval workflow under
`/operations-control/[flightLegId]/weight-balance`.

This is a small workflow slice. Do not add schema changes, auth/signatures,
hard release blocking, provider integrations, file uploads, override workflow,
`ReleasePackage`, automatic snapshots, or `FlightRelease` behavior changes.

## Key Changes

- Add an `Approve` action for W&B runs with status `CALCULATED`.
- Set `status = APPROVED` and `approvedAt = now`.
- Keep `approvedById` null until auth exists.
- Reject approval if the run:
  - Does not belong to the route FlightLeg.
  - Is not `CALCULATED`.
  - Is missing takeoff weight.
  - Is missing landing weight.
  - Is missing center of gravity.
- Keep approved runs non-editable and non-voidable.
- Show approved timestamp in the W&B run card.
- Keep existing Add, Save, Mark Calculated, and Void behavior unchanged for
  non-approved runs.

## Policy

- Approval is a workflow state, not a legal signature.
- Release readiness remains warning-only.
- `CALCULATED` and `APPROVED` both continue to count as W&B ready until a later
  release-blocking policy slice changes that behavior.

## Docs And Status

- Update `docs/PROJECT_STATUS.md`.
- Update `docs/RELEASE_EVIDENCE_MUTATION_PLAN.md`.
- Add QA target for Prompt 66.

## Test Plan

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

- No auth exists, so `approvedById` remains null.
- No approval audit history is required for this slice.
- No hard release blocking is allowed in this slice.
