# Release Evidence Schema Decisions

Last updated: 2026-06-07

This document defines the additive release-evidence schema slice added after the
`FlightLeg` read pilots. It is the source of truth for the Prompt 13 boundary.

## Current Boundary

`FlightLeg` is now the future operational anchor. Dashboard, Flights, and
Operations Control read through FlightLeg-backed helpers with legacy `Flight`
fallbacks. Existing release records remain in `FlightRelease`, attached to
`OperationalControlRecord`.

Do not replace `FlightRelease` yet. A new `ReleasePackage` should wait until the
release workflow transition is planned separately.

Mutation planning now lives in `docs/RELEASE_EVIDENCE_MUTATION_PLAN.md`. The
chosen first write workflow is manifest mutation because it can use the current
`Manifest` and `ManifestItem` schema without provider integrations or passenger
identity redesign.

## Prompt 13 First Additive Slice

Implementation status: complete as an additive foundation.

The first release-evidence migration includes:

- `Manifest`
- `ManifestItem`
- `WeightBalanceRun`
- `FlightLocatingRecord`
- `DispatchPackage`
- `WeatherBriefingSnapshot`
- `NotamSnapshot`
- `FlightPlanReference`

The first release-evidence migration includes:

- `ManifestStatus`: `DRAFT`, `READY`, `LOCKED`, `AMENDED`, `VOIDED`
- `WeightBalanceStatus`: `DRAFT`, `CALCULATED`, `APPROVED`, `VOIDED`
- `FlightLocatingStatus`: `NOT_STARTED`, `FILED`, `ACTIVE`, `CLOSED`, `OVERDUE`

Keep `FlightPlanReference.status` as a string in the first slice because
provider status vocabularies are likely to vary.

## Relationship Decisions

Attach all new operational evidence records to `FlightLeg`, not legacy `Flight`.

Use these cardinalities:

- `Manifest`: one-to-one with `FlightLeg`.
- `ManifestItem`: many-to-one with `Manifest`, optionally linked to current `Passenger`.
- `WeightBalanceRun`: many-to-one with `FlightLeg`, optionally linked to `Manifest`.
- `FlightLocatingRecord`: one-to-one with `FlightLeg`.
- `FlightPlanReference`: many-to-one with `FlightLeg`.
- `DispatchPackage`: one-to-one with `FlightLeg`.
- `WeatherBriefingSnapshot`: independent snapshot, optionally referenced by `DispatchPackage`.
- `NotamSnapshot`: independent snapshot, optionally referenced by `DispatchPackage`.

Prompt 13 did not add `aircraftConfigurationId` to `WeightBalanceRun`
because `AircraftConfiguration` is part of the later airworthiness/configuration
slice. `WeightBalanceRun.calculationSnapshot` can hold demo calculation details
until the configuration model exists.

## Deferred From Prompt 13

These remain deferred:

- `ReleasePackage`
- `PositionReport`
- Passenger identity redesign
- Aircraft configuration and capability tables
- Weather, NOTAM, or flight-plan provider integrations
- Release CRUD, dispatch CRUD, manifest CRUD, or UI mutation flows
- Current page rewiring beyond health/count visibility

Updated transition note: manifest CRUD is no longer generally deferred. Manual
manifest item mutation and `DRAFT` to `READY` status are implemented. Manifest
locking, amendment, passenger identity redesign, and release gating remain
deferred.

Updated transition note: flight locating CRUD is no longer generally deferred.
Manual locating details and simple status transitions are implemented. Position
history, overdue automation, provider integrations, and release gating remain
deferred.

Updated transition note: weight-and-balance mutation planning is complete. The
first W&B write workflow should use manual `WeightBalanceRun` entry, link to
the current manifest when present, store manual context in
`calculationSnapshot`, and keep approval, automated calculations, aircraft
configuration/capability schema, and release gating deferred.

Updated transition note: weight-and-balance CRUD is no longer generally
deferred. Manual `WeightBalanceRun` create/edit, `CALCULATED` transition, and
`VOIDED` transition are implemented. Approval, automated calculations,
aircraft configuration/capability schema, and release gating remain deferred.

