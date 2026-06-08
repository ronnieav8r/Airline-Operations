# Prompt 81: Release Attempt Snapshot QA

## Summary

Validate the Prompt 80 release-attempt snapshot foundation. Keep this slice
QA/docs only unless a defect is found.

## QA Scope

- Confirm Mark Released creates:
  - `FlightRelease.status = RELEASED`;
  - one release-attempt readiness snapshot;
  - one `RELEASE_COMPLETED` audit event linked to the snapshot.
- Confirm Cancel Release creates:
  - `FlightRelease.status = CANCELLED`;
  - one release-attempt readiness snapshot;
  - one `RELEASE_CANCELLED` audit event linked to the snapshot.
- Confirm Void Release creates:
  - `FlightRelease.status = VOIDED`;
  - one release-attempt readiness snapshot;
  - one `RELEASE_VOIDED` audit event linked to the snapshot.
- Confirm explicit preview snapshot capture still creates
  `source: "explicit-preview"` snapshots with findings.
- Confirm release actions remain warning-only and available even when readiness
  has failed or warning findings.
- Confirm route/browser smoke checks still pass.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Run local release-action workflow smoke against a real FlightLeg.
- Start the local app.
- Visit `/operations-control/[flightLegId]`.
- Confirm Release Evidence detail, Preview Snapshots, and Release Control still
  render.
- Confirm `/api/health`, `/internal/release-snapshot-readiness`,
  `/operations-control`, `/flights`, `/aircraft`, `/crew`, and `/scheduling`
  still load.

## Assumptions

- Prompt 81 does not add schema or app behavior.
- Release attempt snapshots remain best-effort.
- Release actions remain warning-only.
