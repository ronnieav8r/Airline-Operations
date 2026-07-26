# Airworthiness Schema Decisions

Last updated: 2026-06-30

This document defines the first airworthiness schema boundary after the
release-evidence workflow batch. It is the source of truth for Prompts 34-36.

## Current Boundary

`Aircraft.status` remains a v1 fleet-board signal. It is not enough to support
airworthiness decisions for a released FlightLeg.

The next schema slice should add airworthiness evidence additively without
rewriting aircraft status, flight release, or release evidence.

## 2026-06-30 Serviceability Restructure

The current serviceability lifecycle supersedes the early warning-only
airworthiness-release framing in this document. Use:

```text
docs/MAINTENANCE_SERVICEABILITY_RTS_LIFECYCLE.md
lib/aircraft-serviceability.ts
```

Current rules:

- Aircraft serviceability is computed, not manually stored as the primary
  decision.
- A new official discrepancy starts `OPEN` and makes the aircraft not
  serviceable until approved deferral or signed Return to Service.
- Corrective maintenance moves a discrepancy to `CORRECTED_PENDING_RTS`; it
  does not clear the discrepancy without signed RTS.
- `AirworthinessRelease` remains historical/operator-specific evidence, not
  the default everyday maintenance gate.
- Do not add direct discrepancy clear/status editing as the normal workflow.

## Prompt 34 Decision

Build the first airworthiness foundation around these additive tables:

- `AircraftConfiguration`
- `AircraftCapability`
- `Discrepancy`
- `Deferral`
- `MaintenanceEvent`
- `AirworthinessRelease`

The first implementation should not add CRUD. It should add schema, seed/backfill,
health counts, DBML, and docs only.

Implementation status: complete as an additive foundation.

## Relationship Decisions

Use these cardinalities:

- `AircraftConfiguration`: many-to-one with `Aircraft`.
- `AircraftCapability`: many-to-one with `Aircraft`.
- `Discrepancy`: many-to-one with `Aircraft`, optionally reported by `User`.
- `Deferral`: many-to-one with `Aircraft` and `Discrepancy`, optionally
  authorized by `User`.
- `MaintenanceEvent`: many-to-one with `Aircraft`, optionally linked to a
  `Discrepancy`, optionally approved by `User`.
- `AirworthinessRelease`: many-to-one with `Aircraft`, optionally linked to a
  `FlightLeg`, optionally released by `User`.

## Status Policy

This early warning-first policy is superseded by the serviceability/RTS
lifecycle in `docs/MAINTENANCE_SERVICEABILITY_RTS_LIFECYCLE.md`.

Current behavior:

- Open discrepancies make the aircraft not serviceable until deferred or
  cleared through signed Return to Service.
- Active valid deferrals may leave the aircraft serviceable with limitations.
- Expired deferrals, corrected-pending-RTS items, and AOG/out-of-service state
  make the aircraft not serviceable.
- Missing current `AirworthinessRelease` is not the normal serviceability gate.
  `AirworthinessRelease` remains historical/operator-specific evidence.

## Prompt 35 Scope

Prompt 35 should add:

- Prisma models and enums.
- Additive migration only.
- Local demo seed/backfill records.
- Gated production/demo backfill script.
- `/api/health` counts.
- DBML current/planning updates.
- Project status and roadmap docs.

Implementation status: complete.

The gated production/demo backfill script is:

```text
scripts/backfill-airworthiness-demo.ts
```

Gate the script with:

```text
RUN_AIRWORTHINESS_BACKFILL=1
```

Default behavior must skip. Do not run broad seed against Render.

## Prompt 36 Scope

Prompt 36 should add:

- Read-only aircraft airworthiness summaries.
- Read-only FlightLeg detail airworthiness context.
- Warning-only airworthiness item in release readiness.
- No mutation routes.

Implementation status: complete.

