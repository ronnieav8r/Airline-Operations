# Prompt 142: Time-Off Request Workflow Foundation

## Summary

Implement the first ops/admin `TimeOffRequest` workflow under Crew Scheduling.
This workflow creates and reviews simple absence requests while keeping
conflict checks warning-only.

## Key Changes

- Add `/crew/scheduling/time-off`.
- Add pending request creation for active crew members.
- Add review actions for pending requests: approve, deny, cancel.
- Add cancel action for approved requests.
- Group requests by `PENDING`, `APPROVED`, `DENIED`, and `CANCELLED`.
- Show warning-only conflicts for overlapping time off, schedule blocks,
  aircraft-block assignments, and upcoming assigned flight coverage.
- Add navigation from `/crew/scheduling`, `/crew`, and `/crew/[crewMemberId]`.

## Boundaries

- No schema changes.
- No auth or crew self-service.
- No `CrewSchedule` or `CrewScheduleEntry` writes.
- No `AircraftCrewAssignment` or `CrewLegAssignment` writes.
- No duty/rest enforcement, assignment automation, imports, provider
  integrations, release blocking, or release behavior changes.

## Prompt 143 QA Target

- Validate create, approve, deny, and cancel behavior.
- Confirm reviewed actions set `reviewedAt`.
- Confirm planner and crew detail surfaces reflect pending/approved time off.
- Confirm review actions do not mutate schedule or assignment tables.
- Confirm route smoke and browser workflow checks pass.
