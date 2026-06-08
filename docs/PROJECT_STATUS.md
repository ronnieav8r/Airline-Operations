# Project Status

Last updated: 2026-06-08

This document is the quick onboarding note for planner and builder chats. Read it
before starting a new AeroOps slice.

## Current State

AeroOps Center is a Next.js, TypeScript, Prisma, PostgreSQL, and Render app for
small airline, charter, or air taxi operations.

The app is currently an operational console backed by live Prisma reads. Most
surfaces remain read-focused, and Operations Control now has the first
controlled FlightLeg create/edit workflow.

It has:

- Dashboard at `/`
- Operations Control at `/operations-control`
- FlightLeg create/edit at `/operations-control/new` and
  `/operations-control/[flightLegId]/edit`
- Manifest management at `/operations-control/[flightLegId]/manifest`
- Flight locating management at `/operations-control/[flightLegId]/locating`
- Weight-and-balance management at
  `/operations-control/[flightLegId]/weight-balance`
- Dispatch package management at `/operations-control/[flightLegId]/dispatch`
- Release snapshot detail at
  `/operations-control/[flightLegId]/snapshots/[snapshotId]`
- Flights at `/flights`
- Aircraft at `/aircraft`
- Crew at `/crew`
- Scheduling at `/scheduling`
- Health endpoint at `/api/health`
- Hidden FlightLeg parity diagnostic at `/internal/flightleg-parity`
- Hidden FlightLeg write-readiness diagnostic at
  `/internal/flightleg-write-readiness`
- Hidden release snapshot-readiness diagnostic at
  `/internal/release-snapshot-readiness`
- Local Docker Postgres development setup
- Render deployment connected to `main`

## Completed Product Slices

1. Foundation app, Prisma schema, migrations, and seed data.
2. Crew-resolution API using aircraft-block assignments.
3. Read-only operations dashboard.
4. App shell navigation.
5. Authority and operational-control schema foundation.
6. Gated authority backfill for Render demo data.
7. Read-only Operations Control page.
8. Read-only Flights page.
9. Local Docker Desktop development setup.
10. Read-only Aircraft page.
11. Read-only Crew page.
12. Read-only Scheduling page.
13. Additive FlightLeg transition foundation.
14. Hidden Flight-to-FlightLeg parity diagnostic.
15. Operations Control FlightLeg read pilot.
16. Flights page FlightLeg read pilot.
17. Dashboard FlightLeg read pilot.
18. Release evidence schema planning.
19. Additive release evidence schema foundation.
20. Release evidence read-only summaries on Dashboard and Operations Control.
21. Release evidence read-only FlightLeg detail drilldown.
22. Scheduling FlightLeg read migration.
23. Aircraft FlightLeg read migration.
24. Crew FlightLeg read migration.
25. FlightLeg create/edit workflow foundation.
26. FlightLeg write QA guardrails.
27. FlightLeg coverage API bridge.
28. CrewLegAssignment snapshot sync on FlightLeg create/edit.
29. Release-control actions foundation.
30. Release evidence mutation planning.
31. Manifest mutation foundation.
32. Flight locating mutation foundation.
33. Weight-and-balance mutation planning.
34. Weight-and-balance mutation foundation.
35. Manual dispatch-package mutation planning.
36. Manual dispatch-package mutation foundation.
37. Release readiness guardrails planning.
38. Release readiness guardrails foundation.
39. Release evidence QA and Operations Control action discoverability.
40. Airworthiness schema planning.
41. Airworthiness additive schema foundation.
42. Airworthiness read-only summaries.
43. Airworthiness mutation planning.
44. Airworthiness discrepancy mutation foundation.
45. Airworthiness deferral mutation foundation.
46. Maintenance event mutation planning.
47. Maintenance event mutation foundation.
48. Airworthiness release planning.
49. Airworthiness release foundation.
50. Airworthiness release readiness refresh.
51. Airworthiness workflow QA and deploy readiness.
52. Release blocking policy planning.
53. Release blocking preview foundation.
54. Release blocking preview QA.
55. Authority-specific release policy planning.
56. Release override and auth planning.
57. Release blocking data model planning.
58. Release blocking schema foundation.
59. Release policy diagnostic QA.
60. Release snapshot planning.
61. Release snapshot preview foundation.
62. Release snapshot QA.
63. Release snapshot diagnostic readiness.
64. Release snapshot drift QA.
65. Release snapshot findings detail.
66. Release snapshot findings detail QA.
67. Release evidence workflow review.
68. Release evidence action panel.
69. Release evidence action panel QA.
70. Weight-and-balance approval planning.
71. Weight-and-balance approval foundation.
72. Weight-and-balance approval QA.
73. Flight locating position history planning.
74. ADS-B / external tracking integration planning.
75. Legacy record import planning.
76. Manual Flight Locating position history foundation.
77. Manual Flight Locating position history QA.
78. Locating freshness evidence panel update.
79. Locating freshness QA.
80. Dispatch package review state planning.
81. Dispatch package review state foundation.
82. Dispatch package review state QA.
83. Dispatch review freshness panel update.
84. Dispatch review freshness QA.
85. Release attempt snapshot planning.
86. Release attempt snapshot foundation.
87. Release attempt snapshot QA.
88. Next release workflow planning.
89. Release audit timeline planning.
90. Release audit timeline read-only foundation.
91. Release audit timeline QA.
92. Legacy record import planning refresh.
93. Legacy import staging/dry-run planning.
94. Next slice planning.
95. Legacy import staging schema planning.
96. Legacy import staging schema foundation.
97. Legacy import staging schema QA.
98. Aircraft maintenance import source format planning.
99. Aircraft maintenance import dry-run mapping planning.
100. Import staging read-only diagnostic planning.
101. Import staging read-only diagnostic foundation.
102. Import staging diagnostic QA.
103. Import batch metadata planning.
104. Import batch metadata foundation.
105. Import batch metadata QA.

