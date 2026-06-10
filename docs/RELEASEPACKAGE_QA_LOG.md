# ReleasePackage QA Log

Last updated: 2026-06-10

## Prompt 173 Static QA

ReleasePackage schema, preview, and explicit capture have been validated by
static checks:

- Prisma schema validation: pass.
- TypeScript typecheck: pass.
- ESLint: pass.
- Production build: pass.

## Verified By Static Checks

- `ReleasePackage` and `ReleasePackageEvidenceLink` remain additive schema
  records around `FlightRelease`.
- FlightLeg detail includes the read-only package preview and explicit capture
  action.
- Package capture is protected by operational roles and records the current
  authenticated user when available.
- Package capture does not mutate `FlightRelease.status`.
- `/api/health` includes ReleasePackage table counts.

## Runtime QA Status

Local DB-backed workflow QA is pending because Docker Desktop was unavailable.
The local database start command could not connect to the Docker Desktop Linux
engine.

Pending runtime checks:

- Start local Postgres.
- Run local migrations and seed.
- Sign in as an ops/admin user.
- Capture a package preview from a FlightLeg detail page.
- Confirm package and evidence-link rows are created.
- Confirm package counts appear in `/api/health`.
- Confirm existing release actions still behave independently.
- Smoke-check the main operational routes and FlightLeg diagnostics.
