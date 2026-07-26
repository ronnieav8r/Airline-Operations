# AeroOps Current Handoff

Last updated: 2026-07-26

## Handoff Snapshot

- Canonical repo: `E:\Codex\Airline Operations\Airline Operations`
- Canonical branch: `codex/aeroops-integration`
- Accepted product HEAD: `9f540a2` (`chore: accept fleet logbook workspace drawer`)
- Latest accepted slices: `MX-002R`, `MX-003`, and `MX-004`
- Pipeline state: no next feature slice is approved or dispatched
- Remote state: local commits only; nothing from this pipeline was pushed,
  deployed, or opened as a pull request
- Agent state: all MX-003/MX-004 coder and integration-lead tasks are complete
- Worktree note: the rejected MX-002 work-package implementation remains
  isolated at `E:\Codex\Airline Operations\.worktrees\aeroops-mx-002` on
  `codex/slice-002-contextual-maintenance-work-packages`; do not merge
  `03242f9`

The local app is available at `http://127.0.0.1:3200`. On this handoff date,
the entire `/crew/scheduling` subtree began returning 404 because the running
Turbopack development cache was corrupt even though the route sources and
production manifest were intact. The installed `@prisma/client` package
directory was also incomplete. The generated caches were moved to
`%TEMP%\codex-aeroops-runtime`, the declared Prisma client was restored and
regenerated, and the app was restarted with the Next.js webpack development
fallback. Scheduling, Schedule Periods, and Maintenance then returned 200 and
Scheduling was rendered successfully in Chrome. No application source change
was required. See `docs/LOCAL_DEVELOPMENT.md` for the recovery command.

## MX-004 Fleet logbook workspace drawer

MX-004 is accepted locally on `codex/aeroops-integration`. The original coder
checkpoint `05d973e373d80750a7daef2058644ed13c9479c5` was accepted only with
coder repair `2a84d3b7` and lead focus-containment repair `2f7c33f2`. Their
canonical checkpoints are `65290dc`, `2afad43`, and `95e9bc3`.

Maintenance Control now stays in `/maintenance?view=logbook` while reviewing
and working across aircraft logbooks. The MX-003 aircraft summary remains a
native expand/collapse control. Its expanded group adds `View full logbook`,
and every child `Review` opens the same URL-addressable wide drawer with that
entry selected.

The drawer has independent tail-level search, status, entry-type, and date
filters. It loads the newest 50 by default, retains newer rows while `Load
older` grows the bounded batch, and uses a stable seek cursor to continue
through older batches after the retained-batch cap. It reports exact visible,
filtered, and tail totals and resolves a selected entry separately when it is
outside the visible batch. Timeline rows use a minimal bounded select, while
every selected entry uses a separate full-detail query even when the entry is
also visible in the timeline. Serviceability input relations are limited to
current evaluator-relevant records: active deferrals; open, deferred, or
corrected-pending-RTS discrepancies; active Maintenance Control holds;
in-progress or completed-pending-RTS events; required overdue compliance; and
the active configuration.

Desktop uses a timeline/detail split at approximately 80vw with a `max-w-6xl`
cap. Narrow screens use the full width and show selected detail with `Back to
<tail> logbook`; no nested drawer is introduced. The header includes tail,
type, computed serviceability, and an aircraft switcher. The shell is a named
modal dialog: focus enters on open, Tab and Shift+Tab remain inside, Escape
returns to the close URL, background content is inert and hidden from assistive
technology, and background page scrolling is locked. Focus restoration is
best-effort to the prior element when it remains mounted after URL navigation.
The native aircraft summary is truly uncontrolled and no URL state is bound to
its `open` attribute.

Authorized actions reuse the existing aircraft-logbook services and rules:

- `MAINTENANCE` can create corrective-action drafts from eligible write-ups,
  sign within existing authority/independent-inspector rules, and upload to
  unlocked entries.
- `ADMIN` can upload to unlocked entries but cannot sign or create corrective
  action.
- action wrappers accept a validated same-app `returnTo` and return success or
  error state to the same drawer, entry, filters, cursor, and retained limit.

Queue and Scheduled Maintenance links that previously navigated to the direct
aircraft logbook now open this Maintenance drawer. The direct
`/aircraft/[aircraftId]/logbook` route remains for compatibility and deep
links; attachment and export endpoints remain aircraft-backed. No schema,
migration, lifecycle, serviceability, immutable-record, signature, attachment,
or audit rule changed.

Canonical validation passed the standard Next.js 16.2.7 Turbopack
`npm run build`, `npm run typecheck`, `npm run lint`,
`npm run smoke:maintenance-lifecycle`, `npm run smoke:aircraft-logbook`,
`npm run smoke:maintenance-logbook-drawer`, and `git diff --check` against
healthy local Docker PostgreSQL. Rendered desktop and 390px checks covered
summary-only toggle followed by drawer navigation without a product hydration
mismatch, independent filtering with selected-entry invalidation, named modal
semantics, focus entry/trap and retention across in-drawer navigation, Escape
close and opener restoration, split/detail behavior, mobile Back, Maintenance
URL retention, and zero horizontal overflow. The only hydration console entry
was the external Chrome `perkspotbx` body-class injection; it is not product
markup.

## MX-003 Aircraft-grouped maintenance views

MX-003 is accepted locally on `codex/aeroops-integration`. The coder checkpoint
is `27da5aa39f14b781c24b345d9237ec48a60f53dd`; its canonical cherry-pick is
`07d2b47`. The accepted integrated product is `fea89fd`, which preserves the
existing read-model child order and makes Logbook summary counts and unresolved
write-up labels operationally truthful.

This slice is UI-only: Scheduled Maintenance and the review-only top-level
Logbook group their already-filtered child rows by aircraft, with collapsible
accessible headers and retained filters, row links, and drawers. It does not
change maintenance lifecycle rules, authorization, schema, migrations, server
actions, or services. Static, standard production-build, focused smoke,
`git diff --check`, and rendered desktop/~390px gates passed.

## MX-002R Simplified Maintenance Lifecycle

