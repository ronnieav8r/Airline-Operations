# Duty/Rest Scenario QA Log

Last updated: 2026-06-11

## Prompt 240 Snapshot QA

Local validation confirmed that duty/rest readiness findings persist into
`ReleaseReadinessSnapshot` / `ReleaseReadinessFinding` records.

Checks:

- Seeded the duty/rest scenario matrix with `RUN_DUTY_REST_SCENARIOS=1`.
- Captured a readiness snapshot from live `getReleaseReadinessItems` output.
- Verified a persisted `duty-rest` finding exists.
- Verified the persisted finding stores evaluator subfindings in details JSON.
- Verified the persisted duty/rest finding remains warning-only.

Deferred:

- Legal enforcement.
- Hard release blocking.
- Outside commercial flying ledger.
- Transportation, reserve, standby, reduced-rest, and actual-flight-time
  calculations.
