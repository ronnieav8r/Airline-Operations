# Builder Prompt 32: Release Readiness Guardrails Foundation

## Summary

Add warning-only release readiness guardrails to the FlightLeg detail page. This
slice reads existing manifest, weight-and-balance, locating, dispatch, weather,
NOTAM, and flight-plan evidence. It does not block release actions, mutate
evidence, add schema, introduce `ReleasePackage`, or add provider integrations.

## Key Changes

- Added a readiness checklist to `/operations-control/[flightLegId]`.
- Shows overall evidence readiness.
- Shows individual ready/needs-attention checks for:
  - Manifest
  - Weight and balance
  - Flight locating
  - Dispatch package
  - Weather
  - NOTAM
  - Flight plan
- Shows a clear warning-only note.
- Keeps current release action buttons available.

## Readiness Rules

- Manifest is ready when a manifest exists, has at least one item, and status is
  `READY` or `LOCKED`.
- W&B is ready when the latest non-voided run is `CALCULATED` or `APPROVED`.
- Locating is ready when status is `FILED`, `ACTIVE`, or `CLOSED`.
- Dispatch package is ready when it exists and links weather, NOTAM, and
  flight-plan records.
- Weather is ready when linked weather has a route summary.
- NOTAM is ready when linked NOTAM has affected station codes.
- Flight plan is ready when linked flight plan has an external reference and
  route text.

## Boundary

This is warning-only.

- Release actions are not blocked.
- Evidence records are not created or changed by the checklist.
- No schema changes are included.
- No release package model is introduced.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/operations-control/[flightLegId]` returns 200.
- The readiness checklist appears near Release Control.
- Release action buttons remain visible.
- A FlightLeg with complete local manual evidence shows all checklist items
  ready.
- `/operations-control`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness` still return 200.
