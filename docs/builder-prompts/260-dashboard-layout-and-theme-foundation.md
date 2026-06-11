# Prompt 260: Dashboard Layout And Theme Foundation

## Summary

Implemented the next dashboard UI refinement after user review. The dashboard
now uses a simpler main body: KPI tiles across the top, a scrollable Flight
Board on the left, AI Review Notes on the right, and Fleet Snapshot as a footer.
Active Alerts and Release Review remain available through top-tile drawers
instead of consuming dashboard body space.

## Changes

- Removed visible dashboard body sections for Active Alerts and Release Review.
- Kept Active Alerts and Release Review accessible through clickable top tiles
  and URL-driven drawers.
- Reworked dashboard body into:
  - scrollable Flight Board tied to the selected lookahead window,
  - expanded AI Review Notes placeholder panel,
  - Fleet Snapshot footer across the bottom.
- Added an app-wide Light/Dark view toggle in the app shell.
- Added global dark-mode CSS overrides for existing utility-class surfaces.

## Notes

- Dark mode is a foundation pass. It applies broadly across the existing app
  without refactoring every page into explicit design tokens yet.
- AI Review Notes remains an inactive placeholder: no AI calls, note storage, or
  recommendations were added.
- The Flights page remains the natural place for all-time/day/week/month
  browsing and filtering.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run smoke:app`
- `npm run smoke:browser`

