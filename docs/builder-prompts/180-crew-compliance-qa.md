# Prompt 180: Crew Compliance QA

## Summary

Prompt 180 validates the crew compliance chain from Prompts 174-179:

- Planning.
- Additive schema.
- Demo seed/backfill support.
- Crew detail and planner read surfaces.
- Aircraft assignment warning integration.
- Release readiness warning integration.

Prompt 180 is QA/docs only. It does not add behavior.

## QA Results

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Local DB-backed route/workflow/browser QA is pending unless Docker Desktop is
available. Docker Desktop was unavailable, and the local database start command
could not connect to the Docker Desktop Linux engine.

## Static QA Coverage

- Schema remains additive.
- Seed/backfill code compiles and default gated backfill skip path was verified
  in Prompt 176.
- Crew detail and planner surfaces compile with new compliance evidence.
- Aircraft crew assignment workflow compiles with warning-only compliance
  context.
- Release readiness compiles with warning-only crew compliance findings.

## Runtime QA Checklist

When Docker/local Postgres is available:

- Run local migrations and seed.
- Confirm `/api/health` shows nonzero counts for crew compliance tables.
- Visit `/crew/[crewMemberId]` and confirm grouped compliance records.
- Visit `/crew/scheduling` and confirm compliance review summaries.
- Visit `/aircraft/[aircraftId]/crew` and confirm warning-only compliance hints.
- Visit `/operations-control/[flightLegId]` and confirm crew compliance appears
  in release readiness.
- Capture a preview readiness snapshot and confirm a crew-compliance finding is
  present.
- Confirm assignment saves and release actions remain available.

## Stop Boundary

No duty/rest legal enforcement, hard release blocking, compliance CRUD,
provider verification, file uploads, imports, or signature behavior was added.