MX-002R is accepted on `codex/aeroops-integration`. The coder checkpoint is
`f9778cf7f5a38dd3203d6ef5457e6df96a20944e`; the accepted integrated product,
including signature-concurrency hardening, is
`0271da181a1e753947dcb300d58ad81e589e1c12`.

The replacement slice removes the work-package product direction. Maintenance
now answers whether a tail is available, why it is down, what is due, what is
deferred, and what official logbook evidence exists.

- An official `OPEN` write-up blocks availability. A valid approved deferral
  restores availability with limitations.
- Corrective work starts from a write-up/logbook context. Maintenance approval
  requires an active authority profile. A designated required-inspection item
  also needs a different authorized inspector.
- Approval leaves the aircraft at `MX release required`. Maintenance Control
  then records a distinct acknowledgement; that transaction creates signed
  `ReturnToServiceRecord` evidence and clears only the linked blocker.
- Scheduled planning stores date, station, and a short note without creating a
  logbook entry or blocking. `Start maintenance` creates the draft entry and
  begins blocking.
- An audited `MaintenanceControlHold` removes a tail from service without a
  write-up. One active hold is allowed per aircraft. Direct release requires an
  explanation; conversion is atomic.
- Admin can configure/review but cannot sign, place/release holds, or release
  aircraft. Those actions require `MAINTENANCE`; signatures also require an
  active authority profile.

Commit `03242f9b3741cbc47ef5ef69837c60d91238dcf4` is rejected. Do not integrate
it. `MX-002R` starts from `8c923193ca30703271d66075f6ea80fd4c3bcdd7`.
Its additive shared-development migration was backed up and exactly reversed;
the accepted replacement migrations are current on both local databases and
Prisma reports no shared-schema difference.
The older work-package notes below are historical and superseded.

## 2026-07-26 Integration Baseline Stabilization

The accumulated integration-tree product work is accepted as `BASELINE-001` on
`codex/aeroops-integration`, from parent commit
`9e3522fa35baca3cc20db59cc31bea1f5d2a4713`. The coder checkpoint and accepted
integrated-product checkpoint are both
`522ffb3fe4fbaaae643d428b9aa51771dc4d2799`; the local lead gate is the
immediately following `chore: accept AeroOps integration baseline` commit.
`docs/PROJECT_PIPELINE.md` is the durable project-management tracker: every
future slice must have explicit scope, acceptance commands, blockers, and
checkpoint/integration records before another feature is dispatched. MX-002R,
MX-003, and MX-004 have since been accepted from that baseline.

## Current State

AeroOps is in frontend/UI polish after backend MVP completion. The backend
contract is stable enough for UI work, with remaining backend items treated as
post-MVP unless separately planned.

Local review auth note: in non-production environments where
`AEROOPS_ENABLE_TEST_AUTH=1`, pages that require an app user fall back to the
seeded local admin when there is no valid session cookie. This is for local UI
review only; production remains session-gated.

## 2026-07-02 Maintenance Handoff Notes (historical, superseded)

The work-package recommendations in this dated section are retained only as
history. MX-002R above controls current implementation and product direction.

The current maintenance workflow should be understood as four connected
surfaces, not four separate sources of truth:

- `Queue` is a computed aircraft-status control board. It groups each tail once
  and nests the reasons that drive the current status: open write-ups,
  deferrals, scheduled-maintenance compliance, AOG phase, RTS pending items, and
  linked work.
- `Scheduled Maintenance` is the due/compliance board. It is driven by reusable
  maintenance-program tasks, applicability, per-tail overrides, compliance
  state, and manual meter snapshots.
- `Program` is the task-library setup view. It manages recurring task
  definitions and applicability. It does not create work orders automatically.
- `Logbook` is a review-first aircraft-tail logbook browser. It is not the v1
  place to create, upload, sign, lock, or export records; those controls remain
  on the existing aircraft-tail logbook route.

The next maintenance workflow slice should add contextual work-package actions,
not a generic event creator. Recommended entry points:

- Queue drawer: open or create the work package for an AOG/open write-up item.
- Aircraft detail/drawer: create a new maintenance event when the work is not
  tied to a scheduled task.
- Aircraft logbook entry: create/link corrective work only from a specific
  write-up or draft that requires maintenance action.
- Scheduled Maintenance drawer: continue using the existing `Create work
  package` action for recurring task work.

When a work package is created, keep linking the same source records together:
`MaintenanceEvent` is the work-order/execution container, `AircraftLogbookEntry`
is the record/signoff path, `Discrepancy` is the serviceability-impacting
write-up, `Deferral` is the approved limitation path, and `ReturnToServiceRecord`
is the signoff that clears corrected work where required.

## 2026-07-01 Maintenance Program Tab And Work Packages

At that point `/maintenance` had three views:

- `Queue`
- `Scheduled Maintenance`
- `Program`

The `Program` view is the setup side of scheduled maintenance. It manages the
reusable `MaintenanceProgramTask` library, task recurrence, required-for-
serviceability flags, applicability, and tail overrides. It is intentionally
separate from `Scheduled Maintenance`, which remains the aircraft-by-aircraft
working board for what is due.

Current Program behavior:

- The Program page now opens directly to the task library. Task creation is a
  `Create task` action that opens a right-side drawer instead of occupying the
  top of the library page.
- The library is grouped by applicability: fleet-wide tasks, aircraft-type
  sections such as `CL 65`, multi-type tasks, and tasks with no active
  applicability.
- Compact task rows show category, interval, required/optional state,
  active/inactive state, applicability summary, and override count.
- Filters for category, aircraft type, tail, active/inactive,
  required/optional, and title/source text search.
- Program drawer supports task edit, activate/deactivate, add applicability,
  retire applicability, add tail override, and affected-aircraft preview.
- Applicability supports all aircraft, aircraft type, or individual tail.
- Tail overrides support include, exclude, and deactivate with required reason.
- Task records are not deleted in v1; deactivate/retire preserve history.

Scheduled Maintenance work creation was upgraded from `Create planned event` to
`Create work package`. Creating a work package now creates both:

- a linked `MaintenanceEvent`
- a linked draft `AircraftLogbookEntry`

