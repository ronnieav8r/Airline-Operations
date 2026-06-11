# Prompt 256: ADS-B Provider-Neutral Integration Planning

## Summary

Plan ADS-B and external flight-tracking integration without implementing
provider calls, schema changes, credentials, polling, maps, or UI behavior.

The selected approach is provider-neutral, ops-only, warning-first, and
evidence-oriented. External tracking should enrich flight locating and
operations awareness, not replace manual locating or become release truth.

## Locked Decisions

- Prompt 256 is planning-only.
- First tracking visibility is internal ops/admin/dispatch only.
- Manual flight locating and manual `PositionReport` remain the fallback
  operational record.
- Future implementation should store provider/raw/matching context in separate
  `ExternalTrackingObservation` records, then write accepted observations into
  `PositionReport`.
- ADS-B must not hard-block release, mark aircraft overdue by itself, update
  aircraft station/status silently, or create legal signatures.

## Planning Updates

- Track `docs/ADSB_DATA_SOURCE_OPTIONS_REPORT.md` as the source report.
- Expand `docs/EXTERNAL_TRACKING_INTEGRATION_PLAN.md` with the provider-neutral
  roadmap.
- Update project/frontend planning docs so frontend IA moves after this ADS-B
  planning insertion.

## Future Implementation Direction

1. Provider bakeoff outside the core app using actual fleet identifiers and
   regions.
2. Provider-neutral schema and adapter interfaces with no provider API calls.
3. Dry-run ingestion command that normalizes mock/provider payloads without
   writing operational data.
4. Write accepted observations to `ExternalTrackingObservation` and accepted
   `PositionReport` rows.
5. Add ops-only freshness/source badges on Operations Control, Aircraft detail,
   and Flight Locating pages.

## Deferred

- Provider credentials.
- Background polling.
- Webhooks.
- Maps.
- Streaming.
- Crew/customer visibility.
- Release blocking.
- Automated aircraft status/station changes.
- Provider-backed legal or compliance conclusions.

## Validation

- `git diff --check`
- Optional static safety pass:
  - `npm run prisma:validate`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
