# Prompt 128: Crew Member Context Page Planning

## Summary

Plan a read-only crew member context page before implementation. The selected
direction is a dedicated `/crew/[crewMemberId]` page that consolidates roster,
availability, qualification, assignment, schedule, time-off, and upcoming
FlightLeg coverage context for one crew member.

Prompt 128 is docs/planning only.

## Key Decisions

- Add `/crew/[crewMemberId]` as a read-only crew operational context page.
- Keep `/crew` as the roster scan page.
- Keep `/crew/scheduling` as the crew availability planner.
- Keep `/aircraft/[aircraftId]/crew` as the only aircraft-block crew assignment
  write workflow.
- Do not add schedule writes, time-off writes, duty/rest enforcement,
  assignment automation, auth/signatures, schema changes, imports, release
  blocking, or provider integrations.
- Use current `AircraftCrewAssignment` as the operational coverage source.
- Use `CrewSchedule` and `TimeOffRequest` as planning context only.
- Keep qualification and availability conflicts warning-only.

## Prompt 129 Target

Implement `/crew/[crewMemberId]` with these visible sections:

- Header: back links to Crew roster and Crew planner, crew identity, employee
  number, base station, employment status, and duty status.
- Availability Snapshot: warning-only availability status, current schedule
  block, time-off overlap, active aircraft assignments, and upcoming coverage
  count.
- Qualifications: aircraft type, seat role, expiration, and current/expired or
  expiring-soon warning labels.
- Current Aircraft Assignments: active aircraft-block assignments with links to
  `/aircraft/[aircraftId]`, `/aircraft/[aircraftId]/crew`, and filtered crew
  planner URLs.
- Schedule And Time Off: read-only `CrewSchedule` and `TimeOffRequest` rows in
  the planning window.
- Upcoming FlightLeg Coverage: inherited coverage from aircraft-block
  assignments, with links to Operations Control detail when a FlightLeg exists.
- Contact And Notes: phone, email, and readable empty states where data is
  missing.

Also add links into crew detail from:

- `/crew`
- `/crew/scheduling`
- `/aircraft/[aircraftId]/crew` assignment lists

## Prompt 130 QA Target

- Confirm `/crew/[crewMemberId]` renders for a crew member with complete and
  partial context.
- Confirm roster, planner, and aircraft crew workflow links route into crew
  detail.
- Confirm aircraft crew workflow links remain available from crew detail.
- Confirm no schedule, time-off, assignment, `CrewLegAssignment`, schema,
  release, import, auth, or provider behavior changed.

## Test Plan

- Prompt 128: docs/planning only.
- Prompt 129 and Prompt 130:
  - `npm run prisma:validate`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - Smoke-check `/crew`, `/crew/scheduling`, one `/crew/[crewMemberId]`,
    `/aircraft`, one `/aircraft/[aircraftId]/crew`, `/operations-control`,
    `/api/health`, `/internal/flightleg-parity`, and
    `/internal/flightleg-write-readiness`.
  - Browser-check crew roster, planner, one crew detail page, and one aircraft
    crew workflow page.

## Assumptions

- Crew member context is read-only.
- The first detail page can reuse current planner data and add small
  detail-specific query shape only if needed.
- The page is an operational context surface, not a legal qualification,
  duty/rest, or release signoff.
