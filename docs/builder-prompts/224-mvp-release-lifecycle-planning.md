# Prompt 224: MVP Release Lifecycle Planning

## Summary

Plan the warning-only MVP release lifecycle before tightening release behavior.

## Key Decisions

- `FlightRelease` remains the release decision/status record.
- `ReleasePackage` remains the evidence bundle and does not replace
  `FlightRelease`.
- Release actions remain warning-only.
- `RELEASED` aligns `FlightLeg.status` to `RELEASED`.
- `CANCELLED` and `VOIDED` clear release completion state and leave the leg
  operationally available as `SCHEDULED`.
- Every release action should create an attributed audit event and attempt a
  readiness snapshot.

## Prompt 225 Target

Tighten release action implementation only:

- Add actor role to release audit events.
- Ensure status, `releasedAt`, `releasedById`, FlightLeg status, attempt
  snapshot metadata, and audit metadata are consistent for mark released,
  cancel release, and void release.
- Keep release actions warning-only.

## Docs

- Added `docs/MVP_RELEASE_LIFECYCLE_PLAN.md`.
- Update backend MVP and release docs/status.

## Validation

- `git diff --check`
