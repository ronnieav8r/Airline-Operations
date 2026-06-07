# Maintenance Event Mutation Plan

Last updated: 2026-06-07

This document tracks the first maintenance-event write path after
airworthiness discrepancy and deferral mutation.

## Decision

Build maintenance-event mutation as the next aircraft-level workflow under:

```text
/aircraft/[aircraftId]/airworthiness
```

Do not create a separate maintenance module yet. The current app only needs a
controlled aircraft-level maintenance event record that can optionally link to
a discrepancy and support return-to-service context.

## Prompt 41 Scope

The next implementation slice should be:

```text
Prompt 41: Maintenance event mutation foundation
```

Minimum workflow:

- Add maintenance-event create/edit under
  `/aircraft/[aircraftId]/airworthiness`.
- Create a `MaintenanceEvent` with aircraft, event number, event type, status,
  optional linked discrepancy, schedule/start/complete timestamps, provider,
  description, return-to-service timestamp, and notes.
- Edit existing maintenance events.
- Allow linking to an existing discrepancy, but do not require it.
- When a maintenance event is marked `COMPLETED`, allow an explicit form choice
  to leave the linked discrepancy unchanged or mark it `CLEARED`.
- Keep deferral status unchanged unless a later policy slice explicitly
  decides maintenance completion can clear deferrals.
- Keep `approvedById` null until auth/user attribution exists.

## Data Policy

- `maintenanceNumber` is required and unique per aircraft.
- If the user leaves `maintenanceNumber` blank, generate a readable
  aircraft-scoped value such as `MX-{tailNumber}-{YYYYMMDD}-{NN}`.
- `eventType` is required.
- `status` defaults to `PLANNED`.
- `providerName`, `description`, and `notes` are optional.
- `returnToServiceAt` is optional and should be warning-only when missing on
  a completed return-to-service event.
- `approvedById` remains null until auth/user attribution exists.

## Supported Event Types

Use the existing enum:

- `INSPECTION`
- `SCHEDULED_MAINTENANCE`
- `UNSCHEDULED_MAINTENANCE`
- `REPAIR`
- `RETURN_TO_SERVICE`
- `OTHER`

## Supported Statuses

Use the existing enum:

- `PLANNED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

## Relationship Policy

- A maintenance event may be created without a discrepancy.
- A maintenance event may link to one discrepancy.
- A completed maintenance event may mark its linked discrepancy `CLEARED` only
  through an explicit form choice.
- Do not automatically clear active deferrals in Prompt 41.
- Do not create or update `AirworthinessRelease` in Prompt 41.

## Readiness Policy

Keep warning-first behavior.

- Missing maintenance event data should warn on the maintenance workflow only.
- Open discrepancies and active deferrals should continue to drive
  airworthiness warnings.
- Maintenance events should not block release actions in this slice.

## Deferred

Do not include these in Prompt 41:

- Prisma schema changes.
- Maintenance work orders.
- Component-level maintenance tracking.
- Reliability analytics.
- Service Difficulty Reports.
- File uploads.
- Vendor/provider integrations.
- Airworthiness release signing.
- Auth, roles, signatures, or user attribution.
- Hard release blocking.

## Validation

Prompt 41 should run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/aircraft/[aircraftId]/airworthiness`.
- Create a maintenance event without a discrepancy.
- Create or edit a maintenance event linked to a discrepancy.
- Mark an event `COMPLETED`.
- If explicitly selected, confirm the linked discrepancy becomes `CLEARED`.
- Confirm `/aircraft` still renders.
- Confirm `/operations-control/[flightLegId]` still treats airworthiness as
  warning-only.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return successfully.

## Stop Conditions

Stop before implementation if:

- A schema migration appears necessary.
- The workflow needs user identity, signature, or approval authority.
- Maintenance completion needs to clear deferrals automatically.
- Airworthiness release signing becomes necessary.
- Release blocking becomes necessary to define.
- Provider integration, file upload, work-order workflow, or component tracking
  becomes tempting.
