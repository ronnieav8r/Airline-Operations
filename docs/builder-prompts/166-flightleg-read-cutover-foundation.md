# Prompt 166: FlightLeg Read Cutover Foundation

## Summary

Prompt 166 begins the app-read cutover by moving the highest-visibility board
helpers to `FlightLeg` primary reads with legacy `Flight` fallback only for
unbridged rows.

## Implemented Scope

- `/flights` helper now queries `FlightLeg` first and merges fallback legacy
  `Flight` rows only when no bridged FlightLeg exists.
- Dashboard today-flight helper now queries `FlightLeg` first and uses legacy
  `Flight` fallback only for unbridged rows.
- `/aircraft` fleet board now reads current/upcoming legs from
  `AircraftAssignment -> FlightLeg` first, with legacy aircraft flights as
  fallback only for unbridged rows.
- Existing UI data shapes, read-source labels, links, and coverage display
  contracts are preserved.

## Deliberate Deferral To Prompt 167

Crew-heavy reads in `/crew`, crew member context, and `/crew/scheduling` remain
coupled to `resolveFlightCoverage`. They should move with the coverage/API
cutover so assignment semantics are changed in one place instead of split
across unrelated visual helpers.

## Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Local runtime/browser smoke remains pending because Docker Desktop was not
available in this environment.

## Prompt 167 Target

Move crew coverage helpers and coverage APIs toward FlightLeg-native inputs
while preserving compatibility aliases and existing API paths.
