# External Tracking Integration Plan

Last updated: 2026-06-11

## Purpose

AeroOps should eventually support ADS-B and external flight-tracking data as
internal situational awareness and flight-locating evidence. It should not use
provider data as the sole operational source of truth.

Manual flight locating and manual `PositionReport` history remain the fallback
operational record. External tracking data should append attributed observations
and warnings, not replace human/operator locating records.

Source report: `docs/ADSB_DATA_SOURCE_OPTIONS_REPORT.md`.

## Locked Direction

- Use a provider-neutral ingestion layer.
- First visibility target is internal ops/admin/dispatch only.
- Treat external positions as supplemental evidence and awareness.
- Keep release behavior warning-only.
- Do not update aircraft station, aircraft status, FlightLeg status, or release
  state from ADS-B alone.
- Do not expose crew/customer tracking without a later privacy/licensing plan.
- Do not retain raw provider payloads unless the provider contract permits it.

## Future Provider-Neutral Contract

Provider adapters should normalize vendor payloads before any app data is
written.

Normalized observation fields should include:

- provider code,
- provider observation/reference ID,
- provider aircraft ID,
- ICAO hex,
- callsign or flight identifier,
- observed time,
- received time,
- latitude and longitude,
- altitude,
- groundspeed,
- heading,
- vertical rate when available,
- squawk when available,
- source type,
- aircraft match key,
- FlightLeg or locating-record match,
- match confidence,
- match reason,
- raw-payload retention decision.

The AeroOps UI should read AeroOps data only. It should not call FlightAware,
Flightradar24, ADS-B Exchange, or any other vendor directly.

## Future Schema Direction

Use separate provider-neutral observation records before writing accepted
positions into locating history.

Recommended future tables:

- `AircraftTrackingIdentity`: date-ranged mapping for aircraft, tail snapshot,
  ICAO hex, provider code, provider aircraft ID, callsign, third-party callsign,
  confidence, privacy notes, and validity dates.
- `ExternalTrackingObservation`: normalized provider observation with provider
  IDs, aircraft/FlightLeg/FlightLocatingRecord links when matched, observed and
  received timestamps, position fields, source type, match confidence, match
  reason, raw payload if licensed, and raw payload retention date.

Accepted observations should then create `PositionReport` rows under the
matched `FlightLocatingRecord`.

Rules:

- Never overwrite manual reports.
- Keep provider-specific IDs out of core operational tables except through the
  neutral identity/observation layer.
- Do not attach low-confidence observations to a `FlightLeg`; keep them
  aircraft-scoped or review-only.
- Keep identity mappings date-ranged because ICAO hex, PIA codes, provider IDs,
  and callsigns can change.

## Matching Policy

Use match confidence, not a single key.

High confidence:

- active aircraft tracking identity,
- ICAO hex or provider aircraft ID match,
- observation time near an active or soon-active FlightLeg,
- callsign/flight identifier match when available,
- plausible route/origin/destination context.

Medium confidence:

- aircraft identity matches but FlightLeg is unclear,
- callsign differs but route/time is plausible,
- observation is useful for aircraft awareness but not leg evidence.

Low confidence:

- callsign-only match,
- tail-only provider metadata without ICAO/provider ID confirmation,
- PIA/temporary identity ambiguity,
- multiple plausible active legs or aircraft.

Low-confidence observations must not become FlightLeg evidence automatically.

## Provider Evaluation

Use actual fleet identifiers and operating regions for selection.

Leading bakeoff candidates:

- FlightAware AeroAPI.
- Flightradar24 API.
- ADS-B Exchange.

Later or specialty options:

- Spire Aviation.
- Aireon or Aireon-backed products.
- Cirium FlightStats/Sky API.
- FAA SWIM/SFDPS.
- Local ADS-B receivers.
- OpenSky only for research/prototyping unless suitable commercial terms are
  obtained.

Evaluate each provider on:

- own-fleet coverage,
- freshness/latency,
- commercial storage/display rights,
- tail/ICAO/callsign matching,
- blocked/private aircraft behavior,
- historical track support,
- rate limits and cost at polling cadence,
- reliability/support,
- streaming upgrade path.

## Implementation Sequence

1. Provider bakeoff outside the core app using real fleet tail numbers, ICAO
   hex values, callsigns, and route geography.
2. Add provider-neutral schema and adapter contracts without provider API calls.
3. Add a dry-run ingestion command that normalizes mock or provider sample
   payloads without writing operational records.
4. Write accepted observations as `ExternalTrackingObservation` rows and
   accepted `PositionReport` rows.
5. Add ops-only UI freshness/source badges on Operations Control, Aircraft
   detail, and Flight Locating pages.
6. Add warning-only freshness/conflict summaries after ingestion quality is
   proven.

## Failure Behavior

- Provider down: show stale-data warning and keep manual locating available.
- No aircraft found: show no provider position, not aircraft missing.
- Rate limited: back off and prioritize active/released/soon-departing legs.
- Provider conflict: show review warning; do not resolve silently.
- Privacy-blocked or PIA aircraft: do not assume tail-linked tracking is
  available or stable.

## Deferred

- Provider selection for production.
- API credentials or secret storage.
- Background polling.
- Webhooks.
- Streaming.
- Maps.
- Crew/customer tracking visibility.
- Raw payload retention before license review.
- Release blocking from tracking data.
- Automated aircraft station/status updates.
- Legal signatures or compliance conclusions from provider data.
