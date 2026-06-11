# Prompt 238: Duty/Rest Diagnostic Foundation

## Summary

Prompt 238 adds a read-only internal diagnostic for seeded duty/rest scenario
fixtures.

## Implemented Scope

- Added `/internal/duty-rest-scenarios`.
- Diagnostic lists FlightLeg scenario rows created by
  `seed:duty-rest-scenarios`.
- Shows expected scenario outcome, operating part, schedule, link to FlightLeg
  detail, evaluator findings, statuses, messages, rule keys, and details JSON.
- Added the route to app smoke checks.

## Boundaries

- Read-only only.
- No schema changes.
- No scenario mutation from the page.
- No hard release blocking.
- No regulatory enforcement.

## Validation Target

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- gated duty/rest scenario seed
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Next Slice

Prompt 239 should refine only clear duty/rest evaluator gaps discovered by
scenario QA.
