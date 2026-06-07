# Release Evidence Mutation Plan

Last updated: 2026-06-07

This document chooses the first release-evidence write path after the
FlightLeg create/edit and release-control slices.

## Decision

Build release-evidence mutation in controlled phases. Start with manifest
mutation.

Chosen first implementation slice:

```text
Prompt 25: Manifest mutation foundation
```

Implementation status: complete.

Rationale:

- `Manifest` is already attached one-to-one to `FlightLeg`.
- `ManifestItem` is concrete and easy to validate without provider integrations.
- Manifest readiness is a prerequisite for useful weight-and-balance work.
- It provides visible operational value without touching dispatch automation.
- It does not require a schema migration for the first workflow.

## Phase Order

1. Manifest mutation foundation. Complete.
2. Flight locating mutation. Complete.
3. Weight-and-balance run mutation. Next planning target.
4. Manual dispatch-package evidence mutation.
5. Release gating against required evidence.
6. Provider integrations for weather, NOTAM, and flight plan data.

## Prompt 25 Boundary

Prompt 25 should add a simple manifest workflow on the existing FlightLeg detail
page or a child route under it.

Minimum workflow:

- Create a manifest if one does not exist for the FlightLeg.
- Add manual manifest items with `personName`, `seatNumber`, `weight`,
  `baggageWeight`, and notes.
- Edit existing manual manifest items.
- Remove or void draft manual items if needed.
- Set manifest status from `DRAFT` to `READY`.
- Keep `LOCKED`, `AMENDED`, and `VOIDED` for later unless the implementation
  can support them safely without broader audit behavior.

Keep current passenger redesign deferred. `ManifestItem.passengerId` can remain
optional; manual `personName` entries are sufficient for the first workflow.

## Status Rules

Use warning-first behavior in the first manifest workflow:

- Allow draft items with missing weights but show clear warnings.
- Show readiness warnings when required item fields are missing.
- Do not block release actions yet; release gating is a later phase.
- Do not lock manifests in the first implementation unless an unlock/amendment
  workflow is also planned.

## Deferred

Do not include these in Prompt 25:

- Weight-and-balance calculations.
- Flight locating status updates.
- Dispatch-package assembly.
- Weather or NOTAM provider calls.
- Flight-plan filing integrations.
- ReleasePackage.
- Passenger identity redesign.
- File uploads.
- Auth, roles, or user attribution.

## Validation

Prompt 25 should run the standard validation set:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Create a FlightLeg or use an existing FlightLeg.
- Create or open its manifest workflow.
- Add at least one manual manifest item.
- Edit the item.
- Mark the manifest `READY`.
- Confirm `/operations-control/[flightLegId]` shows the manifest status and
  item count.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return 200.

## Next Slice: Prompt 26

The next implementation slice should be:

```text
Prompt 26: Flight locating mutation foundation
```

Minimum workflow:

- Create a `FlightLocatingRecord` if one does not exist for the FlightLeg.
- Edit `responsibleParty`, `plannedRoute`, `lastKnownPosition`, and notes.
- Support simple status transitions: `NOT_STARTED`, `FILED`, `ACTIVE`, and
  `CLOSED`.
- Keep `OVERDUE` automation and position history deferred.

Implementation status: complete.

## Next Slice: Prompt 27

The next planning slice should be:

```text
Prompt 27: Weight-and-balance mutation planning
```

Minimum planning questions:

- Whether the first `WeightBalanceRun` workflow is manual entry only.
- Which fields are required for a warning-free calculated run.
- How it should reference the current manifest.
- How to use `calculationSnapshot` until aircraft configuration and capability
  tables exist.
- Whether approval should be included or deferred.
