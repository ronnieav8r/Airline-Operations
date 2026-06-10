# Prompt 201: Logistics Create/Edit Foundation

## Summary

Add the first ops/admin Crew Logistics write workflow. The workflow is scoped
to one crew member at a time under `/crew/[crewMemberId]/logistics`.

## Scope

- Add `/crew/[crewMemberId]/logistics`.
- Allow `ADMIN` and `OPS` users to create and edit `CrewLocationRecord`.
- Allow `ADMIN` and `OPS` users to create and edit `CrewLogisticsNeed`.
- Support status updates and provider/confirmation placeholders.
- Add links from crew detail and crew planner.

## Boundaries

- No crew self-service logistics writes.
- No airline booking, hotel booking, travel provider integration, or expense
  workflow.
- No automatic positioning recommendations.
- No `CrewSchedule`, `CrewScheduleEntry`, `AircraftCrewAssignment`,
  `CrewLegAssignment`, release, or duty/rest mutations.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Runtime workflow smoke remains pending when Docker Desktop is unavailable.

## Follow-Up

Prompt 202 should QA logistics schema, read surfaces, create/edit workflow,
role gates, and unchanged schedule/assignment behavior.