## Current Data Model Boundaries

The current `Flight` model is still the v1 table read by the UI and APIs.
Do not rename it or split it without an approved read-migration slice.

`FlightLeg` now exists as an additive foundation table. It is bridged to current
rows by `FlightLeg.legacyFlightId`. `/`, `/operations-control`, `/flights`,
`/scheduling`, `/aircraft`, and `/crew` now pilot FlightLeg reads with legacy
`Flight` fallback where needed.

Operations Control now has the first controlled FlightLeg write workflow. New
and edited FlightLeg records also create/update the legacy `Flight` bridge row
in the same transaction so current coverage APIs, fallback reads, and parity
diagnostics continue to work during the transition.

FlightLeg create/edit now snapshots resolved aircraft-block crew onto
`CrewLegAssignment`. These rows are leg-level evidence, not the active source of
truth. Aircraft-block assignment remains the source used by coverage APIs and
current crew displays.

FlightLeg detail now has minimal release controls for `FlightRelease` status:
mark released, cancel release, and void release. These actions do not mutate
release evidence or assemble dispatch packages.

FlightLeg detail now links to manual manifest management. The manifest workflow
can create a manifest, add/edit/remove manual manifest items, and mark the
manifest `READY`. Manifest locking, amendments, passenger identity redesign,
release gating, weight-and-balance, locating, and dispatch-package mutation
remain deferred.

FlightLeg detail now links to manual flight locating management. The locating
workflow can create a locating record, edit responsible party, planned route,
last known position, notes, and transition status to `FILED`, `ACTIVE`, or
`CLOSED`. Position history, overdue automation, release gating, and dispatch
mutation remain deferred.

Flight locating position history is now planned. The chosen next implementation
is manual, append-only `PositionReport` history under `FlightLocatingRecord`.
The parent locating record remains the one-row FlightLeg summary, and the
newest manual position report should update `lastKnownPosition`. ADS-B,
external tracking, automatic overdue rules, auth/signatures, and hard release
blocking remain deferred.

Manual Flight Locating position history foundation is implemented. The locating
workflow can now add manual `PositionReport` rows with reported time, position
summary, optional coordinates/altitude/groundspeed/heading/source/notes, show
recent reports, and keep `FlightLocatingRecord.lastKnownPosition` synchronized
to the newest report by reported time. ADS-B, automatic tracking, automatic
overdue rules, report edit/delete/void, auth/signatures, and hard release
blocking remain deferred.

Manual Flight Locating position history QA is complete. Local QA confirmed
position report creation, parent locating record creation when missing, newest
reported position summary synchronization, older-report non-overwrite behavior,
health counts, route smoke checks, and browser rendering. Results are recorded
in `docs/RELEASE_EVIDENCE_QA_LOG.md`.

Locating freshness evidence panel update is implemented. The Release Evidence
Action Panel now includes latest manual position report summary and age on the
Flight locating card when available. An `ACTIVE` locating record with no
position report is shown as needing attention in the panel only. Release
readiness and release actions remain warning-only and unchanged.

Locating freshness QA is complete. Local QA confirmed the panel shows latest
manual position report summary/freshness when available, shows an
`ACTIVE`-with-no-report needs-attention state in the panel only, and keeps
Release Control visible. Results are recorded in
`docs/RELEASE_EVIDENCE_QA_LOG.md`.

Dispatch package review state planning is complete. The chosen first policy is
to add lightweight status fields directly to `DispatchPackage`: `DRAFT`,
`READY`, `REVIEWED`, and `VOIDED`. Review is a workflow state, not a legal
signature or FlightLeg release. Auth/roles, review audit history, file uploads,
provider integrations, `ReleasePackage`, hard blocking, and release-action
changes remain deferred.

