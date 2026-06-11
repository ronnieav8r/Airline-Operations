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

## Prompt 207 Calculator Plan

Prompt 207 selected the first duty/rest calculator boundary. Prompt 208 should
implement a narrow warning-only evaluator using existing data and existing
snapshot storage.

Selected first scope:

- Ordinary Part 91 guardrail/info findings only.
- Part 135 unscheduled/on-demand warnings first.
- FlightLeg release readiness as the first warning surface.
- Existing `ReleaseReadinessSnapshot` and `ReleaseReadinessFinding` as the first
  persistence path for captured findings.
- UTC planned preflight timing from `FlightLeg.scheduledDeparture` and
  `FlightLeg.scheduledArrival`.
- Scheduled-block duration estimates only, because AeroOps does not yet store a
  dedicated airborne/logged flight-time field.

Prompt 208 should produce readable `PASS`, `WARNING`, `MISSING_INPUT`,
`NOT_APPLICABLE`, and `DEFERRED` findings. It must not hard-block release,
schedule publishing, aircraft assignment, or crew portal actions.

## Prompt 208 Implementation

Prompt 208 implements the first warning-only evaluator and surfaces it as a
single `duty-rest` readiness item on FlightLeg detail. The evaluator uses the
default duty/rest policy profile, enabled duty/rest rule settings, FlightLeg
schedule, crew snapshot assignments, and visible crew duty/rest periods.

The readiness item stores evaluator subfindings in the existing readiness item
details JSON. Explicit preview snapshots and release-attempt snapshots persist
that same `duty-rest` item through existing `ReleaseReadinessSnapshot` and
`ReleaseReadinessFinding` records.

Current behavior remains warning-only:

- Ordinary Part 91 shows guardrail/info behavior and does not apply Part 135
  limits.
- Part 135 unscheduled/on-demand shows warnings or missing-input/deferred
  findings when visible data is incomplete.
- Release actions, schedule publishing, aircraft assignment, and crew portal
  actions remain continueable.

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

- Broader duty/rest calculation engine beyond the Prompt 208 warning-only first
  pass.
- Dedicated `CrewDutyRestWarning` table.
- Release, schedule, or assignment blocking.
- Acknowledgement/signature workflow.
- External commercial flying ledger.
- Crew reserve/standby/transportation event tables.
- Reduced-rest compensation tracking.
- OpSpecs/MSpecs-specific policy overrides.

## Prompt 236 Scenario QA Planning

Prompt 236 is complete as planning. Scenario QA should cover ordinary Part 91
guardrail behavior plus Part 135 unscheduled pass, warning, missing-input,
duty/rest overlap, and deferred-data cases. See
`docs/DUTY_REST_SCENARIO_QA_PLAN.md`.
