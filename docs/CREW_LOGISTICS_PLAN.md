# Crew Logistics Plan

Last updated: 2026-06-10

## Purpose

Crew Logistics tracks crew location and travel-support needs so operations can
see whether a crew member appears positioned for future aircraft assignments or
FlightLeg coverage.

It is not a booking engine, expense system, or duty/rest compliance engine.

## First Scope

The first logistics foundation should support:

- latest/current crew location context,
- historical manual location records,
- positioning needs,
- deadhead needs,
- airline ticket placeholders,
- hotel placeholders,
- ground transport placeholders,
- notes and status tracking.

## Data Boundary

Crew Logistics may reference:

- `CrewMember`,
- `Station`,
- `Aircraft`,
- `FlightLeg`,
- `User` for created/updated attribution.

Crew Logistics must not replace:

- `CrewScheduleEntry` for schedule planning,
- `CrewSchedule` for compatibility availability,
- `AircraftCrewAssignment` for operational aircraft staffing,
- crew compliance duty/rest evidence records.

## First Surface Direction

Read-only context should appear on:

- crew detail,
- crew planner,
- aircraft crew assignment workflow.

Ops/admin write workflows should follow after read surfaces.

## Deferred Work

- airline booking integrations,
- hotel booking integrations,
- expense tracking,
- automatic positioning recommendations,
- crew self-service logistics creation,
- hard duty/rest enforcement,
- automatic aircraft assignment changes.

## Prompt Status

Prompt 198 planning status: complete. Prompt 199 should implement additive
schema only for crew location records and logistics needs.
