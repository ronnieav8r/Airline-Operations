# Prompt 147: Schedule Period Create/Edit Foundation

## Summary

Implement ops/admin create, edit, and archive controls for `CrewSchedulePeriod`
on the existing schedule-period admin routes.

## Key Changes

- Add create form on `/crew/scheduling/periods`.
- Add edit form and archive action on `/crew/scheduling/periods/[periodId]`.
- Add route-local server actions for create, update, and archive.
- Allow `BID_OPEN`, `DRAFTING`, and `ARCHIVED` statuses only.
- Keep `PUBLISHED` deferred until a dedicated publishing workflow.
- Validate required fields and date ordering.
- Keep existing detail context for requests and schedule entries.

## Boundaries

- No schema changes.
- No schedule publishing.
- No schedule entry generation.
- No rotation pattern application.
- No crew request review.
- No schedule writes outside `CrewSchedulePeriod`.
- No aircraft assignment, crew leg assignment, auth, duty/rest, import, provider,
  or release behavior changes.

## Prompt 148 QA Target

Validate create, edit, archive, route rendering, and no side effects outside
`CrewSchedulePeriod`.