Updated transition note: manual dispatch-package mutation planning is complete.
The first dispatch write workflow should upsert one manual weather snapshot,
one manual NOTAM snapshot, one manual flight-plan reference, and the linked
`DispatchPackage` using existing schema only. Provider integrations,
`ReleasePackage`, file uploads, aircraft performance calculations, and release
gating remain deferred.

Updated transition note: manual dispatch-package CRUD is no longer generally
deferred. Manual weather, NOTAM, flight-plan, and dispatch package writes are
implemented through existing schema. Provider integrations, `ReleasePackage`,
file uploads, aircraft performance calculations, and release gating remain
deferred.

Updated transition note: release readiness guardrails planning is complete. The
first guardrail implementation should be a warning-only checklist on the
FlightLeg detail page. It should not block release actions, mutate evidence,
add schema, or introduce `ReleasePackage`.

Updated transition note: warning-only release readiness guardrails are
implemented on the FlightLeg detail page. They read existing release evidence
and keep release actions available. Hard blocking, `ReleasePackage`, audit
policy, and approval authority remain deferred.

Updated transition note: release-blocking policy planning is complete in
`docs/RELEASE_BLOCKING_POLICY.md`. The next recommended implementation should
preview `Would block release` vs `Would warn` classifications on the existing
readiness checklist without enforcing blocking. Actual hard blocking,
overrides, auth/signatures, `ReleasePackage`, and authority-specific policy
engines remain deferred.

Updated transition note: release-blocking preview is implemented on FlightLeg
detail. The preview is UI-only and non-enforcing. It does not add schema, does
not mutate evidence, and does not change `FlightRelease` actions.

`PositionReport` belongs in a later locating-specific slice after the app needs
position history, overdue checks, or actual flight-following workflows.

## DBML Delta Notes

The planning DBML already includes the broader target direction. Prompt 13
implements only the release-evidence subset above and updates current-state
DBML.

Implementation DBML updates:

- Add the eight Prompt 13 tables to `docs/schema.current.dbml`.
- Keep `ReleasePackage` and `PositionReport` in planning-only DBML.
- Keep `DispatchPackage.releasePackageId` out of the implemented schema until
  `ReleasePackage` exists.
- Keep `WeightBalanceRun.aircraftConfigurationId` out of the implemented schema
  until `AircraftConfiguration` exists.

## Seed And Backfill Decisions

Local demo seed creates minimal release-evidence records after FlightLeg
foundation rows and passenger manifest source rows exist.

The gated production/demo backfill script is:

```text
scripts/backfill-release-evidence-demo.ts
```

Gate the script with:

```text
RUN_RELEASE_EVIDENCE_BACKFILL=1
```

Default behavior must skip. Do not run broad seed against Render.

Backfill behavior:

- Create one `Manifest` per `FlightLeg`.
- Create `ManifestItem` rows from existing `FlightPassenger` rows when the
  FlightLeg has a legacy flight bridge.
- Create one `FlightLocatingRecord` per `FlightLeg`.
- Create one demo `WeatherBriefingSnapshot` and `NotamSnapshot` per `FlightLeg`.
- Create at least one `FlightPlanReference` per `FlightLeg`.
- Create one `DispatchPackage` per `FlightLeg` linking the snapshots and current
  flight-plan reference.
- Create one `WeightBalanceRun` per `FlightLeg` when enough demo data exists;
  use `DRAFT` or `CALCULATED` status and store assumptions in
  `calculationSnapshot`.

Backfill must be idempotent.

## Health Counts

`/api/health` includes counts for:

- `manifests`
- `manifestItems`
- `weightBalanceRuns`
- `flightLocatingRecords`
- `dispatchPackages`
- `weatherBriefingSnapshots`
- `notamSnapshots`
- `flightPlanReferences`

## Validation Criteria

The foundation remains ready only when:

- The Prisma migration is additive only.
- No existing model is dropped, renamed, or made newly required.
- Current pages still render.
- The hidden FlightLeg parity diagnostic stays green.
- Local seed/backfill produces nonzero health counts for the new tables.
- Render backfill can be run only through the gated environment flag.
