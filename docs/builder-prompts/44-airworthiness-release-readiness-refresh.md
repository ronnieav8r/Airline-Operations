# Prompt 44: Airworthiness Release Readiness Refresh

## Summary

Refresh warning-only airworthiness release readiness displays after the
aircraft-level release workflow exists.

This slice does not add schema, release writes, `FlightRelease` mutation, hard
release blocking, provider integrations, auth, signatures, or file uploads.

## Scope

- Keep `AirworthinessRelease` as aircraft maintenance release state.
- Show current aircraft release by finding the latest `RELEASED` record.
- Distinguish:
  - no assigned aircraft,
  - no active aircraft configuration,
  - no airworthiness release history,
  - no current `RELEASED` record,
  - current `RELEASED` record expired,
  - open/deferred discrepancies,
  - active deferrals.
- Keep FlightLeg release readiness warning-only. Release action buttons remain
  available.
- Keep `FlightRelease` as the operational FlightLeg release record.

## Implementation Notes

- Aircraft and FlightLeg detail queries may read recent release history instead
  of only a single released record.
- UI should clearly label the aircraft maintenance release separately from the
  operational FlightLeg release.
- Expired release state should warn, not block.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/aircraft`.
- Open `/aircraft/[aircraftId]/airworthiness`.
- Open `/operations-control/[flightLegId]`.
- Confirm release readiness is still warning-only.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return successfully.

## Deferred

- Hard release blocking.
- Operational `FlightRelease` policy changes.
- FlightLeg-specific airworthiness snapshots.
- Auth, roles, signatures, or user attribution.
- Provider integrations and file uploads.
