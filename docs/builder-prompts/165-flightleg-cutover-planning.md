# Prompt 165: FlightLeg Cutover Planning

## Summary

Plan the controlled migration away from legacy `Flight` as the active app
bridge. Do not drop or rename `Flight`. The cutover should move app reads and
coverage APIs to `FlightLeg` as the primary operational anchor while preserving
legacy fallbacks until parity is proven.

## Current Inventory

Remaining legacy `Flight` dependencies are concentrated in these areas:

- Dashboard and visible board reads still preserve legacy `Flight` fallback
  semantics.
- `/flights`, `/aircraft`, `/crew`, crew member context, and crew scheduling
  planner helpers still query or normalize legacy `Flight` rows in fallback
  paths.
- Crew coverage APIs still expose `/api/flights/[id]/crew` and
  `/api/flights/[id]/coverage`, and their response shape is keyed to the
  resolved legacy `Flight.id`.
- `resolveFlightCoverage` and related helpers still resolve through the legacy
  `Flight` bridge because aircraft-block coverage was originally based on
  `Flight.aircraftId` plus `Flight.scheduledDeparture`.
- FlightLeg create/edit intentionally still creates or updates a matching
  legacy `Flight` row in the same transaction.
- Seed and demo backfill still create current `Flight` rows and then create
  matching `FlightLeg` records.
- `FlightPassenger` and `CrewFlightLog` remain legacy-history tables and should
  not be removed in this chain.

## Cutover Strategy

Use a staged cutover:

1. Move visible app read helpers to `FlightLeg` primary queries.
2. Keep legacy `Flight` fallback for unbridged rows.
3. Move coverage APIs toward FlightLeg-native identifiers and internals while
   preserving existing API paths and compatibility response aliases.
4. Keep FlightLeg write workflows maintaining the legacy `Flight` bridge until
   parity diagnostics prove safe.
5. Treat legacy `Flight` as compatibility/archive only after page reads and APIs
   no longer depend on it as the source of truth.

## Prompt 166 Target

Move remaining app/page helper reads to FlightLeg-primary data:

- Dashboard.
- `/flights`.
- `/aircraft` fleet/context helpers.
- `/crew` and crew member context helpers.
- `/crew/scheduling` planner helper.

Preserve legacy fallback display for unbridged rows, but make bridged FlightLeg
records the primary query path and label them clearly as FlightLeg-backed reads.

## Prompt 167 Target

Move coverage APIs and crew coverage helpers toward FlightLeg-native inputs:

- Keep `/api/flights/[id]/crew` and `/api/flights/[id]/coverage` paths.
- Accept both `FlightLeg.id` and legacy `Flight.id`.
- Prefer FlightLeg-native assignment/snapshot data when a FlightLeg is supplied.
- Preserve compatibility response fields until callers are migrated.
- Do not delete `resolveFlightCoverage` compatibility behavior in this slice.

## Parity Criteria

Before treating `Flight` as compatibility/archive only:

- `/internal/flightleg-parity` has no failed bridge, control, aircraft, or
  schedule checks for active records.
- New FlightLeg create/edit writes keep the legacy bridge row synchronized.
- Dashboard, Operations Control, Flights, Aircraft, Crew, and Scheduling render
  from FlightLeg-primary helpers.
- Crew coverage APIs work with both FlightLeg IDs and legacy Flight IDs.
- Release evidence, release actions, crew assignment, and scheduling workflows
  still behave as warning-first.

## Rollback Criteria

Rollback to legacy/fallback reads if:

- Active rows disappear from visible operational boards.
- Coverage resolution changes meaningfully for current aircraft-block
  assignments.
- FlightLeg create/edit no longer keeps bridge parity.
- Release evidence detail loses linked operational-control or evidence records.

## Stop Boundary

Prompt 165 is planning only. No schema, API, UI, or data behavior changes.
