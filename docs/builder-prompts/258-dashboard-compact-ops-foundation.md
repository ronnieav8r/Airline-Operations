# Prompt 258: Dashboard Compact Ops Foundation

## Summary

Implement the first dashboard UI polish slice using Option A: a compact
operations dashboard. Keep backend reads and workflows unchanged.

## Changes

- Slim the global app header by removing the developer-facing FlightLeg badge
  and tightening spacing.
- Replace the dashboard's large duplicate header and oversized metric grid with
  a compact command surface.
- Add clickable status tiles for flights today, unreleased legs, evidence gaps,
  crew gaps, active alerts, and aircraft.
- Move active alerts and crew gaps above the fold.
- Condense the today flight board into scannable rows with workflow links.
- Keep the AI Review Notes panel as an inactive placeholder.

## Boundaries

- No schema changes.
- No backend query changes.
- No release behavior changes.
- No drawer/modal behavior yet.
- No AI provider behavior.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Browser/smoke check dashboard rendering.
