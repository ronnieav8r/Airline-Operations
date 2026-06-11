# Prompt 257: Documentation Audit And Navigation Cleanup

## Summary

Clean up AeroOps documentation navigation before frontend/UI work. This is a
docs-only slice. Do not delete historical builder prompts, change app behavior,
or modify schema/code.

## Goals

- Add a top-level docs map.
- Separate current source-of-truth docs from historical/audit/reference docs.
- Record known stale-doc patterns without rewriting all historical prompt
  records.
- Update onboarding/status docs so future builders start from the right files.
- Move frontend IA prompt numbering forward after this cleanup insertion.

## Validation

- `git diff --check`
- Optional static safety pass:
  - `npm run prisma:validate`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

## Boundaries

- Preserve all `docs/builder-prompts/*` files as audit history.
- Do not delete or move domain docs in this slice.
- Do not rewrite old prompt history exhaustively.
- Treat old Docker-unavailable QA notes as historical unless a current MVP
  status or QA doc says otherwise.
