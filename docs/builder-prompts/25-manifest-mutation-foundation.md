# Builder Prompt 25: Manifest Mutation Foundation

## Summary

Add the first release-evidence mutation workflow: manual manifest management for
a FlightLeg. This slice uses the existing `Manifest` and `ManifestItem` schema
and does not add provider integrations or weight-and-balance behavior.

## Implemented Scope

- Added `/operations-control/[flightLegId]/manifest`.
- Added a link from the FlightLeg detail manifest card to the manifest workflow.
- Create a `Manifest` automatically when adding the first item or marking ready.
- Add manual `ManifestItem` rows with:
  - `personName`
  - `seatNumber`
  - `weight`
  - `baggageWeight`
  - `notes`
- Edit manual manifest items.
- Remove manifest items.
- Mark the manifest `READY`.
- Show warning-first readiness messages for missing person names or passenger
  weights.

## Boundaries

- No schema migration is included.
- No manifest locking or amendment workflow is included.
- No passenger identity redesign is included.
- No weight-and-balance calculation is included.
- No flight locating mutation is included.
- No dispatch-package assembly is included.
- No weather, NOTAM, or flight-plan provider calls are included.
- No release gating is included.
- No auth or user attribution is included.

## Validation

Use the standard validation set:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/operations-control/[flightLegId]/manifest`.
- Add at least one manual manifest item.
- Edit the item.
- Mark the manifest `READY`.
- Confirm `/operations-control/[flightLegId]` shows the manifest status and item
  count.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return 200.