Both records link to the aircraft, maintenance program task, and compliance
state. The draft logbook entry is the signoff path. When the linked scheduled-
program logbook entry is signed, the app marks the linked maintenance event
completed and advances the compliance state to current with the next due date
where the task has calendar recurrence. Hours/cycles recurrence still depends
on the existing baseline/meter workflow until deeper utilization tracking is
built.

## 2026-07-01 Scheduled Maintenance Program Foundation

Scheduled Maintenance is now a maintenance-program compliance view instead of
an event-only list.

Implemented foundation:

- `MaintenanceProgramTask` stores reusable inspection/AD/service bulletin/
  component/STC/service-check tasks, source references, required-for-service
  flags, warning thresholds, and calendar/hour/cycle recurrence intervals.
- `MaintenanceProgramApplicability` applies tasks to all aircraft, an aircraft
  type such as `CL_65`, or a specific tail.
- `MaintenanceProgramOverride` supports per-tail include, exclude, or
  deactivate decisions with reasons and effective windows.
- `MaintenanceComplianceState` stores each aircraft/task baseline, last
  completed values, next due values, manual next-due overrides, and current
  compliance state.
- `AircraftMeterSnapshot` stores manual tail-specific airframe hours/cycles;
  v1 does not derive utilization from flight activity.
- `MaintenanceEvent` remains the actual work-order/completion record and can
  link to a program task and compliance state. Program tasks do not
  auto-create maintenance events.

`/maintenance?view=scheduled` now expands task applicability into per-aircraft
compliance rows ordered by urgency. Rows show tail, type, task, category/source,
status, next due date/hours/cycles, latest meter, and linked planned/in-progress
maintenance event when one exists. Filters include aircraft type, tail, status,
and task category.

The scheduled-maintenance drawer supports v1 manual actions:

- set or update baseline and next due values
- enter a manual meter snapshot
- create a linked planned maintenance event
- mark a task not applicable for a tail through an exclude override

Required `Overdue` scheduled-maintenance compliance now feeds computed aircraft
serviceability and appears in the Maintenance queue as an `AOG` row. `Due` and
`Due soon` remain warnings. Non-required overdue tasks remain visible in
Scheduled Maintenance but do not block serviceability.

Demo data was added through `npm run seed:maintenance-program-demo`, including
all-aircraft tasks, CL-65 type-level tasks, one tail-specific task, one excluded
tail, overdue, due, due-soon, current, not-applicable, and needs-baseline
examples.

Latest validation for this pass:

- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local scheduled-maintenance read-model smoke

## 2026-07-01 Maintenance Queue Status Simplification

The `/maintenance` Queue view now uses aircraft serviceability status instead
of visible `Critical / High / Medium / Low` priority labels.

The Maintenance header no longer shows a large title/subtitle block. It keeps
the Queue/Scheduled Maintenance/Program view buttons and uses compact fleet
stats instead: percent in service, AOG count, deferred aircraft count, planned
maintenance work-package count, and in-service/total counts by aircraft type.
These stats are derived from the same queue grouping/serviceability model, not
the old coarse `Aircraft.status` AOG field.
The type stat is now a dropdown. When no aircraft type is selected, Maintenance
defaults to the largest fleet type; choosing `All types` explicitly shows the
whole fleet. The visible stats scope to the selected type while the dropdown
options retain in-service/total counts for every type.

The Queue is now grouped by aircraft tail instead of repeating the same tail as
separate top-level rows. Each aircraft group shows the worst current
serviceability status, aircraft type, total item count, AOG/MEL/CDL/NEF/
scheduled-maintenance counts, a short phase/status summary, and a compact
`Next scheduled MX` reference pulled from the scheduled-maintenance read model.
The individual maintenance items remain nested underneath the tail and still
open the existing review drawer.

Current visible queue statuses:

- `AOG`
- `Serviceable`
- `MEL`
- `CDL`
- `NEF`
- `Deferred`
- `Scheduled MX`

The top queue status controls are now `AOG`, `Serviceable`, `MEL`, `CDL`, and
`NEF`. They sort matching rows to the top instead of hiding the rest of the
stack, with `AOG` as the default focus. Tail and aircraft type remain dropdown
filters. The old priority filter, priority pill, and `All` status button were
removed from the visible UI.

AOG rows now show the current AOG phase when available. The first phase set is:

- `Needs assessment`
- `Troubleshooting`
- `Awaiting parts`
- `Repair in progress`
- `RTS pending`

The AOG phase, ETA/next-update time, and maintenance-control note are stored on
`Discrepancy`. Existing open write-ups infer `Needs assessment` until
maintenance updates them. Corrected-pending-RTS discrepancies infer
`RTS pending`; in-progress corrective maintenance infers
`Repair in progress`.

Maintenance/Admin users can update a discrepancy's AOG phase, ETA, and note
from the `/maintenance` queue drawer. The deeper parts workflow,
troubleshooting tree, and inspection/AD/component due tracking remain future
maintenance slices.

Latest validation for this pass:

- `npm run prisma:validate`
- `npm run db:local:migrate`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## 2026-07-01 Maintenance Cleanup Pass

The aircraft board and aircraft context page were cleaned up so they no longer
use current `AirworthinessRelease` records as the visible maintenance status
signal. Those surfaces now use computed aircraft serviceability for aircraft
status labels and summary text.

Cleanup performed:

- Removed the old `MX Current` / `MX Review` and `A/W current` /
  `A/W warnings` aircraft UI language.
- Removed the aircraft-board query data that only supported those current
  airworthiness-release status pills.
- Kept `AirworthinessRelease` model/actions/history because the current docs
  still retain it for historical or operator-specific Part 135/manual evidence.
- Changed dispatch package capture so airworthiness-release history is optional
  package evidence, not a required everyday release artifact.
- Removed the unused app-shell placeholder component.
- Removed stale local `.next-local-logs` generated artifacts.
- Cleaned local demo data markers that came from the old warning-only
  airworthiness-release demo path.

## 2026-06-30 Maintenance Serviceability And RTS Handoff

The maintenance model was restructured around computed aircraft serviceability
and Return to Service instead of treating a current `AirworthinessRelease` as
the everyday maintenance-release gate.

Current source of truth:

```text
docs/MAINTENANCE_SERVICEABILITY_RTS_LIFECYCLE.md
lib/aircraft-serviceability.ts
```

