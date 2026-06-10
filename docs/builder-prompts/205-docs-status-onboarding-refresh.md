# Prompt 205: Docs/Status/Onboarding Refresh

## Summary

Refresh onboarding documentation after the major scaffolding macro chain. This
is docs-only.

## Scope

- Update README orientation.
- Add a current builder/planner onboarding note.
- Update project and macro status to mark Prompts 159-205 complete for static
  validation.
- Preserve all runtime QA pending notes where Docker Desktop was unavailable.

## Boundaries

- No product code changes.
- No schema changes.
- No new workflows, provider integrations, imports, booking, release blocking,
  assignment automation, or duty/rest enforcement.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