The read-only implementation originally surfaced assigned-aircraft
configuration, capability, discrepancy, deferral, maintenance event, and
airworthiness release context on `/aircraft` and
`/operations-control/[flightLegId]`. Current aircraft and release-readiness
surfaces should derive maintenance state from computed aircraft serviceability,
not from a missing/current airworthiness-release record.

## Prompt 37 Scope

Prompt 37 should plan the first airworthiness mutation workflow before adding
any writes.

Planning questions:

- Whether the first write surface belongs under Aircraft or Operations Control.
- Whether discrepancy and deferral writes should ship together or as separate
  slices.
- Which audit fields are required without user auth/signatures.
- Which warnings stay informational and which, if any, should become release
  blockers later.

No hard release blocking should be implemented without an explicit product
decision.

Implementation status: complete.

Decision: the first mutation surface should be aircraft-scoped at
`/aircraft/[aircraftId]/airworthiness`, not FlightLeg-scoped. Discrepancies and
deferrals belong to the aircraft record and can affect more than one FlightLeg.

Next implementation: Prompt 38 should add discrepancy create/edit only.
Deferral mutation should follow separately in Prompt 39.

The durable mutation plan is:

```text
docs/AIRWORTHINESS_MUTATION_PLAN.md
```

Prompt 38 implementation status: complete. The aircraft-level workflow route
now supports discrepancy create/edit. Deferrals remain read-only and should be
implemented separately in Prompt 39.

Prompt 39 implementation status: complete. The aircraft-level workflow route
now supports deferral create/edit from existing `OPEN` or `DEFERRED`
discrepancies. Maintenance-event mutation should be planned before adding
maintenance-event writes.

Prompt 40 implementation status: complete as a planning slice. Maintenance
events should be added under `/aircraft/[aircraftId]/airworthiness`, may link
to a discrepancy, and may clear the linked discrepancy only through an explicit
form choice. They should not clear deferrals or create airworthiness releases
yet.

Prompt 41 implementation status: complete. The aircraft-level workflow route
now supports maintenance-event create/edit with optional discrepancy linking.
Airworthiness release creation/signing still requires a planning slice before
implementation.

Prompt 42 implementation status: complete as a planning slice.
`AirworthinessRelease` is aircraft maintenance/airworthiness release state, not
the full operational FlightLeg release. `FlightRelease` remains the operational
FlightLeg release. The first airworthiness release workflow should be
aircraft-current, should leave `flightLegId` unused, and should supersede prior
current released aircraft records when a newer release becomes `RELEASED`.

Prompt 43 implementation status: complete. The aircraft-level workflow route
now supports `AirworthinessRelease` create/edit with automatic release-number
generation, `RELEASED` supersede behavior, manual `VOIDED`, and optional
expiration and notes. `flightLegId`, `releasedById`, operational
`FlightRelease` mutation, and hard release blocking remain deferred.

Prompt 44 implementation status: superseded. Aircraft overview surfaces no
longer derive maintenance readiness from the current non-expired `RELEASED`
aircraft record. Airworthiness release history remains available for
historical/operator-specific workflows, while maintenance readiness uses the
shared serviceability lifecycle.

## Deferred

Do not include these in the first airworthiness mutation prompts:

- Component-level tracking.
- Reliability/event trend analytics.
- Service Difficulty Reports.
- MEL/CDL policy enforcement.
- File uploads.
- Vendor/provider integrations.
- Hard release blocking.
- Maintenance work-order workflow.
- User roles or signatures.

## Validation Criteria

The foundation remains ready only when:

- Migration is additive only.
- Existing aircraft, FlightLeg, release, and release-evidence workflows still
  render.
- Local seed/backfill produces nonzero health counts.
- Render backfill can run only through a gated environment flag.

## Health Counts

`/api/health` includes counts for:

- `aircraftConfigurations`
- `aircraftCapabilities`
- `discrepancies`
- `deferrals`
- `maintenanceEvents`
- `airworthinessReleases`
