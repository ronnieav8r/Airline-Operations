# External Tracking Integration Plan

## Purpose

AeroOps should eventually support ADS-B or external flight-tracking data, but
manual flight locating should come first. External data is useful for
situational awareness and evidence enrichment, but it can be incomplete,
delayed, blocked, or restricted by provider licensing.

## Direction

Use a provider-neutral ingestion layer later.

External observations should become attributed position reports, not a
replacement for human/operator flight locating records.

## Future Provider-Neutral Contract

Any future provider should normalize into these concepts:

- Aircraft identifier.
- FlightLeg or locating-record match.
- Observed time.
- Latitude and longitude.
- Altitude.
- Groundspeed.
- Heading.
- Source/provider.
- Provider reference ID.
- Matching confidence.
- Optional raw payload, subject to licensing.

## Provider Evaluation Criteria

- Coverage for the operator's aircraft and operating regions.
- Access to historical and live data.
- ICAO hex, registration, and tail matching support.
- Commercial-use terms.
- Storage and display restrictions.
- API reliability and rate limits.
- Cost at expected fleet size.
- Data freshness and latency.

## Integration Sequence

1. Manual `PositionReport` foundation.
2. Locating freshness UI.
3. Provider selection and data-contract planning.
4. Aircraft identifier mapping.
5. Read-only provider ingestion prototype.
6. Provider QA and reconciliation with manual reports.

## Deferred

- Provider selection.
- API credentials.
- Background jobs.
- Webhooks.
- Automated release blocking.
- Alerts and notifications.
