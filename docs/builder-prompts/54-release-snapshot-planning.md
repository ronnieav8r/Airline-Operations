# Prompt 54: Release Snapshot Planning

## Summary

Plan preview release-readiness snapshots before implementing snapshot writes.

This is a docs/planning slice only. Do not add snapshot writes, findings,
overrides, hard blocking, auth/signatures, provider integrations, file uploads,
`ReleasePackage`, or release-action changes.

## Decisions

- Snapshots are created only by an explicit "Capture preview snapshot" action on
  FlightLeg detail.
- No snapshot is created automatically on page load.
- No snapshot is created automatically by mark released, cancel release, or void
  release.
- Snapshot creation does not block release and does not change
  `FlightRelease.status`.
- Snapshot creation uses the same readiness source as the live FlightLeg detail
  checklist.
- A missing default policy profile should show a readable error and create no
  snapshot.

## Snapshot Contents

`ReleaseReadinessSnapshot` should store:

- FlightLeg.
- FlightRelease.
- ReleasePolicyProfile.
- Authority class.
- Snapshot status.
- Evaluated time.
- Summary counts for pass, block/fail, warning, not-applicable, and total
  findings.

`ReleaseReadinessFinding` should store one row per readiness checklist item:

- Stable rule key.
- Readiness category.
- Severity copied from resolved policy when present.
- Status derived from live readiness.
- Overridable flag copied from policy when present.
- Human-readable summary/message.
- Evidence reference type and ID where available.
- Details JSON for future audit/debug context.

## Prompt 55 Target

Prompt 55 should implement explicit preview snapshot capture on FlightLeg detail.
It should refactor the current readiness logic into a reusable helper so the UI
and snapshot writer use the same source.

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

Docs-only slice:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```
