# Project Status

Last updated: 2026-06-10

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
106. FlightLeg detail information architecture planning.
107. FlightLeg detail information architecture foundation.
108. FlightLeg detail information architecture QA.
109. Operations Control workbench planning.
110. Operations Control workbench foundation.
111. Operations Control workbench QA.
112. Dashboard surfacing planning.
113. Dashboard surfacing foundation.
114. Dashboard surfacing QA.
115. Aircraft context navigation planning.
116. Aircraft context detail foundation.
117. Aircraft context detail QA.
118. Crew assignment workflow planning.
119. Aircraft crew assignment foundation.
120. Aircraft crew assignment QA.
121. Aircraft crew assignment runtime QA.
122. Crew Scheduling module planning.
123. Crew Scheduling read-only planner board.
124. Crew Scheduling planner QA.
125. Crew availability hints on aircraft assignment workflow.
126. Crew availability hints QA.
127. Crew Scheduling planner filters foundation.
128. Crew Scheduling planner filters QA.
129. Crew Scheduling planner grouping foundation.
130. Crew Scheduling planner grouping QA.
131. Crew planner cross-link polish.
132. Crew planner cross-link QA.
133. Crew member context page planning.
134. Crew member context page foundation.
135. Crew member context page QA.
136. Crew planner date/window controls planning.
137. Crew planner date/window controls foundation.
138. Crew planner date/window controls QA.
139. Crew scheduling system architecture planning.
140. Crew scheduling schema foundation planning.
141. Crew scheduling additive schema foundation.
142. Crew scheduling schema QA.
143. Schedule period read-only admin surface planning.
144. Schedule period read-only admin surface foundation.
145. Schedule period read-only admin surface QA.
146. Time-off request workflow planning.
147. Time-off request workflow foundation.
148. Time-off request workflow QA.
149. Time-off queue filters foundation.
150. Time-off queue filters QA.
151. Schedule period create/edit planning.
152. Schedule period create/edit foundation.
153. Schedule period create/edit QA.
154. Rotation pattern admin planning.
155. Rotation pattern admin foundation.
156. Rotation pattern admin QA.
157. Crew schedule entry planning.
158. Crew schedule entry foundation.
159. Crew schedule entry QA.
160. Crew schedule entry planner visibility foundation.
161. Crew schedule entry planner visibility QA.
162. Crew member schedule context foundation.
163. Crew member schedule context QA.
164. Major scaffolding macro plan.
165. Local auth planning.
166. Auth schema foundation.
167. Login/session foundation.
168. Role and attribution foundation.
169. Auth QA.
170. FlightLeg cutover planning.
171. FlightLeg read cutover foundation.
172. FlightLeg API cutover foundation.
173. FlightLeg cutover QA.
174. ReleasePackage planning.
175. ReleasePackage schema foundation.
176. ReleasePackage read-only preview.
177. ReleasePackage preview capture foundation.
178. ReleasePackage QA.

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

Crew Scheduling is planned as a crew availability and planning module, not as
the active coverage source. `CrewSchedule` and `TimeOffRequest` describe
availability context; `AircraftCrewAssignment` remains the operational staffing
record that flights inherit.

Crew Scheduling now has a read-only planner at `/crew/scheduling`. It surfaces
schedule blocks, time-off overlaps, duty/employment status, current
aircraft-block assignments, upcoming FlightLeg coverage, and warning-only
planning conflicts. It does not create assignments or replace
`AircraftCrewAssignment` as coverage truth.

The aircraft crew assignment workflow at `/aircraft/[aircraftId]/crew` now
shows warning-only crew availability hints near the create assignment form.
These hints use existing schedule, time-off, duty/employment,
active-assignment, and qualification context without changing save behavior.

The crew scheduling planner at `/crew/scheduling` now has URL-driven filters
for availability, duty status, assignment state, time-off overlap, base station,
and assigned aircraft. Filters are read-only and do not change coverage truth.

The crew scheduling planner also supports URL-driven grouping by availability,
base, assignment state, or duty status. Grouping is applied after filters and
does not change workflow behavior.

Crew and aircraft surfaces now include consistent shortcut links into the
read-only crew planner. Aircraft pages use aircraft-filtered planner URLs where
helpful, while aircraft crew assignment remains the explicit staffing workflow.

Crew planner cross-link QA is complete. The Prompt 122-127 chain is complete
and stopped as planned.

