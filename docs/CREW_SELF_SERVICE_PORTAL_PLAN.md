# Crew Self-Service Portal Plan

Last updated: 2026-06-22

## Current Status Note

Crew portal backend smoke passed during backend MVP closure. The active crew
self-service product surface is now `/crew/me`, not `/crew/portal`.

Use `docs/CURRENT_HANDOFF.md`, `docs/PROJECT_STATUS.md`,
`docs/BACKEND_MVP_FINAL_SMOKE_QA.md`, and
`docs/CREW_SCHEDULING_MVP_STATUS.md` as newer truth if older sections in this
file mention runtime QA pending.

## 2026-06-22 `/crew/me` Update

`/crew/me` is the accepted first crew-member mobile app direction. It remains
separate from ops/admin crew management and is scoped only to the signed-in
`CREW` user's linked `CrewMember.userId`.

Implemented:

- `CREW` role guard with setup-required state when no linked crew profile
  exists.
- Mobile-first tab shell: `Today`, `Schedule`, `Flights`, `Requests`, and
  `Profile`.
- `Today` is action-focused and shows next schedule, next flight, open
  preflight/postflight actions, request status, and plain-language profile
  review items.
- `Schedule` shows a 42-day crew schedule window.
- `Flights` shows assigned FlightLeg cards and links to crew flight details.
- `Requests` creates only the signed-in crew member's own `TimeOffRequest`
  rows as `PENDING` and `CrewScheduleRequest` rows as `SUBMITTED`.
- `Profile` shows crew identity, base, qualifications, and warning-only status.
- `/crew/me/flights/[flightLegId]` shows assigned flight detail with crew-safe
  Preflight/Postflight forms using existing readiness semantics.
- `CREW` users hitting `/` redirect to `/crew/me`; the shell shows crew-only
  navigation.

Still deferred:

- Redirecting `/crew/portal` to `/crew/me`.
- Richer trip brief UX on `/crew/me/flights/[flightLegId]`.
- Demo data ensuring the linked local crew smoke user has an assigned future
  FlightLeg inside the 42-day window.
- Additional phone/iPad browser QA after a normal crew login.

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

Prompt 195 implementation status: complete. `/crew/portal` now requires the
`CREW` role, resolves the linked `CrewMember` through `CrewMember.userId`, and
shows read-only profile, schedule, request, time-off, assignment, coverage, and
warning context. Request submission waits for Prompt 196.

## Request Submission Scope

The next portal slice can allow a crew member to submit their own
`CrewScheduleRequest` and `TimeOffRequest` rows. Submission must be scoped to
the linked crew member and must not approve, deny, publish, or assign.

Prompt 196 implementation status: complete. `/crew/portal` now lets linked
crew users submit their own `TimeOffRequest` rows with `PENDING` status and
their own `CrewScheduleRequest` rows with `SUBMITTED` status. Admin/ops review
remains required. Crew users still cannot approve, publish, assign aircraft, or
write logistics records.

Prompt 197 QA status: partial pass. Static validation passed. DB-backed portal
shell and request submission smoke remains pending until Docker Desktop is
available.

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
