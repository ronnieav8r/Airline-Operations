# Prompt 198: Crew Logistics Planning

## Summary

Plan the first Crew Logistics foundation. The first scope is crew location and
travel-need tracking only: where a crew member is, where they may need to be,
and what travel support may be required. Do not add airline booking, hotel
booking, expense workflows, provider integrations, or automated positioning
logic.

## Key Decisions

- Crew Logistics stays inside the Crew module.
- First read surfaces should appear on crew detail, crew planner, and aircraft
  crew assignment workflow.
- First write surface should be ops/admin only.
- Crew self-service can view logistics context later, but crew-created logistics
  records are deferred.
- Logistics records are planning/coordination records, not duty/rest evidence.
- Logistics warnings remain warning-only.
- Logistics must not create or change `AircraftCrewAssignment`.
- Logistics must not create or change `CrewScheduleEntry`.

## Prompt 199 Schema Target

Additive schema foundation:

- `CrewLocationRecord`: manual/current or historical location context for one
  crew member.
- `CrewLogisticsNeed`: positioning/deadhead/ticket/hotel/ground transport need
  placeholder for one crew member.

Likely enums:

- `CrewLocationSource`: `MANUAL`, `CREW_REPORTED`, `ASSIGNMENT`, `SCHEDULE`,
  `IMPORT`.
- `CrewLogisticsNeedType`: `POSITIONING`, `DEADHEAD`, `AIRLINE_TICKET`,
  `HOTEL`, `GROUND_TRANSPORT`, `OTHER`.
- `CrewLogisticsNeedStatus`: `PLANNED`, `REQUESTED`, `BOOKED`, `COMPLETED`,
  `CANCELLED`.

Suggested fields:

- `CrewLocationRecord`: crew member, optional station, free-text location,
  effective time, source, notes, created by.
- `CrewLogisticsNeed`: crew member, optional FlightLeg, optional aircraft,
  optional from/to station, need type, status, needed-by time, completed time,
  provider placeholder, confirmation placeholder, notes, created by.

## Prompt 200 Target

Add read-only logistics surfaces:

- crew detail,
- crew planner,
- aircraft assignment workflow.

Show current/latest location, open logistics needs, and warning-only positioning
context.

## Prompt 201 Target

Add ops/admin create/edit for logistics records:

- create location record,
- create logistics need,
- update status,
- edit notes/provider/confirmation placeholders.

No provider integrations or booking execution.

## Prompt 202 QA Target

Validate schema, read surfaces, create/edit workflow, and unchanged assignment
behavior.

## Boundaries

- No airline booking integration.
- No hotel booking integration.
- No expense workflow.
- No automatic crew repositioning.
- No crew-created logistics records.
- No duty/rest hard enforcement.
- No assignment automation.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB/browser smoke when Docker Desktop is available.
