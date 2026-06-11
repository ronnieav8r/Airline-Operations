# ADS-B Data Source Options Report

Generated: 2026-06-11

## Executive recommendation

Use ADS-B and flight-tracking data as an attributed situational-awareness and
flight-locating evidence feed, not as the sole operational source of truth.
AeroOps already has the right foundation: `FlightLeg`,
`FlightLocatingRecord`, and append-only `PositionReport` history. The next
step should be a provider-neutral ingestion layer that writes external
observations into `PositionReport` rows with source, provider ID, confidence,
freshness, and raw-payload retention rules.

Recommended path:

1. Keep manual flight locating as the fallback and operational record.
2. Add aircraft identifier mapping for tail number, ICAO hex, provider aircraft
   ID, optional callsign, and privacy/program notes.
3. Prototype with one low-friction commercial REST provider against the
   operator's actual fleet and regions.
4. Add a second source only if coverage, latency, blocked-aircraft behavior, or
   licensing needs justify it.
5. Do not hard-block releases or mark aircraft overdue from ADS-B alone until
   provider reliability and policy decisions are proven.

Best starting candidates:

- For a practical first production integration: FlightAware AeroAPI or
  Flightradar24 API.
- For direct raw ADS-B-style aircraft position awareness: ADS-B Exchange.
- For global/oceanic or higher-end operations: FlightAware with Aireon,
  Spire Aviation, or Aireon-backed commercial products.
- For research-only prototyping: OpenSky Network, but not as a commercial app
  dependency unless OpenSky grants suitable commercial terms.
- For FAA/NAS data alignment: FAA SWIM/SFDPS, but treat it as an enterprise
  feed rather than a quick app integration.

## AeroOps fit

Current app direction from repo docs:

- `FlightLeg` is the long-term operational anchor.
- `FlightLocatingRecord` is one-to-one with `FlightLeg`.
- `PositionReport` already exists in current Prisma as child history under
  `FlightLocatingRecord`.
- Existing planning says external observations should become attributed
  position reports, not replacements for human/operator locating records.

That means the integration should not update `Aircraft.currentStation` or flight
status directly. It should first create external position observations, then let
separate warning/readiness logic summarize freshness, confidence, and conflicts.

## What ADS-B gives the app

ADS-B Out broadcasts GPS location, altitude, ground speed, and other data to
ground stations and other aircraft once per second according to FAA explanatory
material. It is highly useful for near-real-time awareness, but it is still not
the same thing as a dispatch release, operational-control record, ATC clearance,
arrival confirmation, or company flight-locating procedure.

Good AeroOps use cases:

- Live aircraft location on operations control and aircraft detail pages.
- Last-known-position enrichment for active `FlightLocatingRecord`.
- Locating freshness warnings.
- ETA/route deviation context.
- Post-flight track reconstruction.
- FlightLeg departure/arrival evidence hints.
- Station/ramp awareness for inbound aircraft.
- Exception review: no recent position, unexpected route, tail mismatch,
  inactive transponder, privacy-blocked aircraft, or provider disagreement.

Avoid in early phases:

- Automatic release blocking.
- Automatic legal signatures.
- Treating ADS-B as definitive arrival/departure proof.
- Silent aircraft station changes.
- Crew or passenger-facing public tracking without privacy review.

## Provider options

### FlightAware AeroAPI / Firehose

Source: https://www.flightaware.com/commercial/data

Fit: Strong first commercial candidate for a small operator because it offers a
query-based API for small data needs and a streaming Firehose path for higher
volume. FlightAware describes AeroAPI as pull/query-based live and recent
historical flight-tracking data, while Firehose is a live streaming JSON feed
for enterprise use. FlightAware also describes terrestrial ADS-B coverage over
land in 185+ countries and Aireon space-based ADS-B for 100 percent global
tracking with once-per-minute updates.

Pros:

- Mature commercial aviation data product.
- Pull API aligns with a low-risk first integration.
- Streaming upgrade path exists if polling becomes insufficient.
- Combines ADS-B, flight status, flight plans, estimates, and historical data.
- Good match for operations dashboards, scheduling software, FIDS-style use
  cases, and post-flight analytics.
- Potential global/oceanic option via Aireon-backed data.

Cons:

- Commercial pricing and licensing must be reviewed before storing, redisplaying,
  or exposing data to customers/crew.
