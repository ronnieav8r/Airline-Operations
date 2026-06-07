# Builder Prompt 19: FlightLeg Create/Edit Workflow Foundation

## Summary

Add the first controlled FlightLeg write workflow under Operations Control.
This slice creates and edits core FlightLeg scheduling/control data while
maintaining the current legacy `Flight` bridge required by existing coverage
APIs and fallback reads.

## Implemented Scope

- Added `/operations-control/new` for creating a FlightLeg.
- Added `/operations-control/[flightLegId]/edit` for limited FlightLeg edits.
- Added Operations Control links for creating and editing FlightLeg-backed rows.
- Added an edit link from the existing read-only release-evidence detail page.
- Added server-side form actions with transaction-backed writes.

## Write Behavior

Create writes these records together:

- Legacy `Flight` compatibility row.
- Auto `TripOrMission` using `TRIP-{flightNumber}-{YYYYMMDD}`.
- `FlightLeg` linked through `legacyFlightId`.
- Planned `AircraftAssignment`.
- `OperationalControlRecord` linked to both `Flight` and `FlightLeg`.
- Planned `FlightRelease`.
- Adjacent same-aircraft `TurnaroundLink` rows.

Edit updates these records together:

- Legacy `Flight` bridge row.
- Core `FlightLeg` fields.
- Auto `TripOrMission` requested start/end.
- Current `AircraftAssignment`, preserving replaced assignment history.
- Linked `OperationalControlRecord`.
- Planned `FlightRelease` placeholder when a release row is missing.
- Adjacent same-aircraft `TurnaroundLink` rows.

## Boundaries

- No schema migration is included.
- No auth or user attribution is included.
- No release-evidence mutation is included.
- No dispatch, manifest, weight-and-balance, or locating workflow is included.
- No crew assignment writes are included.
- Current crew coverage still resolves through the legacy `Flight` bridge.
- The parity diagnostic compares `CrewLegAssignment` snapshots when present, but
  missing crew snapshots are expected for newly created FlightLeg rows until a
  later crew workflow promotes leg-level crew writes.

## Validation

Use the standard validation set:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/operations-control/new` creates a FlightLeg.
- `/operations-control/[flightLegId]/edit` edits core leg/control fields.
- Created/edited legs appear on `/operations-control`, `/flights`, `/scheduling`,
  and relevant aircraft context.
- `/operations-control/[flightLegId]` still shows the read-only evidence detail.
- `/api/health` still returns nonzero FlightLeg/control counts.
- `/internal/flightleg-parity` has no failed bridge/control/aircraft checks for
  the created leg.
