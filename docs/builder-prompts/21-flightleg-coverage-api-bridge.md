# Builder Prompt 21: FlightLeg Coverage API Bridge

## Summary

Let existing crew coverage APIs accept either a legacy `Flight.id` or a
`FlightLeg.id`. This keeps current API paths stable while new FlightLeg-backed
surfaces and write flows can request coverage with their native IDs.

## Implemented Scope

- Updated the crew-resolution helper to resolve a FlightLeg ID through
  `FlightLeg.legacyFlight`.
- Kept existing endpoints:
  - `/api/flights/[id]/coverage`
  - `/api/flights/[id]/crew`
- Preserved response shape. The returned `flightId` remains the resolved legacy
  `Flight.id`.
- Updated not-found text to say either Flight or FlightLeg may be missing.

## Boundaries

- No schema migration is included.
- No new API route is included.
- No crew assignment write behavior is included.
- Coverage still resolves from aircraft-block assignments using the legacy
  Flight bridge.

## Validation

Use the standard validation set:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/api/flights/{legacyFlightId}/coverage` still returns the existing response.
- `/api/flights/{flightLegId}/coverage` returns coverage for the linked legacy
  Flight.
- `/api/flights/{flightLegId}/crew` returns crew grouped by seat role.
- Main routes and internal diagnostics still return 200.
