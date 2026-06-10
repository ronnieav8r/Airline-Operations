# Prompt 150: Rotation Pattern Admin Foundation

## Summary

Implement ops/admin rotation pattern template management using existing
`CrewRotationPattern` and `CrewRotationPatternDay` tables.

## Key Changes

- Add `/crew/scheduling/patterns`.
- Add pattern header create/edit.
- Add activate/deactivate controls.
- Add day-row add/update/delete controls.
- Validate pattern keys, names, positive cycle lengths, valid day numbers,
  duty statuses, optional stations, and optional time ranges.
- Add navigation from crew planner and schedule-period admin routes.

## Boundaries

- No schema changes.
- No pattern application.
- No schedule generation.
- No schedule publishing.
- No crew request/bid review.
- No auth, duty/rest enforcement, assignment automation, imports, provider
  integrations, or release behavior changes.

## Prompt 151 QA Target

Validate pattern create/edit, day add/update/delete, activate/deactivate,
route rendering, and no side effects outside rotation-pattern tables.
