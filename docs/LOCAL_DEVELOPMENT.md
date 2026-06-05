# Local Development

Last updated: 2026-06-05

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

Start the local app:

```powershell
npm run dev:local
```

Open:

```text
http://127.0.0.1:3200
```

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
- Render still uses `npm run render-build` and `npm run start`; this local setup
  does not change production deployment commands.