Current implemented lifecycle:

- New official discrepancies start `OPEN` and make the aircraft not
  serviceable until deferred or cleared through signed RTS.
- Approved deferrals use MEL, CDL, NEF, company-approved, or other-approved
  methods and move the discrepancy to `DEFERRED` while surfacing limitations.
- Completed corrective maintenance moves the linked discrepancy to
  `CORRECTED_PENDING_RTS`; it does not clear the write-up by itself.
- Signed `ReturnToServiceRecord` clears the discrepancy.
- Erroneous write-ups use a maintenance-only void/cancel path with required
  reason and audit metadata.
- `AirworthinessRelease` remains historical/operator-specific evidence, not
  the default serviceability requirement.

Latest maintenance UI behavior:

- `/maintenance` no longer queues `No current airworthiness release` items.
- The queue now centers on open write-ups, RTS-required items, active or
  expired deferrals, AOG/out-of-service aircraft, planned/in-progress
  maintenance, and ready-for-signature records.
- `/aircraft/[aircraftId]/airworthiness` no longer treats direct discrepancy
  clearing as the normal path. Use defer, corrective action, prepare/sign RTS,
  or void erroneous write-up.
- Crew squawks from `/crew/me` create official `OPEN` discrepancies for
  assigned aircraft only; crew sees serviceability and limitations, not
  maintenance signoff controls.
- Flight release readiness now reads computed maintenance serviceability
  instead of requiring a current aircraft airworthiness release.

Latest validation for this maintenance lifecycle pass:

- `npm run prisma:validate`
- `npm run db:local:migrate`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Browser checks for `/maintenance` and aircraft airworthiness/logbook detail.

## 2026-06-30 Aircraft, Crew, Scheduling, And Maintenance Handoff

Current review targets:

```text
http://localhost:3200/aircraft
http://localhost:3200/aircraft?view=crew-coverage
http://localhost:3200/maintenance
http://localhost:3200/crew/me
http://localhost:3200/crew
http://localhost:3200/crew/scheduling
```

Latest visible aircraft state:

- `/aircraft` is now a compact fleet-status page instead of large aircraft
  cards. The summary counts are consolidated into one row and the aircraft list
  uses compact, clickable rows.
- The aircraft list is intentionally maintenance/status focused. The separate
  maintenance-pill column, crew coverage status, detail buttons, grid lines, and
  extra action columns were removed from the fleet list.
- Each aircraft row opens the aircraft quick-review drawer. The drawer is the
  place to drill into aircraft details rather than exposing multiple buttons in
  the fleet list.
- Alternating aircraft row shading is used for row separation without heavy grid
  lines.
- The current/next leg area in the aircraft drawer is now an expandable compact
  row. Expanded state shows the next seven days of schedule in a capped,
  scrollable list.
- The drawer no longer shows the crew coverage bridge. Aircraft drawer content
  should remain aircraft and maintenance oriented.
- The aircraft crew coverage tab has started its cleanup pass. Previous/Today/
  Next controls were moved out of the top mode button row and into the planner
  header, but the page still needs additional UI tuning.

Latest visible crew/member state:

- `/crew/me` remains the crew-member phone/iPad portal, separate from the ops
  crew management page.
- Recent crew-portal work moved the Today/home tab toward crew-specific flight
  cards, flight crew contact details, passenger access from flight cards,
  passenger ID photo capture, and passenger check-in/boarding controls.
- The crew portal still needs continued polish around the flight detail flow,
  schedule/request/profile surfaces, and mobile spacing.
- `/crew` remains the ops/admin crew workspace, not the crew member's personal
  portal.

Scheduling state:

- `/crew/scheduling` remains the primary scheduling/planning workbench.
- Scheduling still needs continued hardening and UI cleanup. Keep schedule
  planning separate from aircraft assignment truth unless a later slice
  explicitly changes that boundary.

Maintenance/logbook direction:

- `/maintenance` is now the top-level Maintenance module in the main app
  navigation for `ADMIN` and `MAINTENANCE` users. It is intentionally not a
  top-level `Logbook` tab.
- Maintenance serviceability is computed from discrepancies, deferrals,
  maintenance events, Return to Service records, and later inspection due
  tracking. It is not based on a routine current-airworthiness-release
  requirement.
- V1 is triage plus drilldown: Queue opens first, Scheduled Maintenance handles
  due/work-board review, Program manages reusable scheduled-maintenance tasks,
  and Logbook provides a review-first aircraft-tail logbook workbench. Clicking
  queue, scheduled-maintenance, program, or logbook rows opens a compact drawer
  with links to the aircraft, airworthiness, logbook, and export routes.
  Scheduled Maintenance replaces the older generic Tails tab and is now driven
  by reusable maintenance-program tasks, applicability, overrides, compliance
  states, manual meter snapshots, and linked maintenance events.
- The Maintenance Logbook tab is review-only in V1. Corrective-action forms,
  attachment upload, signing, locking, and export still live on the existing
  aircraft-tail logbook routes.
- Planned/upcoming maintenance uses the maintenance-program compliance layer
  for due tracking. `MaintenanceEvent` remains the work-order/completion record
  and is created manually when maintenance chooses to schedule actual work.
  Deeper parts workflow, troubleshooting workflow, AD/component detail,
  life-limited parts, and overhaul tracking remain later slices.
- Keep aircraft-tail logbooks available from aircraft detail and maintenance
  workflows, but make `Maintenance` the task-first workbench for maintenance
  users.
- Keep `/aircraft` as the fleet/aircraft status drilldown surface. It can link
  into maintenance/logbook detail, but it should not become the full
  maintenance workbench.
- Keep the crew portal limited to crew-facing maintenance status, limitations,
  and squawk/report entry. Crew should not sign maintenance records.

Recommended next slices:

1. Add contextual maintenance work-package creation/open actions from Queue,
   aircraft detail, and aircraft-tail logbook entry drawers while keeping the
   top-level Logbook tab review-first.
2. Finish aircraft crew coverage tab polish after the date controls move.
3. Continue crew portal polish around today's flights, passenger flow, flight
   detail, and profile/request surfaces.
