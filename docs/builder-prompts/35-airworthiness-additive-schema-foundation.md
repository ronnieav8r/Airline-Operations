# Builder Prompt 35: Airworthiness Additive Schema Foundation

## Summary

Add the first airworthiness foundation as an additive schema slice. This slice
adds Prisma models, migration, local seed/backfill, gated Render-safe backfill,
health counts, and DBML/docs. It does not add UI writes, component tracking,
provider integrations, or release blocking.

## Key Changes

- Added airworthiness enums.
- Added additive models:
  - `AircraftConfiguration`
  - `AircraftCapability`
  - `Discrepancy`
  - `Deferral`
  - `MaintenanceEvent`
  - `AirworthinessRelease`
- Added `RUN_AIRWORTHINESS_BACKFILL=1` gated demo backfill.
- Added local seed records for demo airworthiness data.
- Added `/api/health` counts for the new tables.
- Updated DBML and airworthiness docs.

## Boundary

This is schema and demo data only.

- No UI mutation routes.
- No release blocking.
- No `ReleasePackage`.
- No component-level maintenance records.
- No reliability analytics.
- No file uploads.
- No maintenance vendor/provider integrations.

## Validation

Run:

```powershell
npm run db:local:migrate
npm run db:local:seed
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/api/health` returns nonzero counts for the new airworthiness tables.
- `/operations-control`, `/aircraft`, `/operations-control/[flightLegId]`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return 200.

## Render Safety

`render-build` runs the airworthiness backfill command, but it skips unless:

```text
RUN_AIRWORTHINESS_BACKFILL=1
```

Do not run broad seed against Render.
