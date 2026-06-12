# Prompt 263: Dashboard Release Action Workflow

## Summary

Clean up dashboard FlightLeg cards and add a manual dashboard release/void workflow.

## Implementation

- Remove the duplicated release-status display from the lifecycle pill.
- Keep lifecycle focused on movement/status: scheduled, delayed, enroute, complete, cancelled.
- Show release as its own pill:
  - `Ready for release` only when all dashboard release beacons are ready and the flight is not released.
  - `Release review` when one or more release beacons need attention.
  - `Released` after manual release.
- Make the whole dashboard flight card open the quick-review drawer.
- Remove the small action-button cluster from each dashboard flight card.
- Keep release beacons as passive card indicators.
- Add dashboard release verification:
  - Authorized logged-in users confirm release with a Yes/No-style drawer form.
  - Unauthorized users can enter ADMIN/OPS credentials in the same verification drawer.
- Add dashboard void workflow:
  - Clicking `Released` opens a void-release verification drawer.
  - Void requires a reason.
  - Void creates release audit history and keeps release history visible.

## Boundaries

- No schema changes.
- No automatic release when all beacons turn green.
- No ADS-B/status automation.
- Full Operations Control release behavior remains available for warning-first handling.
