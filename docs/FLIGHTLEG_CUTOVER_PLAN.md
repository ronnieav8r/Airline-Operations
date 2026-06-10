# FlightLeg Cutover Plan

Last updated: 2026-06-10

## Decision

`FlightLeg` is the long-term operational anchor. Legacy `Flight` remains as a
compatibility/archive table until active reads, coverage APIs, and write parity
are proven safe.

The app should not drop `Flight`, `FlightPassenger`, `CrewFlightLog`, or the
legacy API paths in the current macro scaffolding chain.

## Source Of Truth Direction

- Operational leg identity: `FlightLeg`.
- Operational control: `OperationalControlRecord.flightLegId`, while preserving
  `flightId` for compatibility.
- Aircraft assignment: `AircraftAssignment`.
- Crew coverage evidence: `CrewLegAssignment` snapshots, with aircraft-block
  assignments remaining operational staffing truth.
- Legacy compatibility: `Flight` bridge through `FlightLeg.legacyFlightId`.

## Remaining Legacy Read Areas

- Dashboard helper.
- Flights helper.
- Aircraft board/context helpers.
- Crew board and crew member context helpers.
- Crew scheduling planner helper.
- Coverage resolver/API compatibility path.
- Seed and backfill bridge creation.

## Implementation Order

1. **App Read Cutover**
   Move visible boards and helper queries to FlightLeg-primary reads, keeping
   legacy fallback rows visible.

   Prompt 166 completed the first board cutover for `/`, `/flights`, and
   `/aircraft`. Crew-heavy reads remain with the coverage/API cutover because
   they depend on `resolveFlightCoverage` semantics.

2. **Coverage/API Cutover**
   Keep current API paths but make FlightLeg IDs first-class. Preserve response
   compatibility while internals move toward FlightLeg assignment/snapshot data.

3. **QA And Parity**
   Validate parity diagnostics, route smoke, create/edit bridge synchronization,
   and both ID styles for coverage APIs.

4. **Compatibility Mode**
   After parity is proven, document legacy `Flight` as compatibility/archive and
   keep destructive removal deferred.

## Deferred

- Dropping or renaming legacy `Flight`.
- Removing legacy `FlightPassenger` or `CrewFlightLog`.
- Removing `/api/flights/[id]` compatibility paths.
- Replacing `AircraftCrewAssignment` as operational staffing truth.
- Hard release blocking.
