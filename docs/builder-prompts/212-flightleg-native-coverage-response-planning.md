# Prompt 212: FlightLeg-Native Coverage Response Planning

## Summary

Plan the next controlled FlightLeg cutover step for crew/coverage APIs. The
selected strategy is additive: keep existing `/api/flights/[id]/crew` and
`/api/flights/[id]/coverage` response fields intact, add FlightLeg-primary
identity aliases, and preserve compatibility for both FlightLeg IDs and legacy
Flight IDs.

Prompt 212 is docs/planning only. Prompt 213 should implement the response
foundation.

## Key Decisions

- Keep `/api/flights/[id]/crew` and `/api/flights/[id]/coverage` as the
  compatibility paths.
- Continue accepting either a `FlightLeg.id` or legacy `Flight.id`.
- Keep current `flightId` behavior for compatibility during Prompt 213.
- Add FlightLeg-primary aliases to both crew and coverage responses:
  - `operationalFlightLegId`: the resolved `FlightLeg.id`, or `null` for
    unbridged legacy rows.
  - `legacyFlightId`: the linked legacy `Flight.id`, or the direct legacy ID for
    fallback rows.
  - `inputId`: the ID passed to the resolver/API.
  - `identitySource`: `FLIGHT_LEG_ID`, `LEGACY_FLIGHT_ID`, or
    `LEGACY_FLIGHT_ONLY`.
- Preserve existing `flightLegId`, `flightId`, `readSource`, `aircraftId`,
  `scheduledDeparture`, assigned crew, coverage warnings, and missing-role
  fields.
- Treat unbridged legacy Flight rows as explicit fallback records, not not-found.

## Prompt 213 Target

- Update `lib/crew-resolution.ts` types and resolver return objects to include
  the new identity fields.
- Update both `/api/flights/[id]` route responses automatically through the
  shared resolver.
- Add focused tests or smoke coverage that compares response identity fields
  for:
  - coverage with a `FlightLeg.id`,
  - coverage with the linked legacy `Flight.id`,
  - crew with a `FlightLeg.id`,
  - crew with the linked legacy `Flight.id`.
- Update cutover docs with implementation status.
- Do not update visible UI consumers yet except as needed for TypeScript
  compatibility.
- Do not remove legacy fields, legacy API paths, legacy tables, or bridge
  writes.

## Transitional Response Contract

For a bridged FlightLeg ID request:

- `inputId`: requested `FlightLeg.id`
- `identitySource`: `FLIGHT_LEG_ID`
- `operationalFlightLegId`: resolved `FlightLeg.id`
- `legacyFlightId`: linked legacy `Flight.id`
- `flightLegId`: existing compatibility field, same as `operationalFlightLegId`
- `flightId`: existing compatibility field, still the linked legacy `Flight.id`

For a linked legacy Flight ID request:

- `inputId`: requested legacy `Flight.id`
- `identitySource`: `LEGACY_FLIGHT_ID`
- `operationalFlightLegId`: linked `FlightLeg.id`
- `legacyFlightId`: requested legacy `Flight.id`
- `flightLegId`: existing compatibility field, same as `operationalFlightLegId`
- `flightId`: existing compatibility field, still the legacy `Flight.id`

For an unbridged legacy Flight fallback:

- `inputId`: requested legacy `Flight.id`
- `identitySource`: `LEGACY_FLIGHT_ONLY`
- `operationalFlightLegId`: `null`
- `legacyFlightId`: requested legacy `Flight.id`
- `flightLegId`: existing compatibility field, `null`
- `flightId`: existing compatibility field, legacy `Flight.id`
- `readSource`: `LEGACY_FLIGHT`

## Test Plan For Prompt 213

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB prep:
  - `npm run db:local:up`
  - `npm run db:local:migrate`
  - `npm run db:local:seed`
- Targeted API smoke:
  - `/api/flights/{flightLegId}/coverage`
  - `/api/flights/{legacyFlightId}/coverage`
  - `/api/flights/{flightLegId}/crew`
  - `/api/flights/{legacyFlightId}/crew`
- Confirm linked FlightLeg and legacy Flight calls resolve to the same
  crew/coverage data while exposing the new identity fields.
- Run `/internal/flightleg-parity`, `/internal/flightleg-write-readiness`,
  `npm run smoke:app`, and `npm run smoke:browser`.

## Assumptions

- There are no customer-facing API consumers yet, but internal code still
  depends on the current response shape.
- Additive response aliases are safer than flipping `flightId` meaning in one
  slice.
- `FlightLeg` is the long-term operational identity.
- Legacy `Flight` remains compatibility/archive for now.
- `Flight`, `FlightPassenger`, `CrewFlightLog`,
  `OperationalControlRecord.flightId`, `FlightLeg.legacyFlightId`, and
  `/api/flights/[id]` paths must not be removed in Prompt 213.
