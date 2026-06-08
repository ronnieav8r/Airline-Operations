# Prompt 66: Weight-and-Balance Approval QA

## Summary

Validate the W&B approval workflow added in Prompt 65.

This is a QA/docs slice unless a defect is found. Keep release behavior
warning-only. Do not add schema changes, hard blocking, auth/signatures,
provider integrations, file uploads, override workflow, `ReleasePackage`,
automatic snapshots, release-action changes, or new mutation actions.

## QA Scope

- Verify a `CALCULATED` W&B run with takeoff weight, landing weight, and center
  of gravity can be approved.
- Verify approval sets `status = APPROVED` and `approvedAt`.
- Verify `approvedById` remains null until auth exists.
- Verify DRAFT W&B runs cannot be approved.
- Verify incomplete CALCULATED W&B runs cannot be approved.
- Verify a W&B run cannot be approved through the wrong FlightLeg route.
- Verify approved W&B runs cannot be edited or voided.
- Verify non-approved Add, Save, Mark Calculated, and Void behavior remains
  unchanged.
- Verify FlightLeg detail Release Evidence Action Panel and Release Readiness
  still render.
- Verify release behavior remains warning-only.

## Test Plan

- Run `npm run db:local:up`.
- Run `npm run db:local:migrate`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check:
  - `/operations-control/[flightLegId]/weight-balance`.
  - `/operations-control/[flightLegId]`.
  - `/api/health`.
  - Main routes: `/`, `/operations-control`, `/flights`, `/aircraft`, `/crew`,
    and `/scheduling`.

## Assumptions

- Local QA data may include prior W&B runs from earlier smoke checks.
- Approval is a workflow state only, not a legal signature.
- `CALCULATED` and `APPROVED` both continue to count as W&B ready until a
  later release-blocking policy slice changes that behavior.
- Prompt 66 should update QA/status docs and commit even if no code changes are
  needed.
