# Builder Prompt 20: FlightLeg Write QA Guardrails

## Summary

Add an internal diagnostic for the first FlightLeg write workflow. This slice is
read-only QA infrastructure; it does not add schema, auth, product workflow, or
new writes.

## Implemented Scope

- Added `/internal/flightleg-write-readiness`.
- Added a read-only report helper that checks FlightLeg write-workflow records.
- The report verifies the expected bridge and support records:
  - legacy `Flight` row exists and matches core leg fields.
  - auto `TripOrMission` exists and matches trip-number policy.
  - exactly one current planned/active `AircraftAssignment` exists.
  - current aircraft assignment matches the legacy `Flight.aircraftId`.
  - `OperationalControlRecord` links to both Flight and FlightLeg.
  - `FlightRelease` placeholder exists.
  - turnaround links are not self-links and do not violate basic schedule order.

## Boundaries

- No new write workflow is included.
- No schema migration is included.
- No release-evidence, dispatch, manifest, weight-and-balance, or crew mutation
  is included.
- This diagnostic is internal and intentionally separate from the public app
  navigation.

## Validation

Use the standard validation set:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/internal/flightleg-write-readiness` returns 200.
- New FlightLegs created through `/operations-control/new` show as ready after
  create/edit unless a bridge/control/assignment problem exists.
- `/internal/flightleg-parity` still returns 200 and remains useful for legacy
  read parity.
