# Prompt 61: Release Evidence Workflow Review

## Summary

Review the current release evidence workflows end-to-end from FlightLeg detail
and identify the next smallest user-visible improvement.

This is a planning/docs slice. Do not add hard blocking, auth/signatures,
provider integrations, file uploads, override workflow, `ReleasePackage`,
automatic snapshots, release-action changes, schema changes, or new mutation
work unless a clear defect is found.

## Review Scope

- FlightLeg detail release evidence hub.
- Manifest workflow.
- Weight-and-balance workflow.
- Flight locating workflow.
- Dispatch package workflow.
- Release Readiness checklist.
- Preview snapshot capture.
- Snapshot-readiness diagnostic.
- Snapshot findings detail.

## Review Questions

- What can a user currently do from FlightLeg detail?
- Which workflow has the largest usability gap for the smallest safe slice?
- Which gaps are intentionally deferred because they need policy, schema,
  auth/signatures, provider integrations, or hard-blocking decisions?
- What should the next builder prompt implement?

## Output

- Add `docs/RELEASE_EVIDENCE_WORKFLOW_REVIEW.md`.
- Update `docs/PROJECT_STATUS.md`.
- Update `docs/RELEASE_EVIDENCE_MUTATION_PLAN.md`.
- Recommend one next prompt only, plus deferred alternatives.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Optional local route smoke if the review discovers a suspected route defect.

## Assumptions

- Current behavior remains warning-only.
- Prompt 61 should not build the next workflow improvement.
- The next implementation slice should be small and user-visible.