- Data may honor blocking/privacy programs depending on product and contract.
- Query costs can grow if the app polls aggressively.
- Provider-specific flight identifiers and tail/callsign matching need careful
  normalization.

Implementation idea:

- Start with pull polling for active and soon-to-depart `FlightLeg` records.
- Store only normalized `PositionReport` fields plus provider reference IDs
  until the license permits raw-payload retention.
- Escalate to Firehose only if the operator needs continuous whole-fleet or
  airspace-scale tracking.

### ADS-B Exchange

Sources: https://www.adsbexchange.com/data-products/ and
https://www.adsbexchange.com/api/aircraft/v2/docs

Fit: Strong direct aircraft-position source when the product needs rawer,
high-frequency ADS-B visibility. ADS-B Exchange markets live positions updated
every 500 ms and live/historical data products for tracking and analysis.

Pros:

- Very high-frequency aircraft position data.
- Good for location awareness by aircraft, region, airport, callsign, squawk, or
  ICAO hex depending on product/API tier.
- Useful for detecting aircraft even when some FAA-derived public feeds suppress
  display.
- Historical products can support track reconstruction.

Cons:

- Commercial terms need explicit review; community/light API tiers are not the
  same as production commercial rights.
- Data may be less tied to operator schedules, flight plans, and dispatch
  context than FlightAware/Cirium-style products.
- High update frequency can create unnecessary storage and cost unless sampled.
- Coverage depends on receiver network geometry and aircraft broadcasts.

Implementation idea:

- Use as a live-position source, sampled down to operational cadence such as
  15-60 seconds per active aircraft.
- Keep provider-specific fields out of core tables; normalize through
  `ExternalTrackingObservation` or directly to `PositionReport`.
- Use confidence rules before linking a hit to a `FlightLeg`: ICAO hex match,
  callsign match, scheduled time window, and route proximity.

### Flightradar24 API

Sources: https://fr24api.flightradar24.com/ and
https://fr24api.flightradar24.com/docs/endpoints

Fit: Good commercial API candidate for live aircraft positions, historic tracks,
airline/airport metadata, and map-style user experience. Public documentation
states the API gives access to real-time aircraft positions, aircraft tracks,
and historical flight data.

Pros:

- Familiar flight-tracking data brand and broad ADS-B network.
- API product is designed for developers rather than scraping public map data.
- Good fit for user-facing maps, route tracks, and airport/airline metadata.
- Recent public material indicates expanded global coverage through Aireon
  space-based ADS-B.

Cons:

- Exact pricing, rate limits, redistribution rights, and blocked-aircraft
  behavior require plan/contract review.
- Flight-aware schedule context may be weaker or stronger depending on endpoint
  and operating region; test against the actual fleet.
- Avoid unofficial SDKs/scrapers for production due to terms and stability risk.

Implementation idea:

- Treat as a comparable first-prototype option to FlightAware.
- Run a two-week bakeoff: active fleet hit rate, latency, historical retrieval,
  route matching, blocked/private aircraft behavior, API cost, and support.

### OpenSky Network

Source: https://openskynetwork.github.io/opensky-api/

Fit: Useful for research, demos, and early technical experiments. The official
docs say the live API is for research and non-commercial purposes, represents
aircraft as state vectors derived from ADS-B and Mode S, and does not provide
commercial flight data such as schedules or delays.

Pros:

- Easy to experiment with state vectors.
- Good for learning the normalization model: ICAO hex, callsign, timestamps,
  latitude, longitude, altitude, velocity, heading.
- Useful as a non-production sandbox and independent sanity check.

Cons:

- Not suitable for production commercial use without direct commercial terms.
- No schedules, delays, or operational flight context.
- Coverage and API access can be constrained; docs warn about abuse and cloud
  provider blocking.
- State vectors can omit stale position/velocity values quickly.

Implementation idea:

- Use only for internal proof-of-concept or unit fixtures unless commercial
  terms are obtained.
- Do not build customer-facing dependencies on the free/public API.

### Spire Aviation

Source: https://aviation-docs.spire.com/api/flights-live/introduction/

Fit: Strong option when global, oceanic, and space-based ADS-B coverage matters.
Spire describes Flights Live as a JSON REST endpoint for real-time flight data,
with richer flight/aircraft/airline/airport/schedule metadata derived from
large-scale ADS-B message processing.

