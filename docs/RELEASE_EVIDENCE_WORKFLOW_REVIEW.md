# Release Evidence Workflow Review

Last updated: 2026-06-08

## Summary

The release evidence workflows now cover the first manual evidence loop around a
FlightLeg:

- Manifest.
- Weight and balance.
- Flight locating.
- Manual dispatch package.
- Warning-only Release Readiness.
- Explicit preview snapshots.
- Snapshot drift diagnostic.
- Snapshot findings detail.

The current system is usable for development, but FlightLeg detail is still a
long evidence packet. The Release Evidence Action Panel helps, and later slices
added locating freshness, dispatch review state, release-attempt snapshots, and
the read-only release audit timeline. The next app-development improvement
should organize FlightLeg detail into a clearer command-center layout without
adding new write behavior.

## Current Workflow Map

| Area | Current behavior | Status |
| --- | --- | --- |
| FlightLeg detail | Shows summary, Release Readiness, preview snapshots, Release Control, airworthiness, manifest, W&B, locating, dispatch, and raw weather/NOTAM snapshots. | Functional but long. |
| Manifest | Add/edit/remove manual manifest items and mark manifest `READY`. | Manual workflow active. |
| Weight and balance | Add/edit manual W&B runs, mark `CALCULATED`, and void runs. | Manual workflow active. |
| Flight locating | Save locating details and mark `FILED`, `ACTIVE`, or `CLOSED`. | Manual workflow active. |
| Dispatch package | Save manual weather, NOTAM, flight-plan, and dispatch notes in one form. | Manual workflow active. |
| Release Readiness | Displays warning-only checklist and non-enforcing blocker preview. | Active, not blocking. |
| Preview snapshots | Explicitly capture readiness snapshot and recent history. | Active, explicit only. |
| Snapshot diagnostics | Compare live readiness to latest snapshot and show drift. | Active, internal/read-only. |
| Snapshot findings detail | Inspect stored snapshot findings and metadata. | Active, read-only. |

## Main Usability Gap

The FlightLeg detail page now has the right data and links, but it does not yet
act as a clear evidence command center. Users must scan down the full page to
find the relevant workflow link or infer which evidence item needs attention
from the readiness checklist.

This is a UI organization problem, not a schema or release-policy problem.

## Recommended Next Slice

Prompt 102 should implement **FlightLeg Detail Information Architecture** using
the Prompt 101 command-center plan.

Minimum behavior:

- Keep all existing workflow pages and release actions available.
- Move Release Evidence Actions and Release Control into a clear top command
  center.
- Add visible section navigation for Readiness, Release History,
  Aircraft/Airworthiness, Evidence Details, and Raw Reference Data.
- Group detailed evidence sections below the command center so the page is
  easier to scan.
- Do not add new mutation actions.
- Do not add schema, hard blocking, auth/signatures, provider integrations,
  file uploads, imports, overrides, automatic snapshots, or `ReleasePackage`.

Why this is the right next slice:

- It is user-visible.
- It makes existing work easier to use.
- It does not require policy decisions.
- It does not change release behavior.
- It prepares the UI for later release readiness, blocking, and operational
  workflow work without enforcing anything.

## Prompt 101 Status

Implementation status: complete.

Prompt 101 selected a compact command-center plus section navigation layout for
FlightLeg detail. Tabs and collapsible sections remain deferred. Prompt 102
should implement the layout-only reorganization, and Prompt 103 should validate
that release actions, evidence workflow links, snapshots, audit history, and
warning-only behavior remain unchanged.

## Deferred Alternatives

These are valid future slices, but they are larger or need more policy:

- Hard release blocking.
- Release override workflow.
- Auth, roles, signatures, and audit events.
- Provider-backed weather, NOTAM, or flight-plan integrations.
- File uploads.
- `ReleasePackage`.
- Passenger identity redesign.
- W&B approval policy.
- Locating overdue automation and position history.
- Manifest locking/amendments.
- Release-attempt automatic snapshots.

## Prompt 62 Target

```text
Prompt 62: Release Evidence Action Panel
```

Scope:

- Add a read-only action panel to FlightLeg detail.
- Reuse existing FlightLeg detail query data.
- Link to existing evidence workflows and snapshot diagnostics/details where
  applicable.
- Keep release behavior warning-only and unchanged.

Prompt 62 should be UI-only unless a clear data access gap is discovered.

