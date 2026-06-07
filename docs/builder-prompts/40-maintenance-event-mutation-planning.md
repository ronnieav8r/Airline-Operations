# Builder Prompt 40: Maintenance Event Mutation Planning

## Summary

Plan the first maintenance-event mutation workflow after discrepancy and
deferral writes. This is a docs/planning slice only. It does not add schema,
routes, actions, forms, seed data, provider integrations, airworthiness release
signing, or release blocking.

## Decision

Build maintenance-event mutation under the existing aircraft airworthiness
workflow:

```text
/aircraft/[aircraftId]/airworthiness
```

Rationale:

- Maintenance events belong to the aircraft record.
- They may optionally link to a discrepancy.
- They should not create or sign airworthiness releases yet.
- Keeping the workflow in the aircraft airworthiness surface avoids a premature
  maintenance work-order module.

## Next Implementation Prompt

```text
Prompt 41: Maintenance event mutation foundation
```

Prompt 41 should:

- Add maintenance-event create/edit to
  `/aircraft/[aircraftId]/airworthiness`.
- Allow events with or without a linked discrepancy.
- Support event type, status, schedule/start/complete timestamps, provider,
  description, return-to-service timestamp, and notes.
- Auto-generate `maintenanceNumber` when blank.
- Allow a completed event to mark a linked discrepancy `CLEARED` only through
  an explicit form choice.
- Keep deferral clearing deferred.
- Keep airworthiness release signing deferred.

## Boundary

- No Prisma schema changes.
- No migration.
- No maintenance work orders.
- No component tracking.
- No reliability analytics.
- No Service Difficulty Reports.
- No file uploads.
- No vendor/provider integrations.
- No auth, roles, signatures, or user attribution.
- No airworthiness release signing.
- No hard release blocking.

## Validation For Prompt 41

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/aircraft/[aircraftId]/airworthiness`
- Create/edit maintenance event without discrepancy.
- Create/edit maintenance event with discrepancy.
- Mark event `COMPLETED`.
- Confirm explicit discrepancy-clear option works.
- `/aircraft`
- `/operations-control/[flightLegId]`
- `/operations-control`
- `/api/health`
- `/internal/flightleg-parity`
- `/internal/flightleg-write-readiness`

## Stop Conditions

Stop before implementation if:

- A schema migration appears necessary.
- The workflow needs user identity, signature, or approval authority.
- Maintenance completion needs to clear deferrals automatically.
- Airworthiness release signing becomes necessary.
- Release blocking becomes necessary to define.
- Provider integration, file upload, work-order workflow, or component tracking
  becomes tempting.
