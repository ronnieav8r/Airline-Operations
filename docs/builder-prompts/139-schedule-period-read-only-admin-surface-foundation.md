# Prompt 139: Schedule Period Read-Only Admin Surface Foundation

## Summary

Implement the read-only schedule period admin surface planned in Prompt 138.

## Key Changes

- Add `/crew/scheduling/periods` for schedule period list and summary.
- Add `/crew/scheduling/periods/[periodId]` for period detail.
- Add read-only period, request, rotation pattern, and schedule entry context.
- Add planner navigation to the schedule period admin surface.

## Boundaries

- No create/edit/delete forms.
- No schedule publishing action.
- No crew request submission or review.
- No pattern application.
- No generated `CrewSchedule` writes.
- No auth, duty/rest enforcement, aircraft assignment automation, positioning
  logistics, imports, or provider integrations.

## Status

Implemented. Prompt 140 should validate route rendering, browser navigation,
and unchanged workflow behavior.
