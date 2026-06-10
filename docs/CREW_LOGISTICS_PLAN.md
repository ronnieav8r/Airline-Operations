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

Prompt 199 schema status: complete for static validation. Crew Logistics now
has additive `CrewLocationRecord` and `CrewLogisticsNeed` tables with enum
status/type/source fields and optional links to crew, stations, aircraft,
FlightLegs, and creator users. No logistics UI, booking integration,
assignment automation, schedule mutation, expense workflow, or duty/rest
enforcement has been added.

Prompt 200 should add read-only logistics surfaces on crew detail, crew
planner, and aircraft crew assignment workflow.

Prompt 200 read-surface status: complete for static validation. Crew detail,
crew planner, and aircraft crew assignment now show recent crew location
context and open logistics needs without adding create/edit actions or changing
schedule, assignment, release, duty/rest, booking, or expense behavior.

Prompt 201 should add ops/admin logistics create/edit workflow planning and
implementation if the read-only context is acceptable.