Dispatch package review state foundation is implemented. The manual dispatch
workflow now tracks `DRAFT`, `READY`, `REVIEWED`, and `VOIDED` status, supports
Mark Ready, Mark Reviewed, and Void actions, and records ready/review/void
timestamps. `reviewedById` remains null until auth exists. Voided dispatch
packages no longer count as dispatch-ready in warning-only readiness, but
release actions remain available and unchanged.

Dispatch package review state QA is complete. Local QA confirmed incomplete
Ready rejection, complete Ready, Reviewed, edit reset to `DRAFT`, Void,
route/browser rendering, and unchanged warning-only release behavior. Results
are recorded in `docs/RELEASE_EVIDENCE_QA_LOG.md`.

Dispatch review freshness panel update is implemented. The FlightLeg detail
Release Evidence Action Panel dispatch card now shows dispatch package review
state and relevant ready/reviewed/voided timestamps. `VOIDED` packages surface
as needing attention in the panel. Release readiness and release actions remain
warning-only and unchanged.

Dispatch review freshness QA is complete. Local QA confirmed the FlightLeg
detail dispatch card shows review state and timestamp context, surfaces
`VOIDED` packages as needing attention, and keeps release actions warning-only.
Results are recorded in `docs/RELEASE_EVIDENCE_QA_LOG.md`.

Release attempt snapshot planning is complete. The chosen policy is
best-effort pre-action readiness snapshots for Mark Released, Cancel Release,
and Void Release, using existing snapshot/finding/audit tables. Snapshot
capture must not block release actions; missing policy data should be recorded
as an audit skip reason. Detailed policy is in
`docs/RELEASE_ATTEMPT_SNAPSHOT_POLICY.md`.

Release attempt snapshot foundation is implemented. Release-control actions now
attempt to capture a pre-action readiness snapshot and create a linked
`ReleaseAuditEvent` for Mark Released, Cancel Release, and Void Release.
Explicit preview snapshot behavior is preserved. Release actions remain
warning-only and do not hard-block on readiness findings.

Release attempt snapshot QA is complete. Local QA confirmed Mark Released,
Cancel Release, and Void Release each create release-attempt snapshots and
linked audit events, while explicit preview snapshot capture still works.
Release behavior remains warning-only. Results are recorded in
`docs/RELEASE_EVIDENCE_QA_LOG.md`.

Next release workflow planning is complete. The chosen next improvement is a
read-only release audit timeline on FlightLeg detail so operators can see the
release attempt audit events and linked readiness snapshots created by the
current workflow. Detailed planning lives in
`docs/NEXT_RELEASE_WORKFLOW_PLAN.md`.

Release audit timeline planning is complete. The chosen first timeline is
FlightLeg-local, newest-first, limited to the latest 10 `ReleaseAuditEvent`
rows, placed below Preview Snapshots and above Release Control. It should show
event type, message, created time, actor placeholder, snapshot links, and
attempt metadata without changing release behavior. Detailed planning lives in
`docs/RELEASE_AUDIT_TIMELINE_PLAN.md`.

Release audit timeline read-only foundation is implemented. FlightLeg detail
now shows a Release Audit Timeline below Preview Snapshots and above Release
Control, including event type, message, created time, actor placeholder,
snapshot links, and attempt metadata. It is read-only and does not change
warning-only release behavior.

Release audit timeline QA is complete. Local QA confirmed the timeline renders
with release audit events, linked snapshot detail routes load, actor placeholder
and attempt metadata display, and release behavior remains warning-only.
Results are recorded in `docs/RELEASE_EVIDENCE_QA_LOG.md`.

Legacy record import planning refresh is complete. Import execution remains
deferred. The first candidate import domain remains aircraft maintenance and
airworthiness history, targeting `Aircraft`, `MaintenanceEvent`,
`Discrepancy`, `Deferral`, and `AirworthinessRelease` only after staging,
dry-run, idempotency, and review policy are approved.

Legacy import staging/dry-run planning is complete. The future import
foundation should use database-backed staging tables, with file uploads,
parser implementation, operational writes, auth/signatures, and schema changes
still deferred until a separate implementation plan is approved. Detailed
planning lives in `docs/LEGACY_IMPORT_STAGING_DRY_RUN_PLAN.md`.

Next slice planning is complete. The selected next path is additive legacy
import staging schema planning and foundation work, followed by source-format
and dry-run mapping planning. Import execution, file uploads, operational
writes, auth/signatures, destructive cleanup, provider integrations, and
ambiguous source-field mapping remain stop conditions.

Legacy import staging schema planning is complete. Prompt 90 should add
additive staging tables for import batches, sources, staged rows, validation
findings, and mapping decisions only. The staging tables should not hold
operational foreign keys yet, and no importer execution, file uploads,
operational writes, auth/signatures, destructive cleanup, or provider
integrations should be added.

