# Prompt 239: Duty/Rest Calculator Refinement

## Summary

Refine the first warning-only duty/rest calculator using the seeded scenario
diagnostic from Prompt 238. Keep scope narrow: improve current-leg scheduled
block findings so supported current-leg checks can pass independently from
missing outside-commercial-flying data.

## Implemented Refinement

- Current-leg one-pilot and two-pilot scheduled-block estimates now return
  `PASS` when the current FlightLeg scheduled block is within the configured
  Part 135 unscheduled estimate.
- The separate outside-commercial-flying ledger finding remains
  `MISSING_INPUT`, so release readiness remains warning-first when full rolling
  commercial totals cannot be validated.
- Over-limit current-leg scheduled-block estimates still return `WARNING`.
- No schema, hard release blocking, legal signoff, release-action behavior,
  crew assignment behavior, scheduling behavior, or duty/rest write behavior was
  added.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local DB prep and seeded duty/rest scenarios
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Deferred

- Outside commercial flying ledger.
- Full rolling flight-time ledger.
- Reserve, standby, transportation, reduced-rest debt, actual flight-time, and
  augmented-crew calculations.
- Hard enforcement or legal-signature behavior.
