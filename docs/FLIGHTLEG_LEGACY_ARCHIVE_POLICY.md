# FlightLeg Legacy Flight Archive Policy

Last updated: 2026-06-11

## Summary

For backend MVP, `FlightLeg` is the preferred operational identity. Legacy
`Flight` remains a compatibility/archive bridge and must not be destructively
removed yet.

## MVP Policy

- New core leg/control writes continue maintaining a legacy `Flight` bridge row
  for compatibility.
- Internal reads should prefer `FlightLeg.id` where a bridge exists.
- Public `/api/flights/[id]/crew` and `/api/flights/[id]/coverage` continue
  accepting both FlightLeg IDs and legacy Flight IDs.
- Existing compatibility response fields remain stable.
- Seed, backfill, parity, and smoke scripts remain legacy-aware.
- `FlightPassenger`, `CrewFlightLog`, `OperationalControlRecord.flightId`,
  `FlightLeg.legacyFlightId`, and `Alert.flightId` remain in place.

## Destructive Removal Requirements

Do not remove or rename legacy `Flight` tables or fields until a later
retirement plan proves:

- No internal runtime consumers require legacy rows except archive readers.
- No compatibility API contract depends on legacy `flightId` semantics.
- Old passenger/logbook/history records have a reviewed migration or archive
  access strategy.
- Render/demo backfill and seed behavior no longer depends on legacy bridge
  creation.
- A rollback strategy exists.

## Backend MVP Status

Prompt 223 confirms the cutover is safe for MVP compatibility/archive mode.
This is not approval for destructive removal.