4. Continue scheduling board hardening and layout cleanup.
5. Continue Maintenance in small slices: polish `/maintenance`, then add deeper
   parts, troubleshooting, and scheduled-maintenance due-tracking workflows.

## 2026-06-22 Crew Member Mobile App Handoff

The active crew self-service surface is now:

```text
http://localhost:3200/crew/me
```

Completed in the latest crew-app pass:

- Added `/crew/me` as the crew-member self-service app for `CREW` users linked
  through `CrewMember.userId`.
- Added tabs for `Today`, `Schedule`, `Flights`, `Requests`, and `Profile`.
- Added crew-scoped request submission actions for `TimeOffRequest` with
  `PENDING` status and `CrewScheduleRequest` with `SUBMITTED` status.
- Added `/crew/me/flights/[flightLegId]` as the assigned-flight detail route.
  It exposes crew-safe Preflight and Postflight forms and reuses the existing
  operational readiness semantics.
- Added a crew-only shell mode. `CREW` users see `Crew App`, the shell labels
  the workspace as `Crew Workspace`, and the shell logo returns to `/crew/me`.
- Redirected `CREW` users from `/` to `/crew/me` so crew users do not land on
  the ops dashboard.
- Removed the dashboard `AI Review Notes` / `Future placeholder` panel and
  replaced it with a real `Active alerts` panel.
- Reworked the `/crew/me` Today tab around `Action needed` instead of generic
  dashboard-style metrics.
- Cleaned `/crew/me` request swap labels so aircraft-derived demo names such
  as `920AOCaptain` and `930AOFirstofficer` do not display as crew last names.

Important implementation files:

- `app/crew/me/page.tsx`
- `app/crew/me/actions.ts`
- `app/crew/me/flights/[flightLegId]/page.tsx`
- `app/crew/me/flights/[flightLegId]/actions.ts`
- `lib/crew-me-queries.ts`
- `app/page.tsx`
- `components/app-shell/app-shell.tsx`

Validation captured for this pass:

- `npm run typecheck`
- `npm run lint`
- Local HTTP check confirmed a linked `CREW` session hitting `/` receives a
  `307` redirect to `/crew/me`.
- Local HTTP check confirmed `/crew/me` renders `Crew Workspace`, `Crew App`,
  and the `Action needed` section without the operations-console shell label.
- Local HTTP check confirmed `/crew/me?tab=requests` no longer exposes the
  aircraft-derived demo name labels.
- Local HTTP check confirmed `/` no longer renders the AI/future placeholder
  and renders the `Active alerts` panel instead.

Crew-app guardrails for the next builder:

- Keep `/crew/me` separate from ops/admin crew management. Do not expose
  another crew member's data by URL or request form.
- `CREW` users must not approve requests, publish schedules, assign aircraft,
  edit compliance records, or access ops/admin scheduling tools from the crew
  app.
- Keep `/crew`, `/crew/scheduling`, `/operations-control`, and aircraft
  assignment drawers as ops tools.
- The old `/crew/portal` remains in place for now. Do not route new work there
  unless the user explicitly asks; a later slice can redirect it to `/crew/me`
  after acceptance.
- Preserve the crew app's mobile-first card/tab pattern. Avoid desktop tables
  and avoid internal workflow explanations on crew screens.
- Keep dashboard AI/provider-call placeholders out of the visible app until a
  specific provider-backed AI feature is deliberately planned.

Known caveats:

- The local linked smoke user is `crew@aeroops.local` / Jordan Miles. In the
  current local 42-day `/crew/me` window, Jordan has no assigned future flights,
  so the Flights tab can legitimately show an empty state until demo data is
  adjusted.
- The flight detail route is assignment-scoped. `PLANNED`/`ACTIVE` crew
  snapshots or overlapping aircraft-block coverage are accepted; `RELIEVED`
  historical snapshots are rejected.
- Preflight/Postflight forms are wired, but the next UX pass should make the
  flight detail feel more like a trip brief rather than a reduced ops page.

Recommended next crew-app slice:

1. Add or adjust demo data so the linked crew smoke user has at least one
   assigned future FlightLeg inside the 42-day window.
2. Expand `/crew/me/flights/[flightLegId]` into a true crew trip brief: route,
   times, tail, assigned crew, readiness, manifest status, fuel/W&B/release,
   preflight, postflight, and delay capture.
3. Simplify request forms further for phone use, especially schedule request
   type selection and period labeling.
4. Add phone-width and iPad-width browser QA after a normal crew login.

## 2026-06-21 Scheduling/UI Handoff Update

The active review target is the focused scheduling planning board:

```text
http://localhost:3200/crew/scheduling?date=2026-06-01&view=month&tab=planning&layer=schedule&aircraftType=all&role=all&base=all&sort=status&detail=names&focus=board
```

Current scheduling behavior to preserve:

- Scheduling is still planning/availability only. Publishing planning drafts
  must not create `AircraftCrewAssignment`, `CrewLegAssignment`, or FlightLeg
  staffing records.
- Current view choices are four-week, eight-week, month, week, and day. The
  13-week and 120-day options were removed from the active UI after the
  scrolling review.
- Four-week/eight-week/month windows move by explicit previous/today/next
  controls. Do not reintroduce auto-infinite horizontal scrolling without a
  separate UX plan.
- In planning names mode, published and draft lanes share one crew row.
  Published assigned bars use generic `Assigned`/`Asn` labels; aircraft tail
  numbers should not appear next to the crew member name in this board.
- `Scheduled` is treated as reserve by default unless an aircraft assignment is
  known. Reserve/scheduled visual treatment is green; assigned remains blue.
- The planning toolbar is not sticky. The schedule grid owns vertical and
  horizontal scrolling. The month/date header and crew/name rail are the sticky
  schedule elements.
- The top schedule toolbar, planning action toolbar, outer planning panel, and
  schedule grid should share the same computed board width so the focused board
  does not leave a large empty black area to the right.
- The current planning controls are labeled `Save draft`, `Select all`,
  `Clear selection`, `Remove selected`, `Publish selected`, and `Publish all`.
  Draft changes autosave shortly after edits; `Save draft` is the manual save
  affordance.

