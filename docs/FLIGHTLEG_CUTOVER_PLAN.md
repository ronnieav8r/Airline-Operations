# FlightLeg Cutover Plan

Last updated: 2026-06-11

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

   Prompt 167 completed the first resolver/API cutover foundation. The shared
   crew coverage resolver now accepts FlightLeg IDs first, uses FlightLeg
   schedule and active AircraftAssignment context, and preserves legacy Flight ID
   compatibility.

3. **QA And Parity**
   Validate parity diagnostics, route smoke, create/edit bridge synchronization,
   and both ID styles for coverage APIs.

   Prompt 168 completed static QA. Runtime/API/browser checks are pending until
   Docker Desktop is available.

   Prompt 211 completed local runtime QA with Docker Postgres available. Static
   checks, route smoke, browser smoke, FlightLeg parity diagnostics, and
   FlightLeg-vs-legacy-ID coverage resolver checks passed for seeded data.

4. **Compatibility Mode**
   After parity is proven, document legacy `Flight` as compatibility/archive and
   keep destructive removal deferred.

   Next recommended step is FlightLeg-native coverage response planning. The
   API paths should continue accepting both FlightLeg IDs and legacy Flight IDs,
   while response fields move toward FlightLeg-first naming with legacy aliases.

   Prompt 212 completed this planning step.

   Prompt 213 implemented FlightLeg-primary identity aliases on the existing
   crew/coverage API responses while preserving current `flightId`
   compatibility. The shared resolver and smoke suite now validate both
   bridged `FlightLeg.id` requests and linked legacy `Flight.id` requests.

   Contract:

   ```text
   docs/FLIGHTLEG_COVERAGE_RESPONSE_CONTRACT.md
   ```

5. **Internal Consumer Cutover**
   Prompt 214 planned the next additive step after Prompt 213: migrate internal
   coverage consumers to prefer `FlightLeg.id` where a bridge exists, while
   preserving legacy `Flight.id` fallback and current API compatibility.

   First implementation target should focus on crew-heavy read helpers and page
   consumers. Parity diagnostics and backfill scripts should remain
   legacy-aware because they intentionally compare or create bridge records.

## Deferred

- Dropping or renaming legacy `Flight`.
- Removing legacy `FlightPassenger` or `CrewFlightLog`.
- Removing `/api/flights/[id]` compatibility paths.
- Replacing `AircraftCrewAssignment` as operational staffing truth.
- Hard release blocking.