Legacy import staging schema foundation is implemented. The schema now has
additive staging-only tables for import batches, sources, staged rows,
validation findings, and mapping decisions, plus `/api/health` counts and DBML
updates. These tables are empty by default and do not perform imports. Importer
execution, parser code, file uploads, operational writes, review/apply routes,
auth/signatures, destructive cleanup, provider integrations, and source-specific
mapping remain deferred.

Legacy import staging schema QA is complete. Local QA confirmed the migration
state, Prisma validation, typecheck after build regeneration, lint, production
build, route smoke, browser rendering, and zero-count `/api/health` diagnostics
for the new import staging tables. Results are recorded in
`docs/LEGACY_IMPORT_QA_LOG.md`.

Aircraft maintenance import source format planning is complete. The first
legacy import domain should use a small source packet covering aircraft
identity, maintenance events, discrepancies, deferrals, and aircraft
airworthiness releases. Actual parser code, file uploads, staging-row writes,
operational writes, review/apply workflow, auth/signatures, destructive
cleanup, provider integrations, and source-specific mapping remain deferred.

Aircraft maintenance import dry-run mapping planning is complete. The future
dry-run should map source rows to staging candidates, validation findings, and
mapping decisions for `MaintenanceEvent`, `Discrepancy`, `Deferral`, and
`AirworthinessRelease` without operational writes. Parser code, importer
execution, file uploads, staging-row writes, review/apply routes,
auth/signatures, destructive cleanup, provider integrations, and source-specific
mapping code remain deferred.

Import staging read-only diagnostic planning is complete. The next safe
implementation, if approved, is a hidden read-only
`/internal/import-staging-readiness` page showing staging table counts, batch
coverage, validation-status summaries, finding summaries, and mapping-decision
summaries. It must not add import execution, parser code, file uploads,
staging mutations, operational writes, auth/signatures, destructive cleanup,
provider integrations, or source-specific mapping code.

Import staging read-only diagnostic foundation is implemented. The hidden
`/internal/import-staging-readiness` page summarizes import staging counts,
batch coverage, row validation coverage, findings, mapping decisions, recent
batches, recent sources, and empty-state guidance. It is read-only and does not
add parser/import execution, file uploads, staging mutations, operational
writes, review/apply routes, auth/signatures, destructive cleanup, provider
integrations, or source-specific mapping code.

Import staging diagnostic QA is complete. Local QA confirmed the hidden
diagnostic route renders, shows empty-state guidance while staging tables are
empty, exposes summary count labels, keeps `/api/health` import counts at zero,
and leaves main app routes healthy. Results are recorded in
`docs/LEGACY_IMPORT_QA_LOG.md`.

Import batch metadata planning is complete. The next implementation should add
a hidden internal `/internal/import-batches` workflow that creates/edits
`ImportBatch` metadata and adds `ImportSource` metadata only. It must not add
file uploads, parser execution, staging-row writes, dry-run execution,
review/apply workflow, operational writes, auth/signatures, destructive
cleanup, provider integrations, or source-specific mapping code.

Import batch metadata foundation is implemented. The hidden
`/internal/import-batches` workflow can create/edit `ImportBatch` metadata and
add `ImportSource` metadata. `/internal/import-staging-readiness` links to it.
The workflow does not add file uploads, parser execution, staging-row writes,
dry-run execution, review/apply workflow, operational writes, auth/signatures,
destructive cleanup, provider integrations, or source-specific mapping code.

Import batch metadata QA is complete. Local QA confirmed metadata-only batch
creation, batch edit, source metadata creation, diagnostic updates, route
health, and zero staging rows/findings/mapping decisions after the workflow.
Results are recorded in `docs/LEGACY_IMPORT_QA_LOG.md`.

ADS-B / external tracking is planned as a future provider-neutral integration.
External observations should become attributed position reports later, not the
sole source of operational-control truth. Provider selection, credentials,
polling/webhooks, aircraft identifier mapping, raw payload storage, and
provider-based release blocking remain deferred.

Legacy record import is planned as a future staging/dry-run workflow. The first
candidate domain should be aircraft maintenance and airworthiness history.
Direct operational imports, file uploads, parser implementation, and
flight/crew/manifest imports remain deferred until source formats are known.

Weight-and-balance mutation planning is complete. The next W&B workflow should
be manual entry only, should use the current `WeightBalanceRun` schema, should
link to the current manifest when present, and should store human-entered
context in `calculationSnapshot`. Approval, automated calculations, aircraft
configuration/capability schema, and release gating remain deferred.

FlightLeg detail now links to manual weight-and-balance management. The W&B
workflow can create/edit manual `WeightBalanceRun` rows, link new runs to the
current manifest when present, store manual notes in `calculationSnapshot`,
mark runs `CALCULATED`, and void runs. Approval, automated calculations,
aircraft configuration/capability schema, and release gating remain deferred.

