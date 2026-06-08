# Prompt 72: Locating Freshness Evidence Panel Update

## Summary

Update the Release Evidence Action Panel locating card to summarize manual
position-report freshness.

This is a UI/read-only slice. Keep release behavior warning-only. Do not add
automatic overdue rules, hard release blocking, ADS-B/provider integrations,
auth/signatures, file uploads, report edit/delete/void workflow, or
release-action changes.

## Key Changes

- Include the latest `PositionReport` in the FlightLeg detail query.
- Show latest position summary and age on the Flight locating action card.
- If the locating record is `ACTIVE` and has no position report, show the card
  as `Needs attention`.
- Keep the underlying release readiness checklist and release actions
  unchanged.

## Deferred

- Automatic overdue status.
- Freshness thresholds by authority class.
- Provider-backed freshness.
- Notifications.
- Hard release blocking.

## Test Plan

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Visit `/operations-control/[flightLegId]`.
- Confirm the Release Evidence Action Panel locating card shows latest position
  summary when a report exists.
- Confirm the locating card still links to the locating workflow.
- Confirm release actions remain available and warning-only.
