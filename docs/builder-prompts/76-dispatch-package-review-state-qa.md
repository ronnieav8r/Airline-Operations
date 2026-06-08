# Prompt 76: Dispatch Package Review State QA

## Summary

Validate the Prompt 75 dispatch-package review-state workflow and document the
results. Keep this slice QA/docs only unless a defect is found.

## QA Scope

- Confirm the additive migration is applied locally.
- Confirm incomplete dispatch evidence cannot be marked `READY`.
- Confirm complete dispatch evidence can be marked `READY`.
- Confirm only `READY` dispatch packages can be marked `REVIEWED`.
- Confirm `REVIEWED` records set `reviewedAt`, keep `reviewedById` null, and
  preserve review notes.
- Confirm editing a reviewed package resets it to `DRAFT`.
- Confirm voiding a package sets `VOIDED` and `voidedAt`.
- Confirm voided dispatch packages no longer count as dispatch-ready in
  warning-only readiness.
- Confirm release actions remain warning-only and unchanged.
- Confirm dispatch page, FlightLeg detail, health, internal diagnostics, and
  main routes still load.

## Test Plan

- Run `npm run db:local:up`.
- Run `npm run db:local:migrate`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Run local workflow smoke against a real FlightLeg.
- Start the local app and check:
  - `/`
  - `/operations-control`
  - `/operations-control/[flightLegId]`
  - `/operations-control/[flightLegId]/dispatch`
  - `/api/health`
  - `/internal/flightleg-parity`
  - `/internal/flightleg-write-readiness`
  - `/flights`
  - `/aircraft`
  - `/crew`
  - `/scheduling`
- Browser-check the dispatch workflow and confirm the review-state controls
  render.

## Assumptions

- Prompt 76 does not add schema or workflow behavior.
- Dispatch review remains informational and warning-only.
- Auth/signatures, review audit history, provider integrations, file uploads,
  `ReleasePackage`, and hard release blocking remain deferred.
