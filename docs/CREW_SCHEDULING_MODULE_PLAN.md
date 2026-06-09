# Crew Scheduling Module Plan

Last updated: 2026-06-08

## Summary

Crew Scheduling should be a crew availability and planning module. It should
help operations see who is available, unavailable, qualified, scheduled,
training, reserve, sick, or on time off before making aircraft-block staffing
decisions.

Crew Scheduling is not the active flight coverage source. Flight coverage
continues to come from `AircraftCrewAssignment`.

## Source-Of-Truth Boundary

The durable boundary is:

- `CrewSchedule`: planned crew availability, duty status, reserve, training,
  and station context.
- `TimeOffRequest`: requested or approved absence.
- Future duty/rest records: compliance history and limit calculations.
- `AircraftCrewAssignment`: operational aircraft-block staffing decision.
- `CrewLegAssignment`: FlightLeg snapshot/evidence of expected crew.

Crew Scheduling answers:

```text
Who appears available and suitable?
```

`AircraftCrewAssignment` answers:

```text
Who is actually assigned to this aircraft block?
```

Flights inherit crew from `AircraftCrewAssignment` at scheduled departure.

## Planning Policy

- Crew Scheduling may show availability, conflicts, warnings, and suggested
  staffing context.
- Crew Scheduling may later prefill aircraft-block assignment forms.
- Crew Scheduling must not silently create, replace, or end aircraft-block
  assignments.
- Actual staffing changes should remain explicit `AircraftCrewAssignment`
  actions under the aircraft crew workflow.
- Conflict checks remain warning-only until later compliance and release-policy
  slices approve stronger enforcement.

## Prompt 118 Read-Only Planner Target

The first implementation adds a read-only `/crew/scheduling` planner board.

Minimum display:

- Crew member identity, base, employment status, and duty status.
- Planned schedule blocks from `CrewSchedule`.
- Time-off context from `TimeOffRequest`.
- Current aircraft-block assignment from `AircraftCrewAssignment`.
- Upcoming FlightLeg coverage inherited from current aircraft-block
  assignments.
- Warning-only availability conflicts.
- Links to `/aircraft/[aircraftId]/crew` for actual assignment changes.

Prompt 118 implementation status: complete. The planner is read-only, uses
existing crew schedule, time-off, aircraft-block assignment, and coverage data,
and keeps all staffing changes under `/aircraft/[aircraftId]/crew`.

Warning-only conflict examples:

- No schedule found for the planning day/window.
- Approved or pending time-off overlaps the planning window.
- Crew member is sick, vacation, training, or otherwise not clearly available.
- Missing or expired qualification for an aircraft type or seat role.
- Aircraft-block coverage gap exists for CPT or FO.

## Deferred Work

- Crew schedule create/edit workflow.
- Time-off request create/edit/review workflow.
- Duty/rest legal enforcement.
- Schedule import/apply workflow.
- Pairing/trip construction.
- Automated assignment recommendations.
- Silent application of aircraft-block assignment changes.
- Auth, signatures, and hard release blocking.

## Non-Goals

- Do not replace `AircraftCrewAssignment` as coverage truth.
- Do not treat `CrewSchedule` as proof that a crew member is assigned to an
  aircraft.
- Do not treat `CrewLegAssignment` as live staffing truth.
- Do not add schema for Prompt 118 unless a separate planning slice approves
  it.
