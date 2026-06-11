# Documentation Audit

Last updated: 2026-06-11

## Result

Docs cleanup is useful and now started. The repository has strong planning and
audit coverage, but the volume is high enough that new builders need a docs map
and a clear stale-note rule.

## What Was Found

- Top-level `docs` contains many active domain docs, QA logs, research reports,
  and DBML files.
- `docs/builder-prompts` contains 250+ prompt history files. These are useful
  audit records and should be preserved.
- `docs/PROJECT_STATUS.md` is very large and serves as both current status and
  running history.
- Several older domain docs preserve "runtime QA pending" or "Docker Desktop
  unavailable" notes from before the final backend MVP smoke pass.
- Current backend-MVP status and QA docs supersede many older pending notes.

## Cleanup Performed In Prompt 257

- Added `docs/README.md` as the primary docs map.
- Added this audit note.
- Updated project status and frontend readiness prompt numbering.
- Updated builder onboarding and root README to point to the docs map.
- Added supersession notes to key domain docs that still contain historical
  runtime-pending language.

## Current Source-Of-Truth Rule

Use current MVP/status docs first:

- `docs/BACKEND_MVP_STATE.md`
- `docs/BACKEND_MVP_FINAL_SMOKE_QA.md`
- domain MVP status docs such as `CREW_SCHEDULING_MVP_STATUS.md`,
  `CREW_COMPLIANCE_MVP_STATUS.md`, `CREW_LOGISTICS_MVP_STATUS.md`, and
  `DUTY_REST_MVP_STATUS.md`
- current domain plans such as `EXTERNAL_TRACKING_INTEGRATION_PLAN.md`

Treat older builder prompts and old QA entries as historical unless newer docs
confirm the issue is still active.

## Recommended Future Cleanup

- Eventually split `docs/PROJECT_STATUS.md` into:
  - `docs/PROJECT_STATUS.md` for concise current state,
  - `docs/PROJECT_HISTORY.md` for completed prompt history.
- Consider subfolders only after frontend work begins, for example:
  - `docs/status/`
  - `docs/domain/`
  - `docs/qa/`
  - `docs/research/`
- Do not move files in the first cleanup unless link maintenance is handled in
  the same slice.