Pros:

- Space-based ADS-B strengths for remote and oceanic coverage.
- REST and streaming/history product families.
- Potentially richer metadata than raw aircraft position feeds.
- Good candidate if the operator flies outside dense terrestrial receiver
  coverage.

Cons:

- Likely enterprise-commercial procurement.
- Overkill for a small domestic-only fleet if terrestrial coverage is enough.
- Requires careful license review for storage and display.

Implementation idea:

- Evaluate if fleet routes include oceanic, remote, international, or poor
  terrestrial coverage.
- Use the same provider-neutral adapter contract as other providers.

### Cirium FlightStats / Sky API

Sources: https://developer.cirium.com/apis/flightstats-apis/overview and
https://developer.cirium.com/apis/flightstats-apis/flight-track

Fit: Better for airline-style flight status, schedules, airport operations, and
fleet/route/area status than raw ADS-B position awareness. Cirium describes
FlightStats APIs as status and positional APIs by flight, airport, fleet, route,
or area, and its flight-track API includes active-flight position fields such as
lat/long, altitude, bearing, speed, and route.

Pros:

- Strong schedule/status ecosystem.
- Useful if AeroOps needs flight status, airport status, route, fleet, or area
  queries in addition to positions.
- Good commercial support posture.

Cons:

- May be less direct for tail-number-centric small-charter operations unless
  contract/endpoints fit.
- Pricing/licensing likely enterprise-oriented.
- Not necessarily the best first choice if all the app needs is own-fleet live
  aircraft positions.

Implementation idea:

- Consider if AeroOps grows toward airline operations, customer status feeds,
  broader schedule analytics, or airport disruption tooling.

### FAA SWIM / SFDPS

Source: https://www.faa.gov/air_traffic/technology/swim/sfdps

Fit: Enterprise/NAS integration option, not a quick ADS-B vendor substitute.
FAA says SFDPS provides en route flight data to NAS consumers and allows
consumers to receive real-time data for analytics, business processes,
research, and related activities.

Pros:

- Official FAA/NAS source.
- Strong fit for U.S. regulatory/operational alignment and flight-data
  provenance.
- Can support enterprise operational-control use cases if the operator has the
  need and access path.

Cons:

- Access, onboarding, infrastructure, filtering, and security are heavier than a
  normal SaaS API.
- LADD obligations apply to FAA SWIM-derived data display.
- Not a raw global ADS-B receiver network.
- Likely too heavy for the first AeroOps tracking slice.

Implementation idea:

- Keep as a later enterprise integration track.
- If pursued, isolate FAA-derived data in a separate source class with explicit
  LADD filtering and display controls.

### Aireon / Aireon-backed products

Sources: https://aireon.com/ and https://www.flightaware.com/commercial/aireon/

Fit: Premium solution for truly global space-based ADS-B, remote/oceanic
tracking, and high-stakes aircraft location awareness.

Pros:

- Space-based ADS-B can close oceanic, polar, desert, and remote coverage gaps.
- Strong fit for global flight-following and higher-risk operations.
- Available directly and through partners such as FlightAware.

Cons:

- Enterprise procurement and cost.
- Likely unnecessary for purely regional U.S. operations.
- Integration and rights depend on the chosen commercial product.

Implementation idea:

- Treat as a coverage upgrade, not the default first integration.
- Add if fleet routes prove terrestrial/standard provider coverage is
  insufficient.

## Local receiver option

The operator can also install one or more local ADS-B receivers at bases or
frequent stations. This can supplement commercial data but should not be the
only production source unless the operational need is strictly local.

Pros:

- Low cost for local ramp/terminal-area visibility.
- Direct control of receiver, uptime, and raw feed.
- Good backup/sanity source for home base movements.

Cons:

- Line-of-sight limits; poor for en route, remote, and low-altitude beyond local
  range.
- Requires hardware maintenance and monitoring.
- Does not provide schedules, flight plans, or broad historical coverage.
- Data licensing is simpler for own received data, but privacy and display
  policy still matter.

Implementation idea:

- Use a local receiver as an optional secondary source feeding the same
  provider-neutral observation contract.
- Mark source as `LOCAL_RECEIVER` and keep it separate from licensed vendor
  data.

## Privacy, blocking, and policy risks

Do not assume all aircraft are trackable, displayable, or matchable by tail.

