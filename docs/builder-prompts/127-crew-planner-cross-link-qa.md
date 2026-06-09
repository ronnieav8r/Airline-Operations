# Prompt 127: Crew Planner Cross-Link QA

## Summary

Validate the crew planner cross-links added across crew and aircraft surfaces
in Prompt 126.

Prompt 127 is QA/docs only unless a defect is found.

## QA Scope

- Validate `/crew/scheduling`, `/crew`, `/aircraft`,
  `/aircraft/[aircraftId]`, and `/aircraft/[aircraftId]/crew`.
- Confirm `Crew planner` links route to planner URLs.
- Confirm aircraft-specific pages use aircraft-filtered planner URLs.
- Confirm aircraft crew assignment links remain available.
- Confirm Operations Control and diagnostics still load.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local route smoke.
- Browser checks for `/crew/scheduling`, `/crew`, `/aircraft`, and one aircraft
  detail/crew workflow page.

## Status

QA complete. Cross-links render locally and route to the expected planner and
aircraft crew workflow surfaces.
