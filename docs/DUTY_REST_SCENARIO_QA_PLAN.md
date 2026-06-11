# Duty/Rest Scenario QA Plan

Last updated: 2026-06-11

## Purpose

Create deterministic local scenarios for the warning-only duty/rest evaluator so
future calculator refinements can be tested against known expected outcomes.

## Scenario Matrix

| Scenario | Authority | Expected Result |
| --- | --- | --- |
| Ordinary Part 91 guardrail | `PART_91` | Guardrail/info findings only; no Part 135 limits. |
| Part 135 unscheduled pass | `PART_135` | Supported checks pass; missing external-flying/deferred checks remain visible. |
| Part 135 missing rest warning | `PART_135` | 10-hour rest finding warns. |
| Part 135 missing input | `PART_135` | Missing-input findings appear instead of false pass. |
| Part 135 duty/rest overlap | `PART_135` | No-duty-during-rest finding warns. |
| Deferred-data case | `PART_135` | Outside flying, reserve/standby, transportation, and actual-time gaps are readable deferred/missing-input findings. |

## Fixture Policy

- Local/demo only.
- Idempotent.
- Safe to rerun.
- Do not run against Render unless explicitly gated.
- No schema changes.

Prompt 237 implementation status: complete. Use:

```powershell
$env:RUN_DUTY_REST_SCENARIOS="1"
npm run seed:duty-rest-scenarios
```

The script skips unless the environment flag is set.

## Diagnostic Policy

Scenario QA should be inspectable from a read-only diagnostic route or script
showing the FlightLeg, operating authority, assigned crew, duty periods, rest
periods, and evaluator findings.

Prompt 238 implementation status: complete. Use:

```text
/internal/duty-rest-scenarios
```

The route evaluates seeded scenario FlightLegs live and shows expected outcome,
finding status, message, rule key, and details JSON.

Prompt 239 refinement status: complete. The Part 135 pass scenario should now
show supported current-leg scheduled-block findings as `PASS` when the scheduled
block is inside the one-pilot or two-pilot estimate, while outside commercial
flying and transportation gaps remain visible as missing/deferred items.

Prompt 240 snapshot QA status: complete. Use:

```powershell
npm run smoke:duty-rest-snapshot
```

The smoke captures a real readiness snapshot from live readiness helper output
and verifies the persisted `duty-rest` finding includes evaluator subfindings.
Results are tracked in `docs/DUTY_REST_SCENARIO_QA_LOG.md`.

Prompt 241 docs refresh status: complete. The current MVP boundary is captured
in `docs/DUTY_REST_MVP_STATUS.md`.

## Deferred

- Hard enforcement.
- Outside commercial flying ledger.
- Reserve/standby/transportation event schema.
- Reduced-rest compensation tracking.
- Actual airborne/aloft-time schema.
- Legal signoff.
