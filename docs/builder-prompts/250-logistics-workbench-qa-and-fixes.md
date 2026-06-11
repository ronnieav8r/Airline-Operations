# Prompt 250: Logistics Workbench QA And Fixes

## Summary

Runtime-test the central ops/admin `/crew/logistics` workbench and fix only
clear route, filter, grouping, or display bugs that do not require a product
decision.

## Scope

- Verify `/crew/logistics` renders for admin and ops users.
- Verify non-admin roles are redirected away from the logistics workbench.
- Verify status, type, crew, aircraft, station, and grouping query paths render
  with logistics records.
- Verify workbench cards preserve links back to crew detail, aircraft context,
  aircraft crew workflow, FlightLeg detail where linked, and crew-scoped
  logistics management.
- Keep logistics creation/editing on `/crew/[crewMemberId]/logistics`.

## Implementation

- Add `npm run smoke:crew-logistics-workbench`.
- Add a focused smoke script that creates deterministic logistics workbench
  records, fetches the relevant workbench views, and checks expected page
  markers.
- Do not add customer-facing behavior unless QA exposes a clear bug.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run smoke:crew-logistics-workbench`
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Deferred

- Provider integrations.
- Live travel booking.
- Expense tracking.
- Crew self-service logistics writes.
- Automatic positioning recommendations.
- Schedule mutation.
- Aircraft assignment mutation.
- Release behavior changes.
- Duty/rest hard enforcement.
