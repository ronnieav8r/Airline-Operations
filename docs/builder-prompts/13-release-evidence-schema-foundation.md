# Builder Prompt 13: Release Evidence Schema Foundation

## Summary

Implement the first additive release-evidence schema slice attached to
`FlightLeg`. This is schema, seed/backfill, health, and docs only. Do not add
CRUD, mutation routes, or UI rewiring.

Use `docs/RELEASE_EVIDENCE_SCHEMA_DECISIONS.md` as the source of truth.

## Key Changes

Add new Prisma enums:

- `ManifestStatus`: `DRAFT`, `READY`, `LOCKED`, `AMENDED`, `VOIDED`
- `WeightBalanceStatus`: `DRAFT`, `CALCULATED`, `APPROVED`, `VOIDED`
- `FlightLocatingStatus`: `NOT_STARTED`, `FILED`, `ACTIVE`, `CLOSED`, `OVERDUE`

Add new Prisma models:

- `Manifest`
- `ManifestItem`
- `WeightBalanceRun`
- `FlightLocatingRecord`
- `DispatchPackage`
- `WeatherBriefingSnapshot`
- `NotamSnapshot`
- `FlightPlanReference`

Attach all new operational evidence records to `FlightLeg`, not legacy `Flight`.

## Relationship Requirements

- `Manifest` is one-to-one with `FlightLeg`.
- `ManifestItem` is many-to-one with `Manifest` and may optionally reference
  current `Passenger`.
- `WeightBalanceRun` is many-to-one with `FlightLeg` and may optionally
  reference `Manifest`.
- `FlightLocatingRecord` is one-to-one with `FlightLeg`.
- `FlightPlanReference` is many-to-one with `FlightLeg`.
- `DispatchPackage` is one-to-one with `FlightLeg`.
- `DispatchPackage` may optionally reference one `WeatherBriefingSnapshot`, one
  `NotamSnapshot`, and one `FlightPlanReference`.
- `WeatherBriefingSnapshot` and `NotamSnapshot` are snapshot records; do not
  require provider integrations.

Do not add `ReleasePackage` yet.
Do not add `PositionReport` yet.
Do not add `AircraftConfiguration` or `aircraftConfigurationId` yet.

## Backfill And Seed Behavior

Update local `prisma/seed.ts` so local demo seed creates release-evidence
records after current FlightLeg foundation records.

Add a gated script:

```text
scripts/backfill-release-evidence-demo.ts
```

Gate it with:

```text
RUN_RELEASE_EVIDENCE_BACKFILL=1
```

Default behavior must skip.

Backfill mapping:

- Create one `Manifest` per existing `FlightLeg`.
- Create `ManifestItem` rows from current `FlightPassenger` rows through
  `FlightLeg.legacyFlightId` when available.
- Create one `FlightLocatingRecord` per `FlightLeg` with a conservative demo
  status.
- Create one demo `WeatherBriefingSnapshot` and `NotamSnapshot` per `FlightLeg`.
- Create at least one `FlightPlanReference` per `FlightLeg`.
- Create one `DispatchPackage` per `FlightLeg` linking the current demo
  snapshots and flight-plan reference.
- Create one `WeightBalanceRun` per `FlightLeg` where enough demo data exists.
- Make the script idempotent.

Do not run broad seed against Render. Production/demo backfill must use only the
gated script.

Update `package.json` and `render-build` so the new backfill script is available
and skips by default on Render.

## Docs And Health

Update `/api/health` with counts for:

- `manifests`
- `manifestItems`
- `weightBalanceRuns`
- `flightLocatingRecords`
- `dispatchPackages`
- `weatherBriefingSnapshots`
- `notamSnapshots`
- `flightPlanReferences`

Update docs:

- `docs/schema.current.dbml`
- `docs/schema.dbml` if still maintained as a current schema artifact
- `docs/schema.visual.dbml` if still maintained as a current schema artifact
- `docs/schema.planning.flightleg.dbml` only if needed to clarify implemented
  versus planning-only tables
- `docs/PROJECT_STATUS.md`
- `docs/SCHEMA_DECISIONS.md`

## Safety Rules

- Additive migration only.
- No drops, renames, destructive resets, or required columns added to populated
  existing tables.
- Do not remove or rename `Flight`, `FlightLeg`, `OperationalControlRecord`, or
  `FlightRelease`.
- Do not migrate current UI/API reads in this slice.
- Do not create CRUD screens, mutation routes, or provider integrations.
- Keep the hidden parity diagnostic green.

## Test Plan

Local database:

```powershell
npm run db:local:up
npm run db:local:migrate
npm run db:local:seed
```

If the release-evidence backfill is separate from seed:

```powershell
$env:RUN_RELEASE_EVIDENCE_BACKFILL='1'
npm run backfill:release-evidence
$env:RUN_RELEASE_EVIDENCE_BACKFILL='0'
```

Validation:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/api/health` returns nonzero local counts for the new release-evidence tables
  after seed/backfill.
- Existing pages still return 200: `/`, `/flights`, `/operations-control`,
  `/aircraft`, `/crew`, and `/scheduling`.
- `/internal/flightleg-parity` still reports no mismatches.

Render:

- Deploy from `origin main`.
- Do not run broad seed.
- If demo data is needed, set `RUN_RELEASE_EVIDENCE_BACKFILL=1`, let Render
  deploy, verify health counts, then set it back to `0`.
