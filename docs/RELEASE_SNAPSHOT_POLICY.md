# Release Snapshot Policy

Last updated: 2026-06-07

This document defines how AeroOps should create preview release-readiness
snapshots. Current release behavior remains warning-only.

## Current Decision

Snapshots are explicit preview records.

A user must click "Capture preview snapshot" on FlightLeg detail. The app must
not create snapshots automatically on page load, mark released, cancel release,
or void release.

Snapshot creation must not change `FlightRelease.status`, block release actions,
or mutate release evidence.

Implementation status: Prompt 55 added explicit preview snapshot capture on
FlightLeg detail. Automatic snapshots and hard blocking remain deferred.

Prompt 56 validated repeated explicit preview captures and confirmed release
actions remain unchanged.

Prompt 57 added `/internal/release-snapshot-readiness`, a read-only diagnostic
that compares live readiness with each FlightLeg's latest explicit preview
snapshot and flags missing or drifted snapshots. It does not create snapshots
or change release behavior.

Prompt 58 validated missing-snapshot, drifted-snapshot, and fresh-capture
current cases. Snapshot drift remains informational only.

## Snapshot Purpose

Preview snapshots preserve what the release-readiness checklist showed at a
specific time. They are useful for testing policy behavior before hard blocking
exists.

They are not release approvals, overrides, signatures, or dispatch packages.

## Data Source

The live FlightLeg detail readiness checklist is the source of truth for the
first snapshot implementation.

Prompt 55 should move the readiness item builder into a reusable helper so both
the UI and snapshot writer use the same data.

## Snapshot Records

`ReleaseReadinessSnapshot` should store:

- FlightLeg ID.
- FlightRelease ID.
- ReleasePolicyProfile ID.
- Authority class.
- Snapshot status.
- Evaluated timestamp.
- Summary JSON with total, passed, failed/block, warning, and not-applicable
  counts.

`ReleaseReadinessFinding` should store one row per readiness item:

- Rule key.
- Readiness category.
- Severity.
- Status.
- Overridable flag.
- Summary message.
- Evidence reference type and ID where available.
- Details JSON where useful.

## Status Mapping

Use this first mapping:

- Ready item with no concern: `PASS`.
- Not-ready item with blocker severity: `FAIL`.
- Not-ready item with warning severity: `WARNING`.
- Deferred or not-relevant future item: `NOT_APPLICABLE`.

Snapshot status:

- `PASS` when all findings pass.
- `BLOCKED` when at least one finding is `FAIL`.
- `WARNING_ONLY` when there are warnings but no failed/blocking findings.

This status is preview-only and does not enforce blocking.

## Missing Policy Profile

If the FlightLeg operating authority has no default release policy profile, the
snapshot action should show a readable error and create no records.

## Deferred

- Automatic release-attempt snapshots.
- Hard release blocking.
- Snapshot drift enforcement.
- Override workflow.
- Auth, roles, permissions, and signatures.
- Provider-backed verification.
- File uploads.
- `ReleasePackage`.