Manual dispatch-package mutation planning is complete. The next dispatch
workflow should save weather, NOTAM, flight-plan, and package notes in one
manual form using existing schema only. Provider integrations, `ReleasePackage`,
file uploads, aircraft performance calculations, and release gating remain
deferred.

FlightLeg detail now links to manual dispatch-package management. The dispatch
workflow can save manual weather briefing evidence, NOTAM evidence, a
flight-plan reference, and package/performance notes in one form, then link
those records to the FlightLeg `DispatchPackage`. Provider integrations,
`ReleasePackage`, file uploads, aircraft performance calculations, and release
gating remain deferred.

Release readiness guardrails planning is complete. The next guardrail
implementation should add a warning-only checklist to FlightLeg detail near
Release Control. It should cover manifest, W&B, locating, dispatch, weather,
NOTAM, and flight-plan evidence. It must not block release actions, mutate
evidence, add schema, or introduce `ReleasePackage`.

FlightLeg detail now shows warning-only release readiness guardrails near
Release Control. The checklist covers manifest, W&B, locating, dispatch,
weather, NOTAM, and flight-plan evidence. Release action buttons remain
available. Hard release blocking, `ReleasePackage`, audit policy, and approval
authority remain deferred.

Operations Control now has a clear Actions column for FlightLeg-backed rows.
The flight number links to detail, and row actions expose Detail, Edit,
Manifest, W&B, Locating, and Dispatch. This was added after QA showed the prior
detail/edit links were too easy to miss inside the evidence cell.

Airworthiness schema planning is complete. The next airworthiness foundation
should add additive models for aircraft configuration, capability,
discrepancies, deferrals, maintenance events, and airworthiness releases.
`Aircraft.status` remains a v1 fleet-board signal, not the airworthiness source
of truth. Component tracking, reliability analytics, hard release blocking,
file uploads, provider integrations, and maintenance work-order workflow remain
deferred.

Airworthiness additive schema foundation is implemented. Current schema now
includes `AircraftConfiguration`, `AircraftCapability`, `Discrepancy`,
`Deferral`, `MaintenanceEvent`, and `AirworthinessRelease`, with local demo
seed data, a gated `RUN_AIRWORTHINESS_BACKFILL` script, health counts, and DBML
updates. There is no airworthiness CRUD or release blocking yet.

Aircraft and FlightLeg detail now show read-only airworthiness summaries. The
FlightLeg release readiness checklist includes warning-only airworthiness
context for assigned aircraft configuration, released airworthiness record,
open/deferred discrepancies, and active deferrals. Release actions remain
available; hard blocking and airworthiness mutation remain deferred.

Airworthiness mutation planning is complete. The chosen first write surface is
`/aircraft/[aircraftId]/airworthiness`, because discrepancies and deferrals are
aircraft-level records that can affect multiple FlightLegs. The next
implementation should add discrepancy create/edit only. Deferral mutation,
maintenance events, airworthiness release signing, auth/signatures, and hard
release blocking remain deferred.

Airworthiness discrepancy mutation foundation is implemented. Aircraft cards
link to `/aircraft/[aircraftId]/airworthiness`, where users can create and edit
aircraft-level discrepancies. Deferrals, maintenance events, airworthiness
release signing, auth/signatures, and hard release blocking remain deferred.

Airworthiness deferral mutation foundation is implemented. The aircraft-level
airworthiness workflow can create/edit deferrals from existing `OPEN` or
`DEFERRED` discrepancies. Active deferrals mark the related discrepancy
`DEFERRED`; clearing a deferral can either keep the discrepancy deferred or
explicitly mark it cleared. Maintenance events, airworthiness release signing,
auth/signatures, and hard release blocking remain deferred.

Maintenance event mutation planning is complete. The next implementation should
add maintenance-event create/edit under `/aircraft/[aircraftId]/airworthiness`,
allow optional discrepancy linking, and allow a completed event to clear a
linked discrepancy only through an explicit form choice. Deferral clearing,
airworthiness release signing, auth/signatures, and hard release blocking
remain deferred.

Maintenance event mutation foundation is implemented. The aircraft-level
airworthiness workflow can create/edit maintenance events with optional
discrepancy links. Completed linked events can mark the linked discrepancy
`CLEARED` only through an explicit form choice. Deferral clearing,
airworthiness release signing, auth/signatures, and hard release blocking
remain deferred.

Airworthiness release planning is complete. `AirworthinessRelease` is treated
as maintenance/aircraft airworthiness release state, not the full FlightLeg
operational release. `FlightRelease` remains the operational FlightLeg release.
The next implementation should add aircraft-level airworthiness release
create/edit under `/aircraft/[aircraftId]/airworthiness`; new `RELEASED`
records should supersede prior current released records for that aircraft.
`AirworthinessRelease.flightLegId`, auth/signatures, and hard release blocking
remain deferred.

