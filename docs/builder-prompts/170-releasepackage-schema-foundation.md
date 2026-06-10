# Prompt 170: ReleasePackage Additive Schema Foundation

## Summary

Prompt 170 adds the additive ReleasePackage schema foundation. It does not
change `FlightRelease` actions, hard-block release, add signatures, add file
uploads, or add provider integrations.

## Implemented Scope

- Added `ReleasePackageStatus`.
- Added `ReleasePackageEvidenceType`.
- Added `ReleasePackage` header table linked to:
  - `FlightLeg`
  - `OperationalControlRecord`
  - `FlightRelease`
  - optional `ReleaseReadinessSnapshot`
  - optional captured-by `User`
- Added `ReleasePackageEvidenceLink` for package evidence rows.
- Added health counts for package headers and evidence links.
- Updated current/planning DBML docs.
- Added additive migration `releasepackage_schema_foundation`.

## Validation

- `npm run prisma:validate`: pass.
- `npm run prisma:generate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Local migration/runtime QA remains pending because Docker Desktop was
unavailable.

## Deferred

- Package preview UI.
- Package capture action.
- Finalized package policy.
- Hard release blocking.
- Signatures.
- File uploads.
- Provider integrations.
- Replacing `FlightRelease`.
