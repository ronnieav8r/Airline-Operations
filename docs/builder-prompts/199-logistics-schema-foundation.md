# Prompt 199: Logistics Schema Foundation

## Summary

Add the first Crew Logistics database foundation as an additive schema slice.
This stores crew location records and travel-support needs without adding
logistics UI, booking integrations, assignment automation, expense tracking, or
duty/rest enforcement.

## Scope

- Add `CrewLocationSource`, `CrewLogisticsNeedType`, and
  `CrewLogisticsNeedStatus` enums.
- Add `CrewLocationRecord` for historical/current manual crew location context.
- Add `CrewLogisticsNeed` for positioning, deadhead, ticket, hotel, ground
  transport, and other travel-support placeholders.
- Link records to `CrewMember`, optional `Station`, optional `Aircraft`,
  optional `FlightLeg`, and optional creator `User`.
- Add health counts for the new logistics tables.

## Boundaries

- Do not add logistics create/edit UI in this slice.
- Do not mutate `CrewSchedule`, `CrewScheduleEntry`, `AircraftCrewAssignment`,
  `CrewLegAssignment`, release records, or duty/rest records.
- Do not add provider integrations, airline booking, hotel booking, expense
  workflow, file uploads, or automatic positioning recommendations.
- Keep Crew Logistics as planning/context data only.

## Test Plan

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB migration smoke when Docker Desktop is available.
- Confirm `/api/health` includes `crewLocationRecords` and
  `crewLogisticsNeeds` after migration.

## Follow-Up

Prompt 200 should add read-only logistics context to crew detail, crew planner,
and aircraft crew assignment surfaces.
