# Crew Logistics Runtime QA Plan

Last updated: 2026-06-11

## Purpose

Run the missing DB-backed QA for Crew Logistics now that local Docker-backed
testing is available. Earlier logistics slices implemented schema, read
surfaces, crew-scoped writes, cross-links, and the central workbench, but some
runtime checks were partial.

## Prompt 249: Crew Logistics Workflow QA

Status: complete.

Verify:

- Admin/ops can create and edit `CrewLocationRecord` rows.
- Admin/ops can create and edit `CrewLogisticsNeed` rows for:
  - positioning,
  - deadhead,
  - airline ticket,
  - hotel,
  - ground transport,
  - other.
- Status changes persist.
- Provider/confirmation placeholder fields persist.
- Logistics records can link to crew, station, aircraft, and FlightLeg context
  where data is available.
- Logistics writes do not mutate `CrewSchedule`, `CrewScheduleEntry`,
  `AircraftCrewAssignment`, release, or duty/rest records.

## Prompt 250: Logistics Workbench QA And Fixes

Status: complete.

Verify:

- `/crew/logistics` renders for admin/ops.
- Non-admin roles are redirected away from logistics management.
- Filters work for status, type, crew member, aircraft, station, and FlightLeg
  context where supported by the current UI.
- Grouping and summary cards reflect seeded/manual logistics records.
- Cross-links route correctly to crew detail, aircraft context, aircraft crew
  workflow, FlightLeg detail, and crew-scoped logistics management.
- Fix only clear route/display/data bugs that do not require a product
  decision.

## Prompt 251: Docs Refresh

Status: complete.

After runtime QA:

- Update `docs/CREW_LOGISTICS_QA_LOG.md`.
- Update `docs/CREW_LOGISTICS_PLAN.md`.
- Update `docs/PROJECT_STATUS.md`.
- Mark manual logistics backend MVP-complete only if runtime QA passes or
  remaining gaps are explicitly deferred as post-MVP.

## Common Validation

Run for each implementation/QA slice:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
npm run db:local:up
npm run db:local:migrate
npm run db:local:seed
npm run smoke:workflows
npm run smoke:app
npm run smoke:browser
```

## Out Of Scope

- Provider integrations.
- Live booking.
- Expenses.
- Crew self-service logistics creation.
- Automatic positioning recommendations.
- Schedule mutation.
- Aircraft assignment mutation.
- Release behavior changes.
- Duty/rest hard enforcement.
