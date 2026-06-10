# Prompt 176: Crew Compliance Seed/Backfill Demo Data

## Summary

Prompt 176 adds safe demo data support for the additive crew compliance
foundation. It seeds and backfills example certificate, medical, training,
check, recency, duty, and rest records so future read surfaces and warnings can
be verified with real rows.

No UI, CRUD workflow, release blocking, duty/rest legal enforcement, imports,
file uploads, provider integrations, or signature behavior is included.

## Implemented Scope

- Added shared demo seeding helper `seedCrewComplianceDemo`.
- Updated local `prisma/seed.ts` to create demo compliance rows after crew
  members exist.
- Added gated script `scripts/backfill-crew-compliance-demo.ts`.
- Added package script `backfill:crew-compliance`.
- Added the gated script to `render-build`; it skips unless
  `RUN_CREW_COMPLIANCE_BACKFILL=1` is set.
- Demo data includes a mix of current, expiring, expired, and warning-ready
  records.
- Backfill behavior deletes and recreates only rows with the exact demo note,
  making it idempotent for demo data.

## Validation

- `npm run prisma:validate`: pass.
- `npm run prisma:generate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run backfill:crew-compliance` with no gate: pass, skipped as expected.

Local seed/backfill smoke is pending. Docker Desktop was unavailable, and the
local database start command could not connect to the Docker Desktop Linux
engine.

## Runtime QA Checklist

When local Postgres is available:

- Run local migrations.
- Run local seed.
- Confirm `/api/health` reports nonzero counts for the seven compliance tables.
- Run `$env:RUN_CREW_COMPLIANCE_BACKFILL="1"; npm run backfill:crew-compliance`.
- Confirm counts remain idempotent rather than duplicating demo rows.

## Boundaries

- `CrewQualification` remains current compatibility warning data.
- New compliance rows are demo evidence only.
- No assignment save behavior changes.
- No release readiness behavior changes.
- No duty/rest legal interpretation.

## Prompt 177 Target

Add read-only crew compliance surfaces on crew detail and crew planner using
the seeded evidence rows.