FAA LADD:

- FAA says LADD lets aircraft owners filter flight data from FAA SWIM
  distribution or from public display by participating websites.
- Vendors subscribing to FAA SWIM data are bound by a Data Access User Agreement
  to filter LADD participants from public display.

FAA PIA:

- FAA says PIA lets eligible aircraft use an alternate temporary ICAO address
  not assigned to the owner in the Civil Aircraft Registry.
- FAA also notes LADD does not affect ADS-B broadcast data, while PIA is intended
  to limit easy identification by third-party receivers.

Product implications:

- Store an aircraft-level privacy/tracking policy note:
  `trackingDisplayPolicy`, `laddStatus`, `piaStatus`, `thirdPartyCallsign`,
  `authorizedViewerRoles`, and `providerContractNotes`.
- Do not publicly display tail-linked tracking without confirming provider terms
  and operator authorization.
- Separate internal operations visibility from public/customer visibility.
- If a feed is FAA-derived, implement explicit LADD filtering behavior.
- If an aircraft uses PIA, do not assume permanent ICAO hex matching is stable.

## Data model recommendations

Minimum additive tables/fields:

```text
AircraftTrackingIdentity
- id
- aircraftId
- tailNumberSnapshot
- icaoHex
- provider
- providerAircraftId
- callsign
- thirdPartyCallsign
- validFrom
- validTo
- confidence
- notes

ExternalTrackingObservation
- id
- provider
- providerObservationId
- providerAircraftId
- icaoHex
- callsign
- aircraftId
- flightLegId
- flightLocatingRecordId
- observedAt
- receivedAt
- latitude
- longitude
- altitude
- groundspeed
- heading
- verticalRate
- squawk
- sourceType
- matchConfidence
- matchReason
- rawPayload
- rawPayloadRetentionUntil
- createdAt
```

Then convert accepted observations into `PositionReport`:

```text
PositionReport
- source = provider name, such as FLIGHTAWARE_AEROAPI or ADSB_EXCHANGE
- reportedAt = observedAt
- latitude / longitude / altitude / groundspeed / heading
- positionSummary = compact human-readable location summary
- notes = provider, confidence, provider timestamp, and any mismatch warning
```

If scope must stay smaller, skip `ExternalTrackingObservation` initially and
write directly to `PositionReport`, but the adapter should still compute:

- provider name,
- observed timestamp,
- received timestamp,
- aircraft match key,
- FlightLeg match key,
- confidence,
- license-safe raw payload decision.

## Matching strategy

Use a confidence score, not a single key.

High confidence:

- Aircraft has active identity mapping for provider and ICAO hex.
- Observation time falls within active/near-active FlightLeg window.
- Callsign or flight identifier matches expected flight when available.
- Position is plausible near route, origin, destination, or expected phase.

Medium confidence:

- Tail/registration maps, but callsign differs.
- ICAO hex maps, but aircraft is not assigned to an active FlightLeg.
- Observation is plausible for aircraft but not for a specific leg.

Low confidence:

- Callsign-only match.
- Tail-only match from provider metadata without ICAO confirmation.
- PIA/temporary ICAO behavior.
- Multiple active legs or aircraft ambiguity.

Rules:

- Never overwrite manual records; append external observations.
- Do not attach low-confidence observations to a `FlightLeg`; keep them
  aircraft-scoped for review.
- Surface provider conflicts as warnings.
- Keep identity mapping date-ranged because transponders, PIA codes, and
  provider IDs can change.

## Provider-neutral layer and future provider pivots

Starting with one provider and switching later should be manageable if the first
implementation keeps provider details behind a narrow adapter. It becomes
painful only if the app lets the first provider's payload shape, IDs, status
terms, or API behavior leak into the core schema and UI.

Target dependency direction:

```text
Provider API
  -> provider adapter
  -> normalized tracking observation
  -> aircraft / FlightLeg matching
  -> PositionReport
  -> UI reads AeroOps data only
```

The AeroOps UI should not call FlightAware, Flightradar24, ADS-B Exchange, or
any other vendor directly. It should read the app's own normalized
`PositionReport`, `FlightLocatingRecord`, and optional
`ExternalTrackingObservation` data.

Provider adapter contract:

