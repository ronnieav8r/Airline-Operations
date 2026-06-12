# Prompt 264: Object Action Drawer Architecture

## Summary

Upgrade dashboard drawers from one-off quick-review panels into a consistent
object-action workspace. Users can click a FlightLeg from the dashboard, inspect
the summary, drill into release, MX, crew, evidence, or audit sections, expand
the drawer to full screen, and return to the same dashboard window.

## Scope

- Extend the shared `ContextDrawer` with standard and expanded sizes.
- Add `Back`, `Expand`, `Contract`, and `Close` controls.
- Move dashboard FlightLeg drawer state to URL-driven
  `object=flightLeg&id=...&view=...` parameters.
- Separate lifecycle state from release state inside the drawer.
- Remove the old `Planned` release-status display from the FlightLeg quick
  review drawer.
- Keep existing release and void verification actions available in the drawer.
- Add read-first drilldown views for release, MX, crew, manifest, W&B, locating,
  dispatch, and audit.
- Keep full workflow pages as fallback links.

## Cleanup Rules

- Do not keep commented-out legacy drawer UI.
- Remove old dashboard `leg`/`panel=flight` drawer routing.
- Keep temporary compatibility only where existing callers still use the shared
  drawer shell.
- Preserve old behavior in docs, not active app code.

## Deferred

- Drawer edit forms.
- Drawer-based workflow replacement for manifest, W&B, locating, dispatch, MX,
  or crew assignment.
- Non-dashboard drawer object routing.
- Schema changes.
- New release policy.

## Test Plan

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run smoke:app`
- `npm run smoke:browser`
- Browser-check dashboard FlightLeg summary, release, MX, crew, manifest, W&B,
  locating, dispatch, audit, Back, Close, Expand, and Contract.
