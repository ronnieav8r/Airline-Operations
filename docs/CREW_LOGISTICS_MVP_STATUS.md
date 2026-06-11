# Crew Logistics MVP Status

Last updated: 2026-06-11

## Status

Manual Crew Logistics is backend MVP-complete for the current coordination
scope.

The module helps ops/admin users track where crew members appear to be and what
manual travel-support needs remain open. It does not book travel, pay expenses,
enforce duty/rest, publish schedules, or automatically assign crew to aircraft.

## Backend Capabilities In Place

- `CrewLocationRecord` stores manual crew location context with station,
  free-text location, source, effective time, notes, and creator attribution.
- `CrewLogisticsNeed` stores positioning, deadhead, airline ticket, hotel,
  ground transport, and other manual travel-support needs.
- Logistics needs can link to crew members, stations, aircraft, FlightLegs, and
  creator users.
- Ops/admin users can create and edit crew-scoped logistics records at
  `/crew/[crewMemberId]/logistics`.
- Ops/admin users can scan all logistics needs at `/crew/logistics`.
- `/crew/logistics` supports summary cards, status/type/crew/aircraft/station
  filters, grouping, missing-provider indicators, overdue indicators, and
  cross-links.
- Crew detail, crew planner, aircraft context, and aircraft crew assignment
  surfaces show logistics context where useful.
- Smoke tooling verifies logistics workflows and the central workbench.

## Runtime QA Evidence

- `npm run smoke:crew-logistics-workflow` verifies location create/update,
  logistics need create/update for all MVP need types, status/provider
  placeholder persistence, and no schedule/assignment/release/duty-rest side
  effects.
- `npm run smoke:crew-logistics-workbench` verifies `/crew/logistics` role
  gates, filters, grouping modes, and cross-link rendering.
- `npm run smoke:app` verifies admin/ops access and non-admin redirects for
  logistics management and the workbench.
- `npm run smoke:browser` verifies protected workflow access and crew-role
  redirect behavior through browser automation.

## Deferred Post-MVP Work

- Airline ticket provider integration.
- Hotel provider integration.
- Ground transport provider integration.
- Live booking, cancellation, or change workflows.
- Expense/payment workflow.
- File uploads or itinerary attachments.
- Crew self-service logistics creation.
- Automatic positioning recommendations.
- Schedule mutation from logistics.
- Aircraft assignment mutation from logistics.
- Release readiness mutation from logistics.
- Duty/rest hard enforcement from logistics.

## Product Boundary

Crew Logistics is a manual coordination module. It should provide visibility and
notes for ops/admin users, but operational staffing remains controlled by
`AircraftCrewAssignment`, schedule availability remains controlled by
`CrewScheduleEntry` and `CrewSchedule`, and legal release behavior remains
warning-first.
