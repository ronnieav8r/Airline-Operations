# Prompt 207: Duty/Rest Warning Calculator Planning

## Summary

Plan the first warning-only duty/rest calculator. The selected scope is narrow:
Part 135 unscheduled/on-demand warnings plus ordinary Part 91 guardrails,
surfaced first in FlightLeg release readiness. Captured results should reuse
existing release-readiness snapshot findings.

Prompt 207 is docs/planning only. Prompt 208 should implement the calculator.

## Key Decisions

- Use existing `DutyRestPolicyProfile` and `DutyRestRuleSetting` as the rule
  source.
- Do not add schema in Prompt 207 or Prompt 208.
- Do not hard-block release, schedule publishing, crew assignment, or crew
  portal actions.
- Use UTC for first calculations because current policy defaults use
  `DutyRestCalculationBasis.UTC`.
- Use planned preflight timing first: `FlightLeg.scheduledDeparture` and
  `FlightLeg.scheduledArrival`.
- Treat FlightLeg duration as a scheduled-block estimate because there is no
  dedicated airborne/logged flight-time field yet.
- Reuse existing `ReleaseReadinessSnapshot` and `ReleaseReadinessFinding` for
  persisted snapshot output.
- Ordinary Part 91 should produce guardrail/info findings only, not Part
  135-style regulatory warnings.
- Part 91K, scheduled Part 135, augmented crew, flight attendant, HEMES,
  reduced-rest compensation, external commercial flying, reserve/standby
  detail, and transportation-specific logic remain deferred or missing-input
  findings.

## Prompt 208 Target

- Add a reusable duty/rest evaluator, conceptually
  `evaluateDutyRestForFlightLeg`, that returns findings with rule key, label,
  status, severity, message, details, and optional evidence reference.
- Supported statuses should be `PASS`, `WARNING`, `MISSING_INPUT`,
  `NOT_APPLICABLE`, and `DEFERRED`.
- Evaluate Part 135 unscheduled/on-demand rules that current data can support:
  visible duty/rest overlap, 10 consecutive hours of rest in the 24 hours before
  planned completion, rolling 24-hour scheduled-block estimate for one-pilot and
  two-pilot assignments, quarterly 24-hour rest count when enough rest records
  are present, and missing outside commercial flying for cumulative commercial
  flying rules.
- Add one duty/rest item to FlightLeg release readiness, classified as
  `WOULD_WARN` unless all supported checks pass.
- Include duty/rest findings in preview and release-attempt readiness snapshots
  through the existing snapshot pipeline.
- Show readable missing-input messages instead of pretending compliance can be
  fully validated.
- Keep current release actions available and warning-only.

## Docs Updates For Prompt 208

- Update `docs/DUTY_REST_POLICY_SETTINGS.md` with implementation status.
- Update `docs/PROJECT_STATUS.md`.
- Update crew compliance and release-readiness docs to clarify that duty/rest
  findings are operational warnings, not legal enforcement.
- Keep `CrewDutyRestWarning`, outside flying ledger, duty activity tables,
  reduced-rest debt, transportation classification, and hard enforcement
  deferred.

## Test Plan For Prompt 208

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Run local seed/backfill so duty/rest policy settings and crew duty/rest demo
  records exist.
- Smoke `/operations-control/[flightLegId]` and confirm a duty/rest readiness
  item appears.
- Capture a release-readiness preview snapshot and confirm duty/rest findings
  are stored in snapshot findings.
- Confirm ordinary Part 91 shows guardrail/info behavior and does not apply
  Part 135 limits.
- Confirm Part 135 unscheduled legs show pass/warning/missing-input findings
  based on rest records and crew assignment context.
- Confirm release actions remain warning-only and continue to work.
- Smoke `/`, `/operations-control`, `/crew`, `/crew/scheduling`, `/aircraft`,
  `/api/health`, `/internal/duty-rest-policy-readiness`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`.

## Assumptions

- First calculator scope is narrow by design: Part 135 unscheduled plus Part 91
  guardrails.
- First warning surface is FlightLeg release readiness only.
- First persistence mechanism is existing release-readiness snapshots, not a new
  duty/rest warning table.
- Current `CrewDutyPeriod` and `CrewRestPeriod` are enough for first-pass
  warnings, but not enough for full legal enforcement.
- Any missing outside commercial flying, transportation, reserve/standby,
  reduced-rest, actual flight-time, OpSpecs/MSpecs, or flight-attendant data
  should produce clear missing-input/deferred warnings.
