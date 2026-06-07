# Builder Prompt 14: Release Evidence Read-Only Summaries

## Summary

Surface the new release-evidence foundation in existing read-only pages. Do not
add CRUD, mutations, forms, uploads, provider integrations, or release workflow
changes.

## Implemented Scope

- Dashboard `/` shows evidence-ready and evidence-partial/missing counts.
- Dashboard flight board shows a release-evidence badge per FlightLeg-backed row.
- Operations Control `/operations-control` shows read-only evidence summary
  counts for manifests, weight and balance, locating, and dispatch packages.
- Operations Control control-record table shows compact evidence badges for each
  FlightLeg-backed record.

## Boundaries

- `FlightRelease` remains the release-decision record.
- `ReleasePackage` remains deferred.
- `PositionReport` remains deferred.
- Evidence summaries read from `FlightLeg` relations only.
- Legacy `Flight` fallback rows display no FlightLeg evidence instead of trying
  to infer evidence from legacy tables.

## Validation

Use the standard validation set:

```powershell
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/` returns 200 and shows release-evidence summary counts.
- `/operations-control` returns 200 and shows release-evidence summary badges.
- `/api/health` still returns nonzero release-evidence counts.
- `/internal/flightleg-parity` still reports no mismatches.
