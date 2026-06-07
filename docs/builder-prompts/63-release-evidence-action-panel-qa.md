# Prompt 63: Release Evidence Action Panel QA

## Summary

Validate the Release Evidence Action Panel added to FlightLeg detail in Prompt
62.

This is a QA/docs slice unless a defect is found. Keep release behavior
warning-only. Do not add schema changes, hard blocking, auth/signatures,
provider integrations, file uploads, override workflow, `ReleasePackage`,
automatic snapshots, release-action changes, or new mutation actions.

## QA Scope

- Verify the panel renders on `/operations-control/[flightLegId]`.
- Verify panel cards appear for:
  - Manifest.
  - Weight and balance.
  - Flight locating.
  - Dispatch package.
  - Airworthiness.
  - Preview snapshots.
- Verify the panel can represent complete, partial, and missing evidence states
  across local FlightLegs.
- Verify links route to existing workflow/detail pages:
  - Manifest.
  - W&B.
  - Locating.
  - Dispatch.
  - Airworthiness when assigned aircraft exists.
  - Latest snapshot detail when a snapshot exists.
  - Snapshot diagnostic.
- Verify main routes still load.

## Test Plan

- Run `npm run db:local:up`.
- Run `npm run db:local:migrate`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check:
  - `/operations-control/[flightLegId]` for multiple FlightLegs.
  - Existing evidence workflow links.
  - `/internal/release-snapshot-readiness`.
  - `/api/health`.

## Assumptions

- Local QA data may include prior preview snapshots and manifest changes.
- The panel is read-only and summarizes existing data only.
- Prompt 63 should update QA/status docs and commit even if no code changes are
  needed.
