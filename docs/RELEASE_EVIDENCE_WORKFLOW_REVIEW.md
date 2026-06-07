# Release Evidence Workflow Review

Last updated: 2026-06-07

## Summary

The release evidence workflows now cover the first manual evidence loop around a
FlightLeg:

- Manifest.
- Weight and balance.
- Flight locating.
- Manual dispatch package.
- Warning-only Release Readiness.
- Explicit preview snapshots.
- Snapshot drift diagnostic.
- Snapshot findings detail.

The current system is usable for development, but FlightLeg detail is becoming a
long evidence packet. The next smallest user-visible improvement should make the
available evidence actions easier to find without adding new write behavior.

## Current Workflow Map

| Area | Current behavior | Status |
| --- | --- | --- |
| FlightLeg detail | Shows summary, Release Readiness, preview snapshots, Release Control, airworthiness, manifest, W&B, locating, dispatch, and raw weather/NOTAM snapshots. | Functional but long. |
| Manifest | Add/edit/remove manual manifest items and mark manifest `READY`. | Manual workflow active. |
| Weight and balance | Add/edit manual W&B runs, mark `CALCULATED`, and void runs. | Manual workflow active. |
| Flight locating | Save locating details and mark `FILED`, `ACTIVE`, or `CLOSED`. | Manual workflow active. |
| Dispatch package | Save manual weather, NOTAM, flight-plan, and dispatch notes in one form. | Manual workflow active. |
| Release Readiness | Displays warning-only checklist and non-enforcing blocker preview. | Active, not blocking. |
| Preview snapshots | Explicitly capture readiness snapshot and recent history. | Active, explicit only. |
| Snapshot diagnostics | Compare live readiness to latest snapshot and show drift. | Active, internal/read-only. |
| Snapshot findings detail | Inspect stored snapshot findings and metadata. | Active, read-only. |

## Main Usability Gap

The FlightLeg detail page now has the right data and links, but it does not yet
act as a clear evidence command center. Users must scan down the full page to
find the relevant workflow link or infer which evidence item needs attention
from the readiness checklist.

This is a UI organization problem, not a schema or release-policy problem.

## Recommended Next Slice

Prompt 62 should add a compact **Release Evidence Action Panel** near the top
of FlightLeg detail, after the FlightLeg summary cards and before Release
Readiness.

Minimum behavior:

- Show one card per evidence area:
  - Manifest.
  - Weight and balance.
  - Flight locating.
  - Dispatch package.
  - Airworthiness.
  - Preview snapshots.
- Each card should show:
  - Current status or missing state.
  - One concise readiness message.
  - Primary link to manage or inspect that area.
- Keep all existing workflow pages and release actions unchanged.
- Do not add new mutation actions.
- Do not add schema, hard blocking, auth/signatures, provider integrations,
  file uploads, overrides, automatic snapshots, or `ReleasePackage`.

Why this is the right next slice:

- It is user-visible.
- It makes existing work easier to use.
- It does not require policy decisions.
- It does not change release behavior.
- It prepares the UI for later release readiness and blocking work without
  enforcing anything.

## Deferred Alternatives

These are valid future slices, but they are larger or need more policy:

- Hard release blocking.
- Release override workflow.
- Auth, roles, signatures, and audit events.
- Provider-backed weather, NOTAM, or flight-plan integrations.
- File uploads.
- `ReleasePackage`.
- Passenger identity redesign.
- W&B approval policy.
- Locating overdue automation and position history.
- Manifest locking/amendments.
- Release-attempt automatic snapshots.

## Prompt 62 Target

```text
Prompt 62: Release Evidence Action Panel
```

Scope:

- Add a read-only action panel to FlightLeg detail.
- Reuse existing FlightLeg detail query data.
- Link to existing evidence workflows and snapshot diagnostics/details where
  applicable.
- Keep release behavior warning-only and unchanged.

Prompt 62 should be UI-only unless a clear data access gap is discovered.
