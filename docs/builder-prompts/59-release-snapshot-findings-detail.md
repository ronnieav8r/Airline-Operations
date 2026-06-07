# Prompt 59: Release Snapshot Findings Detail

## Summary

Add a read-only detail page for a captured preview release-readiness snapshot
and its findings.

This slice should make existing snapshot records inspectable. Do not add hard
blocking, auth/signatures, provider integrations, file uploads, override
workflow, `ReleasePackage`, automatic snapshots, release-action changes, or
schema changes.

## Key Changes

- Add `/operations-control/[flightLegId]/snapshots/[snapshotId]`.
- Show snapshot metadata:
  - FlightLeg number and route.
  - Flight release status.
  - Policy profile and authority class.
  - Snapshot status and evaluated time.
  - Summary counts.
- Show all `ReleaseReadinessFinding` rows:
  - Readiness category.
  - Rule key.
  - Severity.
  - Finding status.
  - Overridable flag.
  - Summary message.
  - Evidence reference type/ID when present.
  - Details JSON.
- Link recent snapshots on FlightLeg detail to the snapshot detail page.
- Link latest snapshots in `/internal/release-snapshot-readiness` to the same
  detail page.

## Rules

- Detail page is read-only.
- Snapshot records are historical; the page should not recompute or mutate live
  readiness.
- If the snapshot does not belong to the route FlightLeg, return not found.
- Missing evidence references should display as missing, not error.

## Docs And Status

- Update `docs/PROJECT_STATUS.md`.
- Update `docs/RELEASE_SNAPSHOT_POLICY.md`.
- Update `docs/RELEASE_EVIDENCE_MUTATION_PLAN.md`.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check:
  - `/operations-control/[flightLegId]/snapshots/[snapshotId]`
  - `/operations-control/[flightLegId]`
  - `/internal/release-snapshot-readiness`
  - `/api/health`

## Assumptions

- Snapshot findings are already created by the explicit preview capture action.
- This page inspects stored historical records only.
- Release behavior remains warning-only.
