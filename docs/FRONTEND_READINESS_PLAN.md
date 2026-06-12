# Frontend Readiness Plan

Last updated: 2026-06-11

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
- `CrewScheduleEntry` and `CrewSchedule` are schedule/availability records, not
  aircraft assignment automation.
- Crew compliance and duty/rest outputs are warnings/evidence, not legal
  enforcement.
- Crew Logistics is manual coordination only; no provider booking is available.
- Role-gated workflows should remain protected by existing auth helpers.

## First UI Tracks

### Track 1: App Shell And Navigation Polish

Goal: make the app feel like one coherent operations console.

Suggested slices:

- Refine global navigation labels and active states.
- Add clearer module grouping for Operations, Aircraft, Crew, Scheduling,
  Logistics, and Admin/Diagnostics.
- Improve page headers and breadcrumb patterns.
- Add role-aware affordances without hiding core read visibility prematurely.

### Track 2: Dashboard Command Surface

Goal: make `/` the daily attention board.

Suggested slices:

- Improve visual hierarchy for today, attention, release state, evidence gaps,
  crew coverage, duty/rest warnings, logistics needs, and aircraft issues.
- Preserve the AI Review Notes placeholder as inactive unless separately
  planned.
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

- Improve aircraft detail hierarchy for assignment, airworthiness, upcoming
  legs, crew coverage, and logistics.
- Improve crew detail hierarchy for compliance, schedule, assignments, time
  off, logistics, and portal-scoped context.
- Polish aircraft crew assignment and crew compliance admin workflows.

### Track 6: Crew Scheduling And Logistics UX

Goal: make planning workflows understandable before adding more backend depth.

Suggested slices:

- Improve crew scheduling planner filters/grouping/empty states.
- Improve schedule period, pattern, request, and time-off admin surfaces.
- Improve crew portal readability.
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
added the Flights page drilldown foundation. Prompt 262 restored Render demo
flight visibility and added shared compact drawer passes. Prompt 263 separated
dashboard lifecycle and release actions. Prompt 264 upgraded dashboard
FlightLeg drawers into the first object-action workspace pattern.

- Prompt 258: Dashboard Compact Ops Foundation.
- Prompt 259: Dashboard Release Readiness Drawer Foundation.
- Prompt 260: Dashboard Layout And Theme Foundation.
- Prompt 261: Flights Page Drilldown Foundation.
- Prompt 262: Render Flights Data Restore And Shared Drawer Foundation.
- Prompt 263: Dashboard Flight Card Release Action Cleanup.
- Prompt 264: Object Action Drawer Architecture.
- Prompt 265: Operator Release Configuration Planning.
- Prompt 266: Dashboard Command Surface Follow-Up Planning.
- Prompt 267: Dashboard Command Surface Follow-Up Foundation.
- Prompt 268: Dashboard Command Surface QA.
- Prompt 269: Operations Control Workbench Polish Planning.
- Prompt 270: Operations Control Workbench Polish Foundation.
- Prompt 271: Operations Control Workbench QA.

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

## Release UI Configuration Follow-Up

Dashboard release-readiness is still using the app's existing global rules. A
future planning slice should define operator-controlled release display and
readiness preferences, including whether manifest, W&B, flight following,
dispatch/current information, MX, crew, or duty/rest are enabled, required,
warning-only, hidden, or operation-type specific.

## Acceptance For Frontend Handoff

- Builders can use `docs/BACKEND_MVP_STATE.md` as the backend contract source.
- Post-MVP backend gaps are clearly separated from UI work.
- The first frontend chain is planned in small slices.
- Backend smoke remains available for regression checks during UI polish.
