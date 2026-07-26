# Maintenance Serviceability And Return-To-Service Lifecycle

Last updated: 2026-07-01

This document is the current source of truth for aircraft maintenance serviceability in AeroOps. It supersedes older planning language that treated a current `AirworthinessRelease` as the normal everyday maintenance gate.

## Current Rule

Aircraft serviceability is computed, not manually released for each flight.

The normal question is:

```text
Does this aircraft have any open, expired, or unresolved maintenance condition that makes it not serviceable?
```

The shared helper is:

```text
lib/aircraft-serviceability.ts
```

All aircraft, maintenance, crew, dashboard, operations-control, and release-readiness surfaces should use that helper or data derived from it rather than rebuilding separate serviceability logic.

## Lifecycle

A new official discrepancy or write-up starts as `OPEN`.

An `OPEN` discrepancy means the aircraft is not serviceable until one of these paths is completed:

- Approved deferral path: create an active deferral under MEL, CDL, NEF, company-approved, or other approved authority. The discrepancy becomes `DEFERRED`.
- Repair path: complete a corrective maintenance event. The discrepancy becomes `CORRECTED_PENDING_RTS`.
- Return-to-service path: an authorized signer signs a `ReturnToServiceRecord`. The discrepancy becomes `CLEARED`.

Erroneous write-ups are not cleared as if maintenance was performed. They are voided or cancelled by maintenance with a required reason and audit metadata.

## Data Model

Current schema support includes:

- `DiscrepancyStatus.CORRECTED_PENDING_RTS`
- `AogResolutionPhase`: `NEEDS_ASSESSMENT`, `TROUBLESHOOTING`, `AWAITING_PARTS`, `REPAIR_IN_PROGRESS`, `RTS_PENDING`
- `DeferralMethod`: `MEL`, `CDL`, `NEF`, `COMPANY_APPROVED`, `OTHER_APPROVED`
- `ReturnToServiceRecordStatus`: `DRAFT`, `READY_FOR_SIGNATURE`, `SIGNED`, `VOIDED`, `SUPERSEDED`
- `ReturnToServiceRecord`, linked to aircraft and optionally to discrepancy, maintenance event, logbook entry, and signer profile
- discrepancy links for active deferral, corrective maintenance event, clearing RTS record, and void/cancel metadata
- discrepancy AOG phase, ETA/next-update time, maintenance-control note, and phase updater metadata
- scheduled-maintenance program models:
  - `MaintenanceProgramTask`
  - `MaintenanceProgramApplicability`
  - `MaintenanceProgramOverride`
  - `MaintenanceComplianceState`
  - `AircraftMeterSnapshot`
- optional `MaintenanceEvent` and `AircraftLogbookEntry` links back to
  maintenance-program tasks and compliance states

`Aircraft.status` remains a coarse fleet or operational marker. It is not the authoritative maintenance-release decision.

`AirworthinessRelease` remains available for historical records and operator-specific Part 135/manual workflows. It is no longer the default requirement for a normal serviceable aircraft state.

## Computed States

The computed serviceability output should support these user-facing concepts:

- `Serviceable`
- `Not serviceable`
- `RTS required`
- `Deferred with limitations`
- `Deferral expired`
- `In maintenance`
- `AOG`

Open discrepancies, expired deferrals, AOG aircraft, and corrected-pending-RTS items make the aircraft not serviceable. Active valid deferrals can allow a deferred-with-limitations state, with limitations visible to crew and ops.

Required scheduled-maintenance tasks with `OVERDUE` compliance state also make
the aircraft not serviceable. `DUE` and `DUE_SOON` scheduled-maintenance states
are warnings only. Non-required overdue tasks stay visible in Scheduled
Maintenance but do not block serviceability.

## App Behavior

### Maintenance

`/maintenance` is the maintenance-user triage workbench. The queue should show aircraft serviceability status first:

- `AOG`
- `Serviceable`
- `Serviceable - MEL`
- `Serviceable - CDL`
- `Serviceable - NEF`
- `Serviceable - Deferred`
- `Serviceable - Scheduled MX`

