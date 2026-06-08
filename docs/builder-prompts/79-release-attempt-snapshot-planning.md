# Prompt 79: Release Attempt Snapshot Planning

## Summary

Plan release-attempt snapshots before changing release actions. The chosen
policy is **best-effort pre-action snapshots** using the existing
`ReleaseReadinessSnapshot`, `ReleaseReadinessFinding`, and `ReleaseAuditEvent`
tables.

This remains warning-only. Do not add hard blocking, auth/signatures, provider
integrations, file uploads, `ReleasePackage`, overrides, or schema changes.

## Key Decisions

- A release attempt is a submitted release-control action:
  - Mark Released.
  - Cancel Release.
  - Void Release.
- Prompt 80 should capture readiness before the release status mutation.
- Attempt snapshots use the same readiness source as explicit preview
  snapshots.
- Attempt snapshots do not block the release action.
- If a default release policy profile is missing, the release action must still
  proceed and should record a release audit event noting that snapshot capture
  was skipped.
- Attempt snapshots should create normal `ReleaseReadinessSnapshot` and
  `ReleaseReadinessFinding` rows when policy data exists.
- Snapshot `summary` JSON should distinguish attempt captures from manual
  previews with fields such as:
  - `source: "release-attempt"`
  - `attemptedReleaseStatus`
  - `attemptedAction`
  - `capturedBeforeStatus`
- Create a linked `ReleaseAuditEvent` for each release action.
- The audit event should link to the snapshot when one was captured.
- `actorUserId` remains null until auth exists.

## Prompt 80 Target

Prompt 80 should refactor the existing explicit preview snapshot writer into a
shared helper used by:

- `captureReleasePreviewSnapshotAction`.
- `markFlightLegReleasedAction`.
- `cancelFlightLegReleaseAction`.
- `voidFlightLegReleaseAction`.

Minimum behavior:

- Explicit preview snapshot behavior remains unchanged.
- Release actions still update `FlightRelease.status` exactly as they do today.
- Before a release action mutates status, attempt to capture a readiness
  snapshot with source `release-attempt`.
- Create one `ReleaseAuditEvent` for the release action:
  - `RELEASE_COMPLETED` for Mark Released.
  - `RELEASE_CANCELLED` for Cancel Release.
  - `RELEASE_VOIDED` for Void Release.
- Include snapshot ID in the audit event when captured.
- Include skip reason in audit metadata when snapshot capture is skipped.
- Do not surface blocking errors for failed snapshot capture.
- Keep release actions available even when readiness would fail/block in the
  preview policy.

## Deferred

- Hard release blocking.
- Override workflow.
- Auth, roles, permissions, and signatures.
- Provider-backed verification.
- File uploads.
- `ReleasePackage`.
- Snapshot drift enforcement.

## Test Plan For Prompt 80

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Mark a FlightLeg released and confirm:
  - release status changes to `RELEASED`;
  - one attempt snapshot is captured when policy data exists;
  - one `RELEASE_COMPLETED` audit event exists and links the snapshot.
- Cancel a FlightLeg release and confirm:
  - release status changes to `CANCELLED`;
  - one attempt snapshot is captured when policy data exists;
  - one `RELEASE_CANCELLED` audit event exists and links the snapshot.
- Void a released FlightLeg and confirm:
  - release status changes to `VOIDED`;
  - one attempt snapshot is captured when policy data exists;
  - one `RELEASE_VOIDED` audit event exists and links the snapshot.
- Confirm release actions remain warning-only when readiness has failed or
  warning findings.
- Confirm explicit preview snapshot action still works.
- Confirm `/operations-control/[flightLegId]`, `/api/health`,
  `/internal/release-snapshot-readiness`, and main routes still load.

## Assumptions

- Existing release-policy defaults are present in local/demo data.
- Existing release snapshot tables are sufficient for attempt snapshots.
- Existing release audit event table is sufficient for release-action audit
  events.
- Snapshot capture must never become release blocking in Prompt 80.
