# Airworthiness Release Policy

Last updated: 2026-06-07

This document defines the first policy boundary for aircraft maintenance
airworthiness releases.

## Decision

`AirworthinessRelease` is a maintenance/aircraft airworthiness release. It is
not the full operational FlightLeg release.

The full operational release remains `FlightRelease` and should eventually
consider airworthiness plus manifest, weight-and-balance, flight locating,
dispatch package, weather, NOTAM, flight plan, authority/control, and future
crew/compliance checks.

## First Workflow Scope

The first airworthiness release workflow should be aircraft-current:

```text
/aircraft/[aircraftId]/airworthiness
```

The release follows the aircraft. FlightLeg detail reads the assigned aircraft's
current airworthiness release as one warning-only readiness signal.

`AirworthinessRelease.flightLegId` remains unused in the first workflow. It may
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

## Readiness Policy

Keep warning-first behavior.

- Missing current aircraft airworthiness release warns.
- Expired current aircraft airworthiness release warns.
- Open discrepancies warn.
- Active deferrals warn.
- Missing current configuration warns.
- Airworthiness warnings do not block `FlightRelease` actions yet.

Hard release blocking should wait for a later policy slice that defines which
warnings become blockers, which authority contexts they apply to, and who can
override them.

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

Prompt 44 should refresh warning-only readiness display text so expired,
missing, and current aircraft airworthiness release states are clearer across
Aircraft and FlightLeg detail views.

Prompt 44 implementation status: complete.

Aircraft and FlightLeg detail now read recent aircraft airworthiness release
history and separately identify the current `RELEASED` record. Missing release
history, latest non-current records, and expired current releases are shown as
warning-only readiness context. Operational `FlightRelease` actions remain
available.

Prompt 46 implementation status: complete as release-blocking policy planning.

The future release-blocking policy now recommends that a missing or expired
current aircraft maintenance airworthiness release should become a normal
release blocker in a later enforcement slice. Open discrepancies and active
deferrals remain warnings until severity, category, due-date, MEL/CDL, and
authority-specific policy is defined. Current app behavior remains
warning-only.

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
