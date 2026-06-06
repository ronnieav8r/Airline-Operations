# Builder Prompt 12: Release Evidence Schema Planning

## Summary

Plan the next additive schema slice for release evidence attached to `FlightLeg`.
This is a planning/documentation slice only. Do not implement Prisma schema,
migrations, seed, backfill, UI, APIs, or CRUD yet.

## Current State

The app now has:

- `FlightLeg` foundation populated locally and on Render.
- Dashboard `/`, Flights `/flights`, and Operations Control `/operations-control`
  reading through FlightLeg-backed helpers with legacy `Flight` fallback.
- Hidden parity diagnostic at `/internal/flightleg-parity`.
- Existing `FlightRelease` still attached to `OperationalControlRecord`.

## Planning Goal

Define the minimum release-evidence schema foundation needed after FlightLeg:

- `Manifest`
- `ManifestItem`
- `WeightBalanceRun`
- `FlightLocatingRecord`
- `DispatchPackage`
- `WeatherBriefingSnapshot`
- `NotamSnapshot`
- `FlightPlanReference`

Optionally evaluate whether `PositionReport` belongs in this same slice or a
later locating-specific slice.

## Required Decisions

Answer these in the planning doc before implementation:

- Which tables are in the first additive migration and which are deferred.
- Which tables are one-to-one with `FlightLeg` and which are one-to-many.
- Which statuses/enums are required now versus plain string fields.
- Whether existing `FlightRelease` remains as-is or whether a new
  `ReleasePackage` should wait for a later transition.
- How demo seed/backfill should create minimal records without broad production
  seed behavior.
- Which health counts should be added after implementation.
- Which current pages, if any, should show read-only release evidence summaries
  after the schema exists.

## Suggested Direction

Keep Prompt 13 implementation smaller than the full planning DBML:

- Include `Manifest`, `ManifestItem`, `WeightBalanceRun`,
  `FlightLocatingRecord`, `DispatchPackage`, `WeatherBriefingSnapshot`,
  `NotamSnapshot`, and `FlightPlanReference`.
- Defer `ReleasePackage` until the current `FlightRelease` to release-package
  transition is explicitly planned.
- Defer `PositionReport` unless the first implementation needs actual locating
  position history.
- Attach all new operational evidence records to `FlightLeg`, not legacy
  `Flight`.
- Keep `Passenger` as the current passenger model; do not redesign passenger
  identity in this slice.

## Safety Rules

- No code or schema implementation in Prompt 12.
- No migrations.
- No seed or backfill changes.
- No Render changes.
- No UI/CRUD.
- Do not remove or rename `FlightRelease`.
- Do not break the current `Flight` fallback path.
- Keep the hidden parity diagnostic green.

## Expected Output

Create or update docs with:

- A concise release-evidence schema decision document.
- A proposed Prompt 13 implementation plan.
- DBML notes showing the intended first additive slice versus deferred tables.
- Validation criteria for the future implementation.

## Validation For This Planning Slice

Because this is docs-only:

```powershell
npm run typecheck
npm run lint
npm run build
```

No local database migration or seed should be required for Prompt 12.
