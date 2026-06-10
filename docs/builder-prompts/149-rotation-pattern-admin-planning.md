# Prompt 149: Rotation Pattern Admin Planning

## Summary

Plan the first ops/admin workflow for reusable crew rotation templates. Use
existing `CrewRotationPattern` and `CrewRotationPatternDay` tables. This is
template administration only; applying patterns to crew schedules remains
deferred.

## Key Decisions

- Add `/crew/scheduling/patterns`.
- Use existing `CrewRotationPattern` for template headers.
- Use existing `CrewRotationPatternDay` for ordered day rows.
- Support create/edit for pattern headers.
- Support add/update/delete for day rows.
- Support activate/deactivate through `isActive`.
- Keep `createdById` null until auth exists.
- Do not create `CrewSchedule`, `CrewScheduleEntry`, `CrewScheduleRequest`, or
  aircraft assignment rows.

## Prompt 150 Target

- Add pattern admin route with summary cards, pattern list, create form, and
  per-pattern day-row editor.
- Validate required `patternKey`, `name`, and positive `cycleLengthDays`.
- Validate day number is between 1 and `cycleLengthDays`.
- Validate optional start/end minutes from `HH:MM` inputs and require end after
  start when both are present.
- Validate optional station ID.
- Prevent duplicate day numbers through existing unique constraint and readable
  errors.
- Add navigation from crew scheduling and schedule periods.

## Prompt 151 QA Target

- Create a custom pattern.
- Add day rows.
- Edit a pattern header.
- Edit a day row.
- Delete a day row.
- Deactivate/reactivate a pattern.
- Confirm no schedule periods, schedule entries, crew schedules, crew requests,
  aircraft assignments, or crew leg assignments are created or changed.

## Boundaries

- No pattern application.
- No schedule generation.
- No schedule publishing.
- No crew request/bid review.
- No auth, crew portal, duty/rest enforcement, assignment automation, imports,
  provider integrations, or release behavior changes.