## Prompt 62 Status

Implementation status: complete.

FlightLeg detail now includes a compact read-only Release Evidence Action Panel
near the top of the page. It summarizes Manifest, W&B, Locating, Dispatch,
Airworthiness, and Preview Snapshots with status, a short message, and links to
existing workflows or detail pages.

Next recommended slice:

```text
Prompt 63: Release Evidence Action Panel QA
```

Prompt 63 should validate the action panel across FlightLegs with complete,
partial, and missing evidence states and confirm links route correctly. Keep it
QA/docs only unless a defect is found.

## Prompt 63 Status

Implementation status: complete.

Local QA confirmed the Release Evidence Action Panel renders on all five demo
FlightLegs, includes all six evidence areas, represents ready,
needs-attention, and missing states, and links to existing workflow/detail
routes. No code defect was found.

Next recommended slice:

```text
Prompt 64: Release Evidence Next Workflow Planning
```

Prompt 64 should decide the next workflow improvement after the action panel.
Compare manifest locking/amendments, W&B approval, locating position history,
dispatch package review state, and release-attempt snapshot planning. Keep it
planning/docs only.

## Prompt 64-65 Status

Implementation status: complete.

Prompt 64 selected W&B approval as the next workflow lane. Prompt 65
implemented the first approval foundation: only `CALCULATED` W&B runs can be
approved, approval sets `APPROVED` and `approvedAt`, and approved runs remain
locked from edit/void. Release behavior remains warning-only.

Next recommended slice:

```text
Prompt 66: Weight-and-Balance Approval QA
```

Prompt 66 should validate approval behavior and keep the slice QA/docs only
unless a defect is found.

## Prompt 66 Status

Implementation status: complete.

Local QA confirmed W&B approval behavior:

- Complete `CALCULATED` runs can be approved.
- Approval sets `APPROVED` and `approvedAt`.
- `approvedById` remains null until auth exists.
- DRAFT, incomplete, and wrong-FlightLeg approval attempts are rejected.
- Approved runs remain locked from edit and void.
- Non-approved Mark Calculated behavior still works.
- FlightLeg detail, W&B workflow, health, and main routes still load.

Durable QA result:

```text
docs/RELEASE_EVIDENCE_QA_LOG.md
```

Next recommended slice:

```text
Prompt 67: Flight Locating Position History Planning
```

Prompt 67 should decide whether the next workflow should add manual
FlightLocating position history, latest-position summaries, and overdue
warnings. Keep it planning/docs only unless a defect is found.

## Prompt 67-69 Status

Implementation status: complete.

Prompt 67 selected manual, append-only `PositionReport` history as the next
Flight Locating workflow. Prompt 68 planned ADS-B / external tracking as a
future provider-neutral integration, not a near-term dependency. Prompt 69
planned legacy record import as a future staging/dry-run workflow, starting
with aircraft maintenance and airworthiness history once source formats are
known.

Durable planning docs:

```text
docs/FLIGHT_LOCATING_POSITION_HISTORY_PLAN.md
docs/EXTERNAL_TRACKING_INTEGRATION_PLAN.md
docs/LEGACY_RECORD_IMPORT_PLAN.md
```

Next recommended slice:

```text
Prompt 70: Manual Flight Locating Position History Foundation
```

Prompt 70 should add additive `PositionReport` schema and a manual position
report workflow under the existing locating page. Keep release behavior
warning-only.

## Prompt 70 Status

Implementation status: complete.

Manual Flight Locating position history is implemented. The locating workflow
can now add manual `PositionReport` rows, show recent reports, and keep the
parent locating summary synchronized to the newest report by reported time.
ADS-B/provider integrations, automatic overdue rules, report edit/delete/void,
auth/signatures, and release blocking remain deferred.

Next recommended slice:

```text
Prompt 71: Manual Flight Locating Position History QA
```

Prompt 71 should validate the new locating history workflow and keep the slice
QA/docs only unless a defect is found.

## Prompt 71 Status

Implementation status: complete.

Local QA confirmed manual locating position history behavior, including parent
record creation when missing, latest-report summary synchronization,
older-report non-overwrite behavior, health-count visibility, route smoke
checks, and browser rendering.

Next recommended slice:

```text
Prompt 72: Locating Freshness Evidence Panel Update
```

Prompt 72 should update the Release Evidence Action Panel locating card to show
latest position report freshness and summary while keeping release behavior
warning-only.

