# Builder Prompt 26: Flight Locating Mutation Foundation

## Summary

Add the second release-evidence mutation workflow: manual flight locating
management for a FlightLeg. This slice uses the existing
`FlightLocatingRecord` schema and does not add position history, overdue
automation, dispatch workflow, or release gating.

## Implemented Scope

- Added `/operations-control/[flightLegId]/locating`.
- Added a link from the FlightLeg detail locating card to the locating workflow.
- Create a `FlightLocatingRecord` automatically when saving details or setting
  a status.
- Edit:
  - `responsibleParty`
  - `plannedRoute`
  - `lastKnownPosition`
  - `notes`
- Support manual status transitions:
  - `FILED`
  - `ACTIVE`
  - `CLOSED`
- Set `activatedAt` when marking active.
- Set `closedAt` when marking closed.
- Show warning-first readiness messages.

## Boundaries

- No schema migration is included.
- No position history is included.
- No overdue automation is included.
- No dispatch-package assembly is included.
- No provider integrations are included.
- No release gating is included.
- No auth or user attribution is included.

## Validation

Use the standard validation set:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/operations-control/[flightLegId]/locating`.
- Save responsible party, planned route, last known position, and notes.
- Mark the locating record `FILED`, `ACTIVE`, and `CLOSED`.
- Confirm `/operations-control/[flightLegId]` shows the locating status and
  fields.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return 200.
