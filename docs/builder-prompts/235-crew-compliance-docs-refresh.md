# Prompt 235: Crew Compliance Docs Refresh

## Summary

Prompt 235 refreshes crew compliance documentation after the admin workflow
chain is complete.

## Documentation Updates

- Added `docs/CREW_COMPLIANCE_MVP_STATUS.md`.
- Updated project status and backend-MVP plan.
- Updated builder onboarding to list the compliance admin route.
- Updated schema decisions to clarify that the first admin workflow chain used
  existing schema only.

## Current Compliance Backend Position

Crew compliance backend is MVP-complete for warning-only development use.
Ops/admin users can manage certificate, medical, training, check, recency, duty,
and rest records under `/crew/[crewMemberId]/compliance`.

## Deferred

- Legal duty/rest enforcement.
- Formal signatures.
- File uploads.
- Provider/FAA verification integrations.
- Crew self-service compliance uploads.
- Compliance import execution.
- Hard release blocking.

## Validation

Docs-only slice. `git diff --check` should pass before commit.

## Next Slice

Prompt 236 should plan duty/rest scenario QA and refinement.
