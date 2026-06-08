# Prompt 68: ADS-B / External Tracking Integration Planning

## Summary

Plan future ADS-B and external flight-tracking integration without implementing
it now.

The chosen approach is **provider-neutral ingestion later**. Manual locating
and manual `PositionReport` rows remain the operational foundation. ADS-B or
external tracking data should become an additional source of observed position
reports, not the sole source of operational-control truth.

## Key Decisions

- Do not integrate with an ADS-B provider in this prompt.
- Do not choose a provider yet.
- Do not store credentials or API keys yet.
- Do not create background jobs yet.
- Do not make ADS-B data release-blocking.
- Treat ADS-B as situational-awareness evidence with source attribution.
- Keep human-entered locating notes and manual reports available even after
  external tracking exists.

## Future Data Direction

Future external tracking should be modeled around normalized position reports:

- FlightLeg or FlightLocatingRecord link.
- Aircraft link.
- Reported/observed time.
- Latitude and longitude.
- Altitude.
- Groundspeed.
- Heading.
- Source/provider.
- Provider aircraft identifier, such as ICAO hex or provider-specific ID.
- Provider event/reference ID where available.
- Confidence or matching quality.
- Raw provider payload only if licensing and storage policy allow it.

## Provider Concerns To Resolve Later

- Coverage gaps at low altitude, remote locations, and blocked aircraft.
- Tail-number, registration, ICAO hex, and provider-ID matching.
- Licensing limits for commercial use, retention, display, and redistribution.
- Polling frequency, rate limits, and cost.
- Provider outage behavior.
- Data freshness thresholds.
- Whether imported data can be used as compliance evidence or only as
  supplemental situational awareness.

## Recommended Future Slice

After manual `PositionReport` exists and is stable, create a future planning
slice:

```text
External Tracking Provider Selection And Data Contract
```

That slice should compare provider options, define the ingestion contract, and
decide whether provider observations need a separate raw-event table or can be
stored directly as `PositionReport` rows.

## Deferred

- ADS-B provider selection.
- Provider API integration.
- Background polling or webhooks.
- Aircraft ICAO hex mapping UI.
- Raw payload retention.
- Release blocking based on external tracking.
- Alerting/notification automation.

## Assumptions

- Manual locating remains useful even if ADS-B is later added.
- External tracking can be stale or unavailable and must not be the only
  operational-control record.
