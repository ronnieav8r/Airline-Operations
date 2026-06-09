# Prompt 123: Crew Scheduling Planner Filters QA

## Summary

Validate the read-only URL-driven planner filters added to `/crew/scheduling`
in Prompt 122.

Prompt 123 is QA/docs only unless a defect is found.

## QA Scope

- Validate default `/crew/scheduling`.
- Validate filtered URLs for availability, duty, assignment, time-off, and
  combined filters.
- Confirm the filter bar, active-filter summary, reset link, and crew cards
  render.
- Confirm aircraft crew workflow links still route correctly.
- Confirm no schema, mutation, schedule-write, time-off-write, duty/rest,
  release-blocking, import, or provider-integration behavior changed.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local route smoke.
- Browser check for filter UI.

## Status

QA complete. Default and filtered planner URLs render locally, and filters
remain read-only.
