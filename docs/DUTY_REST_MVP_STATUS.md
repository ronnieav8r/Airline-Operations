# Duty/Rest MVP Status

Last updated: 2026-06-11

## Status

Duty/rest backend is MVP-complete for the current warning-only product policy.

Implemented backend capabilities:

- Report-derived warning-only policy settings in `DutyRestPolicyProfile` and
  `DutyRestRuleSetting`.
- Default policy/profile seed and gated backfill support.
- `/internal/duty-rest-policy-readiness` diagnostics.
- Gated local/demo duty/rest scenario fixtures.
- `/internal/duty-rest-scenarios` live scenario diagnostic.
- Reusable duty/rest evaluator for:
  - ordinary Part 91 guardrail/info behavior,
  - Part 135 unscheduled/on-demand warning checks using visible inputs,
  - duty/rest overlap warnings,
  - 10-hour rest before planned completion warnings,
  - current-leg scheduled-block one-pilot/two-pilot estimates,
  - quarterly 24-hour rest count visibility where records exist,
  - missing/deferred outside-flying and transportation inputs.
- Warning-only FlightLeg release-readiness item with evaluator subfindings.
- Snapshot persistence through existing `ReleaseReadinessSnapshot` and
  `ReleaseReadinessFinding` records.
- Focused local smoke script:
  `npm run smoke:duty-rest-snapshot`.

## MVP Boundaries

- Duty/rest findings are operational warnings, not legal determinations.
- Release actions remain available when duty/rest findings warn.
- Schedule publishing remains available when duty/rest findings warn.
- Aircraft crew assignment remains available when duty/rest findings warn.
- Crew portal actions remain available when duty/rest findings warn.
- Current calculations use UTC planned schedule times and scheduled-block
  estimates, not actual airborne time.

## Deferred Post-MVP

- Hard release, schedule, or assignment blocking.
- Formal legal signature/attestation.
- Dedicated `CrewDutyRestWarning` table.
- Outside commercial flying ledger.
- Reserve and standby event model.
- Required-transportation classification.
- Reduced-rest compensation/debt tracking.
- Actual flight-time/airborne-time engine.
- Part 91K, scheduled Part 135, augmented crew, flight attendant, HEMES, and
  OpSpecs/MSpecs-specific calculation depth.

## Current Validation

Prompt 240 completed snapshot QA:

- Prisma validation passed.
- Typecheck passed.
- Lint passed.
- Build passed.
- Local DB migrate and seed passed.
- Duty/rest scenario seed passed.
- `npm run smoke:duty-rest-snapshot` passed.
- `npm run smoke:workflows` passed.
- `npm run smoke:app` passed.
- `npm run smoke:browser` passed.
