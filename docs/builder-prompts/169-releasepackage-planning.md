# Prompt 169: ReleasePackage Planning

## Summary

Plan `ReleasePackage` as an additive final evidence bundle around the existing
`FlightRelease`. It should not replace `FlightRelease` in the first
implementation. `FlightRelease` remains the release decision/status record.

## Key Decisions

- `ReleasePackage` is a package/header plus evidence links for a FlightLeg
  release packet.
- `FlightRelease` remains the operational release status and release decision
  record.
- A package can be captured as an explicit preview/finalization artifact, but
  package capture does not hard-block or mutate `FlightRelease` in the first
  implementation.
- Package contents are snapshots/links to evidence that already exists:
  `FlightLeg`, `OperationalControlRecord`, `FlightRelease`,
  `ReleaseReadinessSnapshot`, `Manifest`, `WeightBalanceRun`,
  `FlightLocatingRecord`, `DispatchPackage`, current aircraft airworthiness
  release, aircraft configuration/capability context, discrepancies/deferrals,
  and optional release audit events.
- The first schema should be additive only and should not move existing
  readiness snapshot, override, or audit relations away from `FlightRelease`.
- File uploads, signatures, final legal attestation, hard blocking, provider
  integrations, and override workflow remain deferred.

## Prompt 170 Target

Add an additive ReleasePackage schema foundation:

- `ReleasePackage`: package header linked to `FlightLeg`,
  `OperationalControlRecord`, `FlightRelease`, optional latest readiness
  snapshot, status, package number, captured/finalized timestamps, captured by
  user, summary JSON, and notes.
- `ReleasePackageEvidenceLink`: one row per linked evidence artifact, with
  evidence type, evidence ID, label, status/summary copy, required flag, and
  captured metadata JSON.
- Optional enum for package status, such as `DRAFT`, `PREVIEW`, `FINALIZED`,
  `VOIDED`.
- Optional enum for evidence link type, covering manifest, W&B, locating,
  dispatch, weather, NOTAM, flight plan, airworthiness, maintenance,
  discrepancy, deferral, readiness snapshot, and release audit.

Prompt 170 must not change current `FlightRelease` actions, hard-block release,
add file uploads, add signatures, add provider integrations, or remove existing
tables.

## Prompt 171 Target

Add a read-only package completeness preview on FlightLeg detail:

- Show whether a package exists.
- Show linked evidence categories and missing categories.
- Show latest preview/finalized package metadata.
- Keep current release actions warning-first and unchanged.

## Prompt 172 Target

Add explicit package preview capture only:

- User clicks a capture action.
- The app creates a package header plus evidence links based on current evidence.
- The action does not mutate `FlightRelease.status`.
- The action does not require a package before release.

## Prompt 173 Target

QA schema, preview, capture, and no-regression behavior.

## Stop Boundary

Prompt 169 is planning only. No schema or UI changes are included.
