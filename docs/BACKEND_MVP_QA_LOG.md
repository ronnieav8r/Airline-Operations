# Backend MVP QA Log

Last updated: 2026-06-11

## Prompt 220: Backend MVP QA Pass

Result: pass.

Environment:

- Local Docker Postgres on `127.0.0.1:5434`.
- Local app reachable at `http://127.0.0.1:3200`.
- Smoke auth enabled with `AEROOPS_ENABLE_TEST_AUTH=1`.
- Workflow smoke used local `DATABASE_URL`.

Validation:

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run db:local:up`: pass.
- `npm run db:local:migrate`: pass; no pending migrations.
- `npm run db:local:seed`: pass.
- `npm run smoke:workflows`: pass.
- `npm run smoke:app`: pass.
- `npm run smoke:browser`: pass.

Workflow smoke evidence:

- Run label: `SMOKE-20260611125426`.
- Verified seven smoke-test credentials.
- Created and edited a FlightLeg compatibility bridge.
- Created representative release evidence: manifest, W&B, locating, dispatch,
  flight plan, readiness snapshot, and duty/rest warning-only finding.
- Published a crew schedule period and linked `CrewSchedule` bridge row.
- Submitted crew portal time-off and schedule requests.
- Recorded crew location and booked a logistics need placeholder.
- Captured a ReleasePackage preview.
- Updated a FlightRelease to `RELEASED` and created an attributed release audit
  event.

Route/browser smoke evidence:

- Route smoke passed for all roles and core surfaces.
- Coverage and crew API identity aliases passed for FlightLeg and legacy Flight
  IDs.
- Playwright browser smoke passed for admin protected workflow pages.
- Playwright browser smoke passed for crew portal and crew logistics access
  denial.

Issues found:

- None requiring code fixes in Prompt 220.

Residual risks:

- The workflow smoke validates representative database outcomes; it does not
  drive every server action through the browser.
- Release behavior remains warning-only by design.
- Compliance admin workflows are not part of the current MVP harness because
  they are not implemented yet.
