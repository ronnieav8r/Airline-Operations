# Frontend Readiness Plan

Last updated: 2026-06-30

## Status

AeroOps is ready to shift from backend-MVP scaffolding into frontend/UI work.

The backend smoke baseline passed in `docs/BACKEND_MVP_FINAL_SMOKE_QA.md`, and
the remaining backend gaps are classified in `docs/BACKEND_MVP_GAP_REVIEW.md`.
Frontend work should preserve the backend contracts in
`docs/BACKEND_MVP_STATE.md`.

## Backend Contracts To Preserve

- `FlightLeg` is the primary operational identity for new UI routes and links.
- Legacy `Flight` remains compatibility/archive and should not become the UI
  anchor for new work.
- Release behavior is warning-only.
- `FlightRelease` is the release decision/status record.
- `ReleasePackage` is the evidence package wrapper with preview/final capture.
- `AircraftCrewAssignment` is the operational aircraft staffing source of
  truth.
- Crew eligibility is evaluated as of the FlightLeg scheduled departure.
  Pending planned compliance events may explain scheduling intent, but they do
  not count as clean coverage.
- `CrewScheduleEntry` and `CrewSchedule` are schedule/availability records, not
  aircraft assignment automation.
- Crew compliance and duty/rest outputs are warnings/evidence, not legal
  enforcement.
- Crew Logistics is manual coordination only; no provider booking is available.
- Ops Release, Preflight, and Postflight are separate workflow phases. Fuel and
  weight-and-balance are Preflight-owned when dispatcher support is off.
- `Customer` and `Passenger` are reusable records. `CustomerPassenger` links
  them, and `ManifestItem` is the FlightLeg-specific passenger manifest.
- Role-gated workflows should remain protected by existing auth helpers.

## First UI Tracks

### Track 1: App Shell And Navigation Polish

Goal: make the app feel like one coherent operations console.

Suggested slices:

- Refine global navigation labels and active states.
- Add clearer module grouping for Operations, Aircraft, Crew, Scheduling,
  Maintenance, Logistics, and Admin/Diagnostics.
- Improve page headers and breadcrumb patterns.
- Add role-aware affordances without hiding core read visibility prematurely.

### Track 2: Dashboard Command Surface

Goal: make `/` the daily attention board.

Suggested slices:

- Improve visual hierarchy for today, attention, release state, evidence gaps,
  crew coverage, duty/rest warnings, logistics needs, and aircraft issues.
- Keep provider-backed AI features out of the visible dashboard unless they
  are separately planned and wired. The old inactive AI Review Notes placeholder
  has been removed.
- Add clearer direct links into FlightLeg evidence workflows.

### Track 3: Operations Control Workbench

Goal: make `/operations-control` the primary dispatch/ops workbench.

Suggested slices:

- Refine grouped board cards and filters.
- Clarify evidence readiness and release state language.
- Improve action density without hiding safety context.
- Keep the table available for detailed scanning.

### Track 4: FlightLeg Detail Information Architecture

Goal: turn the long evidence packet into a clearer command-center page.

Suggested slices:

- Improve summary cards and command center prominence.
- Make evidence sections easier to scan.
- Preserve visible release readiness, release actions, snapshots, package
  capture, and audit timeline.
- Consider collapsible sections only after QA confirms important evidence is
  not being hidden in normal workflows.

### Track 5: Aircraft And Crew Context

Goal: make aircraft and crew pages operational context pages, not just record
views.

Suggested slices:

- Keep the aircraft board focused on fleet and tail-number status. The current
  `/aircraft` direction is compact fleet counts, clickable aircraft rows, and a
  quick-review drawer rather than large aircraft cards or separate action
  columns.
- Add a drawer-based aircraft create workflow before adding more aircraft-board
  metrics.
- Keep the top-level `Maintenance` module as a maintenance-user workbench rather
  than a top-level `Logbook` tab. V1 is Queue plus Scheduled Maintenance with a
  compact review drawer and links into aircraft, airworthiness, logbook, and
  export routes.
  Logbook remains a deeper aircraft-tail workspace alongside later write-up,
  MEL/deferral, corrective action, release, template, attachment, export, and
  signer/authority workflows.
