# Prompt 213: FlightLeg-Native Coverage Response Foundation

## Summary

Implement the additive crew/coverage API response aliases planned in Prompt 212.
Keep existing `/api/flights/[id]/crew` and `/api/flights/[id]/coverage`
compatibility paths and continue accepting either a `FlightLeg.id` or a legacy
`Flight.id`.

## Implemented Scope

- Added FlightLeg-primary identity aliases to the shared crew-resolution helper:
  - `operationalFlightLegId`
  - `legacyFlightId`
  - `inputId`
  - `identitySource`
- Preserved existing response fields:
  - `flightId`
  - `flightLegId`
  - `readSource`
  - `aircraftId`
  - `scheduledDeparture`
  - assigned crew
  - coverage warnings and missing-role fields
- Added smoke-test coverage for both API paths using:
  - a bridged `FlightLeg.id`
  - the linked legacy `Flight.id`
- Confirmed the shared resolver returns equivalent crew/coverage data for both
  ID styles while exposing the new identity aliases.

## Identity Contract

`identitySource` values:

- `FLIGHT_LEG_ID`: request input was a `FlightLeg.id`.
- `LEGACY_FLIGHT_ID`: request input was a legacy `Flight.id` bridged to a
  `FlightLeg`.
- `LEGACY_FLIGHT_ONLY`: request input was an unbridged legacy `Flight.id`.

`flightId` remains compatibility-oriented and should not be reinterpreted as the
FlightLeg operational ID in this slice. New internal callers should prefer
`operationalFlightLegId` for operational identity and `legacyFlightId` only for
compatibility/archive references.

## Deferred

- Removing legacy response fields.
- Changing the meaning of `flightId`.
- Removing `/api/flights/[id]` paths.
- Dropping `Flight`, `FlightPassenger`, `CrewFlightLog`,
  `OperationalControlRecord.flightId`, or `FlightLeg.legacyFlightId`.
- Migrating visible UI consumers away from compatibility fields.