Airworthiness release foundation is implemented. The aircraft-level
airworthiness workflow can create/edit maintenance airworthiness releases,
auto-generate release numbers, mark records `DRAFT`, `RELEASED`, `VOIDED`, or
`SUPERSEDED`, set `releasedAt` when a record becomes `RELEASED`, and supersede
older current released aircraft records. This does not mutate operational
`FlightRelease`; `AirworthinessRelease.flightLegId`, auth/signatures, and hard
release blocking remain deferred.

Airworthiness release readiness display refresh is implemented. Aircraft and
FlightLeg detail now read recent aircraft release history and separately derive
the current non-expired `RELEASED` maintenance airworthiness release. Missing
history, latest non-current records, expired current records, discrepancies,
and deferrals remain warning-only. Operational `FlightRelease` actions remain
available.

Airworthiness workflow QA and deploy readiness is complete. Local validation
passed for Prisma schema validation, typecheck, lint, and production build.
Local workflow smoke passed for draft release creation, released release
creation, superseding older current releases, and voiding a draft release.
Local route smoke passed for dashboard, aircraft, airworthiness workflow,
Operations Control, FlightLeg detail, health, parity, and write-readiness.

Release blocking policy planning is complete. Current app behavior remains
warning-only, but `docs/RELEASE_BLOCKING_POLICY.md` now classifies likely
future `WOULD_BLOCK` and `WOULD_WARN` release-readiness findings. The next
implementation should preview those classifications on FlightLeg detail without
blocking `FlightRelease` actions, adding schema, or adding auth/signatures.

Release blocking preview foundation is implemented. FlightLeg detail now shows
non-enforcing `Would block release`, `Would warn`, or `No blocker` policy
preview labels on each readiness checklist item, plus preview totals. Release
action buttons remain available, and no schema, auth/signature, override,
provider, file-upload, or actual blocking behavior was added.

Release blocking preview QA is complete. Local validation passed for Prisma
schema validation, typecheck, lint, and production build. Local route smoke
passed for dashboard, Operations Control, FlightLeg detail, health, parity, and
write-readiness. Local workflow smoke confirmed mark released, cancel release,
and void release still mutate `FlightRelease.status`; the preview does not
block release actions.

Authority-specific release policy planning is complete. Current behavior
remains warning-only, but `docs/AUTHORITY_RELEASE_POLICY.md` now defines the
first planning matrix for `PART_91_BASELINE`, `PART_91K_FRACTIONAL`, and
`PART_135_ON_DEMAND`. Shared future blockers include assigned aircraft, active
configuration, current aircraft maintenance airworthiness release,
operational-control context, authority/revision, planned `FlightRelease`, and
current W&B. Baseline Part 91 strictness for manifest, locating, dispatch,
weather, NOTAM, and flight-plan evidence remains operator-configurable.

Release override and auth planning is complete. Current behavior remains
warning-only, but `docs/RELEASE_OVERRIDE_AUTH_POLICY.md` now defines the future
override boundary. Overrides require user identity, role, reason, authority
context, blocker key, timestamp, and audit capture; selected safety-critical
findings should be non-overridable in the normal operations-control workflow
until stronger policy exists.

Release blocking data model planning is complete. Current schema remains
unchanged and current behavior remains warning-only. The planned future additive
models are `ReleasePolicyProfile`, `ReleasePolicyRule`,
`ReleaseReadinessSnapshot`, `ReleaseReadinessFinding`, `ReleaseOverride`, and
`ReleaseAuditEvent`. These should exist before hard blocking, override
workflow, auth/signature implementation, or provider-backed verification.

Release blocking schema foundation is implemented. The schema now has additive
release policy, rule, readiness snapshot, finding, override, and audit-event
tables, plus conservative default policy/rule seed and gated backfill support.
`/internal/release-policy-readiness` verifies default profile/rule coverage.
Current `FlightRelease` actions remain warning-only; no snapshots, findings,
overrides, hard blocking, auth/signatures, provider integrations, or file
uploads were added.

Release policy diagnostic QA is complete. Local validation confirmed default
release policy profiles/rules seed and backfill successfully, health exposes
the new counts, `/internal/release-policy-readiness` reports policy coverage,
and FlightLeg detail still renders Release Readiness and Release Control.
Snapshots, findings, overrides, audit events, hard blocking, auth/signatures,
provider integrations, file uploads, and `ReleasePackage` remain deferred.

Release snapshot planning is complete. Preview snapshots should be created only
by an explicit "Capture preview snapshot" action on FlightLeg detail. They
should use the same readiness source as the live checklist, create one
`ReleaseReadinessSnapshot` plus one `ReleaseReadinessFinding` per checklist
item, and must not block or change `FlightRelease` actions.