- Improve aircraft detail hierarchy for aircraft status, airworthiness,
  upcoming legs, maintenance state, and logistics. Crew coverage belongs in its
  own aircraft crew coverage tab or scheduling/assignment workflow, not in the
  aircraft quick-review drawer.
- Improve crew detail hierarchy for compliance, schedule, assignments, time
  off, and logistics. Crew self-service work should target `/crew/me`, not the
  older `/crew/portal`.
- Polish aircraft crew assignment and crew compliance admin workflows.

### Track 6: Crew Scheduling And Logistics UX

Goal: make planning workflows understandable before adding more backend depth.

Suggested slices:

- Continue the Crew Schedule Board visualization and planning workflow:
  four-week, 8-week, month, week, and day drilldowns; summary vs names display
  modes; all-position and single-position personnel timelines; status language;
  action affordance styling; and focus-mode ergonomics.
- Harden the Scheduling Planning tab now that the local draft prototype exists:
  Quick Blocks, Reusable Templates, segmented repeating rotations, draft/live
  visual distinction, drag/drop and resize behavior, conflict warnings, and
  publish semantics.
- Keep schedule visualization separate from aircraft assignment truth.
- Improve schedule period, pattern, request, and time-off admin surfaces.
- Continue `/crew/me` as the mobile-first crew self-service app: Today,
  Schedule, Flights, Requests, Profile, assigned-flight details, and crew-safe
  Preflight/Postflight.
- Improve logistics workbench and crew-scoped logistics forms.

## Frontend Design Direction

- Operational, dense, and readable rather than consumer-app sparse.
- Safety/release state should remain visible and not be buried in tabs.
- Use consistent command bars for workflows that create/update records.
- Use clear warning language for compliance, release, and duty/rest items.
- Avoid making warning-first checks look like legal signoff.
- Keep UI polish modular; do not introduce a broad design system until repeated
  patterns are visible.

## Suggested First Frontend Chain

Prompt 256 was inserted as ADS-B provider-neutral integration planning. Prompt
257 was inserted as documentation audit/navigation cleanup. Prompt 258
implemented the first compact dashboard foundation after user dashboard review.
Prompt 259 followed with release-readiness labels, MX visibility, hour-based
lookahead controls, and dashboard quick-review drawers. Prompt 260 reflowed the
dashboard body and added the first app-wide light/dark view toggle. Prompt 261
added the Flights page drilldown foundation. Prompts 265-269 were used for the
fuel ledger and release fuel readiness chain. Subsequent frontend/backend slices
split Ops Release, Preflight, and Postflight; added crew eligibility with
planned compliance events; added customer/passenger records and reusable
manifest workflow; added manifest access from the FlightLeg drawer; and
simplified the aircraft board into clickable fleet status filters.

- Prompt 258: Dashboard Compact Ops Foundation.
- Prompt 259: Dashboard Release Readiness Drawer Foundation.
- Prompt 260: Dashboard Layout And Theme Foundation.
- Prompt 261: Flights Page Drilldown Foundation.
- Fuel ledger chain: Prompts 265-269.
- Release workflow split: Ops Release, Preflight, Postflight, dispatcher
  setting, manifest mode, and flight-plan/locating basis.
- Customer/passenger/manifest chain: `/customers`, customer selector on
  FlightLeg create, reusable passengers, and passenger-first manifest workflow.
- Current drawer refinement: dashboard FlightLeg workspace summary cleanup plus
  manifest add-passenger access.
- Current aircraft refinement: `/aircraft` is being reviewed as a compact
  fleet-status page. It now favors one-row fleet counts, clickable aircraft
  rows, alternating row shading, and an aircraft quick-review drawer. The
  aircraft list should stay aircraft/status focused; maintenance depth belongs
  in drilldowns and the future Maintenance module.
- Current aircraft crew coverage refinement: `/aircraft?view=crew-coverage`
  still needs more polish. Previous/Today/Next controls have been moved into
  the Aircraft crew coverage planner header so they do not blend into the main
  mode buttons.
