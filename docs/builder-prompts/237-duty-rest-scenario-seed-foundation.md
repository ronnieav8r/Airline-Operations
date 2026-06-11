# Prompt 237: Duty/Rest Scenario Seed Foundation

## Summary

Prompt 237 adds gated local/demo duty-rest scenario fixtures for calculator QA.

## Implemented Scope

- Added `scripts/seed-duty-rest-scenarios.ts`.
- Added package script `seed:duty-rest-scenarios`.
- Script skips unless `RUN_DUTY_REST_SCENARIOS=1`.
- Scenario fixtures create isolated crew members, FlightLegs, crew snapshots,
  operational-control records, planned releases, and duty/rest evidence.
- Scenarios cover:
  - ordinary Part 91 guardrail,
  - Part 135 unscheduled pass-like supported checks,
  - Part 135 missing rest warning,
  - Part 135 missing input,
  - Part 135 duty/rest overlap warning,
  - Part 135 deferred-data case.

## Boundaries

- No schema changes.
- No Render/default seed execution.
- No release blocking.
- No outside commercial flying ledger.
- No reserve/standby/transportation schema.
- No hard enforcement.

## Validation Target

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- `npm run seed:duty-rest-scenarios` skip path.
- `$env:RUN_DUTY_REST_SCENARIOS="1"; npm run seed:duty-rest-scenarios`
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Next Slice

Prompt 238 should add a read-only diagnostic route or script for inspecting
scenario evaluator inputs and findings.
