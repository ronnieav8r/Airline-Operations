# Prompt 125: Crew Scheduling Planner Grouping QA

## Summary

Validate the URL-driven grouping added to `/crew/scheduling` in Prompt 124.

Prompt 125 is QA/docs only unless a defect is found.

## QA Scope

- Validate `groupBy=availability`, `groupBy=base`, `groupBy=assignment`, and
  `groupBy=duty`.
- Validate grouping combined with active filters.
- Confirm the grouping selector, filter bar, active summary, group sections,
  empty group states, crew cards, and aircraft crew workflow links render.
- Confirm no data source, coverage-source, or save behavior changed.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local route smoke.
- Browser check for grouped planner UI.

## Status

QA complete. All grouping modes render locally and remain read-only.
