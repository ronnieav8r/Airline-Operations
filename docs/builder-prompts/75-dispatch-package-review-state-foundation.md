# Prompt 75: Dispatch Package Review State Foundation

## Summary

Implement the first manual dispatch-package review-state workflow.

This is an additive schema and workflow slice. Keep release behavior
warning-only. Do not add provider integrations, file uploads, hard release
blocking, auth/signatures, `ReleasePackage`, automatic snapshots, or
release-action changes.

## Key Changes

- Add additive Prisma enum `DispatchPackageStatus`:
  - `DRAFT`
  - `READY`
  - `REVIEWED`
  - `VOIDED`
- Add additive fields to `DispatchPackage`:
  - `status`
  - `readyAt`
  - `reviewedAt`
  - `reviewedById`
  - `voidedAt`
  - `reviewNotes`
- Update manual dispatch workflow to show current dispatch package status.
- Add actions:
  - Mark Ready.
  - Mark Reviewed.
  - Void.
- Mark Ready rejects incomplete dispatch evidence.
- Mark Reviewed rejects packages that are not `READY`.
- Saving a `REVIEWED` or `VOIDED` package resets it to `DRAFT`.
- `reviewedById` remains null until auth exists.

## Deferred

- Legal signatures.
- Auth/role-based reviewer identity.
- Review history/audit events.
- File uploads.
- Provider-backed dispatch evidence.
- Hard release blocking.
- `ReleasePackage`.
- Automatic release-attempt snapshots.

## Test Plan

- Run `npm run db:local:up`.
- Run `npx prisma migrate dev --name dispatch-package-review-state-foundation`.
- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Mark an incomplete dispatch package ready and confirm rejection.
- Complete manual dispatch evidence and mark `READY`.
- Mark a `READY` package `REVIEWED` and confirm `reviewedAt`.
- Edit a reviewed package and confirm it resets to `DRAFT`.
- Void a package and confirm `voidedAt`.
- Confirm dispatch and FlightLeg detail pages still load.

## Assumptions

- Dispatch package review is not the same thing as `FlightRelease`.
- Review is informational/warning-only until later release-blocking policy
  work.
- No auth exists yet, so reviewer identity remains null.