Visible `Critical / High / Medium / Low` priority labels are intentionally not part of the queue UI. The top queue controls are `AOG`, `Serviceable`, `MEL`, `CDL`, and `NEF`; they sort matching rows to the top instead of hiding the rest of the queue. The user-facing maintenance view should answer whether the aircraft can fly and, if not, what phase is blocking it.

It should not show missing current airworthiness releases as the normal queue problem.

For AOG rows, use the current AOG phase:

- `Needs assessment`: write-up exists and maintenance has not routed it yet.
- `Troubleshooting`: maintenance is diagnosing the issue.
- `Awaiting parts`: the repair is blocked by parts.
- `Repair in progress`: the physical repair is underway.
- `RTS pending`: the physical work is complete or effectively complete, but return-to-service signoff is still pending.

The AOG ETA field means the next relevant maintenance-control expectation for the current phase: next update, parts ETA, repair ETA, or expected RTS/signoff time.

The Scheduled Maintenance view is the program-compliance workbench. It expands
reusable maintenance-program tasks by applicability into per-aircraft rows:

- all-aircraft tasks
- aircraft-type tasks, such as `CL_65`
- tail-specific tasks
- per-tail include, exclude, and deactivate overrides

Each row should show the task, applicability source, current compliance status,
next due calendar/hour/cycle values, latest manual meter snapshot, and a linked
planned/in-progress `MaintenanceEvent` if one exists. Missing baseline or next
due data should show `Needs baseline`; the app should not guess due status.

`MaintenanceEvent` remains the work-order/completion record. Program tasks do
not automatically create maintenance events. Maintenance users create or link
events manually when work is actually scheduled.

The Program view is the task-library setup workbench. It manages task details,
recurrence, applicability, active/inactive state, and tail overrides. Task
records are not deleted in v1; deactivate tasks or retire applicability rules
to preserve history.

When a scheduled-maintenance row is ready for work, the app creates a work
package rather than only a standalone event. The work package contains:

- a linked planned `MaintenanceEvent`
- a linked draft `AircraftLogbookEntry`

Both records link to the same aircraft, program task, and compliance state. The
draft logbook entry is the signoff path. Signing a scheduled-program logbook
entry completes the linked maintenance event and advances the compliance state.

Manual meter snapshots are the v1 source for airframe hours and cycles. Flight
utilization does not automatically update scheduled-maintenance meters yet.

### Aircraft Airworthiness And Logbook

Aircraft airworthiness/logbook routes should avoid direct discrepancy status editing. Use explicit actions:

- defer
- create or link corrective maintenance
- prepare Return to Service
- sign Return to Service
- void erroneous write-up

The top-level Maintenance module now includes a review-first `Logbook` view at
`/maintenance?view=logbook`. It filters and inspects aircraft-tail logbook
entries in a compact drawer, but it does not replace the aircraft-tail logbook
route as the create, attachment-upload, signature, lock, or export workflow.

### Crew Portal

Crew squawks create official `OPEN` discrepancies only for flights assigned to the signed-in crew member. Crew sees serviceability status and operating limitations, not maintenance signoff controls.

### Flight Release Readiness

Maintenance readiness should depend on computed serviceability. Active valid deferrals may warn with limitations without blocking a release-readiness snapshot. Expired deferrals, AOG, open unresolved discrepancies, and RTS-required states should surface as not ready.

Operational `FlightRelease` remains separate from aircraft maintenance serviceability.

## Local Implementation And Validation

The local serviceability/RTS implementation added migration:

```text
prisma/migrations/20260630190000_return_to_service_lifecycle/migration.sql
prisma/migrations/20260701130023_scheduled_maintenance_program/migration.sql
```

Latest validation for this slice passed:

```text
npm run prisma:validate
npm run db:local:migrate
npm run prisma:generate
npm run typecheck
npm run lint
npm run build
```

Browser checks confirmed `/maintenance` no longer shows the old missing-airworthiness-release queue items and the aircraft airworthiness/logbook routes expose the new serviceability, RTS, deferral, and void/cancel concepts.
