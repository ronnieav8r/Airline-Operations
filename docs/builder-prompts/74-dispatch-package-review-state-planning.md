# Prompt 74: Dispatch Package Review State Planning

## Summary

Plan dispatch-package review state before implementation.

The chosen approach is **status fields on `DispatchPackage`**. Keep
`DispatchPackage` as the one-row FlightLeg dispatch/current-information
package, then add a small manual status workflow. Do not add provider
integrations, file uploads, hard release blocking, auth/signatures,
`ReleasePackage`, automatic snapshots, or release-action changes.

## Key Decisions

- Add review state directly to `DispatchPackage`, not a separate review-history
  table for the first implementation.
- Use statuses:
  - `DRAFT`
  - `READY`
  - `REVIEWED`
  - `VOIDED`
- Saving manual dispatch evidence should create/update the package as `DRAFT`
  unless it is already `READY` and still complete.
- Editing a `REVIEWED` package should reset it to `DRAFT`.
- `READY` should require the same evidence currently used by dispatch
  readiness:
  - Weather route summary.
  - NOTAM affected station codes.
  - Flight-plan external reference.
  - Flight-plan route text.
- `REVIEWED` should require `READY`.
- Review is a development workflow state, not a legal dispatch release,
  signature, or final operational release.
- `reviewedById` remains null until auth exists.
- `VOIDED` remains manual for entered-in-error dispatch packages.
- Release readiness remains warning-only.

## Prompt 75 Target

Prompt 75 should implement the dispatch package review-state foundation.

Minimum behavior:

- Add additive Prisma enum `DispatchPackageStatus`.
- Add nullable/additive fields to `DispatchPackage`:
  - `status`
  - `readyAt`
  - `reviewedAt`
  - `reviewedById`
  - `voidedAt`
  - `reviewNotes`
- Add migration named `dispatch-package-review-state-foundation`.
- Update manual dispatch workflow to show current status.
- Add actions:
  - Mark Ready.
  - Mark Reviewed.
  - Void.
- Mark Ready should reject incomplete evidence.
- Mark Reviewed should reject non-READY packages.
- Save should reset REVIEWED packages to DRAFT.
- Keep release actions unchanged.

## Deferred

- Legal signatures.
- Auth/role-based reviewer identity.
- Review history/audit events.
- File uploads.
- Provider-backed dispatch evidence.
- Hard release blocking.
- `ReleasePackage`.
- Automatic release-attempt snapshots.

## Test Plan For Prompt 75

- Run `npm run db:local:up`.
- Run `npx prisma migrate dev --name dispatch-package-review-state-foundation`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Mark an incomplete dispatch package ready and confirm rejection.
- Complete manual dispatch evidence and mark READY.
- Mark READY package REVIEWED and confirm `reviewedAt`.
- Edit reviewed package and confirm status resets to DRAFT.
- Void a package.
- Confirm `/operations-control/[flightLegId]`, `/operations-control/[flightLegId]/dispatch`,
  `/api/health`, and main routes still load.

## Assumptions

- Dispatch package review is not the same thing as `FlightRelease`.
- Review is informational/warning-only until later release-blocking policy
  work.
- No auth exists yet, so reviewer identity remains null.
