# Builder Prompt 34: Airworthiness Schema Planning

## Summary

Plan the first airworthiness schema foundation after the release-evidence
workflow batch. This slice is planning/docs only. It does not add Prisma models,
migrations, seed/backfill logic, UI, CRUD, or release blocking.

## Decision

Add airworthiness as a separate additive foundation. Do not rely on
`Aircraft.status` as the airworthiness source of truth.

Chosen implementation slice:

```text
Prompt 35: Airworthiness additive schema foundation
```

## Prompt 35 Scope

Prompt 35 should add these models:

- `AircraftConfiguration`
- `AircraftCapability`
- `Discrepancy`
- `Deferral`
- `MaintenanceEvent`
- `AirworthinessRelease`

It should also add:

- Minimal enums for status/type fields.
- Additive migration only.
- Local demo seed/backfill records.
- A gated airworthiness backfill script.
- `/api/health` counts.
- Current and planning DBML updates.
- Project status and schema decision docs.

## Prompt 36 Scope

Prompt 36 should add read-only visibility only:

- Aircraft page airworthiness summary.
- FlightLeg detail airworthiness context.
- Warning-only airworthiness readiness item.

No mutation route should be added in Prompt 36.

## Readiness Policy

Use warning-first behavior.

- Open discrepancies warn.
- Active deferrals warn.
- Missing current configuration warns.
- Missing recent/current airworthiness release warns.
- Release actions remain available.

## Deferred

Do not include these in Prompts 35-36:

- Component-level maintenance tracking.
- Reliability analytics.
- Service Difficulty Reports.
- MEL/CDL enforcement policy.
- Maintenance work-order workflow.
- File uploads.
- Provider/vendor integrations.
- Hard release blocking.
- User signatures or role enforcement.

## Stop Conditions

Stop before implementation if:

- A destructive migration appears necessary.
- Existing aircraft or FlightLeg relationships require a rewrite.
- The first slice needs component/reliability maintenance depth.
- Release blocking policy becomes required.
