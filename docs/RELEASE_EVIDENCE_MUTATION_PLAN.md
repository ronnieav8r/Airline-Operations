# Release Evidence Mutation Plan

Last updated: 2026-06-07

This document tracks the first release-evidence write path after the FlightLeg
create/edit and release-control slices.

## Decision

Build release-evidence mutation in controlled phases. Manifest, locating,
manual weight-and-balance, and manual dispatch-package mutation are complete.
Release readiness guardrails planning is complete. The next implementation
slice is complete. A focused release-evidence QA and discoverability pass is
complete. Release-blocking policy planning is complete. The next recommended
release-readiness step is a non-enforcing blocker/warning preview on FlightLeg
detail.

Latest QA follow-up:

```text
Prompt 33: Release evidence QA and deploy verification
```

Prompt 33 implementation status: complete.

Rationale:

- The main manual evidence workflows now exist.
- Warning-only release readiness guardrails now explain evidence readiness
  without blocking release actions.
- Prompt 46 classifies likely future blocker vs warning findings, but current
  release actions remain warning-only.
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
7. Release blocking policy planning. Complete.
8. Release-blocking preview. Next recommended release-readiness implementation.
9. Provider integrations for weather, NOTAM, and flight plan data.

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

## Prompt 46 Decision

Prompt 46 planned release-blocking policy without changing app behavior.

Durable policy:

```text
docs/RELEASE_BLOCKING_POLICY.md
```

Recommended next release-readiness implementation:

```text
Prompt 47: Release Blocking Preview Foundation
```

Prompt 47 should add non-enforcing `Would block release` and `Would warn`
classification labels to the existing FlightLeg readiness checklist. It should
keep release action buttons available and must not mutate evidence, add schema,
add auth/signatures, add overrides, or enforce blocking.

Implementation status: complete.

Prompt 47 added non-enforcing readiness policy preview labels and preview
totals to FlightLeg detail. Release action buttons remain available.

Recommended next release-readiness slice:

```text
Prompt 48: Release Blocking Preview QA
```

Prompt 48 should verify the preview labels and confirm that no hard blocking,
schema, auth/signature, override, provider, file-upload, or evidence mutation
scope slipped in.

Implementation status: complete.

Prompt 48 validated the release-blocking preview and confirmed release actions
remain non-blocked.

Durable QA log:

```text
docs/RELEASE_BLOCKING_QA_LOG.md
```

Recommended next release policy slice:

```text
Prompt 49: Authority-Specific Release Policy Planning
```

Prompt 49 should decide how the preview/enforcement policy should vary by
operating authority. It should remain docs-only.

Implementation status: complete.

Prompt 49 created the authority-specific release policy matrix and kept release
behavior warning-only.

Durable policy:

```text
docs/AUTHORITY_RELEASE_POLICY.md
```

Recommended next release policy slice:

```text
Prompt 50: Release Override and Auth Planning
```

Prompt 50 should decide who may override future release blockers, which
blockers are non-overridable, what reason/evidence/identity fields must be
captured, and whether override policy varies by authority class. It should
remain docs-only.

Implementation status: complete.

Prompt 50 planned the future release override/auth boundary and kept release
behavior warning-only.

Durable policy:

```text
docs/RELEASE_OVERRIDE_AUTH_POLICY.md
```

Recommended next release policy slice:

```text
Prompt 51: Release Blocking Data Model Planning
```

Prompt 51 should plan the additive schema shape for authority policy profiles,
policy rules, readiness snapshots, blocker findings, override records, and audit
events. It should remain docs-only unless the next implementation prompt
explicitly approves schema.

Implementation status: complete.

Prompt 51 planned the release-blocking data model and kept the current Prisma
schema unchanged.

Durable plan:

```text
docs/RELEASE_BLOCKING_DATA_MODEL_PLAN.md
```

Recommended next release policy slice if approved:

```text
Prompt 52: Release Blocking Schema Foundation
```

Prompt 52 should add the planned policy/snapshot/override/audit tables
additively only. It should not enforce blocking, add auth/signatures, add
provider integrations, add file uploads, or change current `FlightRelease`
actions.

