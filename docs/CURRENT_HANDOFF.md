# AeroOps Current Handoff

Last updated: 2026-06-13

## Current State

AeroOps is in frontend/UI polish after backend MVP completion. The backend
contract is stable enough for UI work, with remaining backend items treated as
post-MVP unless separately planned.

Latest completed work:

- Fuel ledger and release fuel readiness are implemented.
- `/admin/settings` edits the operator Jet A density setting.
- `/aircraft/[aircraftId]/fuel` records aircraft fuel uplift, defuel, and
  correction events.
- `/operations-control/[flightLegId]/fuel` records release fuel onboard,
  fueled-ready state, and postflight fuel onboard.
- Dashboard FlightLeg drawer summary was refined to reduce duplicate release
  content, show clearer fuel/manifest/crew context, and surface crew
  qualification warnings as warning state.

## Current UI Direction

The dashboard drawer should become an object-action workspace:

- The header carries lifecycle and release state.
- Summary cards should show useful at-a-glance details, not duplicate generic
  status labels.
- Clicking a summary card should open the most actionable workflow currently
  available.
- Full drawer edit workflows are a future goal, but current routes remain the
  fallback until each drawer workflow is deliberately migrated.

## Known Current Follow-Ups

- Add aircraft fuel burn/range/endurance settings before showing calculated
  endurance or conservative range.
- Plan manifest depth: crew/passenger status, onboard/no-show, ID verified,
  no-fly/watchlist verification, and the external verification boundary.
- Plan dispatch/current-information depth.
- Plan MX depth: next service due, MEL restrictions, operational limitations,
  and how those warnings should appear in release review.
- Continue page-by-page UI polish after dashboard/drawer review.

## Validation Status

Most recent static validation passed after the drawer refinement:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Authenticated local browser smoke was not completed in the latest drawer pass
because Docker Desktop/local PostgreSQL was not running. Previous backend MVP
and fuel workflow smoke checks passed before that environment issue.

## Required Start Files For Next Builder

- `docs/README.md`
- `docs/CURRENT_HANDOFF.md`
- `docs/PROJECT_STATUS.md`
- `docs/BACKEND_MVP_STATE.md`
- `docs/FRONTEND_READINESS_PLAN.md`
- `docs/SCHEMA_DECISIONS.md`
- `docs/FUEL_LEDGER_RELEASE_READINESS.md`
