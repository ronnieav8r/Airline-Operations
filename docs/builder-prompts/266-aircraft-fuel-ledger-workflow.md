# Prompt 266: Aircraft Fuel Ledger Workflow

## Summary

Add an aircraft-level fuel ledger workflow under
`/aircraft/[aircraftId]/fuel`.

## Implemented Scope

- Record fuel uplift in pounds.
- Record defuel in pounds.
- Record correction/set-current-onboard fuel in pounds.
- Calculate approximate gallons using the operator density saved on the event.
- Show current aircraft fuel from the latest fuel event.
- Link aircraft context surfaces to the fuel ledger.

## Boundaries

- No fuel-ticket uploads.
- No billing reconciliation.
- No endurance/range calculation.
- No provider integration.