```text
TrackingProviderAdapter
- providerCode
- fetchActiveAircraftPositions(input)
- fetchAircraftTrack(input)
- normalizeProviderPayload(payload)
- classifyProviderError(error)
- estimatePollingCost(requestPlan)
```

Normalized observation contract:

```text
NormalizedTrackingObservation
- provider
- providerObservationId
- providerAircraftId
- aircraftId
- flightLegId
- flightLocatingRecordId
- observedAt
- receivedAt
- latitude
- longitude
- altitude
- groundspeed
- heading
- callsign
- icaoHex
- squawk
- matchConfidence
- matchReason
- rawPayloadAllowed
```

If this layer exists, a future provider switch mostly requires:

- Add a new provider adapter.
- Map the new provider's payload into the normalized observation contract.
- Update credentials and provider config.
- Retest aircraft identity matching.
- Compare coverage, freshness, and blocked-aircraft behavior.
- Run both providers side by side for a short validation window.
- Retire the old adapter when the new provider is trusted.

Avoid these coupling mistakes:

- Storing only provider-specific aircraft IDs without an AeroOps
  `AircraftTrackingIdentity` record.
- Naming core database fields after one vendor.
- Letting UI components call provider APIs directly.
- Treating vendor flight status labels as AeroOps operational status.
- Building release, overdue, or station-change automation from one provider's
  status meanings.
- Assuming one provider's callsign, tail-number, or ICAO matching behavior is
  universal.
- Retaining raw payloads before the license allows it.

Practical pivot difficulty:

- Adapter-based, read-only, append-only first implementation: small-to-medium
  integration task.
- Provider-specific schema/UI/poller implementation: broad migration touching
  data model, UI, matching logic, history, licensing, and tests.

## Ingestion architecture

Recommended first architecture:

```text
Scheduled poller
  -> provider adapter
  -> normalize payload
  -> aircraft identity match
  -> FlightLeg time-window match
  -> store ExternalTrackingObservation
  -> create PositionReport for accepted match
  -> update FlightLocatingRecord.lastKnownPosition summary
  -> emit warning-only freshness state
```

Polling cadence:

- Active FlightLegs: every 30-60 seconds.
- Released/ready legs near departure: every 2-5 minutes.
- Recently closed legs: poll once for track/arrival enrichment.
- Inactive aircraft: no polling unless aircraft detail page requests on-demand
  refresh.

Retention:

- `PositionReport`: retain as operational history.
- Raw provider payload: retain only if contract allows; otherwise store
  normalized fields and provider reference ID.
- High-frequency points: sample for operations view; consider full track only
  when licensed and explicitly needed.

Failure behavior:

- Provider down: show stale-data warning, keep manual locating workflow.
- No aircraft found: show "no provider position" rather than "aircraft missing."
- Match conflict: require human review.
- Rate limit: back off and prefer active legs.

## UI implementation ideas

Operations Control:

- Show latest position age next to active FlightLeg.
- Badge states: fresh, stale, no provider data, conflict, manual only.
- Click-through to locating page for source history.

Aircraft Detail:

- Latest provider position with source and timestamp.
- Current/next FlightLeg context.
- Provider identity mapping status.

Flight Locating Page:

- Timeline of manual and provider position reports.
- Source chips: manual, FlightAware, ADS-B Exchange, FR24, local receiver.
- Confidence and match reason.
- Provider conflict banner when sources disagree materially.

Admin/Settings:

- Aircraft tracking identity mapping.
- Provider credentials and enabled routes/regions.
- Polling policy.
- Privacy/display policy.
- Raw payload retention policy.

Map:

- Add only after source ingestion is stable.
- Start with own fleet only.
- Use route/position pins with source timestamps; avoid consumer-style public
  global maps in the operations app.

## Provider selection scorecard

Score each provider using real fleet routes, not marketing claims:

| Criterion | Weight | Notes |
| --- | ---: | --- |
| Own-fleet coverage | 5 | Test actual tail numbers/routes. |
| Data latency/freshness | 5 | Active ops need freshness more than historical depth. |
| Commercial display/storage rights | 5 | Must be cleared before production. |
| Tail/ICAO/callsign matching | 4 | Critical for FlightLeg association. |
| Historical tracks | 3 | Useful for post-flight evidence and review. |
| Flight status metadata | 3 | ETD/ETA/arrival context may matter. |
| Rate limits and cost at polling cadence | 4 | Prevent surprise operating cost. |
| Privacy/blocking behavior clarity | 5 | Needed for LADD/PIA/customer display. |
| API reliability/support | 4 | Ops dashboards need dependable source. |
| Streaming upgrade path | 2 | Useful later, not required for first slice. |

