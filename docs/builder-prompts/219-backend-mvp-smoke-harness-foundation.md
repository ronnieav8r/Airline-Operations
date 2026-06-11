# Prompt 219: Backend MVP Smoke Harness Foundation

## Summary

Expand the existing backend smoke harness for the backend-MVP baseline without
changing product behavior. The harness remains command-driven, local/demo
gated, and non-production.

## Implemented Scope

- Extended workflow smoke to create and verify representative release evidence:
  manifest, W&B, locating, dispatch, flight plan, readiness snapshot, duty/rest
  readiness finding, ReleasePackage preview, and release audit attribution.
- Extended browser smoke to open evidence workflow pages, scheduling admin
  pages, and internal diagnostics as an admin user.
- Kept smoke-user setup behind `AEROOPS_ENABLE_TEST_AUTH=1`.
- Kept workflow smoke blocked against remote databases unless explicitly
  allowed.

## Boundaries

- No production backdoor.
- No schema changes.
- No hard release blocking.
- No legal signature behavior.
- No provider integration, file upload, booking, expense, or destructive
  cleanup behavior.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`
