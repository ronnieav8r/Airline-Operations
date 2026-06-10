# Prompt 173: ReleasePackage QA

## Summary

Prompt 173 validates the ReleasePackage schema foundation, read-only preview,
and explicit preview capture workflow added in Prompts 170-172.

Release behavior remains warning-first. Package capture does not finalize a
release, create signatures, hard-block release actions, upload files, call
providers, or mutate `FlightRelease.status`.

## QA Scope

- Confirm the additive ReleasePackage schema still validates.
- Confirm FlightLeg detail compiles with the read-only ReleasePackage preview.
- Confirm explicit package capture compiles with role protection and user
  attribution.
- Confirm current release-control actions remain separate from package capture.
- Confirm `/api/health` includes ReleasePackage counts.
- Confirm existing app routes still build.

## Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Runtime workflow smoke is pending. Docker Desktop was unavailable, and the
local database start command could not connect to the Docker Desktop Linux
engine.

## Runtime QA Checklist

When local Postgres is available:

- Start local database services.
- Apply migrations and seed local data.
- Sign in as a seeded ops/admin user.
- Visit one FlightLeg detail page.
- Capture a ReleasePackage preview.
- Confirm the new package appears in the Release Package section.
- Confirm `/api/health` reports nonzero `releasePackages` and
  `releasePackageEvidenceLinks`.
- Confirm mark released, cancel release, and void release still mutate only the
  current `FlightRelease` behavior.
- Smoke-check `/`, `/operations-control`, `/flights`, `/aircraft`, `/crew`,
  `/crew/scheduling`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.

## Stop Boundary

No new ReleasePackage behavior was implemented in Prompt 173. Final release
packages, legal signatures, file uploads, provider evidence fetching, override
workflow, hard blocking, and replacing `FlightRelease` remain deferred.
