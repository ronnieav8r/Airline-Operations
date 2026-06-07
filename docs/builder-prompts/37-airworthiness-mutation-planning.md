# Builder Prompt 37: Airworthiness Mutation Planning

## Summary

Plan the first airworthiness mutation workflow after the additive
airworthiness schema and read-only summaries. This is a docs/planning slice
only. It does not add schema, routes, actions, forms, seed data, provider
integrations, or release blocking.

## Decision

Build the first airworthiness write surface under Aircraft:

```text
/aircraft/[aircraftId]/airworthiness
```

Rationale:

- Discrepancies and deferrals are aircraft-level records.
- A single aircraft warning can affect multiple future FlightLegs.
- Operations Control should consume this state read-only until release-blocking
  policy is explicitly approved.
- Keeping the write surface aircraft-scoped avoids tying maintenance records to
  one leg too early.

## Planned Mutation Order

1. Discrepancy mutation foundation.
2. Deferral mutation foundation.
3. Maintenance event mutation planning.
4. Maintenance event mutation foundation.
5. Airworthiness release planning.
6. Airworthiness release foundation.
7. Release-readiness policy review for possible future blockers.

## Next Implementation Prompt

```text
Prompt 38: Airworthiness discrepancy mutation foundation
```

Prompt 38 should:

- Add `/aircraft/[aircraftId]/airworthiness`.
- Link to it from aircraft cards on `/aircraft`.
- Show current airworthiness context for that aircraft.
- Create a `Discrepancy`.
- Edit discrepancy core fields and status.
- Keep deferral, maintenance event, and airworthiness release mutation
  deferred.

## Prompt 38 Minimum Fields

Required:

- `title`

Optional:

- `discrepancyNumber`, auto-generated if blank.
- `description`
- `severity`
- `status`
- `correctiveSummary`
- `clearedAt`

Status support:

- `OPEN`
- `DEFERRED`
- `CLEARED`
- `CANCELLED`

## Prompt 39 Follow-Up

```text
Prompt 39: Airworthiness deferral mutation foundation
```

Prompt 39 should:

- Create a deferral from an existing `OPEN` or `DEFERRED` discrepancy.
- Mark the related discrepancy `DEFERRED` when an active deferral is created.
- Edit deferral category, due date, notes, and status.
- Keep maintenance events and release signing deferred.

## Boundaries

- No Prisma schema changes.
- No migration.
- No seed/backfill changes.
- No release blocking.
- No auth, roles, signatures, or user attribution.
- No MEL/CDL legal enforcement.
- No component tracking.
- No file uploads.
- No vendor/provider integrations.
- No maintenance work-order workflow.

## Validation For Future Implementation Prompts

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/aircraft`
- `/aircraft/[aircraftId]/airworthiness`
- `/operations-control/[flightLegId]`
- `/operations-control`
- `/api/health`
- `/internal/flightleg-parity`
- `/internal/flightleg-write-readiness`

## Stop Conditions

Stop before implementation if:

- A schema migration appears necessary.
- The workflow needs user identity, signature, or role policy.
- Deferral policy requires MEL/CDL enforcement beyond demo tracking.
- Release blocking becomes necessary to define.
- Maintenance provider integrations, file uploads, or work-order workflow become
  tempting.
