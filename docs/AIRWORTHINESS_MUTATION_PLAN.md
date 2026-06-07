# Airworthiness Mutation Plan

Last updated: 2026-06-07

This document tracks the first airworthiness write path after the additive
airworthiness schema and read-only summaries.

## Decision

Build airworthiness mutation in controlled aircraft-level phases. Do not put
the first discrepancy/deferral writes under Operations Control, because
discrepancies, deferrals, configurations, maintenance events, and
airworthiness releases belong to the aircraft record and may affect multiple
FlightLegs.

Preferred write surface:

```text
/aircraft/[aircraftId]/airworthiness
```

Operations Control should continue to show read-only FlightLeg context. Later
slices may add links from FlightLeg detail to the assigned aircraft's
airworthiness workflow.

## Phase Order

1. Discrepancy mutation foundation.
2. Deferral mutation foundation.
3. Maintenance event mutation planning.
4. Maintenance event mutation foundation.
5. Airworthiness release planning.
6. Airworthiness release foundation.
7. Release-readiness policy review for whether any airworthiness warnings
   should become blockers.

## Prompt 38 Scope

The next implementation slice should be:

```text
Prompt 38: Airworthiness discrepancy mutation foundation
```

Minimum workflow:

- Add `/aircraft/[aircraftId]/airworthiness`.
- Link to the workflow from aircraft cards on `/aircraft`.
- Show existing active configuration, capabilities, discrepancies, deferrals,
  maintenance event, and airworthiness release context.
- Create a `Discrepancy` for the aircraft.
- Edit discrepancy title, description, severity, status, corrective summary,
  and cleared date.
- Support statuses `OPEN`, `DEFERRED`, `CLEARED`, and `CANCELLED`.
- Keep deferral creation/editing deferred to Prompt 39.
- Keep maintenance events and airworthiness releases read-only.

Implementation status: complete.

Prompt 38 added `/aircraft/[aircraftId]/airworthiness`, linked it from
`/aircraft`, and supports discrepancy create/edit only. Deferrals remain
read-only.

## Discrepancy Data Policy

- `discrepancyNumber` is required and unique per aircraft.
- If the user leaves `discrepancyNumber` blank, generate a readable aircraft
  scoped value such as `DISC-{tailNumber}-{YYYYMMDD}-{NN}`.
- `title` is required.
- `description`, `severity`, and `correctiveSummary` are optional.
- New discrepancies should default to `OPEN`.
- Setting status to `CLEARED` should set `clearedAt` when missing.
- Moving a discrepancy away from `CLEARED` should clear `clearedAt` unless the
  form explicitly keeps it.
- `reportedById` remains null until auth/user attribution exists.

## Prompt 39 Scope

Implementation slice:

```text
Prompt 39: Airworthiness deferral mutation foundation
```

Minimum workflow:

- Create a `Deferral` from an existing `OPEN` or `DEFERRED` discrepancy.
- Set deferral number, category, due date, and notes.
- Mark the discrepancy `DEFERRED` when an active deferral is created.
- Edit deferral category, due date, notes, and status.
- Support statuses `ACTIVE`, `CLEARED`, `EXPIRED`, and `CANCELLED`.
- Clearing a deferral should allow the related discrepancy to remain
  `DEFERRED` or move to `CLEARED` only through an explicit form choice.
- `authorizedById` remains null until auth/user attribution exists.

Implementation status: complete.

Prompt 39 added deferral create/edit under
`/aircraft/[aircraftId]/airworthiness`. Active deferral creation marks the
related discrepancy `DEFERRED`; clearing a deferral can keep the discrepancy
deferred or explicitly mark it cleared.

## Prompt 40 Scope

Planning slice:

```text
Prompt 40: Maintenance event mutation planning
```

Minimum planning questions:

- Which maintenance events can be created without a discrepancy.
- Whether maintenance events can clear discrepancies and deferrals.
- Which fields are required for a return-to-service event.
- Whether a maintenance event should create or update an airworthiness release.
- Which user/signature fields remain null until auth exists.

Implementation status: complete.

The durable maintenance-event plan is:

```text
docs/MAINTENANCE_EVENT_MUTATION_PLAN.md
```

Next implementation: Prompt 41 should add maintenance-event create/edit under
`/aircraft/[aircraftId]/airworthiness`, with optional discrepancy linking and
explicit discrepancy clearing. Airworthiness release signing remains deferred.

## Readiness Policy

Keep warning-first behavior.

- Open discrepancies warn.
- Active deferrals warn.
- Missing configuration or released airworthiness record warns.
- No hard release blocking should be added in Prompts 38 or 39.

Hard blocking should wait until a policy slice decides which warnings become
release blockers, which authority contexts they apply to, and who can override
them.

## Deferred

Do not include these in Prompts 38 or 39:

- Prisma schema changes.
- Component-level tracking.
- Reliability analytics.
- Maintenance work-order workflow.
- Service Difficulty Reports.
- File uploads.
- Vendor/provider integrations.
- Airworthiness release signing.
- Auth, roles, signatures, or user attribution.
- Hard release blocking.

## Validation

Each implementation prompt should run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/aircraft`.
- Open `/aircraft/[aircraftId]/airworthiness`.
- Create and edit the scoped record for that prompt.
- Confirm `/aircraft` reflects updated warning counts.
- Confirm `/operations-control/[flightLegId]` reflects updated warning-only
  airworthiness readiness for a FlightLeg assigned to that aircraft.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return successfully.

## Stop Conditions

Stop before implementation if:

- A schema migration appears necessary.
- The workflow requires user identity, signature, or role policy.
- Deferral policy requires MEL/CDL legal interpretation beyond simple demo
  tracking.
- Release blocking becomes necessary to define.
- Maintenance provider integration, file upload, or work-order workflow becomes
  tempting.
