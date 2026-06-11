# Prompt 236: Duty/Rest Scenario QA Planning

## Summary

Plan seeded duty/rest scenario QA for the current warning-only calculator. This
slice is planning-only. Prompt 237 should add safe local/demo scenario data or
fixtures; Prompt 238 should add diagnostics; Prompt 239 should refine evaluator
gaps found by scenario QA.

## Scenario Set

Create local/demo scenarios that exercise the current evaluator without adding
schema or enforcement:

1. **Ordinary Part 91 Guardrail**
   - Operating authority: `PART_91`.
   - Expected: Part 91 guardrail/info findings only.
   - Expected: no Part 135 limits applied.

2. **Part 135 Unscheduled Pass**
   - Operating authority: `PART_135`.
   - Crew: one or two pilot assignments.
   - Duty/rest records: no duty/rest overlap, visible qualifying 10-hour rest,
     reasonable scheduled block estimate, and enough 24-hour rest records if
     fixture coverage supports it.
   - Expected: supported checks pass; outside commercial flying still reports
     missing/deferred if no ledger exists.

3. **Part 135 Missing Rest Warning**
   - Operating authority: `PART_135`.
   - Crew: assigned pilot lacks qualifying 10-hour rest in the preceding
     24-hour window.
   - Expected: warning on 10-hour rest check.

4. **Part 135 Missing Input**
   - Operating authority: `PART_135`.
   - Crew: assigned pilot has no visible duty or rest records.
   - Expected: missing-input findings, not false pass.

5. **Part 135 Duty/Rest Overlap Warning**
   - Operating authority: `PART_135`.
   - Crew: assigned pilot has a visible duty period overlapping a visible rest
     period.
   - Expected: warning on no-duty-during-rest check.

6. **Deferred Data Case**
   - Operating authority: `PART_135`.
   - Inputs intentionally absent: outside commercial flying, reserve/standby
     depth, transportation classification, actual flight-time/aloft-time
     fields.
   - Expected: readable deferred or missing-input findings.

## Prompt 237 Target

- Add safe local/demo fixture support for the scenario set.
- Prefer a gated script or smoke fixture helper over broad seed mutation if the
  data is only for QA.
- Do not run against Render by default.
- Avoid schema changes.
- Make fixtures idempotent through stable labels or cleanup-by-label in local
  test data only.

## Prompt 238 Target

- Add a read-only duty/rest diagnostic route or script that shows:
  - FlightLeg.
  - operating part/policy profile.
  - assigned crew.
  - visible duty periods.
  - visible rest periods.
  - evaluator findings and details JSON.
- Keep it internal/read-only.

## Prompt 239 Target

- Refine only clear evaluator gaps found by scenario QA.
- Keep warning-only behavior.
- Do not add hard enforcement, new schema, or legal signoff.

## Prompt 240 Target

- Verify duty/rest readiness findings persist correctly into explicit preview
  snapshots and release-attempt snapshots.

## Boundaries

- No hard release blocking.
- No schedule publishing or aircraft assignment blocking.
- No outside commercial flying ledger yet.
- No reserve/standby/transportation schema.
- No reduced-rest compensation tracking.
- No actual flight-time/aloft-time field changes.
- No legal compliance signoff.

## Validation Target For Implementation Slices

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`
- Scenario-specific duty/rest diagnostic checks.

## Assumptions

- Existing `CrewDutyPeriod` and `CrewRestPeriod` are enough for first-pass
  warning scenarios.
- Missing external inputs should be reported honestly, not treated as pass.
- Part 91 remains guardrail-only unless a future operator policy changes that.
