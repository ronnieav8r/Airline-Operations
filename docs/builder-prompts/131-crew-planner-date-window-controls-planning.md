# Prompt 131: Crew Planner Date/Window Controls Planning

## Summary

Plan URL-driven date/window controls for the read-only `/crew/scheduling`
planner before implementation.

Prompt 131 is docs/planning only.

## Key Decisions

- Add date/window controls to `/crew/scheduling` using URL query params.
- Use `date=YYYY-MM-DD` as the planning window start date.
- Use `days=1|3|7|14` as the planning window length.
- Default behavior remains today plus the current 7-day window.
- Preserve existing filters and grouping.
- Apply the selected window to:
  - `CrewSchedule` blocks.
  - `TimeOffRequest` overlap checks.
  - upcoming FlightLeg coverage.
  - summary counts and warning-only availability messages.
- Keep all behavior read-only.
- Do not add schedule writes, time-off writes, assignment automation,
  duty/rest enforcement, auth/signatures, release blocking, schema changes,
  imports, or provider integrations.

## Prompt 132 Target

Implement date/window controls on `/crew/scheduling`:

- Extend `getCrewSchedulingPlannerData` to accept a planning window start date
  and window length.
- Parse `date` and `days` from `searchParams`.
- Clamp supported window lengths to 1, 3, 7, or 14 days.
- If `date` is missing or invalid, use today.
- Add a compact planner window form above the existing filter controls.
- Add shortcut links for Today, Tomorrow, 3 days, 7 days, and 14 days.
- Preserve current filter and grouping params when practical.
- Keep reset behavior readable.
- Show the selected planning window in summary cards and active-filter text.

## Prompt 133 QA Target

- Confirm default planner view still works.
- Confirm `date=YYYY-MM-DD` changes the planning window.
- Confirm `days=1`, `days=3`, `days=7`, and `days=14` work.
- Confirm filters and grouping still work with selected date/window.
- Confirm no write behavior changed.

## Test Plan

- Prompt 131: docs/planning only.
- Prompt 132 and Prompt 133:
  - `npm run prisma:validate`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - Smoke-check `/crew/scheduling`, `/crew/scheduling?days=1`,
    `/crew/scheduling?days=14`, `/crew/scheduling?groupBy=base&days=3`,
    `/crew`, one `/crew/[crewMemberId]`, `/aircraft`, `/operations-control`,
    `/api/health`, `/internal/flightleg-parity`, and
    `/internal/flightleg-write-readiness`.
  - Browser-check planner window controls, shortcut links, filters, grouping,
    and crew detail links.

## Assumptions

- Date/window controls are planner visibility controls only.
- The selected window should not mutate schedule, time-off, assignment,
  FlightLeg, release, or evidence records.
- The crew detail page can remain on its fixed 7-day context window until a
  separate planning slice decides otherwise.
