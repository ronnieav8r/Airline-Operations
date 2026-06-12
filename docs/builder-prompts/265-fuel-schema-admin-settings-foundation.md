# Prompt 265: Fuel Schema And Admin Fuel Setting Foundation

## Summary

Add fuel as a first-class aircraft operational ledger foundation. Crews enter
fuel in pounds; the app calculates approximate gallons from the operator Jet A
density setting, defaulting to `6.700 lb/gal`.

## Implemented Scope

- Add `OperatorFuelSetting`.
- Add `AircraftFuelEvent`.
- Add `AircraftFuelEventType`.
- Add `/admin/settings`.
- Allow admin users to edit the operator default Jet A density.
- Seed default operator fuel settings.
- Keep provider integrations, billing reconciliation, fuel tickets, and hard
  release blocking deferred.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```
