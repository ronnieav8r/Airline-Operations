# Backend MVP Final Smoke QA

Last updated: 2026-06-11

## Prompt 252 Result

Status: pass.

## Scope

Prompt 252 validates the backend MVP as an integrated system before the final
gap review and frontend readiness planning.

## Validation Matrix

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run db:local:up`: pass.
- `npm run db:local:migrate`: pass.
- `npm run db:local:seed`: pass.
- `RUN_DUTY_REST_SCENARIOS=1 npm run seed:duty-rest-scenarios`: pass.
- `npm run smoke:duty-rest-snapshot`: pass.
- `npm run smoke:schedule-publishing`: pass.
- `npm run smoke:rotation-patterns`: pass.
- `npm run smoke:crew-requests-time-off`: pass.
- `npm run smoke:crew-portal-backend`: pass.
- `npm run smoke:crew-logistics-workflow`: pass.
- `npm run smoke:crew-logistics-workbench`: pass.
- `npm run smoke:workflows`: pass.
- `npm run smoke:app`: pass.
- `npm run smoke:browser`: pass.

## Findings

- No backend MVP smoke failures remain from Prompt 252.
- A first `npm run typecheck` was run in parallel with `npm run build` and hit
  a transient `.next` type-artifact race. Re-running `npm run typecheck`
  serially after build passed.
- Duty/rest scenario seed is correctly gated. It was rerun with
  `RUN_DUTY_REST_SCENARIOS=1` for this final smoke pass.

## Verified Coverage

- Smoke-test users exist for all current roles.
- Authenticated route and role gates pass.
- FlightLeg create/edit, release evidence, release package capture, and release
  audit workflows pass.
- FlightLeg/legacy coverage API identity aliases pass.
- Duty/rest warning snapshot capture passes.
- Schedule publishing, rotation pattern draft generation, request/time-off
  review, and crew portal request submission pass.
- Crew compliance admin workflow coverage passes through the full workflow
  smoke.
- Crew logistics create/edit and workbench filter/group/cross-link coverage
  pass.
- Browser smoke passes for admin protected workflow access and crew redirect
  behavior.

## Notes

- Release behavior remains warning-only.
- Legacy `Flight` remains compatibility/archive.
- Provider integrations, file uploads, hard release blocking, legal signatures,
  and destructive legacy removal remain out of scope.
