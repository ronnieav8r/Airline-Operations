# Prompt 109: Dashboard Surfacing QA

## Summary

Validate the Prompt 108 dashboard surfacing foundation on local data.

Prompt 109 is QA/docs only unless a defect is found. It should confirm the
dashboard now surfaces Operations Control priorities without changing release
actions, evidence workflows, schema, auth, imports, provider integrations, or AI
behavior.

## QA Scope

- Confirm `/` renders the Operations Attention panel.
- Confirm `/` renders Priority FlightLegs.
- Confirm `/` renders the AI Review Notes placeholder.
- Confirm the AI placeholder is non-functional and clearly marked as future
  work.
- Confirm dashboard links route to FlightLeg detail, Manifest, W&B, Locating,
  Dispatch, and Operations Control.
- Confirm existing dashboard sections still render:
  - Today's flight board.
  - Coverage gaps.
  - Active alerts.
  - Fleet snapshot.
- Confirm release behavior remains warning-only.

## Validation

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.

## Runtime Smoke

- Smoke-check `/`.
- Smoke-check `/operations-control`.
- Smoke-check one `/operations-control/[flightLegId]`.
- Smoke-check `/flights`.
- Smoke-check `/aircraft`.
- Smoke-check `/crew`.
- Smoke-check `/scheduling`.
- Smoke-check `/api/health`.
- Smoke-check `/internal/flightleg-parity`.
- Smoke-check `/internal/flightleg-write-readiness`.

## Browser QA

- Browser-check `/` for the Operations Attention panel.
- Browser-check Priority FlightLegs.
- Browser-check the AI Review Notes placeholder.
- Browser-check direct workflow links for Detail, Manifest, W&B, Locating, and
  Dispatch.
- Browser-check the Operations Control workbench link.
- Browser-check coverage gaps, active alerts, and fleet snapshot.

## Assumptions

- Prompt 109 does not add app behavior.
- Prompt 108 already implemented the dashboard surfacing foundation.
- The AI Review Notes area remains a placeholder only.
- No provider calls, note persistence, recommendations, automation, or hidden
  background work should exist in this slice.
