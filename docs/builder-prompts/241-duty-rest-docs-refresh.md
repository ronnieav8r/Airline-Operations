# Prompt 241: Duty/Rest Docs Refresh

## Summary

Close the duty/rest calculator QA/refinement batch with current status docs.
This slice is docs-only.

## Completed Docs Work

- Added `docs/DUTY_REST_MVP_STATUS.md`.
- Refreshed duty/rest policy and scenario docs so Prompt 208-240 behavior is
  current, not future-tense.
- Updated backend MVP and project status docs to mark the warning-only
  duty/rest calculator batch complete.

## Current Boundary

- Duty/rest settings, scenario fixtures, diagnostics, calculator warnings, and
  snapshot persistence are in place for backend MVP.
- Duty/rest remains warning-only.
- No hard release blocking, scheduling blocking, aircraft-assignment blocking,
  legal signatures, outside-flying ledger, reserve/standby/transportation
  model, reduced-rest debt, or actual-flight-time engine exists yet.

## Validation

- Docs-only review.
- `git diff --check`.
