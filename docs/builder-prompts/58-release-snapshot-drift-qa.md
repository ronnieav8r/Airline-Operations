# Prompt 58: Release Snapshot Drift QA

## Summary

Validate the read-only release snapshot diagnostic added in Prompt 57.

This is a QA/docs slice unless the diagnostic exposes a defect. Keep release
behavior warning-only. Do not add hard blocking, auth/signatures, provider
integrations, file uploads, override workflow, `ReleasePackage`, automatic
snapshots, or release-action changes.

## QA Scope

- Verify `/internal/release-snapshot-readiness` loads successfully.
- Verify the diagnostic reports FlightLegs with no captured snapshot.
- Verify the diagnostic reports drift when live readiness differs from the
  latest captured preview snapshot.
- Verify capturing a fresh explicit preview snapshot returns a stable FlightLeg
  to current status when evidence has not changed.
- Verify `/internal/release-policy-readiness`, `/operations-control/[flightLegId]`,
  and `/api/health` still load.
- Verify release actions remain independent from snapshot diagnostics.

## Allowed Local QA Actions

- Use the local Docker database only.
- Create local preview snapshots through the existing explicit snapshot action.
- Temporarily modify local demo evidence if needed to produce a drift case.
- Restore or leave local-only QA data as acceptable demo-state drift, but do not
  add seed/backfill behavior in this slice.

## Stop Conditions

- Stop if QA implies a schema change.
- Stop if release blocking policy becomes ambiguous.
- Stop if fixing a defect would require changing `FlightRelease` behavior.
- Stop if provider integrations, auth/signatures, overrides, or file uploads
  become tempting.

## Test Plan

- Run `npm run db:local:up`.
- Run `npm run db:local:migrate`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check:
  - `/internal/release-snapshot-readiness`
  - `/internal/release-policy-readiness`
  - `/operations-control/[flightLegId]`
  - `/api/health`
  - `/operations-control`
- Document QA results in `docs/RELEASE_POLICY_QA_LOG.md`.

## Assumptions

- Snapshot diagnostics are informational only.
- Missing snapshots and drift do not block release actions.
- A fresh preview snapshot should match live readiness for a stable FlightLeg.
