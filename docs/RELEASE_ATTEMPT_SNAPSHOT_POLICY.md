# Release Attempt Snapshot Policy

Last updated: 2026-06-07

## Decision

Release-control actions should capture a best-effort readiness snapshot before
the release status changes.

This is not hard release blocking. A failed or missing snapshot must not stop
Mark Released, Cancel Release, or Void Release.

Implementation status: Prompt 80 implements best-effort pre-action release
attempt snapshots and linked release audit events using existing tables.

## Attempt Definition

A release attempt is one of these submitted actions on FlightLeg detail:

- Mark Released.
- Cancel Release.
- Void Release.

## Snapshot Timing

Capture the readiness snapshot before mutating `FlightRelease.status`. This
preserves what the readiness checklist looked like at the moment the operator
attempted the release action.

## Data Model

Use existing tables:

- `ReleaseReadinessSnapshot`
- `ReleaseReadinessFinding`
- `ReleaseAuditEvent`

No schema change is required for the first attempt-snapshot workflow.

Attempt context should be stored in `ReleaseReadinessSnapshot.summary` JSON:

- `source: "release-attempt"`
- `attemptedReleaseStatus`
- `attemptedAction`
- `capturedBeforeStatus`

Each release action should create a `ReleaseAuditEvent`:

- `RELEASE_COMPLETED` for Mark Released.
- `RELEASE_CANCELLED` for Cancel Release.
- `RELEASE_VOIDED` for Void Release.

The audit event should link to the snapshot when capture succeeds. If capture
is skipped, the audit event should include the skip reason in metadata.

## Missing Policy Profile

If the FlightLeg operating authority has no default release policy profile,
release action should continue. The app should skip snapshot capture and record
the skip reason in release audit metadata.

## Deferred

- Hard release blocking.
- Override workflow.
- Auth, roles, permissions, and signatures.
- Provider-backed verification.
- File uploads.
- `ReleasePackage`.
- Snapshot drift enforcement.
