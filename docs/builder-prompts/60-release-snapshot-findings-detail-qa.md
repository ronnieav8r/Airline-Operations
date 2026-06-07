# Prompt 60: Release Snapshot Findings Detail QA

## Summary

Validate the read-only release snapshot findings detail page added in Prompt
59.

This is a QA/docs slice unless a defect is found. Keep release behavior
warning-only. Do not add hard blocking, auth/signatures, provider integrations,
file uploads, override workflow, `ReleasePackage`, automatic snapshots,
release-action changes, or schema changes.

## QA Scope

- Verify `/operations-control/[flightLegId]/snapshots/[snapshotId]` loads for
  an existing snapshot.
- Verify the page displays:
  - FlightLeg route and scheduled time.
  - FlightRelease status.
  - Policy profile and authority class.
  - Snapshot status and evaluated time.
  - Summary counts.
  - Finding category, rule key, severity, status, overridable flag, evidence
    reference, and details JSON.
- Verify a snapshot ID that does not belong to the route FlightLeg returns not
  found.
- Verify recent snapshot links on FlightLeg detail point to the detail page.
- Verify latest snapshot links in `/internal/release-snapshot-readiness` point
  to the detail page.
- Verify `/api/health` counts remain stable and release actions remain
  warning-only.

## Test Plan

- Run `npm run db:local:up`.
- Run `npm run db:local:migrate`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check:
  - `/operations-control/[flightLegId]/snapshots/[snapshotId]`
  - `/operations-control/[flightLegId]`
  - `/internal/release-snapshot-readiness`
  - `/internal/release-policy-readiness`
  - `/api/health`
  - `/operations-control`

## Assumptions

- Existing local QA snapshots are acceptable test data.
- Snapshot findings are historical and should not be recomputed by the detail
  page.
- Prompt 60 should update QA/status docs and commit even if no code changes are
  needed.
