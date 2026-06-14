# AeroOps Current Handoff

Last updated: 2026-06-14

## Current State

AeroOps is in frontend/UI polish after backend MVP completion. The backend
contract is stable enough for UI work, with remaining backend items treated as
post-MVP unless separately planned.

Latest completed work:

- Crew workflows are now moving drawer-first. `/crew` has a compact roster,
  drawer-based add/edit/detail surfaces, and a time-off review drawer with
  same-position coverage context.
- Time-off review now shows affected aircraft/seat position, available crew,
  pending and approved overlapping time off, occupied crew, and whether the
  count is schedule-backed or unscheduled planning context.
- `/crew/scheduling` was reworked into a read-only scheduler workbench with
  Coverage Board, Schedule Planning, Assignment Overlay, and Requests tabs.
  Month/week/day views are URL-driven and count crew by aircraft type and role
  using `CPT` for captain and `CA` for cabin attendant.
- Scheduling remains read/drill-only in the latest slice. It does not create
  schedule rows, aircraft crew assignments, or FlightLeg assignments.
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
- Scheduling has two layers: schedule coverage planning first, then assignment
  coverage overlay. `AircraftCrewAssignment` remains the staffing truth.

## Known Current Follow-Ups

- Start Docker/local Postgres before running DB-backed crew smoke or browser
  checks. Useful sequence: `npm run db:local:up`, `npm run db:local:migrate`,
  and `npm run db:local:seed` when the database needs refresh.
- Rerun crew scheduling checks with the local DB available:
  `npm run smoke:crew-scheduling-workbench`, then browser-check
  `/crew/scheduling?view=month`, `/crew/scheduling?view=week`, and
  `/crew/scheduling?view=day`.
- Continue the crew scheduling workbench from read/drill into focused drawer
  workflows for schedule planning actions, request review, and assignment
  handoff. Do not add auto-assignment or duty/rest hard enforcement without a
  separate plan.
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

Most recent crew scheduling workbench slice passed:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

DB-backed crew scheduling smoke and browser checks are pending because local
Postgres was not available during the latest run. The user confirmed Docker can
be started for future checks; do that before marking the DB-backed checks
blocked.

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
- `docs/SCHEMA_DECISIONS.md`
- `docs/FUEL_LEDGER_RELEASE_READINESS.md`
