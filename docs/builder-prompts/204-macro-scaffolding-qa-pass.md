# Prompt 204: Macro Scaffolding QA Pass

## Summary

Run a macro QA/status pass across the major scaffolding chains completed in
Prompts 159-203. This is QA/docs only unless validation exposes a defect.

## Scope

- Review auth, roles, and attribution status.
- Review FlightLeg cutover and ReleasePackage status.
- Review crew compliance status.
- Review crew scheduling lifecycle status.
- Review crew self-service portal status.
- Review crew logistics status.
- Confirm warning-first boundaries remain in place.
- Confirm runtime QA gaps are documented.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Docker/runtime smoke when available.

## Boundaries

- No new schema.
- No new UI/workflow implementation.
- No booking, provider integration, file upload, hard release blocking,
  signature semantics, assignment automation, or duty/rest hard enforcement.
