# Fuel Ledger And Release Fuel Readiness

Last updated: 2026-06-12

## Current Policy

Fuel is modeled as aircraft operational state first and FlightLeg release
evidence second.

- Pounds are the source-of-truth crew entry unit.
- Approximate gallons are calculated from the operator Jet A density setting.
- The default Jet A density is `6.700 lb/gal`.
- The density used is stored on every fuel event so historical records do not
  change when the operator edits the default later.
- Gallons are approximate until a later fuel-ticket/vendor integration records
  actual billed gallons.

## Implemented Records

`OperatorFuelSetting` stores the editable operator default Jet A density.

`AircraftFuelEvent` stores the aircraft fuel ledger:

- `UPLIFT`: fuel added to the aircraft.
- `DEFUEL`: fuel removed from the aircraft.
- `CORRECTION`: set/correct current onboard fuel.
- `RELEASE_ONBOARD`: FlightLeg release fuel snapshot.
- `POSTFLIGHT_ONBOARD`: postflight fuel snapshot.

Current aircraft fuel state is the latest `AircraftFuelEvent` by `recordedAt`.

## Implemented Routes

- `/admin/settings`: admin-only operator fuel-density setting.
- `/aircraft/[aircraftId]/fuel`: aircraft fuel ledger workflow for admin, ops,
  dispatch, and maintenance.
- `/operations-control/[flightLegId]/fuel`: FlightLeg release/postflight fuel
  workflow for admin, ops, dispatch, crew, and maintenance.

## Demo / Render Backfill

`npm run backfill:fuel` is included in `render-build`, but it is skipped by
default. Set `RUN_FUEL_BACKFILL=1` only when demo/development data should be
initialized with default operator fuel settings and release fuel snapshots for
existing FlightLeg rows.

## Release Readiness

Fuel is now a release readiness item. It is ready only when the FlightLeg has a
`RELEASE_ONBOARD` event with `fueledReady = true`.

Release behavior remains warning-only. Fuel readiness affects dashboard
ready/review display, but it does not create hard release blocking or legal
signature semantics.

## Deferred

- Fuel ticket uploads.
- Fuel vendor/provider integrations.
- Billing reconciliation.
- Actual-gallons capture separate from approximate gallons.
- Endurance/range calculations.
- Automated W&B calculation from fuel.
- Hard release blocking.