## Prompt 72 Status

Implementation status: complete.

The Release Evidence Action Panel locating card now shows latest position
report summary and freshness when available. `ACTIVE` locating with no position
report is surfaced as needs attention in the panel only. Release readiness and
release actions remain unchanged.

Next recommended slice:

```text
Prompt 73: Locating Freshness QA
```

Prompt 73 should validate the panel states and keep the slice QA/docs only
unless a defect is found.

## Prompt 73 Status

Implementation status: complete.

Local QA confirmed locating freshness panel behavior for both latest-report and
active-with-no-report states. Release Control still renders and release
behavior remains warning-only.

Next recommended slice:

```text
Prompt 74: Dispatch Package Review State Planning
```

Prompt 74 should decide the next dispatch-package workflow improvement before
implementation.

## Prompt 74 Status

Implementation status: complete.

Prompt 74 selected lightweight status fields on `DispatchPackage` as the first
manual dispatch-review workflow. The intended statuses are `DRAFT`, `READY`,
`REVIEWED`, and `VOIDED`. This remains warning-only and separate from
`FlightRelease`.

Next recommended slice:

```text
Prompt 75: Dispatch Package Review State Foundation
```

Prompt 75 should implement the additive schema fields and manual status actions
under the existing dispatch workflow.

## Prompt 75 Status

Implementation status: complete.

Dispatch package review state is implemented. The dispatch workflow now shows
package status and supports Mark Ready, Mark Reviewed, and Void actions. READY
requires complete manual dispatch evidence. REVIEWED requires READY and records
review time while keeping reviewer identity null until auth exists. VOIDED
packages are treated as not dispatch-ready in warning-only readiness, but
release actions remain unchanged.

Next recommended slice:

```text
Prompt 76: Dispatch Package Review State QA
```

Prompt 76 should validate the dispatch review-state workflow and keep the
slice QA/docs only unless a defect is found.

## Prompt 76 Status

Implementation status: complete.

Local QA confirmed incomplete dispatch Ready rejection, complete Ready,
Reviewed, edit reset to `DRAFT`, Void, route/browser rendering, and unchanged
warning-only release behavior.

Next recommended slice:

```text
Prompt 77: Dispatch Review Freshness Panel Update
```

Prompt 77 should surface dispatch package review status and freshness in the
FlightLeg detail Release Evidence Action Panel without changing release
readiness enforcement or release actions.

## Prompt 77 Status

Implementation status: complete.

The Release Evidence Action Panel dispatch card now shows dispatch package
review state and relevant ready/reviewed/voided timestamp context. `VOIDED`
packages are surfaced as needing attention in the panel. Release readiness and
release actions remain warning-only and unchanged.

Next recommended slice:

```text
Prompt 78: Dispatch Review Freshness QA
```

Prompt 78 should validate the panel display for dispatch review states and
keep the slice QA/docs only unless a defect is found.

## Prompt 78 Status

Implementation status: complete.

Local QA confirmed the FlightLeg detail dispatch card shows review state and
timestamp context, surfaces `VOIDED` packages as needing attention, and keeps
release actions warning-only.

Next recommended slice:

```text
Prompt 79: Release Attempt Snapshot Planning
```

Prompt 79 should decide whether release-control actions should capture
readiness snapshots on attempts before any release-action implementation
changes.

## Prompt 79 Status

Implementation status: complete.

Prompt 79 selected best-effort pre-action readiness snapshots for release
attempts. Mark Released, Cancel Release, and Void Release should try to capture
a readiness snapshot before mutating release status and then create a linked
release audit event. Snapshot capture must not block release actions.

Next recommended slice:

```text
Prompt 80: Release Attempt Snapshot Foundation
```

Prompt 80 should implement the shared snapshot helper and release-action audit
events while preserving warning-only release behavior.

## Prompt 80 Status

Implementation status: complete.

Release-control actions now use a shared snapshot helper to attempt pre-action
readiness snapshots and create linked release audit events. Explicit preview
snapshot behavior is preserved. Release actions remain warning-only.

Next recommended slice:

```text
Prompt 81: Release Attempt Snapshot QA
```

Prompt 81 should validate attempt snapshots and audit events for release,
cancel, and void actions.

## Prompt 81 Status

Implementation status: complete.

