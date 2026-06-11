# MVP Release Lifecycle Plan

Last updated: 2026-06-11

## Summary

The MVP release backend remains warning-only. `FlightRelease` is the release
decision/status record, and `ReleasePackage` is the evidence bundle around that
decision. Release readiness findings may warn or preview future blockers, but
they do not prevent release actions in MVP.

## MVP Release States

Use the existing `FlightRelease.status` values:

- `PLANNED`: release placeholder exists but no release action completed.
- `RELEASED`: ops/admin marked the FlightLeg released.
- `CANCELLED`: release was cancelled/withdrawn.
- `VOIDED`: release record/action was entered in error.

FlightLeg status alignment:

- `RELEASED` sets `FlightLeg.status = RELEASED`.
- `CANCELLED` and `VOIDED` clear release completion state and keep the leg
  operationally available by setting `FlightLeg.status = SCHEDULED`.
- Flight cancellation as an operational event is separate and should not be
  implied by `FlightRelease.status = CANCELLED` in MVP.

## Required Release Action Behavior

Prompt 225 should ensure Mark Released, Cancel Release, and Void Release:

- Require `ADMIN` or `OPS`.
- Capture a best-effort release-attempt readiness snapshot before status
  mutation.
- Update `FlightRelease.status`, `releasedAt`, and `releasedById` consistently.
- Keep `FlightLeg.status` aligned by the MVP rules above.
- Create one `ReleaseAuditEvent` with actor user, actor role, attempted action,
  attempted status, prior status, snapshot ID when captured, and skipped reason
  when not captured.
- Keep release actions available even when readiness has warnings or future
  would-block findings.

Prompt 225 implementation status: complete. Release attempt snapshots now store
actor user and role metadata, release audit events store `actorRole`, and smoke
workflow assertions verify release audit attribution while release actions
remain warning-only.

## ReleasePackage Boundary

Prompt 225 should not implement final ReleasePackage capture. Prompt 226 should
plan final capture separately.

MVP direction for that later slice:

- Preview package capture remains available and non-mutating to
  `FlightRelease`.
- Final package capture should be explicit, attributed, and linked to the
  current `FlightRelease`, latest readiness snapshot, and available evidence.
- Final package capture still must not hard-block release until a later policy
  slice approves enforcement.

## Deferred

- Hard release blocking.
- Legal signatures.
- Override workflow.
- Provider-backed evidence verification.
- File uploads/document generation.
- Destructive release/legacy data cleanup.
