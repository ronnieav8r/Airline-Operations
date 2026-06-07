# Prompt 55: Release Snapshot Preview Foundation

## Summary

Implement explicit preview release-readiness snapshot capture on FlightLeg
detail.

Keep release behavior warning-only. Do not add automatic snapshots, hard
blocking, overrides, auth/signatures, provider integrations, file uploads,
`ReleasePackage`, or release-action changes.

## Implemented Scope

- Refactor FlightLeg detail readiness logic into `lib/release-readiness.ts`.
- Add `captureReleasePreviewSnapshotAction`.
- Add "Capture preview snapshot" on FlightLeg detail.
- Create one `ReleaseReadinessSnapshot` plus related
  `ReleaseReadinessFinding` rows when the explicit action is submitted.
- Use the default policy profile for the FlightLeg operating authority.
- Show a readable error if a default policy profile or `FlightRelease` is
  missing.
- Show recent preview snapshots on FlightLeg detail with pass, fail, warning,
  and not-applicable counts.

## Deferred

- Automatic snapshot creation.
- Hard release blocking.
- Override workflow.
- Auth, roles, permissions, and signatures.
- Provider integrations.
- File uploads.
- `ReleasePackage`.
- Release action behavior changes.

## Validation

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime smoke should capture a preview snapshot and confirm release actions
remain available and unchanged.
