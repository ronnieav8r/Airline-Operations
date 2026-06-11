# Smoke Testing

Last updated: 2026-06-10

## Purpose

This repo has a command-driven smoke-test harness for local/demo QA. It creates
test users for every role, creates real DB-backed sessions, and checks app
routes over HTTP without mouse interaction.

This is not a production backdoor. There is no HTTP bypass endpoint. The tools
are command-line only and require an explicit environment gate.

## Safety Gate

All smoke auth commands require:

```powershell
$env:AEROOPS_ENABLE_TEST_AUTH="1"
```

If `NODE_ENV=production`, smoke auth also requires:

```powershell
$env:AEROOPS_ALLOW_PRODUCTION_TEST_USERS="1"
```

Do not enable production smoke users unless intentionally testing a disposable
demo environment.

## Smoke Users

Default password:

```text
AeroOpsSmoke!2026
```

Override with:

```powershell
$env:AEROOPS_SMOKE_TEST_PASSWORD="YourStrongPasswordHere"
```

Default smoke accounts:

| Email | Role |
| --- | --- |
| `admin@aeroops.local` | `ADMIN` |
| `ops@aeroops.local` | `OPS` |
| `dispatch@aeroops.local` | `DISPATCH` |
| `maintenance@aeroops.local` | `MAINTENANCE` |
| `crew@aeroops.local` | `CREW` |
| `safety@aeroops.local` | `SAFETY` |
| `viewer@aeroops.local` | `VIEWER` |

The setup command links `crew@aeroops.local` to an existing seeded crew member
when one exists, so `/crew/portal` can be tested.

## Local Setup

From the repo root:

```powershell
$env:AEROOPS_ENABLE_TEST_AUTH="1"
npm run db:local:up
npm run db:local:migrate
npm run db:local:seed
npm run test:users:setup
npm run smoke:workflows
```

Start the app in another terminal:

```powershell
npm run dev:local
```

Then run:

```powershell
$env:AEROOPS_ENABLE_TEST_AUTH="1"
$env:AEROOPS_SMOKE_BASE_URL="http://127.0.0.1:3200"
npm run smoke:app
npm run smoke:browser
```

The workflow smoke command writes runtime QA records with `SMOKE-` identifiers.
It verifies smoke-user credentials, creates and edits a FlightLeg compatibility
bridge, publishes a crew schedule period into `CrewSchedule`, submits crew
portal requests, creates and books a crew logistics need, and captures a
ReleasePackage preview. It refuses non-local database URLs unless
`AEROOPS_ALLOW_REMOTE_SMOKE=1` is explicitly set.

`npm run smoke:browser` runs a Playwright Chromium browser smoke test. It logs
in through the real `/login` form, opens protected admin workflow pages, opens
the crew portal as a crew user, and confirms the crew user is redirected away
from crew logistics management.

## What The Smoke Runner Checks

- Anonymous `/login` returns successfully.
- Every role can open core app surfaces:
  - `/`
  - `/operations-control`
  - `/flights`
  - `/aircraft`
  - `/crew`
  - `/crew/scheduling`
  - `/scheduling`
  - `/api/health`
- Dynamic seeded routes are reachable:
  - one FlightLeg detail page
  - one aircraft context page
  - one crew detail page
- Role-specific access is checked:
  - `ADMIN` and `OPS` can open crew logistics management.
  - `CREW` can open `/crew/portal`.
  - non-ops roles are redirected away from crew logistics management.
  - dispatch, maintenance, safety, and viewer smoke their relevant read
    surfaces.

## Limitations

The HTTP smoke runner checks route access and role gates. The workflow smoke
runner checks representative database outcomes for core create/edit workflows,
and the browser smoke runner checks real login/form navigation in Chromium.

## Current Runtime Note

Recent attempts to start the local Docker database failed because Docker
Desktop was unavailable:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

The smoke commands require the app and database to be running.
