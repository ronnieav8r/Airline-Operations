# Prompt 218: Backend MVP Smoke Harness Planning

## Summary

Plan the backend MVP smoke harness before expanding test code. The selected
approach is to build on the existing route smoke, workflow smoke, and
Playwright browser smoke rather than creating a separate test framework.

## Current Harness

- `npm run smoke:app` checks role-based route access, dynamic seeded routes,
  and FlightLeg/legacy coverage API identity compatibility.
- `npm run smoke:workflows` verifies smoke-user credentials and representative
  database workflows for FlightLeg create/edit, schedule publish, crew portal
  request submission, logistics writes, and ReleasePackage preview capture.
- `npm run smoke:browser` uses Playwright/Chromium to log in through `/login`
  and open protected workflow pages.

## Prompt 219 Target

- Expand workflow smoke to cover release evidence presence, readiness snapshot
  persistence, duty/rest readiness findings, release-package preview capture,
  scheduling publish bridge rows, crew portal request scoping, and logistics
  link integrity.
- Expand route/browser smoke for the backend MVP routes that are not yet
  covered.
- Keep the smoke harness command-driven and gated by explicit local/test
  environment variables.
- Do not add a production backdoor, provider integration, hard release blocking,
  legal signature behavior, file uploads, or destructive cleanup.

## Docs

- Added `docs/BACKEND_MVP_SMOKE_HARNESS_PLAN.md`.
- Update `docs/BACKEND_MVP_COMPLETION_PLAN.md`, `docs/PROJECT_STATUS.md`, and
  `docs/SMOKE_TESTING.md` to point Prompt 219 at this harness expansion.

## Validation

- `git diff --check`
