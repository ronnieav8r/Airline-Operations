# Prompt 80: Release Attempt Snapshot Foundation

## Summary

Implement best-effort pre-action readiness snapshots for release-control
actions. Preserve warning-only release behavior.

## Key Changes

- Refactor explicit preview snapshot creation into a shared helper.
- Keep explicit "Capture preview snapshot" behavior unchanged.
- Before release-control status mutation, attempt to capture a readiness
  snapshot with summary source `release-attempt`.
- Apply attempt snapshots to:
  - Mark Released.
  - Cancel Release.
  - Void Release.
- Create one `ReleaseAuditEvent` per release action.
- Link the audit event to the attempt snapshot when capture succeeds.
- Record snapshot skip reason in audit metadata when capture is skipped.
- Keep `actorUserId` null until auth exists.

## Guardrails

- Snapshot capture must not hard-block release actions.
- Do not add auth, signatures, provider integrations, file uploads,
  `ReleasePackage`, overrides, or schema changes.
- Do not change warning-only release readiness policy.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Mark a FlightLeg released and confirm a release-attempt snapshot plus
  `RELEASE_COMPLETED` audit event.
- Cancel a FlightLeg release and confirm a release-attempt snapshot plus
  `RELEASE_CANCELLED` audit event.
- Void a released FlightLeg and confirm a release-attempt snapshot plus
  `RELEASE_VOIDED` audit event.
- Confirm explicit preview snapshot capture still works.
- Confirm release actions remain available even when readiness has warning or
  failed findings.
- Confirm `/operations-control/[flightLegId]`, `/api/health`,
  `/internal/release-snapshot-readiness`, `/operations-control`, `/flights`,
  `/aircraft`, `/crew`, and `/scheduling` still load.

## Assumptions

- Existing release-policy defaults are present for local/demo authorities.
- Existing release snapshot and audit event tables are sufficient.
- No hard blocking is introduced.
