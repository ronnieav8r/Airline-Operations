# Backend MVP Smoke Harness Plan

Last updated: 2026-06-11

## Summary

The backend MVP smoke harness should provide one command-driven QA baseline for
the core backend before frontend/UI polish. It should combine:

- HTTP route and role-gate checks.
- Database-backed workflow checks.
- Playwright browser checks for real login and high-value workflow navigation.

The current harness already covers smoke users, core routes, coverage API
identity aliases, FlightLeg create/edit at the database layer, schedule publish,
crew portal request submission, logistics writes, and ReleasePackage preview
capture. Prompt 219 should expand that into a fuller backend-MVP smoke baseline.

## Prompt 219 Target

Expand smoke coverage without changing product behavior:

- Add route checks for release diagnostics and schedule/logistics/admin workflow
  routes that are part of backend MVP.
- Extend workflow smoke to verify release evidence data exists for a created
  FlightLeg or selected seeded FlightLeg, including manifest, W&B, locating,
  dispatch, readiness snapshots, and ReleasePackage preview capture.
- Verify release actions remain warning-only by checking release state changes
  and audit records where existing server actions/data model support it.
- Verify duty/rest readiness appears in readiness snapshot findings.
- Verify scheduling workflows produce the expected period, draft entry,
  published entry, and linked `CrewSchedule` bridge rows.
- Verify crew portal request submissions create pending/submitted records scoped
  to the linked crew user.
- Verify logistics location and travel-support need writes keep FlightLeg,
  aircraft, station, crew, creator, status, provider-placeholder, and
  confirmation-placeholder links.
- Extend browser smoke enough to log in as admin and crew, open the key backend
  workflow pages, and confirm protected routes redirect for non-authorized
  roles.

## Harness Boundaries

- Do not add a production backdoor or HTTP bypass endpoint.
- Keep test-user setup behind `AEROOPS_ENABLE_TEST_AUTH=1`.
- Keep workflow smoke blocked against remote databases unless
  `AEROOPS_ALLOW_REMOTE_SMOKE=1` is explicit.
- Do not require hard release blocking, legal signatures, provider
  integrations, file uploads, or destructive cleanup.
- Prefer isolated `SMOKE-` records and idempotent assertions where practical.

## Minimum Runtime Commands

```powershell
$env:DATABASE_URL="postgresql://aeroops_local:aeroops_local_password@127.0.0.1:5434/aeroops_local?schema=public"
$env:AEROOPS_ENABLE_TEST_AUTH="1"
$env:AEROOPS_SMOKE_BASE_URL="http://127.0.0.1:3200"
$env:AEROOPS_BROWSER_BASE_URL="http://127.0.0.1:3200"
npm run db:local:up
npm run db:local:migrate
npm run db:local:seed
npm run test:users:setup
npm run smoke:workflows
npm run smoke:app
npm run smoke:browser
```

## Acceptance Criteria

- One local backend QA run exercises all MVP backend modules without manual
  mouse use.
- Smoke output clearly identifies the created runtime QA records.
- Failures are actionable and tied to a workflow area.
- The harness does not change public app behavior or loosen production auth.