Implementation status: complete.

Prompt 52 added the release-blocking schema foundation with conservative
default policy/rule records and kept release behavior warning-only.

Durable schema plan:

```text
docs/RELEASE_BLOCKING_DATA_MODEL_PLAN.md
```

Hidden diagnostic:

```text
/internal/release-policy-readiness
```

Recommended next release policy slice:

```text
Prompt 53: Release Policy Diagnostic QA
```

Prompt 53 should validate default policy/rule records, health counts, the hidden
diagnostic, and unchanged warning-only release behavior. It should not add
snapshots, findings, overrides, hard blocking, auth/signatures, provider
integrations, file uploads, or release-action changes.

Implementation status: complete.

Prompt 53 validated the release-policy default records, health counts, hidden
diagnostic, and unchanged warning-only release behavior.

Durable QA log:

```text
docs/RELEASE_POLICY_QA_LOG.md
```

Recommended next release policy slice:

```text
Prompt 54: Release Snapshot Planning
```

Prompt 54 should plan explicit preview snapshot creation before any snapshot
write implementation.

Implementation status: complete.

Prompt 54 planned explicit preview snapshot creation.

Durable policy:

```text
docs/RELEASE_SNAPSHOT_POLICY.md
```

Recommended next release policy slice:

```text
Prompt 55: Release Snapshot Preview Foundation
```

Prompt 55 should implement explicit preview snapshot capture on FlightLeg detail
without changing release actions.

Implementation status: complete.

Prompt 55 implemented explicit preview snapshot capture and recent snapshot
history on FlightLeg detail. Release actions remain warning-only and unchanged.

Recommended next release policy slice:

```text
Prompt 56: Release Snapshot QA
```

Prompt 56 should validate snapshot row creation, repeated capture history, live
readiness display, health counts, and unchanged release behavior.

Implementation status: complete.

Prompt 56 validated explicit preview snapshots and unchanged warning-only
release behavior.

Durable QA log:

```text
docs/RELEASE_POLICY_QA_LOG.md
```

Recommended next release policy slice:

```text
Prompt 57: Release Snapshot Diagnostic Readiness
```

Prompt 57 should add or extend a read-only internal diagnostic comparing live
readiness with latest captured snapshots before any hard blocking work.

Implementation status: complete.

Prompt 57 added `/internal/release-snapshot-readiness`, a read-only diagnostic
that compares current live readiness helper output with each FlightLeg's latest
explicit preview snapshot. It flags missing snapshots and drifted snapshot
findings by readiness category and rule key.

Recommended next release policy slice:

```text
Prompt 58: Release Snapshot Drift QA
```

Prompt 58 should validate the diagnostic against local no-snapshot and drift
cases, then confirm capturing a fresh explicit preview snapshot clears drift
for a stable FlightLeg. Keep the slice QA/docs only unless a defect is found.

Implementation status: complete.

Prompt 58 validated `/internal/release-snapshot-readiness` against local
no-snapshot, drifted-snapshot, and fresh-capture-current cases. No code defect
was found and release behavior remains warning-only.

Recommended next release policy slice:

```text
Prompt 59: Release Snapshot Findings Detail
```

Prompt 59 should add a read-only detail view for a captured preview snapshot
and its findings, then link recent snapshots and diagnostic rows to that view.
It should not add hard blocking, overrides, auth/signatures, provider
integrations, file uploads, automatic snapshots, or release-action changes.

Implementation status: complete.

Prompt 59 added `/operations-control/[flightLegId]/snapshots/[snapshotId]` as a
read-only detail page for stored preview snapshot metadata and findings. Recent
snapshot cards on FlightLeg detail and latest snapshot rows in
`/internal/release-snapshot-readiness` link to it.

Recommended next release policy slice:

```text
Prompt 60: Release Snapshot Findings Detail QA
```

Prompt 60 should validate the snapshot findings detail page and links from
FlightLeg detail and the internal diagnostic. Keep the slice QA/docs only
unless a defect is found.

Implementation status: complete.

Prompt 60 validated the snapshot findings detail page, FlightLeg detail links,
internal diagnostic links, and mismatched FlightLeg/snapshot not-found behavior.
No code defect was found and release behavior remains warning-only.

