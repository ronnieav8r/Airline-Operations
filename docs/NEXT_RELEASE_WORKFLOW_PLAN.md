# Next Release Workflow Plan

Last updated: 2026-06-07

## Decision

The next release workflow improvement should be a read-only release audit
timeline on FlightLeg detail.

## Why This Next

The app now creates release-attempt readiness snapshots and linked
`ReleaseAuditEvent` rows for Mark Released, Cancel Release, and Void Release.
Those records are valuable, but they are not yet visible to the operator in a
clear timeline.

A read-only timeline is the safest next improvement because it exposes existing
data without changing release authority, release readiness, or evidence
mutation behavior.

## Scope For Prompt 83

Plan the timeline:

- Placement on FlightLeg detail.
- Event fields to show.
- Snapshot links.
- Skipped snapshot metadata display.
- Read-only guardrails.

## Scope For Prompt 84

Implement the timeline:

- Query recent `ReleaseAuditEvent` rows for the FlightLeg.
- Show event type, message, created time, actor placeholder, snapshot link, and
  metadata summary.
- Link to existing snapshot detail pages when available.
- Keep release actions warning-only and unchanged.

## Prompt 83 Planning Status

Prompt 83 selected a FlightLeg-local timeline placed below Preview Snapshots
and above Release Control. The first display should show the latest 10
`ReleaseAuditEvent` rows, newest first, with event type, message, created time,
actor placeholder, linked snapshot when available, and useful attempt metadata.

Detailed timeline plan:

```text
docs/RELEASE_AUDIT_TIMELINE_PLAN.md
```

## Deferred

- Auth/signatures.
- Hard release blocking.
- Override workflow.
- Provider integrations.
- File uploads.
- `ReleasePackage`.
- Global audit console.
- Schema changes.
