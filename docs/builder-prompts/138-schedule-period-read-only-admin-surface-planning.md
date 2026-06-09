# Prompt 138: Schedule Period Read-Only Admin Surface Planning

## Summary

Plan the first read-only admin surface for the crew scheduling schema
foundation. The selected direction is a period list plus period detail under
Crew Scheduling.

Prompt 138 is docs/planning only. Prompt 139 should implement read-only UI.

## Key Decisions

- Add `/crew/scheduling/periods` as the schedule-period admin list.
- Add `/crew/scheduling/periods/[periodId]` as the schedule-period detail page.
- Keep `/crew/scheduling` as the crew availability planner.
- Add navigation links between the planner and schedule period admin pages.
- Show schema-foundation data only:
  - periods and lifecycle status.
  - bid window and schedule window.
  - request counts by status/type.
  - rotation pattern counts.
  - schedule entry counts by status/duty.
  - recent requests and draft entries.
- Keep all surfaces read-only.

## Prompt 139 Target

Implement read-only pages:

- `/crew/scheduling/periods`
  - summary cards for total periods, bid-open periods, draft periods,
    published periods, and active patterns.
  - period cards/table with name, status, date range, bid window, request
    count, schedule entry count, and detail link.
- `/crew/scheduling/periods/[periodId]`
  - period summary.
  - request summary.
  - rotation pattern context.
  - schedule entry table with crew, date, duty status, station, source request,
    pattern, and generated `CrewSchedule` bridge where present.
  - links back to crew planner, crew roster, and crew member detail pages.

## Boundaries

- No create/edit/delete forms.
- No schedule publishing action.
- No crew request submission/review.
- No pattern application.
- No generated `CrewSchedule` writes.
- No auth/crew portal behavior.
- No duty/rest enforcement.
- No aircraft assignment automation.
- No positioning/logistics implementation.

## Test Plan For Prompt 139

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke-check `/crew/scheduling/periods`,
  `/crew/scheduling/periods/[periodId]`, `/crew/scheduling`, `/crew`,
  `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.
- Browser-check the list page, detail page, planner navigation, and links to
  crew detail.

## Assumptions

- The local seed from Prompt 136 provides at least one schedule period.
- The surface is for admin/ops visibility, but auth is not implemented yet.
- The first read-only pages may use page-level query helpers.
