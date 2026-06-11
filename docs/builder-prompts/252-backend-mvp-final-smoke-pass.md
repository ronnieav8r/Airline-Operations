# Prompt 252: Backend MVP Final Smoke Pass

## Summary

Run the full backend MVP smoke pass across static checks, local database prep,
route checks, browser checks, and focused workflow smokes. Fix only clear bugs
that do not require a product decision.

## Scope

- Auth and role gates.
- FlightLeg create/edit and compatibility coverage APIs.
- Release evidence, readiness snapshots, release actions, and ReleasePackage
  capture.
- Crew compliance admin records.
- Duty/rest warning calculator and snapshot persistence.
- Crew scheduling periods, publishing, rotation pattern draft generation,
  requests, time off, and crew portal.
- Crew logistics workflow and workbench.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run db:local:up`
- `npm run db:local:migrate`
- `npm run db:local:seed`
- `npm run seed:duty-rest-scenarios`
- `npm run smoke:duty-rest-snapshot`
- `npm run smoke:schedule-publishing`
- `npm run smoke:rotation-patterns`
- `npm run smoke:crew-requests-time-off`
- `npm run smoke:crew-portal-backend`
- `npm run smoke:crew-logistics-workflow`
- `npm run smoke:crew-logistics-workbench`
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Stop Gates

Stop and plan if QA exposes hard release blocking, legal signatures, provider
integrations, file uploads, destructive legacy `Flight` removal, or ambiguous
regulatory/product policy.
