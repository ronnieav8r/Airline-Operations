# Release Evidence Mutation Plan

Last updated: 2026-06-07

This document tracks the first release-evidence write path after the FlightLeg
create/edit and release-control slices.

## Decision

Build release-evidence mutation in controlled phases. Manifest, locating,
manual weight-and-balance, and manual dispatch-package mutation are complete.
Release readiness guardrails planning is complete. The next implementation
slice is complete. A focused release-evidence QA and discoverability pass is
complete. The next recommended work is post-deploy verification and choosing
the next domain.

Latest QA follow-up:

```text
Prompt 33: Release evidence QA and deploy verification
```

Prompt 33 implementation status: complete.

Rationale:

- The main manual evidence workflows now exist.
- Warning-only release readiness guardrails now explain evidence readiness
  without blocking release actions.
- The combined workflow should be verified on Render after auto-deploy.
- Operations Control action discoverability was improved after QA found the
  evidence/detail links were too hidden.

## Phase Order

1. Manifest mutation foundation. Complete.
2. Flight locating mutation. Complete.
3. Weight-and-balance run mutation. Complete.
4. Manual dispatch-package evidence mutation. Complete.
5. Release readiness guardrails. Complete.
6. Release evidence QA and Operations Control discoverability. Complete.
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

## Prompt 27 Decision

Prompt 27 answered the weight-and-balance planning questions:

- First workflow is manual entry only.
- A warning-free run should have a linked manifest, at least one manifest item,
  takeoff weight, landing weight, and center of gravity.
- The run should link to the current FlightLeg manifest when one exists.
- `calculationSnapshot` should store manual-entry context such as method,
  notes, manifest item count, and entry timestamp.
- Approval remains deferred because there is no auth/user attribution or
  release-blocking policy yet.

Implementation status: complete.

## Next Slice: Prompt 28

The next implementation slice should be:

```text
Prompt 28: Weight-and-balance mutation foundation
```

Minimum workflow:

- Add `/operations-control/[flightLegId]/weight-balance`.
- Create and edit manual `WeightBalanceRun` rows.
- Link new runs to the current FlightLeg manifest when present.
- Store manual notes and context in `calculationSnapshot`.
- Support `DRAFT`, `CALCULATED`, and `VOIDED`.
- Keep `APPROVED`, automated calculation, aircraft configuration/capability
  data, and release gating deferred.

Implementation status: complete.

## Next Slice: Prompt 29

The next planning slice should be:

```text
Prompt 29: Manual dispatch-package mutation planning
```

Minimum planning questions:

- Whether the first dispatch workflow should save all manual dispatch evidence
  in one form.
- Which weather, NOTAM, and flight-plan fields are required for warning-free
  dispatch readiness.
- How to create stable manual snapshot keys without provider integrations.
- How `DispatchPackage.performanceData` should store manual context.
- Whether release-readiness guardrails should be warning-only after dispatch
  mutation is implemented.

Implementation status: complete.

## Prompt 29 Decision

Prompt 29 answered the manual dispatch-package planning questions:

- The first dispatch workflow should save all manual dispatch evidence in one
  form.
- A warning-free package should have linked weather, NOTAM, and flight-plan
  records, plus route summary, affected station codes, external reference, and
  route text.
- Manual weather and NOTAM snapshots should use stable per-FlightLeg keys.
- `DispatchPackage.performanceData` should store manual method, notes, and
  timestamp context.
- Release-readiness guardrails should be warning-only after dispatch mutation
  is implemented.

Implementation status: complete.

## Next Slice: Prompt 30

The next implementation slice should be:

```text
Prompt 30: Manual dispatch-package mutation foundation
```

Minimum workflow:

- Add `/operations-control/[flightLegId]/dispatch`.
- Save manual weather briefing evidence.
- Save manual NOTAM snapshot evidence.
- Save a manual flight-plan reference.
- Upsert the FlightLeg `DispatchPackage` and link all three evidence records.
- Store manual package notes in `DispatchPackage.performanceData`.
- Keep provider integrations, release-package modeling, and release gating
  deferred.

Implementation status: complete.

## Next Slice: Prompt 31

The next planning slice should be:

```text
Prompt 31: Release readiness guardrails planning
```

Minimum planning questions:

- Which evidence records should appear in the readiness checklist.
- Whether guardrails are warning-only or release-blocking.
- How to treat `DRAFT`, `READY`, `CALCULATED`, `FILED`, `ACTIVE`, and missing
  dispatch evidence.
- Where the readiness checklist should appear on the FlightLeg detail page.
- Whether any schema changes are needed before guardrails are implemented.

Implementation status: complete.

## Prompt 31 Decision

Prompt 31 answered the release-readiness guardrail questions:

- The readiness checklist should cover manifest, weight and balance, locating,
  dispatch package, weather, NOTAM, and flight-plan evidence.
- Guardrails are warning-only. They must not block release actions.
- Manifest is ready at `READY` or `LOCKED` with at least one item.
- W&B is ready when the latest non-voided run is `CALCULATED` or `APPROVED`.
- Locating is ready at `FILED`, `ACTIVE`, or `CLOSED`.
- Dispatch is ready when package, weather, NOTAM, and flight-plan links exist,
  with weather summary, affected station codes, external reference, and route
  text present.
- The checklist should appear near Release Control on the FlightLeg detail page.
- No schema changes are needed.

Implementation status: complete.

## Next Slice: Prompt 32

The next implementation slice should be:

```text
Prompt 32: Release readiness guardrails foundation
```

Minimum workflow:

- Add a warning-only readiness checklist to `/operations-control/[flightLegId]`.
- Show overall ready/not-ready status.
- Show each evidence item as ready or needing attention.
- Keep all release action buttons available.
- Do not mutate evidence, add schema, or introduce `ReleasePackage`.

Implementation status: complete.

## Next Slice: Prompt 33

Recommended follow-up:

```text
Prompt 33: Release evidence QA and deploy verification
```

Minimum workflow:

- Re-run local create/edit smoke checks for manifest, W&B, locating, dispatch,
  release controls, and readiness checklist.
- Confirm Render deploy succeeds from `origin main`.
- Confirm Render routes return successfully.
- Do not add schema or new write workflows in the QA slice.

Implementation status: complete.
