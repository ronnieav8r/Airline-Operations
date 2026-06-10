# Prompt 168: FlightLeg Cutover QA

## Summary

Prompt 168 validates the FlightLeg cutover foundation from Prompts 165-167.

## Static QA Results

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

## Runtime QA Status

Local runtime/database QA is pending because Docker Desktop was not available.
`npm run db:local:up` failed while connecting to the Docker Desktop Linux
engine.

## Pending Runtime Checks

- Start local Postgres.
- Run local migrations and seed.
- Confirm `/`, `/flights`, and `/aircraft` show FlightLeg-backed read counts.
- Confirm `/crew`, `/crew/[crewMemberId]`, and `/crew/scheduling` still render
  with coverage after resolver changes.
- Confirm `/api/flights/{flightLegId}/coverage` and
  `/api/flights/{flightLegId}/crew` return successful compatibility payloads.
- Confirm `/api/flights/{legacyFlightId}/coverage` and
  `/api/flights/{legacyFlightId}/crew` still return successful compatibility
  payloads.
- Confirm `/internal/flightleg-parity` and
  `/internal/flightleg-write-readiness` remain clean.
- Create/edit a FlightLeg and confirm the legacy bridge remains synchronized.

## Result

The cutover foundation is static-clean. Runtime/browser/API verification remains
pending until Docker is available.
