# Prompt 167: FlightLeg API Cutover Foundation

## Summary

Prompt 167 moves the shared crew coverage resolver toward FlightLeg-native
inputs while preserving current API paths and compatibility response fields.

## Implemented Scope

- `resolveFlightCrew` and `resolveFlightCoverage` now resolve `FlightLeg.id`
  first.
- When a FlightLeg ID is supplied, the resolver uses FlightLeg schedule and
  active `AircraftAssignment` context before falling back to the legacy bridge.
- Legacy `Flight.id` inputs remain supported.
- API paths remain unchanged:
  - `/api/flights/[id]/crew`
  - `/api/flights/[id]/coverage`
- Response payloads preserve `flightId` for compatibility and now also expose
  `flightLegId` plus `readSource`.

## Preserved Behavior

- `AircraftCrewAssignment` remains operational staffing truth.
- Coverage still evaluates aircraft-block assignments at the leg departure
  time.
- Qualification warnings remain warning-only.
- No route rename, schema change, or hard release blocking was added.

## Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Local runtime/API smoke remains pending because Docker Desktop was unavailable.

## Prompt 168 Target

Run FlightLeg cutover QA: parity diagnostics, route smoke, create/edit bridge
checks, and both legacy Flight ID plus FlightLeg ID coverage API checks when
local runtime is available.