Recent validation captured for this scheduling pass:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- The focused planning URL above returned 200 locally and reflected the latest
  button labels and board-width changes.

Guardrails for the next builder:

- Before changing scheduling UI, restate the exact visible issue, the exact
  files expected to be touched, and the things that must not change.
- Keep scheduling fixes page-local unless the user explicitly approves broader
  shared behavior changes.
- Do not change view options, status semantics, colors, staffing data
  boundaries, schema, or other pages while fixing a layout-only scheduling
  issue.
- Browser-check the exact focused URL after layout changes. A typecheck alone
  is not enough for this page.

## Final Handoff Snapshot

This handoff closes the current scheduling/UI-planning pass:

- The planning-board pseudo-crew issue was traced to local
  `SCHED-WORKBENCH-*` smoke-test records. The smoke script now cleans up those
  artifacts before and after it runs, and the local database was cleaned.
- The current browser planning board was checked at the focused scheduling URL;
  it renders the planning surface and no longer contains `Workbench` crew text.
- The app-wide UI direction now lives in
  `docs/AEROOPS_UI_WORKFLOW_MACRO_PLAN.md`.
- The page-by-page UI blueprint now lives in
  `docs/AEROOPS_UI_PAGE_DESIGN_DRILLDOWN.md`.
- Next implementation should not start with another broad planning pass unless
  the user asks for revisions. The recommended first builder slice remains
  Scheduling Hardening, followed by Aircraft Create Drawer, Customers Workspace,
  and Operations Control Board polish.

Latest completed work:

- Crew workflows are now moving drawer-first. `/crew` has a compact roster,
  drawer-based add/edit/detail surfaces, and a time-off review drawer with
  same-position coverage context.
- Time-off review now shows affected aircraft/seat position, available crew,
  pending and approved overlapping time off, occupied crew, and whether the
  count is schedule-backed or unscheduled planning context.
- `/crew/scheduling` is being reworked into the default Crew Schedule Board.
  The first screen is now the coverage/schedule visualization rather than a
  multi-tab admin workbench. Four-week, eight-week, month, week, and day views
  remain URL-driven.
- The default Scheduling nav and reset target now use `view=four-week`. Four
  week view shows the full current week row plus the next three weeks, with
  past days faded and the active day outlined.
- Month view still renders full Sunday-through-Saturday calendar weeks,
  including adjacent-month days. Each week has a highlighted Week view action,
  and each day drills to the day view.
- Calendar summary mode uses count pills by position. Calendar names mode is
  an experimental all-position timeline: positions are grouped as horizontal
  personnel timelines with crew names on the left and status bars across days.
- Single-position drilldown now switches from bucket counts to a
  person-by-person schedule timeline. Continuous blocks span adjacent days,
  `Assigned` blocks show known tail numbers such as `Assigned N215AO`, and
  the old `Available` label is shown as `Unscheduled`.
- Planning now has a draft-canvas implementation for names-first editing. It
  shows published and draft lanes in the same crew row, creates draft blocks,
  supports Quick Blocks and Reusable Templates, saves/autosaves drafts, cancels
  selected draft changes, and publishes selected/all draft changes into the
  live schedule availability layer.
- Reusable Templates are backed by rotation patterns and per-day pattern rows.
  A 7 on / 7 off template is treated as a 14-day rotation with segmented
  scheduled/off visual bars, cycle-count placement, and resize behavior that
  repeats the pattern. Quick Blocks cover one-off single-status ranges.
- Crew scheduling now has a compact board toolbar and focus mode. The large
  page header and always-visible filter rows were removed; schedule/planning,
  horizon/detail selectors, filters, and focus controls now live in the board
  toolbar.
- Scheduling still must not create aircraft crew assignments or FlightLeg
  assignments from planning. Publishing draft schedule changes materializes
  availability/schedule rows only.
- Crew eligibility now resolves as of the flight scheduled departure. Pending
  planned compliance events show planning intent, but only eligible/warning
  crew count as clean coverage.
- Flight workflow is split into Ops Release, Preflight, and Postflight.
  Dispatcher and manifest modes are operator settings; flight locating is only
  required when no FAA flight plan is filed.
- Customer and passenger records are now reusable data. `Customer` and
  `Passenger` stay separate, linked through `CustomerPassenger`; `ManifestItem`
  is the flight-specific manifest source of truth.
- `/customers` is available for customer/passenger search, create, edit, and
  linking. FlightLeg creation uses customer selection instead of free-text
  customer creation.
- Manifest workflows now prioritize adding reusable passengers, suggest
  customer-linked passengers first, and can create/link a passenger from the
  manifest flow.
- Dashboard FlightLeg drawer includes a manifest action panel so passengers can
  be added from the object-action workspace.
- `/aircraft` was simplified from a dense metric board into six clickable fleet
  status filters: Aircraft, Available, In flight, AOG, Open MELs, and Open
  write-ups. AOG currently maps to aircraft `OUT_OF_SERVICE`.
- `docs/AEROOPS_UI_WORKFLOW_MACRO_PLAN.md` now captures the app-wide UI
  direction from the scheduling work: board first, focused drawers/actions
  second, compact toolbars, context menus where inline controls crowd the
  screen, and module-specific plans for dashboard, operations, scheduling,
  crew, aircraft, customers/passengers, manifest, and logistics.
- `docs/AEROOPS_UI_PAGE_DESIGN_DRILLDOWN.md` is the page-level companion plan
  with recommended layouts, drawer content, row/card content, interaction
  boundaries, risks, and next-slice sequencing for the major app surfaces.

## Current UI Direction

The dashboard drawer should become an object-action workspace:

- The header carries lifecycle and release state.
- Summary cards should show useful at-a-glance details, not duplicate generic
  status labels.
- Clicking a summary card should open the most actionable workflow currently
  available.
- Full drawer edit workflows are a future goal, but current routes remain the
  fallback until each drawer workflow is deliberately migrated.
- Avoid routing drawer cards to broad pages when the user is trying to fix one
  specific issue. The drawer should show the focused fix surface when practical.
- Aircraft should stay a fleet inventory/status board. Detailed maintenance
  workflows need their own focused surface instead of adding more top-level
  aircraft counters.