Crew member context page planning is complete. Prompt 129 should add a
read-only `/crew/[crewMemberId]` page and links from roster, planner, and
aircraft crew workflow surfaces without changing assignment, schedule, or
time-off behavior.

Crew member context page foundation is complete. The new detail route is
read-only and links back to roster, planner, aircraft context, aircraft crew
assignment, and Operations Control where applicable.

Crew member context page QA is complete. Local validation confirmed crew
detail rendering, cross-links from crew surfaces, and unchanged aircraft crew
workflow behavior.

Crew planner date/window controls planning is complete. Prompt 132 should add
URL-driven `date` and `days` controls to the read-only crew planner.

Crew planner date/window controls foundation is complete. `/crew/scheduling`
now supports URL-driven planning windows while preserving filters, grouping,
crew cards, and read-only behavior.

Crew planner date/window controls QA is complete. The Prompt 128-133 chain is
complete and stopped as planned.

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
Next planning session
```

Scope:

- Choose the next small app-development slice.
- Do not add schema, schedule writes, time-off writes, duty/rest enforcement,
  assignment automation, auth/signatures, hard release blocking, imports, or
  provider integrations.

Recent completed app-development chain:

```text
Prompt 101: FlightLeg Detail Information Architecture Planning
Prompt 102: FlightLeg Detail Information Architecture Foundation
Prompt 103: FlightLeg Detail Information Architecture QA
Prompt 104: Operations Control Workbench Planning
Prompt 105: Operations Control Workbench Foundation
Prompt 106: Operations Control Workbench QA
```

Scope:

- Improve the usability of existing FlightLeg/evidence workflows before adding
  more evidence or import features.
- Make FlightLeg detail easier to scan by grouping summary, readiness,
  release actions, evidence, audit history, and raw reference sections.
- Improve Operations Control list usability with clearer status/filter/action
  affordances.
- Keep release behavior warning-only.
- Do not add schema changes unless a later planning slice explicitly approves
  them.

Prompt 101 is complete. The selected FlightLeg detail information architecture
is a compact command-center plus section navigation. Prompt 102 should
implement this as a layout-only change, and Prompt 103 should validate it.

Prompt 102 is complete. FlightLeg detail now groups Release Evidence Actions
and Release Control into a top command center, adds visible section navigation,
and groups readiness, release history, aircraft/airworthiness, evidence
details, and raw reference data without changing release behavior.

Prompt 103 is complete. Local QA confirmed all five local FlightLeg detail
pages render the command-center layout markers, evidence workflow routes still
return 200, snapshot and aircraft airworthiness links still route correctly, and
release behavior remains warning-only. Results are recorded in
`docs/RELEASE_EVIDENCE_QA_LOG.md`.

Prompt 104 is complete. The selected Operations Control direction is a
filterable board plus the existing table. Prompt 105 should add grouped
FlightLeg cards with URL-driven grouping and filters, while preserving the
current table and warning-only release behavior.

Prompt 105 is complete. Operations Control now has a URL-driven workbench board
above the existing table, with grouping by release state, schedule window, or
aircraft and filters for release status, evidence state, operating part, and
aircraft. The existing Control Records table remains below the board.

Prompt 106 is complete. Local QA confirmed all workbench grouping modes,
URL-driven filters, card action links, retained Control Records table, main
route smoke, and browser rendering. Results are recorded in
`docs/RELEASE_EVIDENCE_QA_LOG.md`.

Prompt 107 is complete. The selected next app-development direction is
dashboard surfacing using Today + Attention. Prompt 108 should improve `/` with
release/evidence attention signals, direct FlightLeg workflow links, and a
non-functional AI Review Notes placeholder while preserving existing dashboard
sections and warning-only release behavior.

Prompt 108 is complete. The dashboard now has an Operations Attention panel,
Priority FlightLegs list, direct links into FlightLeg detail/evidence
workflows, release status on today's flight board, and a clearly labeled
non-functional AI Review Notes placeholder. Existing dashboard sections remain
visible and release behavior remains warning-only.

Prompt 109 is complete. Local QA confirmed the dashboard attention surface,
Priority FlightLegs, direct workflow links, AI Review Notes placeholder,
retained dashboard sections, main route smoke, and browser rendering. Results
are recorded in `docs/RELEASE_EVIDENCE_QA_LOG.md`.

Prompt 110 is complete. The selected aircraft context direction is Fleet +
Detail: keep `/aircraft` as the fleet board and add `/aircraft/[aircraftId]`
as a read-only aircraft operational context page. Prompt 111 should implement
the detail page and link to it from aircraft cards while preserving the existing
airworthiness workflow route.

Prompt 111 is complete. Aircraft cards now link to `/aircraft/[aircraftId]`,
which shows read-only aircraft identity, current/next assignment, upcoming
FlightLegs, crew coverage, airworthiness state, discrepancies, deferrals,
alerts, and Operations Control workflow links. The existing aircraft
airworthiness workflow remains under `/aircraft/[aircraftId]/airworthiness`.

Prompt 112 is complete. Local QA confirmed `/aircraft`, the new aircraft
context route, the existing airworthiness route, Operations Control workflow
links, route smoke, rendered page content, and unchanged warning-only release
behavior. Results are recorded in `docs/RELEASE_EVIDENCE_QA_LOG.md`.

Prompt 113 is complete. The selected first crew assignment write path is
aircraft-block staffing under `/aircraft/[aircraftId]/crew`. Prompt 114 should
create/edit/end `AircraftCrewAssignment` rows, resync affected future
`CrewLegAssignment` snapshots, and keep qualification and coverage issues
warning-only. Full Crew Scheduling, duty/rest, time-off/vacation, imports, and
leg-specific crew overrides remain deferred.

Prompt 114 is complete. `/aircraft/[aircraftId]/crew` now supports
aircraft-block crew assignment create, limited edit, and Relieve Now actions.
The workflow keeps qualification and coverage issues warning-only, resyncs
affected future `CrewLegAssignment` snapshots, and leaves full Crew Scheduling,
duty/rest, imports, auth/signatures, hard release blocking, and leg-specific
crew override behavior deferred.

Prompt 115 is complete as a code-validation QA pass. Prisma validation,
typecheck, lint, and production build passed. Local runtime workflow smoke was
blocked because Docker Desktop was not running, so the local PostgreSQL
database at `127.0.0.1:5434` was unavailable. The next focused follow-up should
rerun local aircraft crew workflow smoke once Docker is available.

Prompt 116 is complete. Docker Desktop was started, local Postgres was brought
up, migrations were current, local seed ran, and the aircraft-block crew
assignment workflow was validated locally. QA confirmed create, limited edit,
Relieve Now, warning-only qualification display, route rendering, and future
FlightLeg `CrewLegAssignment` snapshot resync.

Prompt 117 is complete. The broader Crew Scheduling module is planned as a
crew availability and planning system. It does not replace
`AircraftCrewAssignment` as the active coverage source. Future scheduling
surfaces should show availability, time off, duty/training/reserve context, and
warning-only conflicts, then link to aircraft-block assignment workflows for
actual staffing changes.

Prompt 118 is complete. `/crew/scheduling` now provides a read-only crew
availability planner with schedule, time-off, duty/employment,
aircraft-block assignment, upcoming coverage, and warning-only conflict
context. Actual staffing changes remain under `/aircraft/[aircraftId]/crew`.

Prompt 119 is complete. Local QA confirmed `/crew/scheduling` renders the
planner, planning boundary, crew availability section, and aircraft crew
workflow links. Route smoke, browser QA, validation, lint, and build passed.

Prompt 120 is complete. `/aircraft/[aircraftId]/crew` now shows warning-only
availability hints near the create assignment form and adds availability status
to crew selector labels. Hints use existing schedule, time-off,
duty/employment, active-assignment, and qualification context without changing
assignment save behavior.

Prompt 121 is complete. Local QA confirmed availability hints, full planner
link, crew selector status context, create assignment form, Relieve Now, and
Edit assignment controls render. Validation, lint, build, route smoke, and
browser checks passed.

Prompt 122 is complete. `/crew/scheduling` now has URL-driven filters for
availability, duty status, assignment state, time-off overlap, base station,
and assigned aircraft. The planner shows filtered counts, active filters, and a
resettable empty state without changing write behavior.

Prompt 123 is complete. Local QA confirmed default and filtered planner URLs,
filter controls, active-filter summary, reset link, route smoke, validation,
lint, and build.

Prompt 124 is complete. `/crew/scheduling` now supports URL-driven grouping by
availability, base, assignment state, or duty status. Grouping preserves active
filters, crew cards, summary cards, warning-only messaging, and aircraft crew
workflow links.

Prompt 125 is complete. Local QA confirmed all grouping modes, grouped filtered
URLs, empty group handling, route smoke, browser rendering, validation, lint,
and build.

Prompt 126 is complete. `/crew`, `/aircraft`, `/aircraft/[aircraftId]`, and
`/aircraft/[aircraftId]/crew` now include consistent navigation links into the
read-only crew planner. Aircraft-specific links use filtered planner URLs where
helpful.

Prompt 127 is complete. Local QA confirmed all new planner links render and
route correctly, aircraft-specific planner links use filtered URLs, aircraft
crew workflow links remain available, and Operations Control plus diagnostics
still load.

Prompt 128 is complete. The selected direction is a read-only crew member
context page at `/crew/[crewMemberId]` with links from the crew roster, crew
planner, and aircraft crew workflow surfaces.

Prompt 129 is complete. `/crew/[crewMemberId]` now provides a read-only crew
context page with availability warnings, qualifications, current
aircraft-block assignments, schedule blocks, time off, upcoming FlightLeg
coverage, and workflow navigation links.

Prompt 130 is complete. QA confirmed the crew detail route, cross-links from
crew roster, planner, and aircraft crew workflow surfaces, route smoke, and
unchanged workflow behavior.

Prompt 131 is complete. The selected crew planner window policy is
URL-driven `date=YYYY-MM-DD` and `days=1|3|7|14`, defaulting to today plus 7
days.

Prompt 132 is complete. `/crew/scheduling` now has planner window controls,
shortcut links, and query-driven schedule/time-off/coverage windows while
remaining read-only.

Prompt 133 is complete. QA confirmed default and query-param planner windows,
date/day shortcut links, filters, grouping, crew detail links, route smoke, and
unchanged read-only behavior.

Prompt 134 is complete. Crew Scheduling is now planned as a full internal
AeroOps scheduling module with flexible periods, crew bids/requests, rotation
patterns, and a `BID_OPEN -> DRAFTING -> PUBLISHED -> ARCHIVED` lifecycle.
Published schedules remain recommendation/availability context only;
`AircraftCrewAssignment` remains the operational coverage source.

Prompt 135 is complete. The selected schema direction is additive: keep the
existing `CrewSchedule` table for current planner reads and add future
schedule-building tables beside it for periods, requests, rotation patterns,
pattern days, and schedule entries.

Prompt 136 is complete. Additive crew scheduling schema tables now exist, local
seed creates demo scheduling foundation rows, and `/api/health` reports counts
for the new tables.

Prompt 137 is complete. Local QA confirmed the crew scheduling schema
foundation migration, seed data, health counts, validation, build, and existing
route availability.

Prompt 138 is complete. The selected read-only admin surface is
`/crew/scheduling/periods` for period list/summary and
`/crew/scheduling/periods/[periodId]` for period detail.

Prompt 139 is complete. The read-only schedule period admin list and detail
pages are implemented under `/crew/scheduling/periods`.

Prompt 140 is complete. Local QA confirmed the schedule period list/detail
routes, planner navigation, crew detail links, health counts, validation, build,
and unchanged read-only behavior. The Prompt 136-140 crew scheduling schema and
read-only admin surface chain is complete.

Prompt 141 is complete. The first time-off write workflow is planned as an
ops/admin `TimeOffRequest` workflow at `/crew/scheduling/time-off`, with create
plus approve/deny/cancel review actions, warning-only conflicts, and no schedule
or assignment side effects.

Prompt 142 is complete. `/crew/scheduling/time-off` now supports ops/admin
time-off request creation, approve/deny/cancel review actions, approved-request
cancellation, and warning-only conflict visibility without schema, schedule, or
assignment side effects.

Prompt 143 is complete. Local QA confirmed create, approve, deny, and cancel
workflows, `reviewedAt` updates, route smoke, and that only `TimeOffRequest`
rows changed.

Prompt 144 is complete. `/crew/scheduling/time-off` now supports URL-driven
filters for status, crew member, request type, and date window, with active
filter summary, reset link, and safe return to filtered views after actions.

Prompt 145 is complete. Local QA confirmed default and filtered time-off queue
routes, browser filter controls, filtered create/review/cancel return behavior,
validation, route smoke, and unchanged schedule/assignment side effects. The
Prompt 142-145 time-off workflow chain is complete.

Prompt 146 is complete. The next schedule-period write workflow is planned as
ops/admin create, edit, and archive for `CrewSchedulePeriod`, without schedule
publishing, schedule entry generation, pattern application, request review, or
assignment automation.

Prompt 147 is complete. `/crew/scheduling/periods` now has schedule-period
create controls, and `/crew/scheduling/periods/[periodId]` has edit/archive
controls. The workflow only mutates `CrewSchedulePeriod`.

Prompt 148 is partial. Static validation passed for the schedule-period
workflow, but local DB-backed workflow/browser QA is pending because Docker
Desktop was not running.

Prompt 149 is complete. Rotation pattern admin is planned as template
management using `CrewRotationPattern` and `CrewRotationPatternDay`, without
pattern application, schedule generation, publishing, request review, or
assignment automation.

Prompt 150 is complete. `/crew/scheduling/patterns` now supports rotation
pattern create/edit, active toggles, and day-row add/update/delete using the
existing pattern tables only.

Prompt 151 is partial. Static validation passed for the rotation-pattern admin
workflow, including route generation for `/crew/scheduling/patterns`, but local
DB-backed workflow/browser QA is pending because Docker Desktop was not running.

Prompt 152 is complete. The first `CrewScheduleEntry` workflow is planned as
manual draft-entry create/edit/cancel inside a schedule period. Schedule entries
remain planning records only and do not publish schedules, generate
`CrewSchedule` rows, apply rotation patterns, approve requests, or mutate
aircraft assignments.

Prompt 153 is complete. `/crew/scheduling/periods/[periodId]` now supports
manual draft `CrewScheduleEntry` create/edit/cancel with warning-only conflict
context. It does not publish schedules, generate `CrewSchedule` rows, apply
patterns, review requests, or mutate aircraft assignments.

Prompt 154 is partial. Static validation passed for the draft schedule-entry
workflow, but local DB-backed workflow/browser QA is pending because Docker
Desktop was not running.

Prompt 155 is complete. `/crew/scheduling` now shows draft/published
`CrewScheduleEntry` rows as read-only schedule-period planning context beside
existing `CrewSchedule` blocks. This does not change aircraft assignment or
coverage behavior.

Prompt 156 is partial. Static validation passed for schedule-entry planner
visibility, but local DB-backed route/browser QA is pending because Docker
Desktop was not running.

Prompt 157 is complete. `/crew/[crewMemberId]` now shows draft/published
`CrewScheduleEntry` rows as read-only individual crew schedule context. This
does not change aircraft assignment or coverage behavior.

Prompt 158 is partial. Static validation passed for crew-member schedule-entry
context, but local DB-backed route/browser QA is pending because Docker Desktop
was not running.

Prompt 159 is complete. The remaining major scaffolding is now organized in
`docs/MAJOR_SCAFFOLDING_MACRO_PLAN.md` as dependency-first chains for auth,
FlightLeg cutover, ReleasePackage, crew compliance, crew scheduling lifecycle,
crew self-service, and crew logistics.

Prompt 160 is complete. Local auth is planned in `docs/LOCAL_AUTH_PLAN.md`:
email/password credentials, HttpOnly DB-backed sessions, expanded operational
roles, mutation-first route/action protection, and user attribution through
existing nullable user fields.

Prompt 172 is complete. FlightLeg detail now has an explicit ReleasePackage
preview capture action that creates a package header and evidence links without
auto-capture, hard blocking, finalization, signatures, file uploads, or
FlightRelease status changes.

Prompt 173 is complete. Static validation passed for ReleasePackage schema,
preview, and explicit capture behavior. Local DB-backed workflow smoke remains
pending because Docker Desktop was unavailable.

Prompt 174 is complete. Crew compliance is now planned as an additive evidence
foundation beside the current shallow `CrewQualification` table, with separate
certificate, medical, training, check, recency, duty, and rest records feeding
warning-only surfaces first.

Prompt 175 is complete. The additive crew compliance schema foundation adds
separate compliance evidence tables, migration, DBML updates, and health counts
only. Static validation passed; local migration smoke remains pending because
Docker Desktop was unavailable. Seed/demo data, read surfaces, assignment
warnings, release-readiness warnings, and QA remain in later prompts.

Prompt 176 is complete. Demo seed/backfill support now creates representative
crew compliance evidence rows for future warning/read surfaces. Static
validation and the default gated backfill skip path passed; DB-backed seed and
backfill smoke remains pending because Docker Desktop was unavailable.

Prompt 177 is complete. Crew detail and crew scheduling planner read the new
compliance evidence tables and display warning-only summaries. Static
validation passed; runtime route/browser smoke remains pending because Docker
Desktop was unavailable. No assignment, release, duty/rest, or compliance write
behavior was added.

Prompt 178 should add richer warning-only compliance context to the aircraft
crew assignment workflow without blocking saves.

Prompt 178 is complete. The aircraft crew assignment workflow now shows
warning-only compliance evidence context, and assignment save behavior remains
unchanged. Static validation passed; workflow/browser smoke remains pending
because Docker Desktop was unavailable.

Prompt 179 should add crew compliance warnings to FlightLeg release readiness
as warning-only signals.

Prompt 179 is complete. FlightLeg release readiness now has a warning-only crew
compliance item based on crew snapshot assignments and compliance evidence.
Static validation passed; route/browser and snapshot smoke remain pending
because Docker Desktop was unavailable. Release actions remain available.

Prompt 180 should QA the crew compliance chain.

Prompt 180 is complete for static validation. Crew compliance QA documented the
schema, seed/backfill, read surfaces, aircraft assignment warnings, and release
readiness warnings. Prisma validation, typecheck, lint, and build passed.
DB-backed runtime QA remains pending because Docker Desktop was unavailable.

Prompt 181 should refresh docs/status for the completed crew compliance chain
and set the next macro step to crew scheduling lifecycle planning.

Prompt 181 is complete. Crew compliance docs/status now reflect the completed
foundation chain. Static validation for the chain passed in Prompt 180, and
DB-backed runtime QA remains pending because Docker Desktop was unavailable.

Prompt 182 is complete. Schedule publishing is planned as a planning/availability
finalization workflow: publish eligible `CrewScheduleEntry` rows, create or
update linked `CrewSchedule` bridge rows, and mark the period published without
mutating aircraft assignments or hard-enforcing duty/rest.

Prompt 183 is complete. `/crew/scheduling/periods/[periodId]` now has a
protected Publish Period action for admin/ops users. Publishing marks eligible
schedule entries and the period `PUBLISHED`, creates or updates linked
`CrewSchedule` bridge rows idempotently, and keeps aircraft assignments
unchanged. Static validation passed; DB-backed workflow/browser QA remains
pending because Docker Desktop was unavailable.

Prompt 184 is complete as a partial QA pass. Static validation passed for
schedule publishing. Runtime DB-backed checks for publish idempotency, bridge
row creation/update, planner visibility, crew detail visibility, and unchanged
aircraft assignment counts remain pending because Docker Desktop was
unavailable.

Prompt 185 is complete. Rotation pattern application is planned as a
preview-first, draft-only workflow on schedule period detail. Pattern
application should generate `DRAFT` `CrewScheduleEntry` rows only, and must not
publish entries, create `CrewSchedule` bridge rows, review requests, or mutate
aircraft assignments.

Prompt 186 is complete. Schedule period detail now has a read-only
pattern-application preview that calculates generated rows from active rotation
pattern days and shows warning-only conflicts. It does not write
`CrewScheduleEntry` rows, create `CrewSchedule` bridge rows, publish schedules,
or mutate aircraft assignments. Static validation passed; DB-backed
workflow/browser smoke remains pending because Docker Desktop was unavailable.

Prompt 187 is complete. The pattern preview panel now has an explicit
admin/ops generate-drafts action. It creates only `DRAFT` `CrewScheduleEntry`
rows, links them to the selected rotation pattern, skips exact duplicates, and
does not publish schedules, create `CrewSchedule` bridge rows, review requests,
or mutate aircraft assignments. Static validation passed; DB-backed
workflow/browser smoke remains pending because Docker Desktop was unavailable.

Prompt 188 is complete as a partial QA pass. Static validation passed for
pattern preview and draft generation. Runtime DB-backed checks for preview,
generation, duplicate skipping, planner visibility, no bridge rows before
publish, and unchanged aircraft assignment counts remain pending because Docker
Desktop was unavailable.

Prompt 189 is complete. The `CrewScheduleRequest` workflow is planned as
admin/ops approve/deny review of submitted period-scoped requests. Approved
requests are planning input only and must not automatically create schedule
entries, publish schedules, create `CrewSchedule` bridge rows, or mutate
aircraft assignments.

Preferred next step:

```text
Prompt 190: Admin request review foundation
```

Scope:

- Add approve/deny review controls for submitted `CrewScheduleRequest` rows.
- Record review status, notes, timestamp, and reviewer.
- Keep approval side effects to the request row only.

Deferred follow-up to keep on the roadmap:

```text
Legacy record import planning
```

Scope:

- Plan import formats, staging/dry-run behavior, idempotency keys, source
  references, and target table mappings for old records.
- Start with aircraft maintenance history only after current app workflows and
  operational screens are more stable.
- Do not build import execution until source data shape is known.