Release snapshot preview foundation is implemented. FlightLeg detail now has an
explicit "Capture preview snapshot" action and recent snapshot history. Snapshot
capture uses the same readiness helper as the live checklist, stores one
`ReleaseReadinessSnapshot` plus related `ReleaseReadinessFinding` rows, and does
not change `FlightRelease.status` or block release actions.

Release snapshot QA is complete. Local QA confirmed repeated preview captures
append historical snapshots with findings, FlightLeg detail still shows live
Release Readiness and snapshot history, health exposes snapshot/finding counts,
and mark released, cancel release, and void release remain unchanged.
Overrides, audit events, hard blocking, auth/signatures, provider integrations,
file uploads, and `ReleasePackage` remain deferred.

Release snapshot diagnostic readiness is implemented. The hidden
`/internal/release-snapshot-readiness` route compares each FlightLeg's current
live release-readiness checklist with its latest explicit preview snapshot and
flags missing or drifted snapshots. It is read-only and does not mutate
snapshots, evidence, policy rules, or `FlightRelease` actions.

Release snapshot drift QA is complete. Local QA confirmed the diagnostic reports
no-snapshot FlightLegs, reports drift when local live readiness changes after a
snapshot, and returns a stable FlightLeg to current after a fresh explicit
preview snapshot. No release behavior changed.

Release snapshot findings detail is implemented. Users can inspect a captured
preview snapshot and its stored findings at
`/operations-control/[flightLegId]/snapshots/[snapshotId]`. FlightLeg detail
recent snapshot cards and the internal snapshot-readiness diagnostic link to
this read-only detail view. Snapshot findings remain historical records; the
page does not recompute readiness or change release behavior.

Release snapshot findings detail QA is complete. Local QA confirmed the detail
page renders stored snapshot metadata and findings, both link sources work, a
mismatched FlightLeg/snapshot pair returns 404, and health still shows zero
overrides and audit events. Release behavior remains warning-only.

Release evidence workflow review is complete. The current evidence workflows
are usable, but FlightLeg detail is now a long evidence packet. The next
recommended user-visible improvement is a compact Release Evidence Action Panel
near the top of FlightLeg detail that summarizes each evidence area and links
to the existing workflows without adding new write behavior.

Release evidence action panel is implemented. FlightLeg detail now shows a
compact read-only panel near the top with Manifest, W&B, Locating, Dispatch,
Airworthiness, and Preview Snapshot status/actions. It reuses existing data and
does not add new mutation actions or change release behavior.

Release evidence action panel QA is complete. Local QA confirmed the panel
renders on all five demo FlightLegs, includes all six evidence areas, represents
ready/needs-attention/missing states, and links to existing workflows and
snapshot detail/diagnostic routes. Release behavior remains warning-only.

Weight-and-balance approval planning is complete. The first approval workflow
should use the existing `WeightBalanceRun` fields with no schema change and
should allow approval only from `CALCULATED` runs. Approved runs remain locked
from edit/void, `approvedById` stays null until auth exists, and release
readiness remains warning-only.

Weight-and-balance approval foundation is implemented. The W&B workflow now
supports approving `CALCULATED` runs that have takeoff weight, landing weight,
and center of gravity. Approval sets `APPROVED` plus `approvedAt`, keeps
`approvedById` null until auth exists, and leaves release behavior
warning-only.

Weight-and-balance approval QA is complete. Local QA confirmed approval from
`CALCULATED` to `APPROVED`, rejection of DRAFT, incomplete, and wrong-FlightLeg
approval attempts, approved-run edit/void locking, unchanged non-approved Mark
Calculated behavior, and successful route/browser smoke checks. Results are
recorded in `docs/RELEASE_EVIDENCE_QA_LOG.md`.

Use `/internal/flightleg-write-readiness` after local create/edit QA. It checks
the expected write-workflow support records: legacy Flight bridge, auto trip,
current aircraft assignment, operational-control link, release placeholder, and
basic turnaround-link order.

Render has been backfilled with FlightLeg foundation records. The
`RUN_FLIGHTLEG_BACKFILL` flag should remain `0` unless intentionally rerunning
the gated idempotent backfill.

New additive foundation tables:

- `TripOrMission`
- `FlightLeg`
- `AircraftAssignment`
- `CrewLegAssignment`
- `TurnaroundLink`

Release evidence now exists as an additive FlightLeg-attached foundation:

- `Manifest`
- `ManifestItem`
- `WeightBalanceRun`
- `FlightLocatingRecord`
- `DispatchPackage`
- `WeatherBriefingSnapshot`
- `NotamSnapshot`
- `FlightPlanReference`

Use these DBML files for schema discussions:

- `docs/schema.current.dbml`: clean current-state DBML matching the implemented Prisma schema.
- `docs/schema.planning.flightleg.dbml`: planning-only target DBML using `FlightLeg` as the operational anchor.