Recommended next release evidence slice:

```text
Prompt 61: Release Evidence Workflow Review
```

Prompt 61 should review the current release evidence workflows end-to-end from
FlightLeg detail, then identify the next smallest user-visible workflow
improvement. Keep it planning/docs only unless a clear defect is found.

Implementation status: complete.

Prompt 61 reviewed the current release evidence workflows end-to-end and found
that the main remaining near-term gap is discoverability on FlightLeg detail.
The current workflows exist, but the page is becoming a long evidence packet.

Durable review:

```text
docs/RELEASE_EVIDENCE_WORKFLOW_REVIEW.md
```

Recommended next release evidence slice:

```text
Prompt 62: Release Evidence Action Panel
```

Prompt 62 should add a compact read-only action panel near the top of FlightLeg
detail, summarizing Manifest, W&B, Locating, Dispatch, Airworthiness, and
Preview Snapshots with status, a short message, and links to existing workflow
or detail routes. Keep it UI-only and do not add new mutation actions, schema,
hard blocking, overrides, auth/signatures, provider integrations, file uploads,
automatic snapshots, or release-action changes.

Implementation status: complete.

Prompt 62 added the Release Evidence Action Panel to FlightLeg detail. It is
read-only, reuses existing detail data, and links to existing evidence
workflows and snapshot detail pages.

Recommended next release evidence slice:

```text
Prompt 63: Release Evidence Action Panel QA
```

Prompt 63 should validate the panel across complete, partial, and missing
evidence states and confirm links route correctly. Keep it QA/docs only unless
a defect is found.

Implementation status: complete.

Prompt 63 validated the Release Evidence Action Panel across local demo
FlightLegs. The panel renders, includes all six evidence areas, exposes existing
workflow/detail links, and release behavior remains warning-only.

Recommended next release evidence slice:

```text
Prompt 64: Release Evidence Next Workflow Planning
```

Prompt 64 should decide the next workflow improvement after the action panel.
Compare manifest locking/amendments, W&B approval, locating position history,
dispatch package review state, and release-attempt snapshot planning. Keep it
planning/docs only.

Implementation status: complete.

Prompt 64 selected W&B approval as the next workflow lane.

Chosen approval policy:

- W&B approval is **Calculated only**.
- A `WeightBalanceRun` must be `CALCULATED` before it can be marked
  `APPROVED`.
- Use existing `WeightBalanceRun.status`, `approvedAt`, and `approvedById`.
- Add no schema change for the first approval workflow.
- `approvedById` remains `null` until auth exists.
- Approved runs remain locked from edit and void in the existing workflow.
- Editing a non-approved run continues to reset it to `DRAFT`.
- Release readiness continues to treat `CALCULATED` or `APPROVED` as ready
  until a later release-blocking policy slice decides otherwise.

Deferred:

- Auth/signatures.
- Legal attestation.
- W&B approval audit history.
- Automated calculations.
- Hard release blocking.
- Provider integrations.
- File uploads.

Recommended next release evidence slice:

```text
Prompt 65: Weight-and-Balance Approval Foundation
```

Prompt 65 should add an `Approve` action for `CALCULATED` W&B runs under
`/operations-control/[flightLegId]/weight-balance`, set `APPROVED` plus
`approvedAt`, reject incomplete or wrong-status runs, and keep existing
non-approved W&B behavior unchanged.

Implementation status: complete.

Prompt 65 added W&B approval for `CALCULATED` runs. Approval sets `APPROVED`
and `approvedAt`, leaves `approvedById` null until auth exists, rejects
incomplete or wrong-status runs, and keeps approved runs locked from edit/void.
Release behavior remains warning-only.

Recommended next release evidence slice:

```text
Prompt 66: Weight-and-Balance Approval QA
```

Prompt 66 should validate calculated-to-approved behavior, rejection of
DRAFT/incomplete/wrong-FlightLeg runs, approved-run locking, and unchanged
FlightLeg detail/action-panel/readiness behavior. Keep it QA/docs only unless a
defect is found.
