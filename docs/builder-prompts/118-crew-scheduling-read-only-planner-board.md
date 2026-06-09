# Prompt 118: Crew Scheduling Read-Only Planner Board

## Summary

Implement the first Crew Scheduling surface as a read-only availability planner
at `/crew/scheduling`.

Crew Scheduling is planning context only. It helps decide who appears
available for aircraft-block staffing, but it does not create, edit, replace,
or end aircraft crew assignments.

## Scope

- Add `/crew/scheduling`.
- Show crew identity, base, employment status, and duty status.
- Show planned schedule blocks from `CrewSchedule`.
- Show pending/approved time-off context from `TimeOffRequest`.
- Show current aircraft-block assignments from `AircraftCrewAssignment`.
- Show upcoming FlightLeg coverage inherited through existing aircraft-block
  crew resolution.
- Surface warning-only availability conflicts.
- Link to `/aircraft/[aircraftId]/crew` for actual staffing changes.
- Add lightweight navigation links from Crew, Scheduling, and aircraft crew
  assignment pages.

## Guardrails

- Do not add schema.
- Do not mutate `CrewSchedule`, `TimeOffRequest`, `AircraftCrewAssignment`, or
  `CrewLegAssignment`.
- Do not add duty/rest enforcement.
- Do not add release blocking.
- Do not add auth, signatures, imports, provider integrations, file uploads,
  or automated assignment recommendations.

## Test Plan

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke-check `/crew/scheduling`, `/crew`, `/scheduling`, `/aircraft`,
  `/operations-control`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.

## Status

Implementation complete. The planner is read-only and keeps
`AircraftCrewAssignment` as the operational coverage source.
