# AeroOps UI Page Design Drilldown

Last updated: 2026-06-17

## Purpose

This is the page-level companion to
`docs/AEROOPS_UI_WORKFLOW_MACRO_PLAN.md`. The macro plan defines the shared UI
direction. This drilldown translates it into concrete page layouts, drawer
content, row/card content, interaction rules, and QA checks.

The goal is not to make every page look like the crew scheduling timeline. The
goal is to reuse the strongest parts of that workflow:

- compact toolbar,
- board-first work surface,
- sticky object identity where scanning matters,
- focused drawers instead of route churn,
- context menus where inline actions crowd the UI,
- warning-first signals that do not become legal signoff,
- no duplicate status chips that repeat what the page already says.

## Shared UI Building Blocks

### Board Toolbar

Use this on work surfaces where users scan and act repeatedly.

Recommended layout:

```text
[Mode/View] [Date/Search/Window]                         [Filters] [Tools] [Focus]
```

Rules:

- Keep the toolbar one row on desktop when possible.
- Put secondary filters behind a compact popover.
- Do not repeat the page identity if the nav or selected mode already says it.
- Use focus/expand only for large boards, not ordinary detail pages.
- Preserve route-query state so reloads keep the same view.

### Object Row

Use this for dense boards and lists.

Recommended row structure:

```text
Primary identity        Operational context             Warnings/actions
Tail / Flight / Name    time, base, customer, route      status strip, menu
```

Rules:

- The first column should answer "what am I looking at?"
- The middle should answer "where is it in the operation?"
- The right side should answer "what needs attention?"
- Avoid pushing every available metric into the row.

### Object Drawer

Use drawers for quick review and immediate actions.

Recommended drawer structure:

```text
Header: identity, lifecycle/status, primary action
Summary: the most useful current facts
Action area: direct fix surface or focused workflow controls
Warnings: clear but non-blocking
Links: open full workflow only when needed
History/audit: lower priority unless the task is audit-focused
```

Rules:

- The drawer should let the user fix the obvious issue without leaving the
  board when practical.
- Use drawer subviews for related workflows.
- Keep broad pages as fallback for deep work.
- Never route a summary card to a broad page when a focused fix surface exists.

### Context Menu

Use right-click or overflow menus when inline controls make rows/cards crowded.

Recommended contents:

```text
Open details
Change status
Create related item
Remove/cancel when safe
```

Rules:

- Right-click opens a menu. It does not perform a destructive action.
- First click outside closes the menu without performing the current tool.
- Keep destructive actions as explicit menu items.
- Use menus for schedule bars, FlightLeg cards, aircraft rows, passenger rows,
  and logistics needs only when it reduces clutter.

## Dashboard

### User Intent

The dashboard should answer:

- What is happening today or in the selected ops window?
- Which FlightLegs need release/preflight/postflight attention?
- What needs action now?
- Which warnings deserve review before dispatch?

### Recommended Layout

```text
Compact header: date/window controls, Open workbench, New FlightLeg
Summary tile strip: flights, release review, released, alerts, enroute, delayed
Flight board: active/upcoming FlightLeg cards or rows
Fleet snapshot footer: small, not competing with FlightLeg work
Drawer: FlightLeg object-action workspace
```

### Row/Card Content

Each FlightLeg card should show:

- flight number or trip identifier,
- scheduled departure and route,
- aircraft tail and customer,
- lifecycle status and release status,
- phase readiness strip: Ops Release, Preflight, Postflight, Manifest, Fuel,
  W&B, Flight Following, MX, Crew,
- one strongest warning line when present.

Avoid:

- large decorative headers,
- duplicate release state in multiple chips,
- deep aircraft or crew management in the main dashboard body,
- alert-only layout that hides normal release work.

### Drawer Views

Keep the current FlightLeg drawer direction and refine it:

- Summary: schedule, route, aircraft, customer, crew coverage, release state.
- Release: readiness warnings, release action, void/cancel when appropriate.
- Crew: current crew, assignment gaps, candidate fix surface.
- Manifest: quick add passenger, passenger list, full manifest link.
- Preflight: fuel, W&B, dispatch package status.
- Postflight: postflight evidence and closeout.
- Audit: lower priority but available.

### Best Next Slice

