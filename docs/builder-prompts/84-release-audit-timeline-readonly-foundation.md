# Prompt 84: Release Audit Timeline Read-Only Foundation

## Summary

Implement the first read-only release audit timeline on FlightLeg detail using
existing `ReleaseAuditEvent` rows.

## Key Changes

- Extend the FlightLeg detail query with recent release audit events.
- Add a `Release Audit Timeline` section below Preview Snapshots and above
  Release Control.
- Show event type, message, created time, actor placeholder, snapshot link, and
  attempt metadata summary.
- Show snapshot skipped reason when no snapshot link exists.

## Guardrails

- Read-only only.
- No audit mutation.
- No schema changes.
- No auth/signatures.
- No hard release blocking.
- No provider integrations.
- No file uploads.
- No `ReleasePackage`.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Visit `/operations-control/[flightLegId]`.
- Confirm the Release Audit Timeline renders when audit events exist.
- Confirm linked snapshot detail routes load.
- Confirm FlightLeg detail still renders when no audit events exist.
- Confirm `/api/health`, `/internal/release-snapshot-readiness`, and main
  routes still load.

## Assumptions

- Prompt 80/81 local data includes release audit events for the main demo
  FlightLeg.
- The first timeline is FlightLeg-local only.
