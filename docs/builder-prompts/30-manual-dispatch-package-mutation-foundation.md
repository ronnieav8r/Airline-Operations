# Builder Prompt 30: Manual Dispatch-Package Mutation Foundation

## Summary

Add the first manual dispatch-package mutation workflow for a FlightLeg. This
slice uses the existing `WeatherBriefingSnapshot`, `NotamSnapshot`,
`FlightPlanReference`, and `DispatchPackage` schema. It does not add provider
integrations, release-package modeling, release gating, aircraft performance
calculations, file uploads, auth, or schema changes.

## Key Changes

- Added `/operations-control/[flightLegId]/dispatch`.
- Added a link from the FlightLeg detail dispatch card to the dispatch workflow.
- Save manual weather briefing evidence.
- Save manual NOTAM snapshot evidence.
- Save a manual flight-plan reference.
- Create or update the FlightLeg `DispatchPackage`.
- Link the dispatch package to the manual weather, NOTAM, and flight-plan
  records.
- Store manual dispatch/performance notes in `DispatchPackage.performanceData`.
- Show warning-first readiness messages for missing dispatch evidence.

## Boundary

This workflow is manual operational evidence only.

- Weather and NOTAM snapshots use stable manual keys per FlightLeg.
- A blank flight-plan external reference falls back to `MANUAL-{flightLegId}`.
- Saving the form updates or creates the linked dispatch package.
- Release controls remain warning-only and are not blocked by dispatch
  readiness.

## Deferred

Not included:

- Weather provider calls.
- NOTAM provider calls.
- Flight-plan filing provider calls.
- ReleasePackage.
- Release-readiness blocking.
- File uploads.
- Aircraft performance calculations.
- Auth, roles, or user attribution.
- Schema changes.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/operations-control/[flightLegId]/dispatch` returns 200.
- Saving manual dispatch evidence succeeds.
- Editing manual dispatch evidence succeeds.
- `/operations-control/[flightLegId]` shows linked weather, NOTAM, and
  flight-plan data plus the manage link.
- `/operations-control`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness` still return 200.