Tighten the FlightLeg card density and make "needs action" grouping clearer
without changing backend release behavior.

## Operations Control

### User Intent

Operations Control should answer:

- Which active or upcoming FlightLegs need operational work?
- What phase is each flight in?
- What evidence or coverage is missing?
- Which flight should the dispatcher work next?

### Recommended Layout

```text
Toolbar: date/window, operational status mode, filters popover, New FlightLeg
Grouped board:
  Needs release review
  Ready/released
  Preflight active
  Enroute
  Postflight/complete
Drawer or row expansion: focused FlightLeg actions
Optional secondary table view later
```

### Row/Card Content

Each row should show:

- departure time and route,
- FlightLeg number/trip identity,
- aircraft tail,
- customer,
- lifecycle and release state,
- phase strip,
- strongest blocker/warning,
- overflow menu.

### Drawer Content

Use the dashboard FlightLeg drawer model for consistency. The Operations
Control drawer can be slightly more work-focused:

- release action,
- evidence gaps,
- crew gap fix,
- manifest quick add,
- links to W&B, fuel, dispatch, locating.

### Keep Separate From Flights

Operations Control should be the active workbench. `/flights` can remain the
broader flight list, archive, search, and create/edit entry point.

### Best Next Slice

Rework board grouping and phase strips before any large redesign of the
FlightLeg detail page.

## Flights

### User Intent

Flights should answer:

- How do I find a FlightLeg?
- How do I create or edit a FlightLeg?
- How do I open the full release or workflow page?

### Recommended Layout

```text
Toolbar: search, date range, status, release, issue filters, New FlightLeg
Flight list/cards: broader than Operations Control
Drawer:
  New FlightLeg
  Flight quick review
  Crew quick review where applicable
```

### Difference From Operations Control

Flights is a searchable record/workflow entry page. Operations Control is the
live dispatch board. If they become visually similar, the labels and grouping
must still make the difference obvious.

### Best Next Slice

Keep current drawer-first behavior, but align card/row fields with the
Operations Control phase strip after that pattern is settled.

## Crew Scheduling

### User Intent

Crew Scheduling should answer:

- Who is scheduled, draft-scheduled, off, reserve, sick, personal, or
  unavailable?
- Where are coverage gaps?
- Can I create and revise a draft schedule without losing sight of published
  schedule?
- How many ON_DUTY days does this person have in each visible month?

### Recommended Layout

The current planning board is the reference pattern:

```text
Toolbar: Schedule/Planning, date/window, detail mode, filters, tools, focus
Sticky crew identity rail
Published lane
Draft lane
Context menu on draft blocks
Quick Blocks and Reusable Templates behind compact controls
```

### Key UX Rules

- Draft bars must never overlap.
- Adjacent bars should behave predictably when one is resized.
- Resize preview should be visible before release.
- Monthly counters belong near the crew identity, not in a distant summary
  area.
- Reusable Templates are repeatable rotations.
- Quick Blocks are ad hoc single-status ranges.
- Publishing draft schedule changes must not create aircraft assignments.

### Best Next Slice

Finish conflict rules, adjacent block behavior, resize previews, panning, and
template management before using this as a pattern for other pages.

## Crew Roster

### User Intent

The crew page should answer:

- Who is available or unavailable?
- Who has assignment, qualification, compliance, or request issues?
- How do I open the person's detail, schedule, compliance, logistics, or
  assignment context?

### Recommended Layout

```text
Toolbar: search, base, role, duty/employment, warnings filter, Add Crew
Compact crew rows:
  Name and base
  Role/type qualifications
  Current assignment or unassigned
  Current duty/schedule status
  Open request/compliance warning marker
Drawer:
  Profile summary
  Schedule snapshot
  Assignments
  Compliance warnings
  Logistics
  Time off
```

### Row Content

Show:

- full name,
- base,
- primary qualification badges,
- active aircraft assignment if any,
- current duty/schedule status,
- warning count or short warning text.

Move to drawer/detail:

- phone/email,
- full qualification history,
- full compliance evidence,
- logistics history,
- long notes.

### Best Next Slice

Tighten the roster row and add drawer subviews. Do not make `/crew` a schedule
timeline.

## Crew Detail

### User Intent

Crew detail should answer:

