# Prompt 259: Dashboard Release Readiness Drawer Foundation

## Summary

Implemented the next dashboard UI slice after user review. The dashboard no
longer uses the vague `Needs attention now` / `Evidence gaps` framing. It now
surfaces a release-centered view with operator-friendly release readiness pills,
hour-based lookahead controls, and URL-driven quick-review drawers.

## Changes

- Added dashboard lookahead controls: `+1 hr`, `+2 hr`, `+6 hr`, `+12 hr`,
  `+24 hr`, and `Today`.
- Changed the dashboard attention model to `Release Review`.
- Replaced broad evidence language with release-readiness components:
  `Manifest`, `W&B`, `Flt Follow`, `Dispatch`, `MX`, and `Crew`.
- Added `MX` as the visible maintenance/airworthiness beacon.
- Added quick-review drawers for:
  - active alerts,
  - release review items,
  - FlightLeg release summary,
  - individual release components.
- Kept full workflow links available from the drawers.
- Kept implementation read-only on the dashboard; no release policy, schema, or
  backend workflow behavior changed.

## Notes

- `Flt Follow` is the dashboard label for the existing flight locating record.
  The database/internal model can remain `FlightLocatingRecord`.
- The release-readiness strip is a display layer over existing warning-first
  release data. It is not hard release blocking.
- Operator-specific release configuration remains deferred. The next planning
  slice should define which release components are enabled/required per
  operator, operating part, or operation type.

## Validation

- `npm run typecheck`
- `npm run lint`

