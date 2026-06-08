# Prompt 100: App Development Priority Reset

## Summary

Move legacy import work down the priority list and return the next AeroOps build
chain to core app development. This is a planning/status slice only.

The import staging foundation remains useful future infrastructure, but the app
needs more usable operational workflows before old-record importing should
continue.

## Decision

Legacy import work is now deferred behind app usability and operational workflow
development.

Do not continue into staging-row creation, dry-run execution, parser code, file
uploads, review/apply workflow, or operational import writes until a later
planning slice explicitly re-prioritizes imports.

## Recommended Next Chain

Run these as narrow slices:

```text
Prompt 101: FlightLeg Detail Information Architecture Planning
Prompt 102: FlightLeg Detail Information Architecture Foundation
Prompt 103: FlightLeg Detail Information Architecture QA
Prompt 104: Operations Control Workbench Planning
Prompt 105: Operations Control Workbench Foundation
Prompt 106: Operations Control Workbench QA
```

## Prompt 101 Target

Plan how FlightLeg detail should be organized now that it contains summary,
readiness, release controls, evidence actions, manifest, W&B, locating,
dispatch, airworthiness, snapshots, audit events, and raw reference sections.

Decide whether the first implementation should use:

- A sticky section navigation.
- Collapsible evidence sections.
- A tabbed detail layout.
- A compact command-center layout with secondary detail sections below.

Recommended direction: compact command-center plus section navigation. This
keeps the page server-rendered and avoids hiding safety-critical status behind
tabs.

## Prompt 102 Target

Implement the chosen FlightLeg detail organization without changing workflow
behavior.

Minimum behavior:

- Keep all existing data and actions available.
- Move the highest-value actions and statuses near the top.
- Add clear section anchors or navigation.
- Group evidence details so users do not need to scan one long packet.
- Preserve existing URLs for evidence workflows.
- Keep release behavior warning-only.

Do not add schema, auth, signatures, hard blocking, provider integrations,
file uploads, import behavior, or new release policy.

## Prompt 104 Target

Plan an Operations Control workbench improvement after FlightLeg detail
organization is complete.

Likely scope:

- Better status grouping for FlightLegs.
- Date/status/aircraft filters.
- Clearer quick links for release, evidence, edit, and aircraft context.
- More obvious missing-evidence indicators.

## Test Plan

For implementation slices:

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/`, `/operations-control`, one
  `/operations-control/[flightLegId]`, `/flights`, `/aircraft`, `/crew`,
  `/scheduling`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.
- Confirm release actions, evidence workflow links, and snapshot/history links
  still work.

## Assumptions

- Import work is deferred, not abandoned.
- Existing import docs and schema remain in place.
- The next product goal is improving the live development app experience.
- No production users exist, but preserving relational integrity and workflow
  behavior still matters.
