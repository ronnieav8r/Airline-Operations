# Airworthiness Release Policy

Last updated: 2026-07-01

This document defines the first policy boundary for aircraft maintenance
airworthiness releases.

## 2026-06-30 Superseding Note

The original policy in this file is historical context for the first
`AirworthinessRelease` workflow. The current maintenance serviceability rule is
now documented in:

```text
docs/MAINTENANCE_SERVICEABILITY_RTS_LIFECYCLE.md
```

Do not treat a missing current `AirworthinessRelease` as the normal everyday
reason an aircraft is not serviceable. Serviceability is computed from
discrepancies, approved deferrals, maintenance events, Return to Service
records, and later inspection due tracking.

`AirworthinessRelease` remains available for historical or operator-specific
Part 135/manual workflows. It is not the default maintenance gate for every
flight.

## Decision

`AirworthinessRelease` is a maintenance/aircraft airworthiness release. It is
not the full operational FlightLeg release.

The full operational release remains `FlightRelease` and should eventually
consider airworthiness plus manifest, weight-and-balance, flight locating,
dispatch package, weather, NOTAM, flight plan, authority/control, and future
crew/compliance checks.

## Current Workflow Scope

`AirworthinessRelease` records are managed from:

```text
/aircraft/[aircraftId]/airworthiness
```

The records are historical or operator/manual-specific evidence. They do not
make an aircraft serviceable by themselves and a missing current record is not
the normal reason an aircraft is unavailable.

`AirworthinessRelease.flightLegId` remains optional. It may
support later FlightLeg-specific snapshots, but those snapshots should not be
added until operational release policy is more mature.

## Lifecycle Policy

Supported statuses:

- `DRAFT`
- `RELEASED`
- `VOIDED`
- `SUPERSEDED`

Rules:

- New records start as `DRAFT` unless explicitly marked `RELEASED`.
- When a record becomes `RELEASED`, set `releasedAt` if blank.
- When a record becomes `RELEASED`, mark prior current `RELEASED` records for
  the same aircraft as `SUPERSEDED`.
- `VOIDED` is manual and should be used for records entered in error.
- `SUPERSEDED` is automatic when a newer `RELEASED` record replaces an older
  current aircraft release.
- `releasedById` remains null until auth/user attribution exists.

## Historical Readiness Policy

This was the first readiness policy before the serviceability/RTS restructure.
It is retained here only as historical context:

- It checked for missing or expired current airworthiness-release records.
- It checked open discrepancies, active deferrals, and missing current
  configuration.
- It treated those findings as informational and did not block
  `FlightRelease` actions.

Current readiness and maintenance status should use computed aircraft
serviceability instead. Do not rebuild warning or blocking behavior from
missing/expired current `AirworthinessRelease` records.

## Prompt 43 Status

Prompt 43 added aircraft-level airworthiness release create/edit under
`/aircraft/[aircraftId]/airworthiness`.

Implemented behavior:

- Create/edit `AirworthinessRelease`.
- Support `DRAFT`, `RELEASED`, `VOIDED`, and `SUPERSEDED`.
- Auto-generate `releaseNumber` if blank.
- Set `releasedAt` when marking a record `RELEASED` if blank.
- Supersede prior current released records for the same aircraft when a new
  record becomes `RELEASED`.
- Support optional `expiresAt` and `releaseNotes`.
- Keep `releasedById` null.
- Do not mutate `FlightRelease`.

Prompt 44 implementation status: superseded. Aircraft overview surfaces no
longer present current airworthiness release as the maintenance status signal.
They use computed serviceability. Airworthiness release history remains
available where the aircraft airworthiness/logbook workflow needs it.

Prompt 46 implementation status: complete as release-blocking policy planning.

This prompt's old future-blocking recommendation has been superseded by the
2026-06-30 serviceability/RTS lifecycle. Future release-readiness policy should
use computed aircraft serviceability instead of missing/expired current
`AirworthinessRelease` as the normal maintenance gate. Current app behavior
remains warning-first unless a later enforcement slice is explicitly planned.

Durable policy doc:

```text
docs/RELEASE_BLOCKING_POLICY.md
```

## Deferred

Do not include these in Prompt 43:

- Prisma schema changes.
- FlightLeg-specific airworthiness snapshots.
- Operational `FlightRelease` mutation.
- Auth, roles, signatures, or user attribution.
- Hard release-blocking enforcement.
- Maintenance work orders.
- Provider integrations.
- File uploads.
