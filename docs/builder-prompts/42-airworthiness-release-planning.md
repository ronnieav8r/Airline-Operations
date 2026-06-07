# Builder Prompt 42: Airworthiness Release Planning

## Summary

Plan airworthiness release policy before adding release writes. Treat
`AirworthinessRelease` as a maintenance/aircraft airworthiness release, not the
full FlightLeg operational release.

This is a docs/planning slice only. It does not add schema, routes, actions,
forms, seed data, auth/signatures, release blocking, or `FlightRelease`
mutation.

## Decision

Use aircraft-current scope for the first airworthiness release workflow.

The first write surface should remain:

```text
/aircraft/[aircraftId]/airworthiness
```

`AirworthinessRelease` follows the aircraft. `FlightRelease` remains the full
operational FlightLeg release and should eventually consider airworthiness,
manifest, weight-and-balance, locating, dispatch, weather, NOTAM, flight plan,
authority/control, and future crew/compliance checks.

## Lifecycle Policy

- New `RELEASED` airworthiness records should mark prior current `RELEASED`
  records for the same aircraft as `SUPERSEDED`.
- `VOIDED` remains manual for records entered in error.
- `DRAFT` remains editable and not current.
- `SUPERSEDED` is automatic when a newer released record replaces an older one.
- `releasedById` remains null until auth/user attribution exists.

## Readiness Policy

Keep warning-first behavior.

- Missing current aircraft airworthiness release warns.
- Expired current aircraft airworthiness release warns.
- Open discrepancies warn.
- Active deferrals warn.
- Missing current configuration warns.
- Airworthiness warnings do not block FlightLeg release actions yet.

## Next Implementation Prompt

```text
Prompt 43: Airworthiness release foundation
```

Prompt 43 should:

- Add airworthiness release create/edit under
  `/aircraft/[aircraftId]/airworthiness`.
- Create/edit `AirworthinessRelease`.
- Support `DRAFT`, `RELEASED`, `VOIDED`, and `SUPERSEDED`.
- Auto-generate `releaseNumber` if blank.
- Set `releasedAt` when marking a record `RELEASED` if blank.
- Supersede prior current released records for that aircraft when a new record
  becomes `RELEASED`.
- Support optional `expiresAt` and `releaseNotes`.
- Keep `AirworthinessRelease.flightLegId` unused/deferred.
- Keep `releasedById` null.
- Do not mutate `FlightRelease`.

## Boundary

- No Prisma schema changes.
- No migration.
- No FlightLeg-specific airworthiness snapshots.
- No `FlightRelease` mutation.
- No auth, roles, signatures, or user attribution.
- No hard release blocking.
- No provider integrations.
- No file uploads.

## Validation For Prompt 43

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/aircraft/[aircraftId]/airworthiness`.
- Create a draft aircraft airworthiness release.
- Mark a release `RELEASED`.
- Confirm prior released aircraft records become `SUPERSEDED`.
- Void a release.
- Confirm `/aircraft/[aircraftId]/airworthiness` shows release state.
- Confirm `/operations-control/[flightLegId]` still treats airworthiness as
  warning-only.
- Confirm `/aircraft`, `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return successfully.

## Stop Conditions

Stop before implementation if:

- A schema migration appears necessary.
- FlightLeg-specific airworthiness snapshots become required.
- Auth, signature, or approval authority becomes required.
- Operational `FlightRelease` mutation becomes tempting.
- Hard release blocking becomes necessary to define.