Local QA confirmed Mark Released, Cancel Release, and Void Release each create
release-attempt snapshots and linked audit events. Explicit preview snapshot
capture still works. Release behavior remains warning-only.

Next recommended slice:

```text
Prompt 82: Next Release Workflow Planning
```

Prompt 82 should choose the next small release-evidence workflow target after
attempt snapshots.

## Prompt 82 Status

Implementation status: complete.

Prompt 82 selected a read-only release audit timeline on FlightLeg detail as
the next workflow improvement. This exposes the release attempt audit events
and linked readiness snapshots created by the current workflow without changing
release actions.

Next recommended slice:

```text
Prompt 83: Release Audit Timeline Planning
```

Prompt 83 should plan timeline placement, fields, snapshot links, skipped
snapshot metadata, and read-only guardrails before implementation.

## Prompt 83 Status

Implementation status: complete.

Prompt 83 planned the first release audit timeline. It should be
FlightLeg-local, newest-first, limited to 10 events, placed below Preview
Snapshots and above Release Control, and display event type, message, created
time, actor placeholder, snapshot links, and useful attempt metadata.

Next recommended slice:

```text
Prompt 84: Release Audit Timeline Read-Only Foundation
```

Prompt 84 should implement the read-only timeline on FlightLeg detail without
changing release behavior.

## Prompt 84 Status

Implementation status: complete.

FlightLeg detail now includes a read-only Release Audit Timeline below Preview
Snapshots and above Release Control. It shows recent `ReleaseAuditEvent` rows
with event type, message, created time, actor placeholder, snapshot links, and
attempt metadata.

Next recommended slice:

```text
Prompt 85: Release Audit Timeline QA
```

Prompt 85 should validate timeline rendering, snapshot links, no-event state,
and unchanged warning-only release behavior.

## Prompt 85 Status

Implementation status: complete.

Local QA confirmed Release Audit Timeline rendering, visible release event
types, actor placeholder, snapshot links, linked snapshot route loading, and
unchanged warning-only release behavior.

Next recommended slice:

```text
Prompt 86: Legacy Record Import Planning Refresh
```

Prompt 86 should refresh the deferred legacy import planning based on the
current data model and workflow state without implementing importer execution.

## Prompt 86 Status

Implementation status: complete.

Legacy import planning was refreshed. Import execution remains deferred. The
first candidate domain remains aircraft maintenance and airworthiness history,
but staging, dry-run, idempotency, source references, and review policy must be
planned before implementation.

Next recommended slice:

```text
Prompt 87: Legacy Import Staging/Dry-Run Planning
```

Prompt 87 should define staging/dry-run concepts and keep all importer
execution deferred.

## Prompt 87 Status

Implementation status: complete.

Legacy import staging/dry-run planning selected future database-backed staging
with file uploads, parser implementation, operational writes, auth/signatures,
and schema changes deferred. The first candidate domain remains aircraft
maintenance and airworthiness history.

## Prompt 88-89 Status

Implementation status: complete.

Prompt 88 selected additive legacy import staging schema as the next safe path.
Prompt 89 planned the schema for import batches, sources, staged rows,
validation findings, and mapping decisions. The schema remains staging-only:
no importer execution, parser code, file uploads, operational writes,
auth/signatures, destructive cleanup, provider integrations, or operational
foreign-key assumptions should be added.

Next recommended slice:

```text
Prompt 90: Legacy Import Staging Schema Foundation
```

Prompt 90 should implement the additive staging schema, health counts, and DBML
updates only.

## Prompt 90 Status

Implementation status: complete.

The additive import staging schema foundation is implemented. It adds staging
tables for import batches, sources, raw staged rows, validation findings, and
mapping decisions, plus health counts and DBML updates. It does not add
importer execution, parser code, file uploads, operational writes,
auth/signatures, destructive cleanup, provider integrations, or source-specific
mapping.

Next recommended slice:

```text
Prompt 91: Legacy Import Staging Schema QA
```

Prompt 91 should validate the schema, migration, zero-count health diagnostics,
and unchanged app routes.

## Prompt 91 Status

Implementation status: complete.

Local QA confirmed the import staging schema has no pending local migrations,
passes Prisma validation, typecheck, lint, and production build, exposes
zero-count staging diagnostics in `/api/health`, and leaves the main app routes
and Operations Control browser rendering intact.

Durable QA result:

```text
docs/LEGACY_IMPORT_QA_LOG.md
```