- Crew and scheduling should continue the same task-first pattern: compact
  list or board first, then focused drawers for review, edit, coverage,
  location, logistics, and assignment handoff tasks.
- Scheduling is the current reference pattern for large operational surfaces:
  compact toolbar, focused controls, sticky object labels, context-menu actions,
  rolling work window, and compact counters beside the row identity.
- Scheduling has two layers: schedule coverage planning first, then assignment
  coverage overlay. `AircraftCrewAssignment` remains the staffing truth.
- The active scheduling UI direction is: four-week/month/week/day calendar
  coverage first; then position drilldown by personnel; then planning/editing.
  Planning should feel like a draft/development layer where published schedule
  data remains visible until selected draft changes are explicitly published.

## Active Local Scheduling Slice

The current uncommitted working tree contains the scheduling visualization and
planning draft canvas work discussed with the user:

- `components/app-shell/app-shell.tsx`: Scheduling nav points to
  `/crew/scheduling?view=four-week&tab=coverage`, the Crew nav item no longer
  stays active on scheduling pages, and the shell header has an
  `app-shell-header` class so board focus mode can hide it from the scheduling
  page.
- `app/crew/scheduling/page.tsx`: default view is four-week; the page title is
  removed from the visible UI; Schedule Board and Planning remain URL-driven;
  4-week, 8-week, month, week, and day views are available; summary and names
  modes are URL-driven; summary mode uses day cards and count pills; names mode
  uses grouped all-position personnel timelines; single-position drilldown
  keeps the compact personnel timeline; past days use muted treatment; active
  days have a low-contrast graphite marker; gap badges use fuchsia with a
  subtle pulse; assigned count pills match the blue assigned timeline
  treatment. The compact `BoardToolbar` contains schedule/planning, horizon,
  detail, filters, and focus controls. `focus=board` hides app chrome, tightens
  page padding, and shares the computed board width with the outer planning
  panel and planning action toolbar.
- `app/crew/scheduling/planning-draft-canvas.tsx`: client canvas for Planning
  names mode. It renders published bars on the top lane and draft bars on the
  bottom lane inside the same crew row, includes draft checkboxes, Select all,
  Clear selection, Save draft, Remove selected, Publish selected, Publish all,
  active tool selection, Quick Blocks, Reusable Templates, cycle-count
  placement, segmented template rendering, right-edge resize/extend handles,
  monthly published/draft scheduled-day counters, draft status changes, remove
  markers, and a first move/swap prompt. The month/date header and crew rail
  are sticky inside the schedule scroll container; the planning toolbar is not
  sticky and should scroll away.
- `app/crew/scheduling/planning-actions.ts`: new server actions for draft
  autosave/manual save, draft-change upsert, selection toggles, cancel selected,
  publish selected/all, and reusable template persistence. Actor fields are
  nullable for the local prototype, so template creation, placement, resize,
  save, and publish marking do not redirect to sign-in. Publishing writes crew
  schedule availability rows and schedule entries; it does not write aircraft
  crew assignments.
- `app/globals.css`: added scheduling-specific surface, hover, selected,
  past-day, planning-draft, planning-canvas, sticky rail, and gap-pulse styles
  for light/dark view.
- `lib/crew-scheduling-workbench-queries.ts`: supports four-week and 8-week
  horizons plus month/week/day; month query windows cover full visible calendar
  weeks and can be clamped to today for scheduling planning views; `focusedCrew`
  supplies all qualified crew for the selected aircraft type/role position;
  planning queries return active draft data, rotation-pattern templates with
  per-day statuses, and monthly scheduled-day counters.
- `prisma/schema.prisma` and
  `prisma/migrations/20260615230000_crew_planning_draft_canvas/`: new
  `CrewPlanningDraft` and `CrewPlanningDraftChange` models plus draft/change
  status enums and relations to schedule periods, crew, users, stations, and
  source published schedule entries.
- `prisma/migrations/20260616120000_add_personal_duty_status/`: adds
  `DutyStatus.PERSONAL` for personal-day planning.
- `package.json`, `scripts/seed-scheduling-demo-pilots.ts`, and
  `scripts/smoke-reusable-templates.ts`: added a local guarded demo crew seed
  and focused reusable-template smoke. The reusable-template smoke cleans up
  its own `REUSABLE-TEMPLATE-SMOKE-*` artifacts before and after each run.
- `scripts/smoke-crew-scheduling-workbench.ts`: now cleans up its own
  `SCHED-WORKBENCH-*` crew, period, and flight smoke artifacts before and after
  the smoke so Workbench pseudo-crew do not remain visible on planning boards.

Local inspection URL:

```text
http://127.0.0.1:3200/crew/scheduling?view=four-week&tab=coverage
http://localhost:3200/crew/scheduling?date=2026-06-01&view=month&tab=planning&layer=schedule&aircraftType=all&role=all&base=all&sort=status&detail=names&focus=board
http://127.0.0.1:3200/crew/scheduling?date=2026-06-20&view=eight-week&tab=coverage&layer=schedule&aircraftType=all&role=all&base=all&sort=status&detail=names&focus=board
```

## Known Current Follow-Ups

- Focus-mode browser polish: verify the focused planning names URL manually
  after any layout change. The next likely issue is visual containment around
  the top toolbar, planning action toolbar, and outer board panel; keep fixes
  limited to those containers unless a broader change is explicitly approved.
- Reusable template management is still basic. Add edit/delete/search and a
  more deliberate pattern builder later; keep the current drawer as the local
  prototype surface.
- Start Docker/local Postgres before running DB-backed crew smoke or browser
  checks. Useful sequence: `npm run db:local:up`, `npm run db:local:migrate`,
  and `npm run db:local:seed` when the database needs refresh.
- Rerun crew scheduling checks with the local DB available:
  `npm run smoke:crew-scheduling-workbench`, `npm run smoke:reusable-templates`,
  then browser-check `/crew/scheduling?view=four-week`,
  `/crew/scheduling?view=month`, `/crew/scheduling?view=week`,
  `/crew/scheduling?view=day`, and focused coverage/planning names URLs.
- Harden the planning draft workflow after the UI cleanup: review conflict
  blocking, baseline/live-change review states, browser-confirmed selection
  persistence, publish result messaging, and whether cancelled local changes
  should disappear immediately without a reload.
