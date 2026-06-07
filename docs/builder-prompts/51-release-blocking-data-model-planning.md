# Prompt 51: Release Blocking Data Model Planning

## Summary

Plan the additive data model needed for future release blocking, authority
policy profiles, readiness snapshots, override records, and audit events.

This is a docs/planning slice only. Do not change Prisma schema, generate
migrations, add enforcement, add auth, add override UI, add provider
integrations, add file uploads, or mutate release behavior.

## Planning Goal

Define the future schema shape needed before hard release blocking can be
implemented safely.

The plan should answer:

- How policy profiles attach to operators and operating authorities.
- How individual readiness rules are stored and versioned.
- How a release attempt records the exact readiness snapshot evaluated.
- How blocker findings are stored.
- How overrides are linked to findings and actors.
- How append-only audit events preserve release history.

## Durable Output

Create or update:

```text
docs/RELEASE_BLOCKING_DATA_MODEL_PLAN.md
```

Update related planning docs:

```text
docs/PROJECT_STATUS.md
docs/RELEASE_BLOCKING_POLICY.md
docs/RELEASE_OVERRIDE_AUTH_POLICY.md
docs/SCHEMA_DECISIONS.md
```

## Proposed Future Models

Plan these as additive tables only:

- `ReleasePolicyProfile`
- `ReleasePolicyRule`
- `ReleaseReadinessSnapshot`
- `ReleaseReadinessFinding`
- `ReleaseOverride`
- `ReleaseAuditEvent`

Do not replace `FlightRelease`.

## Required Boundaries

- `FlightRelease` remains the operational FlightLeg release record.
- `AirworthinessRelease` remains aircraft maintenance airworthiness release
  state.
- Policy rules should be versioned/effective-dated.
- Readiness snapshots should preserve what the app saw at release attempt time.
- Override records should attach to specific findings, not broadly bypass a
  FlightLeg.
- Audit events should be append-only.

## Prompt 52 Target

Prompt 52 may implement an additive release-blocking schema foundation only
after this data model plan is accepted.

Prompt 52 should not enforce blocking, add auth, add signatures, add provider
integrations, or change current release actions unless separately approved.

## Deferred

- Prisma schema changes in this slice.
- Actual hard release blocking.
- Override workflow implementation.
- Auth implementation.
- Signature implementation.
- Provider integrations.
- File uploads.
- `ReleasePackage`.

## Validation

Docs-only slice:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```