## Recommended implementation phases

### Phase 1: Decision and bakeoff

- Pick two candidates: FlightAware AeroAPI and either ADS-B Exchange or
  Flightradar24.
- Collect operator fleet tail numbers, ICAO hex values, common callsigns, and
  route geography.
- Run a limited test outside the app or in a read-only admin script.
- Compare hit rate, latency, match stability, cost, and contract terms.

### Phase 2: Provider-neutral foundation

- Add `AircraftTrackingIdentity`.
- Add provider config storage through environment variables/secrets.
- Add a provider adapter interface.
- Add a dry-run ingestion command that prints normalized observations without
  writing app data.

### Phase 3: Read-only ingestion

- Write accepted observations as `PositionReport` rows.
- Keep `FlightLocatingRecord.lastKnownPosition` synchronized to latest accepted
  report.
- Add no hard automation beyond warnings.
- Add provider source/age to existing locating and operations-control surfaces.

### Phase 4: Operational alerts

- Add warning-only freshness rules:
  - no active locating record,
  - no recent position,
  - provider stale,
  - provider conflict,
  - active leg with impossible route/position,
  - aircraft identity unmapped.
- Let ops acknowledge warnings without changing legal release state.

### Phase 5: Scale and second source

- Add streaming only if polling cannot meet ops requirements.
- Add second source for redundancy only after first source is stable.
- Add historical track reconstruction where contract and storage policy permit.

## Open decisions before production

- Which users may see live aircraft location?
- Is this internal-only, crew-visible, customer-visible, or all three?
- Does the operator participate in LADD, PIA, third-party callsign programs, or
  other blocking/privacy arrangements?
- Are flights domestic/regional, oceanic, remote, or international?
- Is the required freshness 15 seconds, 60 seconds, 5 minutes, or "last known"?
- Does the provider license allow raw payload storage?
- Does the provider license allow redisplay in an internal operations tool?
- Should provider observations be considered operational evidence or only
  situational context?
- Who owns aircraft identity mapping changes?

## Bottom line

AeroOps should integrate ADS-B through a narrow, provider-neutral tracking
adapter that appends evidence to flight locating history. The safest first
production path is FlightAware AeroAPI or Flightradar24 for broad commercial API
coverage, with ADS-B Exchange as the stronger raw/high-frequency ADS-B option
if licensing and product fit are confirmed. Spire/Aireon are best reserved for
global or remote coverage needs. OpenSky is useful for prototyping, not default
commercial production. FAA SWIM is important but should be treated as a later
enterprise/NAS integration with explicit LADD controls.

## Sources reviewed

- FAA ADS-B In/Out overview:
  https://www.faa.gov/air_traffic/technology/equipadsb/capabilities/ins_outs
- FAA LADD:
  https://www.faa.gov/pilots/ladd
- FAA ADS-B Privacy / PIA:
  https://www.faa.gov/air_traffic/technology/equipadsb/privacy
- FAA SWIM SFDPS:
  https://www.faa.gov/air_traffic/technology/swim/sfdps
- FlightAware APIs:
  https://www.flightaware.com/commercial/data
- FlightAware AeroAPI portal:
  https://www.flightaware.com/aeroapi/portal
- ADS-B Exchange data products:
  https://www.adsbexchange.com/data-products/
- ADS-B Exchange API docs:
  https://www.adsbexchange.com/api/aircraft/v2/docs
- Flightradar24 API:
  https://fr24api.flightradar24.com/
- Flightradar24 API docs:
  https://fr24api.flightradar24.com/docs/endpoints
- OpenSky Network API docs:
  https://openskynetwork.github.io/opensky-api/
- Spire Aviation Flights Live API:
  https://aviation-docs.spire.com/api/flights-live/introduction/
- Cirium FlightStats API overview:
  https://developer.cirium.com/apis/flightstats-apis/overview
- Cirium Flight Track API:
  https://developer.cirium.com/apis/flightstats-apis/flight-track
- Aireon:
  https://aireon.com/
- FlightAware Aireon:
  https://www.flightaware.com/commercial/aireon/
