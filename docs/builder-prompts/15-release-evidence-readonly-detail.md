# Builder Prompt 15: Release Evidence Read-Only Detail

## Summary

Add a read-only evidence drilldown for one `FlightLeg`. This slice does not add
CRUD, mutations, uploads, provider integrations, or release workflow changes.

## Implemented Scope

- Added `/operations-control/[flightLegId]`.
- Added a read-only detail query for FlightLeg release evidence.
- Added links from Operations Control evidence badges to the detail page.
- Detail page shows:
  - FlightLeg summary, aircraft, authority, and release context.
  - Manifest status and manifest items.
  - Weight and balance runs.
  - Flight locating record.
  - Dispatch package with weather, NOTAM, and flight-plan references.
  - Raw demo weather and NOTAM snapshots.

## Boundaries

- `FlightRelease` remains the release-decision record.
- `ReleasePackage` remains deferred.
- `PositionReport` remains deferred.
- Provider-backed weather, NOTAM, and flight-plan integrations remain deferred.
- The detail page reads from `FlightLeg` relations only.
- Legacy `Flight` fallback rows do not get a detail link unless a FlightLeg is linked.

## Validation

Use the standard validation set:

```powershell
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/operations-control` returns 200 and links FlightLeg-backed records to detail.
- `/operations-control/[flightLegId]` returns 200 for a seeded FlightLeg.
- `/api/health` still returns nonzero release-evidence counts.
- `/internal/flightleg-parity` still reports no mismatches.
