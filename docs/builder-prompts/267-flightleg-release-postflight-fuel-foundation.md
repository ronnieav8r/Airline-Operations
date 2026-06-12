# Prompt 267: FlightLeg Release And Postflight Fuel Foundation

## Summary

Add FlightLeg fuel evidence under `/operations-control/[flightLegId]/fuel`.

## Implemented Scope

- Record release fuel onboard in pounds.
- Record fueled-ready yes/no.
- Record postflight onboard fuel in pounds.
- Calculate approximate gallons from the density stored on each event.
- Show consumed fuel when both release and postflight snapshots exist.
- Keep fuel as warning-first release evidence.

## Boundaries

- No hard release blocking.
- No legal signature semantics.
- No automatic W&B computation.
- No fuel vendor integrations.
