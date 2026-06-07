# Builder Prompt 22: CrewLegAssignment Snapshot Sync

## Summary

Snapshot resolved aircraft-block crew onto `CrewLegAssignment` during FlightLeg
create/edit. This adds leg-level crew evidence for the FlightLeg workflow while
preserving aircraft-block assignment as the active source of truth.

## Implemented Scope

- FlightLeg create now snapshots active aircraft-block crew assignments onto
  `CrewLegAssignment`.
- FlightLeg edit now resyncs the snapshot after aircraft or scheduled departure
  changes.
- Existing CrewLegAssignment rows that are no longer part of the resolved crew
  are marked `RELIEVED`.
- Matching CrewLegAssignment rows are upserted back to `PLANNED`, with
  `reportTime` set to the scheduled departure and
  `sourceAircraftCrewAssignmentId` preserved.

## Boundaries

- No schema migration is included.
- No crew override workflow is included.
- No crew release/check-in workflow is included.
- Current coverage APIs still resolve from aircraft-block assignments.
- CrewLegAssignment is a snapshot/evidence table for this slice, not the active
  crew assignment source.

## Validation

Use the standard validation set:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Create a FlightLeg with an aircraft that has active crew blocks.
- Confirm `CrewLegAssignment` rows are created for the new FlightLeg.
- Edit the FlightLeg to another aircraft/time and confirm snapshots resync.
- Confirm `/internal/flightleg-parity` still has no failures.
- Confirm `/api/flights/{flightLegId}/coverage` still resolves through the
  legacy Flight bridge.
