# Local Development

Last updated: 2026-07-26

This repo can run locally on this Windows PC with Docker Desktop and a local
Postgres database. This avoids using the live Render database for day-to-day
development checks.

## Local Endpoints

- App: `http://127.0.0.1:3200`
- Postgres: `127.0.0.1:5434`
- Database: `aeroops_local`
- Container: `aeroops-local-postgres`

## First-Time Setup

Run these from the repo root:

```powershell
E:\Codex\Airline Operations\Airline Operations
```

Create the private local env file:

```powershell
Copy-Item .env.local.example .env.local
```

Start local Postgres:

```powershell
npm run db:local:up
```

Apply Prisma migrations to the local database:

```powershell
npm run db:local:migrate
```

Load demo data into the local database:

```powershell
npm run db:local:seed
```

The local seed creates the current `Flight` rows, matching additive `FlightLeg`
foundation rows, release-evidence demo rows, and airworthiness demo rows. The
separate FlightLeg, release-evidence, and airworthiness backfill scripts are
gated and normally skipped unless intentionally run.

Optional gated FlightLeg backfill:

```powershell
$env:RUN_FLIGHTLEG_BACKFILL="1"; npm run backfill:flightleg
```

Optional gated release-evidence backfill:

```powershell
$env:RUN_RELEASE_EVIDENCE_BACKFILL="1"; npm run backfill:release-evidence
```

Optional gated airworthiness backfill:

```powershell
$env:RUN_AIRWORTHINESS_BACKFILL="1"; npm run backfill:airworthiness
```

Start the local app:

```powershell
npm run dev:local
```

If Next.js Turbopack reports a corrupt task database, loses known routes with
404 responses, or references missing `.next\dev\cache\turbopack` files:

1. Stop the local app process.
2. Move the generated `.next` directory to a temporary backup outside the
   repo. Do not delete or edit application source.
3. Confirm `node_modules\@prisma\client` is populated; run
   `npm run prisma:generate` after restoring dependencies when needed.
4. Start the local webpack fallback:

```powershell
.\node_modules\.bin\next.cmd dev --webpack -H 127.0.0.1 -p 3200
```

Recheck the affected route plus one unrelated route. The 2026-07-26 handoff
used this recovery to restore `/crew/scheduling`,
`/crew/scheduling/periods`, and `/maintenance` to HTTP 200 without an
application-source change.

Open:

```text
http://127.0.0.1:3200
```

## Command-Driven Smoke Testing

Smoke-test users and route checks are documented in
`docs/SMOKE_TESTING.md`.

Create/update local smoke users:

```powershell
$env:AEROOPS_ENABLE_TEST_AUTH="1"
npm run test:users:setup
```

With the local app running at `http://127.0.0.1:3200`, run:

```powershell
$env:AEROOPS_ENABLE_TEST_AUTH="1"
$env:AEROOPS_SMOKE_BASE_URL="http://127.0.0.1:3200"
npm run smoke:app
```

The smoke harness creates real DB-backed sessions for each test role and checks
routes over HTTP. It is gated and should not be treated as a production
backdoor.

## Daily Use

1. Confirm Docker Desktop is running.
2. Run `npm run db:local:up`.
3. Run `npm run db:local:migrate` after schema changes.
4. Run `npm run dev:local`.
5. Test at `http://127.0.0.1:3200`.

Stop local Postgres when needed:

```powershell
npm run db:local:down
```

## Important Boundaries

- Keep `.env.local` pointed at the local Docker database unless explicitly
  testing against Render.
- `npm run db:local:seed` is safe for local demo data, but it deletes and
  recreates seed-owned demo rows. Do not run it against production data.
- `npm run backfill:flightleg` skips unless `RUN_FLIGHTLEG_BACKFILL=1` is set.
  Use it only when intentionally creating bridge records outside the local seed.
- `npm run backfill:release-evidence` skips unless
  `RUN_RELEASE_EVIDENCE_BACKFILL=1` is set.
- `npm run backfill:airworthiness` skips unless
  `RUN_AIRWORTHINESS_BACKFILL=1` is set.
- Render still uses `npm run render-build` and `npm run start`; this local setup
  does not change production deployment commands.
