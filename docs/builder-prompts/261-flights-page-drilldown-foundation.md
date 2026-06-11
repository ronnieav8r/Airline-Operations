# Prompt 261: Flights Page Drilldown Foundation

## Summary

Implemented the first frontend polish slice for `/flights`. The page now acts
as the drill-down flight list for day/week/month/custom range review, while the
dashboard stays focused on the selected operational window.

## Changes

- Consolidated the old header plus summary cards into one compact header.
- Added `New FlightLeg` and `Operations Control` actions in the header.
- Added URL-driven filters:
  - date range: today, tomorrow, 7 days, 30 days, custom date range,
  - flight status,
  - release state,
  - issue type.
- Replaced the static table with interactive flight cards.
- Added right-side drawers for:
  - flight summary,
  - release/control review,
  - crew member quick review.
- Crew names are clickable.
- Crew members with qualification warnings are visually highlighted in amber.
- Added full workflow links from drawer context to crew profile, release
  workspace, and edit workflow where available.

## Notes

- The crew quick-review drawer is intentionally first-pass and read-only.
- The future crew member information pop-up should expand into location,
  current duty state, next on/off duty window, compliance status, logistics, and
  upcoming assignments.
- No schema or backend workflow behavior changed.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run smoke:app`

