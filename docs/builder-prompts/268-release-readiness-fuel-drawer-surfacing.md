# Prompt 268: Release Readiness Fuel And Drawer Surfacing

## Summary

Surface fuel as a release readiness component and make it visible in the
dashboard FlightLeg drawer, release checklist, W&B context, and manifest
summary context.

## Implemented Scope

- Add Fuel readiness item.
- Treat Fuel as ready only when release fuel is recorded and marked fueled
  ready.
- Add dashboard drawer fuel line.
- Add Fuel to the release checklist.
- Show fuel context in W&B views.
- Show crew and passenger/manifest counts in the manifest drawer view.

## Boundaries

- Release remains warning-only.
- Drawer edit forms remain deferred except existing safe actions.
- No release checklist duplication beyond summary plus drilldown.
