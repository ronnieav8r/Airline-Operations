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

## Prompt 120 Availability Hints Target

The aircraft crew assignment workflow now surfaces read-only availability hints
near the create assignment form. These hints use existing schedule, time-off,
duty/employment, active assignment, and qualification context.

Prompt 120 implementation status: complete. Availability hints do not block
saves and do not replace `AircraftCrewAssignment` as the operational coverage
source.

## Prompt 122 Planner Filters

The crew scheduling planner now supports URL-driven filters for availability,
duty status, current assignment state, time-off overlap, base station, and
assigned aircraft.

Prompt 122 implementation status: complete. Filters are read-only and do not
change schedule, time-off, assignment, release, or coverage behavior.

Prompt 123 QA status: complete. Default and filtered planner URLs render
locally, and the filter controls remain read-only.

## Prompt 124 Planner Grouping

The crew scheduling planner now supports URL-driven grouping by availability,
base, current assignment state, or duty status. Grouping is applied after
active filters and does not change planner data sources or workflow behavior.

Prompt 124 implementation status: complete.
Prompt 125 QA status: complete. All grouping modes render locally and remain
read-only.

## Prompt 126 Cross-Link Polish

Crew and aircraft surfaces now include consistent shortcut links into the
read-only crew planner. Aircraft-specific pages use aircraft-filtered planner
URLs where practical.

Prompt 126 implementation status: complete. Links are navigation-only.

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
