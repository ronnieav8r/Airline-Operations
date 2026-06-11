# FlightLeg Coverage Response Contract

Last updated: 2026-06-11

## Purpose

The crew and coverage API responses are moving toward FlightLeg-native identity
without breaking existing internal callers that still expect legacy `flightId`
fields.

Current compatibility paths remain:

- `/api/flights/[id]/crew`
- `/api/flights/[id]/coverage`

Both paths should accept either a `FlightLeg.id` or a legacy `Flight.id`.

## Prompt 212 Decision

Prompt 212 selected an additive response strategy. Prompt 213 should keep the
current response shape and add identity aliases.

New fields:

- `operationalFlightLegId`: resolved `FlightLeg.id`, or `null` for unbridged
  legacy rows.
- `legacyFlightId`: linked or direct legacy `Flight.id`.
- `inputId`: ID passed to the resolver/API.
- `identitySource`: `FLIGHT_LEG_ID`, `LEGACY_FLIGHT_ID`, or
  `LEGACY_FLIGHT_ONLY`.

Existing fields stay:

- `flightId`
- `flightLegId`
- `readSource`
- `aircraftId`
- `scheduledDeparture`
- assigned crew
- crew warnings
- coverage missing-role fields

## Prompt 213 Implementation

Prompt 213 implements the additive aliases in the shared crew-resolution helper,
so both compatibility API paths now return the same identity contract:

- `/api/flights/[id]/crew`
- `/api/flights/[id]/coverage`

The smoke suite checks both a bridged `FlightLeg.id` request and its linked
legacy `Flight.id` request, then confirms the new aliases resolve to the same
operational leg and compatibility flight.

## Transitional Meaning

For Prompt 213, `flightId` remains the compatibility legacy Flight ID when a
legacy bridge exists. Do not make `flightId` mean `FlightLeg.id` yet.

Use these fields for new code:

- Prefer `operationalFlightLegId` for operational identity.
- Use `legacyFlightId` only for compatibility and archive references.
- Use `identitySource` to distinguish whether the request was resolved from a
  FlightLeg ID, a linked legacy Flight ID, or an unbridged legacy-only row.

## Deferred

- Removing `flightId` from API responses.
- Changing `flightId` to mean `FlightLeg.id`.
- Removing `/api/flights/[id]` paths.
- Dropping `Flight`, `FlightPassenger`, or `CrewFlightLog`.
- Removing `OperationalControlRecord.flightId`.
- Removing `FlightLeg.legacyFlightId`.

## Next Consumer Cutover

Prompt 214 plans the next safe internal migration after the response aliases:
page/query consumers should prefer `operationalFlightLegId` or known
`FlightLeg.id` values for coverage lookups when a bridge exists, while keeping
legacy `Flight.id` fallback for unbridged rows.

API paths and response fields remain compatibility-stable until a separate
versioned API transition is planned.

Prompt 216 implements the first internal consumer migration for crew-heavy
coverage callers. New internal code should continue using FlightLeg IDs for
coverage lookups whenever a bridge exists.