- What is this person's operational readiness?
- What are their active assignments?
- What schedule, time off, compliance, and logistics records matter now?

### Recommended Layout

```text
Compact header: name, base, employment/duty, primary action
Summary strip: assignment, schedule, compliance, logistics, open requests
Tabs/sections:
  Overview
  Schedule
  Assignments
  Compliance
  Logistics
  Time off
```

### Best Next Slice

After roster cleanup, add better schedule and logistics summaries to the crew
detail page, with links back into scheduling and crew logistics.

## Aircraft

### User Intent

The aircraft board should answer:

- Which aircraft are available, in flight, AOG, or carrying open issues?
- What needs attention before assignment or release?
- How do I open aircraft detail, crew block, fuel, or airworthiness?

### Recommended Layout

```text
Summary filters: Aircraft, Available, In flight, AOG, Open MELs, Open write-ups
Toolbar: search/type/status maybe behind filters
Aircraft rows/cards:
  Tail and type
  Current status/location
  Current/upcoming FlightLeg
  Crew block
  Fuel snapshot
  Open MEL/write-up markers
Drawer:
  Quick review
  Links to detail, crew, fuel, airworthiness
```

### Create Drawer

The next aircraft UI win is a create drawer:

- tail number,
- type,
- status,
- base/home station if available,
- optional notes,
- save and return to board.

### Maintenance Boundary

Do not overload the aircraft board with maintenance depth. The board should
surface AOG, Open MELs, and Open write-ups. Detailed maintenance should live in
airworthiness/maintenance workflows.

### Best Next Slice

Aircraft create drawer, then aircraft drawer summary polish.

## Aircraft Detail And Maintenance

### User Intent

Aircraft detail should answer:

- Is this aircraft operationally usable?
- What open airworthiness or maintenance issues matter?
- What flights, fuel events, crew blocks, and limitations are attached?

### Recommended Layout

```text
Header: tail, type, status, current location, primary workflow actions
Summary strip: AOG/current status, open MELs, write-ups, fuel, next leg
Sections:
  Upcoming FlightLegs
  Crew block
  Fuel ledger summary
  Airworthiness and maintenance
  Operational limitations
  History
```

### Maintenance Workspace Options

Option A: aircraft-detail-first maintenance.

- Best near-term.
- Keeps maintenance tied to the aircraft.
- Lower navigation overhead.

Option B: central maintenance board.

- Better later when there are enough open write-ups and MELs across the fleet.
- Use after aircraft detail workflows are clearer.

Recommendation: aircraft-detail-first now; plan central maintenance later.

## Customers

### User Intent

Customers should answer:

- Which customer account am I working with?
- Who are the linked passengers?
- What contact and notes matter for operations?
- How do I add/link passenger records?

### Recommended Layout

```text
Toolbar: search, customer/passenger toggle, New customer, New passenger
Customer rows:
  Customer name/code
  Contact
  Linked passenger count
  Recent/upcoming FlightLeg count if available
  Notes marker
Drawer:
  Customer profile
  Linked passengers
  Link existing passenger
  Create passenger for customer
  Recent manifest usage
```

### Remove From First Screen

The always-visible create forms should move into drawers. They take space from
the records the user is trying to scan.

### Best Next Slice

Customers workspace cleanup should happen soon after aircraft create drawer.
This is a high-visibility usability win.

## Passengers

### User Intent

Passengers should answer:

- Who is this person?
- Which customers are they linked to?
- What identity/contact details are available?
- Where have they appeared on manifests?

### Recommended Layout

```text
Passenger rows:
  Full name
  Contact
  Customer link count
  ID document status marker
  Recent manifest count
Drawer:
  Profile
  Customer links
  Identity document details
  Manifest history
  Edit action
```

### Identity Boundary

Identity, passport, no-fly/watchlist, and verification workflows need their own
planning slice. For now, show fields and warnings without pretending the app
has external verification.

## Manifest

### User Intent

Manifest should answer:

- Who is planned or onboard for this FlightLeg?
- Are passengers linked to reusable records?
- Is the manifest ready for release/preflight review?

### Recommended Layout

```text
FlightLeg header: route, time, customer, release state
Passenger list:
  Name
  Customer relationship
  Status later: planned/onboard/no-show/removed
  ID marker later
Actions:
  Add linked passenger
  Add any passenger
  Create and link passenger
  Mark manifest ready
```