- Continue the crew scheduling workbench into focused drawer workflows for
  schedule planning actions, request review, and assignment handoff. Do not add
  auto-assignment or duty/rest hard enforcement without a separate plan.
- Use `docs/AEROOPS_UI_WORKFLOW_MACRO_PLAN.md` before broad UI changes. It is
  the current macro plan for translating the scheduling board interaction model
  across dashboard, operations, aircraft, crew, customers/passengers, manifest,
  and logistics workflows. The doc also records UI variants, the current
  recommendation per module, a detailed slice backlog, and acceptance checks.
- Use `docs/AEROOPS_UI_PAGE_DESIGN_DRILLDOWN.md` when starting a page-specific
  UI slice. It translates the macro plan into concrete page layout, drawer,
  row/card, and QA guidance.
- Add aircraft fuel burn/range/endurance settings before showing calculated
  endurance or conservative range.
- Add an aircraft create drawer from `/aircraft`.
- Plan maintenance depth around AOG, open write-ups, MELs, CDL, and NEF/EFL
  terminology. MELs should be the primary deferred-discrepancy language for
  Part 91/135 jet workflows unless a later policy slice defines otherwise.
- Continue manifest depth: passenger status, onboard/no-show, ID verified,
  passport/identity document depth, no-fly/watchlist verification, and the
  external verification boundary.
- Plan dispatch/current-information depth.
- Plan MX depth: next service due, MEL restrictions, operational limitations,
  and how those warnings should appear in release review.
- Continue drawer-contained issue fixing, especially crew assignment from the
  FlightLeg drawer.
- Continue page-by-page UI polish after dashboard, flights, customers, and
  aircraft review.

## Validation Status

### BASELINE-001 acceptance — 2026-07-26

Lead acceptance passed:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`, both for the clean working tree and the full
  parent-to-coder-checkpoint diff
- `npm run smoke:reusable-templates`
- `npm run smoke:crew-scheduling-workbench`
- `npm run smoke:crew-compliance-evaluator`
- `npm run smoke:passenger-identity-documents`
- `npm run smoke:aircraft-logbook`

Docker Postgres was healthy at `127.0.0.1:5434`, and all 31 migrations were
applied. No reseed was required. Rendered acceptance passed for `/`,
`/maintenance`, `/crew/scheduling?view=four-week&tab=coverage`, and `/crew/me`;
the Crew app also passed at `390x844` without horizontal overflow. The
Chrome-only hydration message caused by the injected `perkspotbx` body class is
known extension behavior; no other console warnings or errors were present.

### Superseded scheduling validation history — 2026-06-17

The following records the earlier scheduling validation pass. Its flight-gap
failure is superseded by the green 2026-07-26 baseline smoke above.

That scheduling validation passed:

- `npm run typecheck`
- `npm run lint`
- `npm run prisma:validate`
- `npm run build`
- `npm run smoke:reusable-templates` with `.env.local` loaded

Browser checks covered the focused coverage and planning names URLs, compact
toolbar, filter popover staying inside the viewport, app chrome hiding in focus
mode, redundant schedule/planning status pill removal, Reusable Templates
drawer persistence after reload, 7 on / 7 off segmented placement, Quick Block
drag placement, resize/extend behavior, draft save without sign-in redirect,
and sticky crew/date behavior inside the planning board.

One build attempt failed when shell hiding was implemented with
`useSearchParams` inside the app shell. That was resolved by keeping the
app-shell change to a static class and applying page-scoped focus CSS from the
scheduling page.

Focused DB smoke status:

- `npm run smoke:crew-scheduling-workbench` initially refused to run because
  the shell had a non-local `DATABASE_URL`.
- Docker/local Postgres was started with `npm run db:local:up`.
- Local migrations were checked with `npm run db:local:migrate`; no pending
  migrations were reported.
- Rerunning the smoke with `.env.local` loaded reached the local DB but failed
  at that time on:
  `Workbench did not surface existing CPT/FO flight-derived gaps.`

Previous browser checks for the earlier scheduling visualization slice covered
four-week default, month/week/day switching, summary/names modes,
all-position names timeline, single-position timeline, Schedule Board vs
Planning tab, fuchsia pulsing gap badges, assigned blue summary pills,
active-day outline, past-day opacity, and hover affordances.

The local demo pilot seed was run successfully:

- `npm run seed:scheduling-demo-pilots`
- Result: 30 CL-65 captain demo pilots and 1,050 visible-calendar-week schedule
  rows for June 2026 local review.

Formal DB-backed crew scheduling smoke was not green in that historical run.
The 2026-07-26 baseline rerun passed the flight-gap assertion and supersedes
this older result.

Latest handoff/planning verification on 2026-06-17:

- `npm run typecheck` passed after the smoke cleanup code change.
- `npm run lint` passed after the smoke cleanup code change.
- `git diff --check` passed for the handoff/planning docs and smoke cleanup;
  output only included normal Windows line-ending warnings.
- Local database check reported `Remaining smoke crew rows: 0` for
  `SCHED-WORKBENCH-*`.
- In-app browser check on the planning URL reported the scheduling surface
  present and `hasWorkbenchText: false`.

Most recent aircraft-board slice passed:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Browser checks for `/aircraft`, `/aircraft?filter=aog`,
  `/aircraft?filter=open-mels`, and `/aircraft?filter=open-writeups`.

Recent manifest/customer work also added `npm run smoke:customer-passenger-manifest`
coverage. Keep DB-backed smoke checks narrow when continuing UI slices.

## Required Start Files For Next Builder

- `docs/README.md`
- `docs/CURRENT_HANDOFF.md`
- `docs/PROJECT_STATUS.md`
- `docs/BACKEND_MVP_STATE.md`
- `docs/FRONTEND_READINESS_PLAN.md`
- `docs/AEROOPS_UI_WORKFLOW_MACRO_PLAN.md`
- `docs/AEROOPS_UI_PAGE_DESIGN_DRILLDOWN.md`
- `docs/SCHEMA_DECISIONS.md`
- `docs/FUEL_LEDGER_RELEASE_READINESS.md`