Next recommended slice:

```text
Prompt 92: Aircraft Maintenance Import Source Format Planning
```

Prompt 92 should define expected source formats for the first aircraft
maintenance/airworthiness import domain without adding parser or importer code.

## Prompt 92 Status

Implementation status: complete.

Aircraft maintenance import source format planning is complete. The planned
source packet covers aircraft identity, maintenance events, discrepancies,
deferrals, and aircraft airworthiness releases. It keeps parser code, file
uploads, staging-row writes, operational writes, source-specific mapping,
auth/signatures, and provider integrations deferred.

Durable plan:

```text
docs/AIRCRAFT_MAINTENANCE_IMPORT_SOURCE_FORMAT_PLAN.md
```

Next recommended slice:

```text
Prompt 93: Aircraft Maintenance Import Dry-Run Mapping Planning
```

Prompt 93 should plan how those source rows become staging candidates and
validation findings without implementing importer execution.

## Prompt 93 Status

Implementation status: complete.

Aircraft maintenance import dry-run mapping planning is complete. The plan
defines future target labels, validation finding codes, validation status
policy, idempotency direction, batch summary shape, and stop conditions for
maintenance events, discrepancies, deferrals, and aircraft airworthiness
releases. It does not implement dry-run execution or staging writes.

Durable plan:

```text
docs/AIRCRAFT_MAINTENANCE_IMPORT_DRY_RUN_MAPPING_PLAN.md
```

Next recommended slice:

```text
Prompt 94: Import Staging Read-Only Diagnostic Planning
```

Prompt 94 should plan a hidden read-only staging diagnostic route without
adding parser/import execution or staging mutations.

## Prompt 94 Status

Implementation status: complete.

Import staging read-only diagnostic planning is complete. The next safe
implementation, if approved, is a hidden `/internal/import-staging-readiness`
route that summarizes staging table counts, batch coverage, row validation
coverage, findings, and mapping decisions without mutation controls.

Durable plan:

```text
docs/IMPORT_STAGING_DIAGNOSTIC_PLAN.md
```

Stop after Prompt 94 unless a new plan is approved.

## Prompt 95 Status

Implementation status: complete.

The hidden read-only `/internal/import-staging-readiness` diagnostic now
summarizes import staging counts, batch coverage, row validation coverage,
findings, mapping decisions, recent batches, recent sources, and empty-state
guidance. It does not add importer execution or mutation behavior.

Next recommended slice:

```text
Prompt 96: Import Staging Diagnostic QA
```

Prompt 96 should validate the diagnostic and keep the slice QA/docs-only unless
a defect is found.

## Prompt 96 Status

Implementation status: complete.

Local QA confirmed `/internal/import-staging-readiness` renders the empty-state
diagnostic and summary count labels, main routes remain healthy, `/api/health`
continues to expose zero-count import staging diagnostics, and validation/build
checks pass.

Next recommended slice:

```text
Prompt 97: Import Batch Metadata Planning
```

Prompt 97 should plan a metadata-only workflow for import batches and source
references. Parser execution, file uploads, staging-row writes, dry-run
execution, review/apply workflow, and operational writes should remain
deferred.

## Prompt 97 Status

Implementation status: complete.

Import batch metadata planning is complete. The next implementation should add
a hidden `/internal/import-batches` workflow for `ImportBatch` and
`ImportSource` metadata only. It should not parse files, upload files, create
staging rows, run dry-runs, apply imports, or write operational records.

Durable plan:

```text
docs/IMPORT_BATCH_METADATA_WORKFLOW_PLAN.md
```

Next recommended slice:

```text
Prompt 98: Import Batch Metadata Foundation
```

## Prompt 98 Status

Implementation status: complete.

The hidden `/internal/import-batches` workflow now supports metadata-only
`ImportBatch` create/edit and `ImportSource` creation. It is linked from
`/internal/import-staging-readiness`. It does not parse files, upload files,
create staging rows, run dry-runs, apply imports, or write operational records.

Next recommended slice:

```text
Prompt 99: Import Batch Metadata QA
```

## Prompt 99 Status

Implementation status: complete.

Local QA confirmed metadata-only batch creation, batch edit, source metadata
creation, diagnostic reflection, route health, and zero staging rows/findings/
mapping decisions after metadata writes.

Stop after Prompt 99 unless a new plan is approved.
