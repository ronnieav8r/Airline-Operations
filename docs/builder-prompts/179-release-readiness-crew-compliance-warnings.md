# Prompt 179: Release Readiness Crew Compliance Warning Integration

## Summary

Prompt 179 adds crew compliance warnings to the FlightLeg release readiness
checklist. The new readiness item is warning-only and does not block release
actions.

No schema, seed, CRUD workflow, hard release blocking, override workflow,
auth/signature changes, imports, file uploads, provider integrations, or
duty/rest legal enforcement is included.

## Implemented Scope

- FlightLeg release evidence detail query now includes active/planned
  `CrewLegAssignment` snapshots and compact crew compliance evidence.
- Shared release readiness helper now adds a `Crew compliance` readiness item.
- Missing FlightLeg crew snapshots, missing CPT/FO snapshot roles, missing
  compliance categories, and expired/voided compliance records generate
  `WOULD_WARN` findings.
- Release readiness snapshots automatically include the new warning item because
  snapshot capture uses the shared readiness helper.

## Boundaries

- Release actions remain available.
- Crew compliance findings do not block release.
- `AircraftCrewAssignment` remains operational coverage truth.
- `CrewLegAssignment` remains FlightLeg snapshot/evidence.
- No duty/rest legality calculation was added.

## Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Runtime route/browser and snapshot smoke are pending unless Docker Desktop is
available. Docker Desktop was unavailable, and the local database start command
could not connect to the Docker Desktop Linux engine.

## Prompt 180 Target

QA the crew compliance chain: schema, seed/backfill, read surfaces, aircraft
assignment warnings, and release readiness warnings.
