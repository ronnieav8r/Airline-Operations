# Crew Self-Service Portal Plan

Last updated: 2026-06-10

## Purpose

The crew self-service portal gives a crew member a safe authenticated view into
their own operational context. It is not an admin scheduling console and it is
not an aircraft assignment workflow.

## Identity Boundary

The portal should resolve the current authenticated user through the existing
auth/session helpers, then find the linked `CrewMember` through
`CrewMember.userId`.

If a `CREW` user is not linked to a `CrewMember`, the portal should show a
readable setup-required state instead of exposing another crew member's data.

## First Portal Scope

The first portal shell should be read-only and should show:

- profile and crew identity,
- base station,
- employment and duty status,
- published schedule context,
- time-off request status,
- schedule request status,
- current and upcoming aircraft-block assignments,
- upcoming FlightLeg coverage,
- compliance warning summary.

## Request Submission Scope

The next portal slice can allow a crew member to submit their own
`CrewScheduleRequest` and `TimeOffRequest` rows. Submission must be scoped to
the linked crew member and must not approve, deny, publish, or assign.

## Explicit Non-Goals

- Crew users cannot approve requests.
- Crew users cannot publish schedules.
- Crew users cannot create or change aircraft assignments.
- Crew users cannot edit compliance records.
- Crew users cannot create logistics records in the first portal chain.
- Crew users cannot view another crew member's private portal data.

## Relationship To Existing Admin Surfaces

- `/crew` remains the admin/ops crew roster and context surface.
- `/crew/scheduling` remains the admin/ops planner.
- `/crew/scheduling/periods` remains the admin/ops period lifecycle surface.
- `/crew/scheduling/time-off` remains the admin/ops time-off review surface.
- `/aircraft/[aircraftId]/crew` remains the operational aircraft assignment
  workflow.
