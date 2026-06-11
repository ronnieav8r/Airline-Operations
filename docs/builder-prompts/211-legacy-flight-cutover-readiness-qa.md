# Prompt 211: Legacy Flight Cutover Readiness QA

## Summary

Validate the current FlightLeg cutover state before any further migration away
from legacy `Flight`. This is a QA/docs slice only. It does not remove
`Flight`, change schema, change API response shapes, or alter write behavior.

## QA Results

Completed local runtime QA on 2026-06-11 with local Docker Postgres.

Passed:

- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Targeted FlightLeg/legacy Flight resolver parity script.
- `npm run smoke:app`
- `npm run smoke:browser`

Targeted parity result:

- 5 bridged FlightLeg rows checked.
- 0 coverage/crew resolver mismatches between FlightLeg ID and legacy Flight ID.
- 5 parity rows passing.
- 0 parity rows failing.
- 0 missing FlightLeg bridge rows.
- 0 crew mismatches.
- 0 aircraft mismatches.
- 0 control mismatches.
- 0 turnaround mismatches.

## Decision

AeroOps is ready for the next controlled cutover planning/implementation slice,
but not for destructive legacy `Flight` removal.

Keep legacy compatibility for now:

- `Flight`
- `FlightPassenger`
- `CrewFlightLog`
- `OperationalControlRecord.flightId`
- `FlightLeg.legacyFlightId`
- `/api/flights/[id]/crew`
- `/api/flights/[id]/coverage`

## Recommended Next Slice

Prompt 212 should plan FlightLeg-native coverage response behavior.

Goals:

- Decide whether public/internal coverage responses should expose
  `operationalFlightLegId` or make `flightLegId` primary.
- Preserve legacy `flightId` as a compatibility alias.
- Keep `/api/flights/[id]` paths working for both ID styles.
- Avoid deleting legacy tables.

## Assumptions

- Legacy `Flight` remains compatibility/archive until a separate removal plan is
  approved.
- FlightLeg remains the operational identity target.
- Aircraft-block crew assignment remains the operational staffing source.
- `CrewLegAssignment` remains a FlightLeg snapshot/evidence table.
