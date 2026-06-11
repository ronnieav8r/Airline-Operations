# Prompt 206: Duty/Rest Policy Settings Foundation

## Summary

Use `docs/DUTY_REST_REGULATORY_RESEARCH.md` to add the first duty/rest policy
settings foundation. This is an additive configuration slice only. It does not
calculate duty/rest legality, block releases, block schedule publication, change
aircraft assignments, or create legal signoff behavior.

## Implemented Scope

- Add additive Prisma models:
  - `DutyRestPolicyProfile`
  - `DutyRestRuleSetting`
- Add policy enums for operation kind, calculation basis, enforcement mode, and
  duty/rest rule severity.
- Seed warning-only default profiles and rule settings for existing operating
  authorities.
- Add a gated demo/Render-safe backfill script:
  - Package script: `backfill:duty-rest-policy`
  - Env gate: `RUN_DUTY_REST_POLICY_BACKFILL=1`
- Add `/internal/duty-rest-policy-readiness` as a read-only diagnostic route.
- Add `/api/health` counts for duty/rest policy profiles and rule settings.

## Policy Decisions

- Ordinary Part 91 does not receive invented FAA Part 135-style regulatory
  duty/rest limits. It receives guardrail settings and may later receive
  operator-policy warnings.
- Part 135 defaults target unscheduled/on-demand warning settings first:
  14 CFR 135.263 and 135.267.
- Part 91K settings are supported if a Part 91K authority exists later, but the
  current demo seed only has Part 91 and Part 135 authorities.
- All settings default to `WARNING_ONLY`.
- Outside commercial flying rules are flagged as incomplete unless a future
  external/commercial flying ledger is added.
- Reserve is not rest, standby is duty, required non-local transportation is not
  rest, and reduced rest requires operator/legal review.

## Deferred

- Duty/rest calculation engine.
- Persisted duty/rest warning snapshots.
- Schedule publish blocking.
- Aircraft assignment blocking.
- Release blocking.
- Acknowledgement/signature workflow.
- External commercial flying ledger.
- Crew reserve, standby, duty activity, and transportation event tables.
- OpSpecs/MSpecs-specific overrides.

## Validation

- `npx prisma migrate dev --name duty-rest-policy-settings`
- `npm run db:local:seed`
- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Smoke `/api/health` and `/internal/duty-rest-policy-readiness`.
