# Prompt 57: Release Snapshot Diagnostic Readiness

## Summary

Add a read-only internal diagnostic that compares each FlightLeg's current live
release-readiness checklist with its latest captured preview snapshot.

This is a diagnostic-only slice. Keep release behavior warning-only. Do not add
hard blocking, auth/signatures, provider integrations, file uploads, override
workflow, `ReleasePackage`, automatic snapshots, or release-action changes.

## Key Changes

- Add `/internal/release-snapshot-readiness`.
- Add a read-only helper that:
  - Loads FlightLeg release-evidence detail.
  - Computes live readiness items from the existing readiness helper.
  - Uses the same severity/status mapping as preview snapshot capture.
  - Finds the latest captured `ReleaseReadinessSnapshot`.
  - Compares live findings with latest snapshot findings by readiness category
    and rule key.
- Diagnostic should show:
  - Total FlightLegs checked.
  - FlightLegs with no snapshot.
  - FlightLegs whose latest snapshot matches live readiness.
  - FlightLegs whose latest snapshot differs from live readiness.
  - Per-FlightLeg route, authority, release status, latest snapshot time,
    live counts, snapshot counts, and mismatch details.

## Comparison Rules

- Missing latest snapshot is a diagnostic issue, but not a release blocker.
- A live item missing from the latest snapshot is a mismatch.
- A snapshot finding that no longer exists in live readiness is a mismatch.
- A matching item is considered current when status, severity, and summary
  match the current live readiness output.
- This diagnostic does not mutate snapshots, findings, releases, evidence,
  policy profiles, or rules.

## Docs And Status

- Update `docs/PROJECT_STATUS.md`.
- Update `docs/RELEASE_SNAPSHOT_POLICY.md`.
- Update `docs/RELEASE_EVIDENCE_MUTATION_PLAN.md` if needed.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check:
  - `/internal/release-snapshot-readiness`
  - `/internal/release-policy-readiness`
  - `/operations-control/[flightLegId]`
  - `/api/health`
- Confirm the diagnostic is read-only and release actions remain unchanged.

## Assumptions

- Preview snapshots are still explicit only.
- The latest snapshot is the comparison target.
- Drift is expected after evidence changes until a new preview snapshot is
  captured.
- Snapshot drift is informational only.
