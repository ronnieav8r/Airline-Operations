# AeroOps Current Handoff

Last updated: 2026-06-14

## Current State

AeroOps is in frontend/UI polish after backend MVP completion. The backend
contract is stable enough for UI work, with remaining backend items treated as
post-MVP unless separately planned.

Latest completed work:

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

## Known Current Follow-Ups

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
