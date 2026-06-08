# Prompt 77: Dispatch Review Freshness Panel Update

## Summary

Surface dispatch-package review status and freshness on the FlightLeg detail
Release Evidence Action Panel. Keep this as a read-only UI update. Do not
change release readiness enforcement, release actions, schema, auth, provider
integrations, file uploads, or `ReleasePackage`.

## Key Changes

- Update the Release Evidence Action Panel dispatch card to show:
  - `DRAFT`
  - `READY`
  - `REVIEWED`
  - `VOIDED`
- Show the relevant timestamp when available:
  - `readyAt`
  - `reviewedAt`
  - `voidedAt`
- Treat `VOIDED` as needing attention in the panel.
- Keep `READY` and `REVIEWED` informational only.
- Keep release actions warning-only and unchanged.

## Deferred

- Hard release blocking.
- Auth/signatures or reviewer identity.
- Review audit history.
- Provider-backed dispatch evidence.
- File uploads.
- `ReleasePackage`.
- Release-attempt snapshots.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Start the local app.
- Visit `/operations-control/[flightLegId]`.
- Confirm the Release Evidence Action Panel dispatch card shows dispatch review
  state and timestamp details.
- Visit `/operations-control/[flightLegId]/dispatch`.
- Confirm the dispatch workflow still renders.
- Confirm `/api/health`, `/operations-control`, `/flights`, `/aircraft`,
  `/crew`, and `/scheduling` still load.

## Assumptions

- Prompt 77 is a display-only slice.
- Existing dispatch workflow writes remain unchanged.
- Release readiness and release actions remain warning-only.
