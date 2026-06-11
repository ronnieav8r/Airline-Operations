# Crew Logistics Depth Plan

Last updated: 2026-06-11

## Purpose

Crew Logistics should help operations answer:

- Where does each crew member appear to be?
- What positioning, deadhead, ticket, hotel, or ground transport support is
  still open?
- Which needs are due soon, missing provider details, or tied to aircraft and
  FlightLeg coverage?

This remains a coordination module. It is not a booking engine, payment system,
expense system, duty/rest engine, schedule publisher, or aircraft assignment
automation tool.

## Current State

- `CrewLocationRecord` tracks manual/current or historical location context.
- `CrewLogisticsNeed` tracks travel-support needs with type, status, stations,
  optional aircraft, optional FlightLeg, provider placeholder, confirmation
  number, and notes.
- Ops/admin users can create and edit records under
  `/crew/[crewMemberId]/logistics`.
- Crew detail, crew planner, aircraft context, and aircraft crew assignment show
  logistics context and cross-links.

## Next Direction

The next implementation should add a central `/crew/logistics` workbench for
ops/admin users. It should be read-only for the central board and route users to
existing crew-scoped edit pages for mutations.

Minimum workbench behavior:

- Summary cards for open, requested, booked, overdue, missing provider details,
  and missing crew location context.
- URL-driven filters for status, need type, aircraft, station, and crew member.
- Grouping by status, need type, aircraft, or needed-by window.
- Logistics cards with crew, latest location, need status/type, station route,
  aircraft, FlightLeg, provider, confirmation, and notes excerpt.
- Cross-links to crew detail, crew logistics management, aircraft context,
  aircraft crew workflow, and FlightLeg detail.

## Prompt 210 Status

Implementation status: complete with local static and smoke validation.
`/crew/logistics` now provides the central ops/admin workbench with summary
cards, URL-driven filters, grouping, logistics cards, and cross-links back to
existing crew-scoped management workflows. No schema, provider integration,
booking automation, expense workflow, crew self-service logistics write,
schedule mutation, aircraft assignment mutation, release mutation, or duty/rest
mutation was added.

## Provider Integration Boundary

Provider integrations should be planned after the workbench. Do not add live
booking or external API calls until vendor choices, workflow ownership, data
retention, cancellation/change behavior, and audit requirements are known.

Future provider planning should cover:

- airline ticket provider or manual ticketing workflow,
- hotel provider or manual hotel workflow,
- ground transport provider or manual transport workflow,
- provider credential/settings storage,
- booking status mapping,
- cancellation/change handling,
- confirmation and itinerary attachment strategy,
- expense/payment boundary.

## Deferred

- Live airline booking.
- Live hotel booking.
- Live ground transport booking.
- Expense or payment workflow.
- File uploads or itinerary attachments.
- Crew-created logistics records.
- Automatic positioning recommendations.
- Schedule mutation.
- Aircraft assignment mutation.
- Duty/rest enforcement.
- Release readiness or release action mutation.
