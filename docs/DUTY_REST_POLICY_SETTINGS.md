# Duty/Rest Policy Settings

Last updated: 2026-06-11

## Purpose

AeroOps now has a warning-only duty/rest settings foundation based on
`docs/DUTY_REST_REGULATORY_RESEARCH.md`.

These settings answer: which duty/rest rule families should be considered for
an operating authority, what inputs are required, and which findings require
operator review later. They do not decide legal compliance yet.

## Current Data Model

- `DutyRestPolicyProfile`: authority-level policy configuration.
- `DutyRestRuleSetting`: report-derived rule setting rows under a profile.
- `DutyRule`: older shallow demo threshold table retained for compatibility.

## Current Defaults

- Ordinary Part 91: guardrail-only. AeroOps should not apply Part 91K, Part
  135, or Part 117 duty/rest warnings to ordinary Part 91 unless a specific
  operator policy or legal authority is configured later.
- Part 135: warning-only unscheduled/on-demand defaults for 14 CFR 135.263 and
  135.267.
- Part 91K: warning-only defaults are supported for future Part 91K authorities.
- Enforcement mode: `WARNING_ONLY`.
- Calculation basis: `UTC`.
- Reserve is not rest.
- Standby counts as duty.
- Required non-local transportation does not count as rest.
- Reduced rest requires operator/legal review.
- Outside commercial flying is marked required where cumulative limits depend on
  all commercial flying.

## Diagnostic

Use:

```text
/internal/duty-rest-policy-readiness
```

This page shows default profile coverage, rule counts, warning/info severity,
external flying flags, and missing default settings.

Health counts:

```text
/api/health
```

Includes:

- `dutyRestPolicyProfiles`
- `dutyRestRuleSettings`

## Backfill

Local/demo/Render-safe backfill:

```powershell
$env:RUN_DUTY_REST_POLICY_BACKFILL="1"
npm run backfill:duty-rest-policy
```

The script skips unless the env flag is set.

## Deferred

Do not add hard enforcement until operator/legal review decides exact
applicability and input requirements.

Deferred items:

- Duty/rest calculation engine.
- Persisted warning snapshots.
- Release, schedule, or assignment blocking.
- Acknowledgement/signature workflow.
- External commercial flying ledger.
- Crew reserve/standby/transportation event tables.
- Reduced-rest compensation tracking.
- OpSpecs/MSpecs-specific policy overrides.
