# Prompt 82: Next Release Workflow Planning

## Summary

Choose the next small release-evidence workflow improvement after release
attempt snapshots. This is a planning/docs-only slice.

## Decision

The next workflow target should be a read-only release audit timeline on
FlightLeg detail.

Rationale:

- Prompt 80 now creates `ReleaseAuditEvent` rows for release-control actions.
- Prompt 81 validated the audit events and linked attempt snapshots.
- The operator cannot easily see this audit trail yet.
- A read-only timeline improves transparency without adding release blocking,
  auth, signatures, provider integrations, file uploads, `ReleasePackage`, or
  schema changes.

## Prompt 83 Target

Prompt 83 should plan the release audit timeline before implementation.

Minimum planning decisions:

- Where the timeline appears on FlightLeg detail.
- Which audit event fields to show.
- How to link audit events to readiness snapshots.
- How to display skipped snapshot metadata.
- How to keep audit visibility read-only.

## Prompt 84 Target

Prompt 84 should implement the read-only timeline.

Minimum behavior:

- Query recent `ReleaseAuditEvent` rows for the FlightLeg.
- Show event type, message, created time, actor placeholder, snapshot link, and
  metadata summary.
- Link to the existing snapshot detail page when `snapshotId` exists.
- Keep release actions and readiness warning-only.

## Deferred

- Auth/signatures.
- Hard release blocking.
- Override workflow.
- Provider integrations.
- File uploads.
- `ReleasePackage`.
- Audit-event mutation outside existing release actions.
- Schema changes.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start local app.
- Confirm `/operations-control/[flightLegId]`, `/api/health`,
  `/internal/release-snapshot-readiness`, and main routes still load.

## Assumptions

- The existing audit event model is sufficient for read-only visibility.
- The first UI should be FlightLeg-local, not a global audit console.