Use `docs/RELEASE_EVIDENCE_SCHEMA_DECISIONS.md` for the release-evidence
boundary. `ReleasePackage` and `PositionReport` remain deferred.

Use `docs/RELEASE_EVIDENCE_MUTATION_PLAN.md` for the release-evidence mutation
sequence. The chosen first implementation workflow is manifest mutation.

Use `docs/RELEASE_EVIDENCE_WORKFLOW_REVIEW.md` for the current end-to-end
release evidence workflow review and the recommended next UI-only improvement.

Use `docs/AIRWORTHINESS_MUTATION_PLAN.md` for the airworthiness mutation
sequence. The chosen first implementation workflow is discrepancy mutation
under the aircraft-level airworthiness route.

Use `docs/MAINTENANCE_EVENT_MUTATION_PLAN.md` for maintenance-event workflow
planning.

Use `docs/AIRWORTHINESS_RELEASE_POLICY.md` for the aircraft maintenance
airworthiness release policy. `AirworthinessRelease` is not the same thing as
the full FlightLeg operational `FlightRelease`.

Use `docs/RELEASE_BLOCKING_POLICY.md` for future operational release blocking
policy. Current release actions remain warning-only until a later implementation
slice explicitly changes that behavior.

Use `docs/AUTHORITY_RELEASE_POLICY.md` for planning how release readiness should
vary by authority class. This is policy planning only; there is no
authority-specific policy engine yet.

Use `docs/RELEASE_OVERRIDE_AUTH_POLICY.md` for future release override, auth,
role, signature, and audit policy. This is policy planning only; there is no
override workflow or auth model yet.

Use `docs/RELEASE_BLOCKING_DATA_MODEL_PLAN.md` for the future release-blocking
schema plan. The additive foundation tables now exist, but hard release
blocking remains deferred.

Use `docs/LEGACY_RECORD_IMPORT_PLAN.md` for the deferred old-record import
lane. The future goal is a safe import method for legacy operational, aircraft,
maintenance, crew, manifest, dispatch, and release records. Do not implement it
yet; source formats, staging/dry-run behavior, idempotency keys, and target
table mappings must be planned first.

Crew coverage uses aircraft-block assignment:

```text
Flight.aircraftId + Flight.scheduledDeparture
```

Find active `AircraftCrewAssignment` rows for that aircraft and time. Required
cockpit roles are currently `CPT` and `FO`.

Coverage APIs accept either a legacy `Flight.id` or a `FlightLeg.id`:

- `/api/flights/[id]/coverage`
- `/api/flights/[id]/crew`

When a FlightLeg ID is provided, the resolver follows `FlightLeg.legacyFlight`
and returns the existing response shape keyed to the legacy Flight ID.

Authority/control data exists now:

- `Operator`
- `OperatingAuthority`
- `AuthorityRevision`
- `Manual`
- `ManualRevision`
- `OperationalControlRecord`
- `FlightRelease`

`OperationalControlRecord.flightLegId` is nullable and additive. It preserves
the existing `flightId` link for current UI/API behavior.

## Local Development

Use the local Docker setup for day-to-day checks:

```powershell
npm run db:local:up
npm run db:local:migrate
npm run db:local:seed
npm run dev:local
```

Local app:

```text
http://127.0.0.1:3200
```

Local Postgres:

```text
127.0.0.1:5434
```

Important: `npm run build` should be run after stopping the local dev server if
the server is holding `.next` files.

## Render Deployment

Render deploys from `origin main`.

Current Render commands:

```text
Build: npm install && npm run render-build
Start: npm run start
```

`render-build` runs migrations, generates Prisma, runs the gated authority,
FlightLeg, and release-evidence backfill scripts, then builds Next.js. Backfill
scripts skip by default unless their explicit environment flags are set.

Do not run broad seed scripts against Render unless explicitly approved.

## Validation Standard

Before committing a slice, run:

```powershell
npm run typecheck
npm run lint
npm run build
```

For local route checks, start the app with:

```powershell
npm run dev:local
```

Then verify the changed routes and `/api/health`.

## Recommended Next Step

Preferred next slice:

```text
Prompt 100: Next Import Workflow Planning
```

Scope:

- Decide whether to continue with staging-row creation planning, import dry-run
  execution planning, or pause import work and return to operational workflows.
- Keep it planning/docs-only.
- Do not add parser code, importer execution, file uploads, staging-row writes,
  dry-run execution, review/apply workflow, or operational writes.
- Do not add importer execution, file uploads, operational writes,
  auth/signatures, destructive cleanup, or provider integrations.

Deferred follow-up to keep on the roadmap:

```text
Legacy record import planning
```

Scope:

- Plan import formats, staging/dry-run behavior, idempotency keys, source
  references, and target table mappings for old records.
- Start with aircraft maintenance history only after the current
  airworthiness workflows stabilize.
- Do not build import execution until source data shape is known.
