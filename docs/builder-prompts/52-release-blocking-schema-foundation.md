# Prompt 52: Release Blocking Schema Foundation

## Summary

Add the release-blocking foundation as an additive database slice with
conservative default policy/rule data.

Chosen scope: tables plus defaults.

Keep current release behavior warning-only. Do not block releases, create
readiness snapshots, add auth/signatures, add override UI, add provider
integrations, add file uploads, or change current `FlightRelease` actions.

## Implemented Scope

- Additive Prisma enums:
  - `ReleaseAuthorityClass`
  - `ReleaseRuleSeverity`
  - `ReleaseSnapshotStatus`
  - `ReleaseFindingStatus`
  - `ReleaseOverrideDecision`
  - `ReleaseAuditEventType`
- Additive Prisma models:
  - `ReleasePolicyProfile`
  - `ReleasePolicyRule`
  - `ReleaseReadinessSnapshot`
  - `ReleaseReadinessFinding`
  - `ReleaseOverride`
  - `ReleaseAuditEvent`
- Migration:
  - `20260607145711_release_blocking_schema_foundation`
- Default policy/rule seed support:
  - `lib/release-policy-defaults.ts`
  - local `prisma/seed.ts`
  - gated `scripts/backfill-release-policy-demo.ts`
  - `RUN_RELEASE_POLICY_BACKFILL=1`
- Hidden diagnostic:
  - `/internal/release-policy-readiness`
- Health counts:
  - `releasePolicyProfiles`
  - `releasePolicyRules`
  - `releaseReadinessSnapshots`
  - `releaseReadinessFindings`
  - `releaseOverrides`
  - `releaseAuditEvents`

## Default Policy Direction

- `PART_91` maps to `PART_91_BASELINE`.
- `PART_91K` maps to `PART_91K_FRACTIONAL`.
- `PART_135` maps to `PART_135_ON_DEMAND`.
- Shared default blockers include assigned aircraft, active aircraft
  configuration, current aircraft maintenance airworthiness release,
  operational-control context, operating authority/revision, planned
  `FlightRelease`, and current W&B.
- Baseline Part 91 manifest, locating, dispatch, weather, NOTAM, and
  flight-plan gaps default to warning/operator-configurable rules.
- Part 91K and Part 135 manifest, locating, dispatch, weather, NOTAM, and
  flight-plan gaps default to blocker rules.
- Open discrepancies, active deferrals, and crew compliance remain warning
  defaults.

## Deferred

- Actual hard release blocking.
- Readiness snapshot creation.
- Release finding creation.
- Override workflow.
- Auth, roles, permissions, and signatures.
- Provider integrations.
- File uploads.
- `ReleasePackage`.

## Validation

```powershell
npm run db:local:up
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-prisma.ps1 migrate dev --name release-blocking-schema-foundation
npm run db:local:seed
$env:RUN_RELEASE_POLICY_BACKFILL="1"; npm run backfill:release-policy
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime smoke:

- `/api/health`
- `/internal/release-policy-readiness`
- `/operations-control/[flightLegId]`
- release mark/cancel/void actions remain unchanged
- `/`, `/operations-control`, `/flights`, `/aircraft`, `/crew`, `/scheduling`
