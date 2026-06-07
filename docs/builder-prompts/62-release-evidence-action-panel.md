# Prompt 62: Release Evidence Action Panel

## Summary

Add a compact read-only action/status panel near the top of FlightLeg detail so
users can quickly see the evidence areas and jump to the right existing
workflow.

This is a UI-only slice. Do not add new mutation actions, schema changes, hard
blocking, auth/signatures, provider integrations, file uploads, override
workflow, `ReleasePackage`, automatic snapshots, or release-action changes.

## Key Changes

- Add a Release Evidence Action Panel on
  `/operations-control/[flightLegId]` after the FlightLeg summary cards and
  before Release Readiness.
- Include one card for each area:
  - Manifest.
  - Weight and balance.
  - Flight locating.
  - Dispatch package.
  - Airworthiness.
  - Preview snapshots.
- Each card should show:
  - Status or missing state.
  - Concise readiness message.
  - Primary link to the existing workflow or detail route.
- Reuse existing FlightLeg detail query data.
- Keep the existing detailed evidence sections below the panel.

## Panel Behavior

- Manifest card links to `/operations-control/[flightLegId]/manifest`.
- W&B card links to `/operations-control/[flightLegId]/weight-balance`.
- Locating card links to `/operations-control/[flightLegId]/locating`.
- Dispatch card links to `/operations-control/[flightLegId]/dispatch`.
- Airworthiness card links to the assigned aircraft airworthiness page when an
  assigned aircraft exists; otherwise no link.
- Preview snapshots card links to the latest snapshot detail when one exists;
  otherwise it should point users back to the explicit capture button in Release
  Readiness.

## Docs And Status

- Update `docs/PROJECT_STATUS.md`.
- Update `docs/RELEASE_EVIDENCE_WORKFLOW_REVIEW.md`.
- Update `docs/RELEASE_EVIDENCE_MUTATION_PLAN.md`.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check:
  - `/operations-control/[flightLegId]`
  - existing evidence workflow links
  - latest snapshot detail link when present
  - `/api/health`

## Assumptions

- The panel summarizes existing data only.
- Release behavior remains warning-only.
- The existing detailed evidence sections remain below the panel.
