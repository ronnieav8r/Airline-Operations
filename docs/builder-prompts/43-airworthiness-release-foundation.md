# Prompt 43: Airworthiness Release Foundation

## Summary

Add aircraft-level maintenance airworthiness release create/edit under
`/aircraft/[aircraftId]/airworthiness`.

This slice treats `AirworthinessRelease` as aircraft maintenance release state.
It does not mutate `FlightRelease`, does not add hard release blocking, and does
not add auth, signatures, schema changes, provider integrations, or file
uploads.

## Scope

- Add create/edit forms for `AirworthinessRelease` on the existing aircraft
  airworthiness workflow page.
- Support statuses `DRAFT`, `RELEASED`, `VOIDED`, and `SUPERSEDED`.
- Auto-generate `releaseNumber` when blank.
- Set `releasedAt` when marking a record `RELEASED` if blank.
- When a record becomes `RELEASED`, automatically mark prior current
  `RELEASED` records for the same aircraft as `SUPERSEDED`.
- Support optional `expiresAt` and `releaseNotes`.
- Keep `flightLegId` unused.
- Keep `releasedById` null until auth exists.

## Implementation Notes

- The workflow remains aircraft-current. FlightLeg detail may read the current
  aircraft release as warning-only readiness context, but this page does not
  create FlightLeg-specific release snapshots.
- `VOIDED` remains a manual correction status.
- `SUPERSEDED` is normally automatic, but remains editable so demo data can be
  corrected without adding a separate admin tool.
- `FlightRelease` remains the operational release record and is not mutated by
  this workflow.

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
- Create a draft airworthiness release.
- Mark a release `RELEASED`.
- Confirm prior current released records for that aircraft become
  `SUPERSEDED`.
- Void a release.
- Confirm `/operations-control/[flightLegId]` still treats airworthiness as
  warning-only.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return successfully.

## Deferred

- Auth, roles, user attribution, and signatures.
- Hard operational release blocking.
- `FlightRelease` mutation.
- FlightLeg-specific airworthiness release snapshots.
- Schema changes.
- Provider integrations.
- File uploads.
