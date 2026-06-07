# Builder Prompt 23: Release-Control Actions Foundation

## Summary

Add minimal Operations Control release status actions on the FlightLeg detail
page. This slice controls the `FlightRelease` status only; it does not mutate
release evidence or assemble dispatch packages.

## Implemented Scope

- Added release controls to `/operations-control/[flightLegId]`.
- Added server actions for:
  - Mark Released
  - Cancel Release
  - Void Release
- Release actions update the linked `FlightRelease`.
- Mark Released sets `FlightLeg.status` to `RELEASED`.
- Cancel/Void sets `FlightLeg.status` back to `SCHEDULED` so existing parity
  rules remain consistent.

## Boundaries

- No schema migration is included.
- No release-evidence mutation is included.
- No dispatch-package assembly is included.
- No user attribution is included because auth is not implemented.
- Legacy `Flight.status` remains unchanged; release status maps to FlightLeg
  status through existing parity rules.

## Validation

Use the standard validation set:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/operations-control/[flightLegId]`.
- Mark a planned release as released and confirm the detail page shows
  `RELEASED`.
- Void a released release and confirm the detail page shows `VOIDED`.
- Confirm `/operations-control`, `/flights`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return 200.