- Current crew scheduling refinement: `/crew/scheduling` defaults to the Crew
  Schedule Board in `4 week` view; four-week, 8-week, month, week, and day
  drilldowns are URL-driven; summary mode shows position count cards; names
  mode shows grouped all-position personnel timelines; selected positions
  render compact personnel timelines with continuous status bars and
  `Unscheduled` fallback status. The large page header and always-visible
  filter rows were replaced with a compact board toolbar and `focus=board`
  mode. Planning now has a local draft canvas with Quick Blocks, Reusable
  Templates, segmented 7 on / 7 off rotation placement, cycle-count placement,
  resize/extend behavior, monthly published/draft ON_DUTY counters, generic
  `Assigned` labels, and no sign-in redirect for local template/draft actions.
  The 2026-06-21 focus-mode hardening pass also records an important guardrail:
  layout repairs should preserve current view options, colors, data boundaries,
  and scheduling semantics unless the user explicitly approves broader changes.
- Current crew member app refinement: `/crew/me` is the active self-service
  target for linked `CREW` users. It redirects crew users from `/`, uses a
  crew-only shell, has Today/Schedule/Flights/Requests/Profile tabs, creates
  only the signed-in crew member's own requests, and exposes assigned-flight
  Preflight/Postflight forms at `/crew/me/flights/[flightLegId]`. Recent crew
  portal work added today's flight cards, crew contact access, passenger access,
  passenger ID photo capture, and passenger check-in/boarding controls.
- Current maintenance/logbook direction: `/maintenance` is now the top-level
  task-first workbench for `ADMIN` and `MAINTENANCE` users. It opens to an
  action queue, has a Scheduled Maintenance view for planned/in-progress
  maintenance events, and drills into existing aircraft-tail logbook/
  airworthiness routes. Keep `/aircraft` as the fleet/status drilldown.
- Current UI planning refinement: `docs/AEROOPS_UI_WORKFLOW_MACRO_PLAN.md`
  records the macro app-wide direction from the scheduling interaction model,
  and `docs/AEROOPS_UI_PAGE_DESIGN_DRILLDOWN.md` translates it into
  page-specific layout, drawer, row/card, and QA guidance.
- Handoff status: the macro/page drilldown planning pass is complete and linked
  from `docs/README.md`, `docs/CURRENT_HANDOFF.md`, and
  `docs/PROJECT_STATUS.md`. Continue with the recommended implementation order
  unless the user asks for another design-planning iteration.
- Next recommended crew slice: seed or select a linked crew user with assigned
  future FlightLegs inside the 42-day window, then expand
  `/crew/me/flights/[flightLegId]` into a true crew trip brief with route,
  times, tail, assigned crew, readiness, manifest, fuel/W&B/release,
  preflight, postflight, and delay capture.
- Next recommended scheduling slice: harden the current Scheduling Planning
  workflow, especially conflict blocking, baseline/live-change review states,
  publish messaging, cancelled-change behavior, reusable-template management,
  and horizontal panning ergonomics.
- Next recommended aircraft/maintenance slice: finish aircraft crew coverage
  polish, then polish the Maintenance queue/drawer/scheduled-maintenance
  experience before adding create/sign/admin workflows.

## Backend Work To Avoid During UI Polish

- New schema unless required by a specific approved UI workflow.
- Hard release blocking.
- Legal signatures.
- Provider integrations.
- File uploads.
- Import execution.
- Destructive legacy `Flight` removal.
- ADS-B integration.
- Duty/rest enforcement expansion.
- Automatic aircraft assignment generation from scheduling or logistics.
- Additional scheduling schema changes beyond the current draft/template
  prototype unless a specific workflow requires them.
- Hard scheduling enforcement or automatic coverage replacement from planning
  drafts.

## Release UI Configuration Follow-Up

Dashboard release-readiness now has the first operator-controlled split:
dispatcher support, manifest mode, and flight-plan/locating basis. Future
planning should continue refining operator-controlled display and readiness
preferences without turning warning-first checks into legal signoff.

## Acceptance For Frontend Handoff

- Builders can use `docs/BACKEND_MVP_STATE.md` as the backend contract source.
- Post-MVP backend gaps are clearly separated from UI work.
- The first frontend chain is planned in small slices.
- Backend smoke remains available for regression checks during UI polish.