### Drawer Behavior

Dashboard and FlightLeg drawers should support quick add and quick review.
The full manifest page should remain available for larger edits.

### Best Next Slice

Improve passenger search/selection and customer-linked suggestions. Defer
identity verification until the warning model is planned.

## Crew Logistics

### User Intent

Crew Logistics should answer:

- What movement or support needs are open?
- Who needs transportation, hotel, airline, or other coordination?
- What is the status, due time, and related FlightLeg?

### Recommended Layout

```text
Toolbar: status, need type, date, base/station, crew search
Need rows:
  Crew member
  Need type
  From/to
  Needed by
  Status
  Provider/confirmation placeholder
  Related FlightLeg or aircraft
Drawer:
  Need detail/edit
  Crew schedule snapshot
  Related FlightLeg
  Status update
```

### Best Next Slice

Add a logistics need drawer edit/review workflow after scheduling and roster
cross-links are clearer.

## Admin And Settings

### User Intent

Admin should answer:

- What operator settings affect visible workflows?
- Which warning thresholds or modes are configured?
- Which system defaults should be used by release, scheduling, manifest, and
  fuel workflows?

### Recommended Layout

Keep Admin boring and explicit:

- grouped settings,
- plain forms,
- short explanations,
- audit-friendly labels.

Do not use board/timeline patterns for settings.

### Near-Term Settings Worth Planning

- scheduling monthly ON_DUTY warning threshold,
- monthly vs rolling-30 scheduling method,
- dispatcher support mode,
- manifest mode,
- flight plan/locating basis,
- fuel density default,
- future maintenance display preferences.

## Cross-Page Navigation Rules

- Dashboard and Operations Control should open FlightLeg drawers first.
- Full FlightLeg pages should remain the deep workflow destination.
- Aircraft rows should open aircraft drawer first, then detail/fuel/crew/MX.
- Crew rows should open crew drawer first, then detail/compliance/logistics.
- Customer/passenger rows should open drawers first, not edit pages.
- Scheduling bars should use context menus before full drawers.
- Manifest actions should stay attached to FlightLeg.

## Implementation Risk Notes

- Too many drawers can become inconsistent. Standardize drawer header, summary,
  warning, action, and link patterns before expanding them.
- Too many status chips reduce readability. Prefer one lifecycle status, one
  release/readiness state, and one warning summary per row.
- Do not turn every list into cards. Crew, logistics, customers, and passengers
  need dense rows more than decorative cards.
- Do not push maintenance depth into aircraft top-level filters. The six filter
  model is strong because it is simple.
- Do not blur scheduling with assignment truth. Schedule planning is
  availability; aircraft crew assignment is staffing.
- Do not add hard release blocking through UI wording. Keep release and
  compliance warning-first until policy changes.

## Recommended Sequence After This Plan

1. Finish scheduling hardening.
2. Add aircraft create drawer and aircraft drawer polish.
3. Rework customers/passengers into drawer-first workspace.
4. Tighten Operations Control into a phase-grouped FlightLeg board.
5. Tighten Crew roster and crew detail subviews.
6. Plan aircraft maintenance depth before building more MX UI.

## Acceptance For This Planning Phase

This planning phase is ready when:

- macro plan exists,
- page drilldown exists,
- quick Workbench smoke-row cleanup is done,
- docs map and current handoff point to the plans,
- typecheck/lint remain green after code-touching cleanup,
- browser check confirms Workbench rows are gone from planning.

Those items are now the evidence gate before the next implementation slice.

## Handoff Status

Current status: complete for handoff on 2026-06-17.

Verified evidence:

- macro plan exists,
- page drilldown exists,
- docs map and handoff point to both plans,
- Workbench smoke-row cleanup is implemented,
- local database check found zero `SCHED-WORKBENCH-*` crew rows,
- in-app browser check found no `Workbench` text on the planning board,
- typecheck and lint passed after the code-touching cleanup.

Open implementation work:

- scheduling overlap/adjacent resize hardening,
- reusable-template management,
- panning ergonomics,
- aircraft create drawer,
- customers/passengers drawer-first workspace,
- Operations Control phase-grouped board,
- crew roster/detail polish,
- aircraft maintenance-depth planning.
