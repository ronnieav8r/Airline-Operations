# Prompt 83: Release Audit Timeline Planning

## Summary

Plan the first read-only release audit timeline before implementation. This is
a planning/docs-only slice.

## Decision

Add a FlightLeg-local release audit timeline to the FlightLeg detail page.

Placement:

- Place it near Release Control and Preview Snapshots.
- Keep it below Preview Snapshots and above Release Control so operators can
  review recent release-attempt history before using release actions.

Data source:

- Use existing `ReleaseAuditEvent` rows filtered by `flightLegId`.
- Sort newest first.
- Limit initial display to the latest 10 events.

Fields to show:

- Event type.
- Event message.
- Created time.
- Actor placeholder:
  - `System / unauthenticated` when `actorUserId` is null.
  - User display fields later when auth exists.
- Snapshot link when `snapshotId` exists.
- Release status/action metadata when present.
- Snapshot skipped reason when present.

Snapshot links:

- If `snapshotId` exists, link to
  `/operations-control/[flightLegId]/snapshots/[snapshotId]`.
- If no snapshot exists but metadata includes a skip reason, show the skip
  reason as informational text.

Read-only guardrails:

- No audit mutation.
- No auth/signature workflow.
- No hard release blocking.
- No schema changes.
- No `ReleasePackage`.

## Prompt 84 Target

Prompt 84 should implement the read-only timeline:

- Extend the FlightLeg detail query to include recent `releaseAuditEvents`.
- Add a `ReleaseAuditTimeline` section.
- Render event type, message, created time, actor placeholder, snapshot link,
  and metadata summary.
- Keep release actions and readiness behavior unchanged.

## Prompt 85 Target

Prompt 85 should validate:

- Timeline renders when audit events exist.
- Snapshot links resolve to existing snapshot detail pages.
- Skipped snapshot metadata displays without requiring a snapshot link.
- FlightLeg detail still renders when no audit events exist.
- Release actions remain warning-only.

## Deferred

- Global audit console.
- Search/filter/export.
- User attribution until auth exists.
- Legal signatures.
- Override approval workflow.
- Hard release blocking.
- Schema changes.

## Test Plan For Prompt 84

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Use local release-action events from Prompt 80/81 or create fresh events.
- Visit `/operations-control/[flightLegId]`.
- Confirm release audit timeline renders event rows and snapshot links.
- Confirm `/operations-control/[flightLegId]/snapshots/[snapshotId]` loads for
  linked snapshots.
- Confirm `/api/health`, `/internal/release-snapshot-readiness`, and main
  routes still load.

## Assumptions

- Existing `ReleaseAuditEvent` fields are sufficient for the first display.
- The timeline is local to one FlightLeg, not a cross-fleet audit log.
