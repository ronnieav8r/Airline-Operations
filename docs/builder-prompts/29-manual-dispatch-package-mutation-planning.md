# Builder Prompt 29: Manual Dispatch-Package Mutation Planning

## Summary

Plan the first manual dispatch-package mutation workflow after manifest,
locating, and weight-and-balance writes. This slice is planning/docs only. It
does not add schema, routes, actions, provider integrations, release gating, or
release-package modeling.

## Decision

Build the first dispatch-package workflow as one manual evidence form under the
existing FlightLeg detail surface.

Chosen implementation slice:

```text
Prompt 30: Manual dispatch-package mutation foundation
```

## Prompt 30 Scope

Prompt 30 should add a narrow workflow at:

```text
/operations-control/[flightLegId]/dispatch
```

Minimum workflow:

- Save manual weather briefing evidence.
- Save manual NOTAM snapshot evidence.
- Save a manual flight-plan reference.
- Create or update the FlightLeg `DispatchPackage`.
- Link the package to the manual weather, NOTAM, and flight-plan records.
- Store manual performance/dispatch notes in `DispatchPackage.performanceData`.
- Add a link from `/operations-control/[flightLegId]` to the dispatch workflow.
- Show warnings for missing weather summary, missing NOTAM coverage, missing
  flight-plan reference, or missing flight-plan route text.

## Data Policy

Use the existing release-evidence schema only.

Manual snapshot keys should be stable per FlightLeg:

```text
manual-weather-{flightLegId}
manual-notam-{flightLegId}
```

The first manual flight-plan reference should use either the entered external
reference or a stable fallback:

```text
MANUAL-{flightLegId}
```

Recommended `DispatchPackage.performanceData` shape:

```json
{
  "method": "manual_v1",
  "notes": "Dispatcher-entered package notes.",
  "updatedAt": "2026-06-07T00:00:00.000Z"
}
```

Recommended weather `rawSnapshot` shape:

```json
{
  "method": "manual_v1",
  "routeSummary": "Manual route weather summary.",
  "enteredAt": "2026-06-07T00:00:00.000Z"
}
```

Recommended NOTAM `rawSnapshot` shape:

```json
{
  "method": "manual_v1",
  "affectedStationCodes": "KTEB,KHPN",
  "notes": "Manual NOTAM notes.",
  "enteredAt": "2026-06-07T00:00:00.000Z"
}
```

## Readiness Policy

Use warning-first behavior.

A warning-free manual dispatch package should have:

- A linked weather briefing snapshot with `routeSummary`.
- A linked NOTAM snapshot with `affectedStationCodes`.
- A linked flight-plan reference with `externalReference`.
- A flight-plan `routeText`.
- Dispatch/performance notes when operationally relevant.

Release controls must not be blocked by this workflow yet. Release readiness
guardrails are planned separately after manual dispatch evidence can be edited.

## Deferred

Do not include these in Prompt 30:

- Weather provider calls.
- NOTAM provider calls.
- Flight-plan filing provider calls.
- ReleasePackage.
- Release blocking or gating.
- File uploads.
- Aircraft performance calculation.
- Schema changes.
- Auth, roles, or user attribution.

## Validation

Prompt 30 should run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open a FlightLeg detail page.
- Open `/operations-control/[flightLegId]/dispatch`.
- Save manual dispatch evidence.
- Edit the manual dispatch evidence.
- Confirm `/operations-control/[flightLegId]` shows the linked weather, NOTAM,
  and flight-plan data.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return 200.

## Stop Conditions

Stop before implementation if:

- A schema migration appears necessary.
- Provider integration becomes tempting.
- Release blocking policy needs to be defined.
- The workflow requires file uploads or aircraft performance calculations.
