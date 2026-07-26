# AeroOps UI Workflow Macro Plan

Last updated: 2026-06-17

## Purpose

Use the crew scheduling work as the interaction pattern for the broader app:
compact operational boards, focused drawers or menus for action, and dense but
readable context. This plan is intentionally UI/workflow-first. Backend
contracts remain unchanged unless a later slice explicitly approves schema or
policy work.

For page-by-page layouts, drawer content, row/card content, and implementation
boundaries, use `docs/AEROOPS_UI_PAGE_DESIGN_DRILLDOWN.md` with this file.

## Product-Wide Principles

- **Board first, action second.** Each major area should open to the thing an
  operator needs to scan, not a landing page or admin list.
- **Keep the current object visible.** When a user edits a flight, crew member,
  aircraft, customer, or schedule block, use drawers, context menus, or side
  panels so the surrounding board stays visible.
- **Use focused controls instead of permanent button rows.** Scheduling proved
  that always-visible controls become noise. Prefer compact tool buttons,
  drawers, popovers, right-click menus, and contextual action panels.
- **Separate planning from operational truth.** Crew schedules describe
  availability. `AircraftCrewAssignment` remains staffing truth. `FlightLeg`
  remains the operational flight identity. Release and compliance stay
  warning-first.
- **Make warnings visible, not blocking.** The UI should call out missing
  evidence, aircraft issues, crew gaps, and compliance warnings without making
  them look like legal signoff or hard enforcement.
- **Prefer operator language.** Labels should read like the operation: AOG, Open
  MELs, Open write-ups, Ops Release, Preflight, Postflight, Crew Coverage,
  Manifest, Flight Following, and Schedule Planning.
- **Design for repeated use.** Dense grids, sticky labels, compact counters,
  keyboard/mouse workflows, and quick menus matter more than decorative hero
  layouts.

## Shared Interaction Model

### 1. Boards

Boards are the first screen for active work:

- Dashboard: daily command board.
- Operations Control: FlightLeg workbench.
- Crew Scheduling: timeline planning board.
- Aircraft: fleet status board.
- Crew: roster and coverage context.
- Customers: customer/passenger relationship board.

Each board should provide:

- compact toolbar,
- filter/search controls behind one button when possible,
- sticky or persistent object labels where horizontal/vertical scrolling exists,
- row/card click into a drawer,
- full-page detail link only for deep work,
- visible warning counts or attention markers.

### 2. Drawers

Drawers should become the default object-action workspace:

- summary at the top,
- the most likely actions in the first view,
- deeper sections as drawer subviews,
- full workflow link only when the action is too large for the drawer.

Current strongest pattern: Dashboard FlightLeg drawer with summary, release,
manifest, crew, preflight, postflight, and audit views.

### 3. Context Menus

Use right-click or overflow menus for direct object actions where inline buttons
crowd the board:

- schedule block: change status, remove block, split later if needed,
  extend/repeat behavior;
- FlightLeg card: open release review, manifest, crew, preflight, postflight;
- aircraft row: open quick review, mark status workflow, open write-up/MEL
  workflow;
- passenger row: open profile, link to customer, add to manifest when in a
  flight context.

Context menus should never perform destructive actions immediately on
right-click. Right-click opens the menu. A menu item performs the action.

### 4. Full Pages

Full pages remain for workflows that need space:

- FlightLeg release workspace,
- manifest management,
- weight and balance,
- flight locating,
- aircraft airworthiness/maintenance,
- aircraft crew assignment,
- crew compliance,
- crew logistics,
- scheduling planning.

The drawer should route to the full page only when the user is entering that
larger workflow deliberately.

## Scheduling Pattern To Reuse

The scheduling board now has the app's clearest operational pattern:

- compact toolbar instead of a large page header,
- board focus mode,
- sticky labels and dates,
- board-level horizontal work surface,
- Quick Blocks for ad hoc changes,
- Reusable Templates for repeatable patterns,
- draft vs published distinction,
- right-click action menu,
- compact counters near the object label,
- rolling planning window.

Reusable ideas for the rest of the app:

- **Templates:** not only schedule rotations. Use for repeatable release
  packages, common maintenance write-up types, passenger manifest presets,
  common logistics needs, and recurring crew compliance tasks later.
- **Quick Blocks:** use equivalent quick actions on other boards: mark review
  needed, add manifest passenger, add fuel onboard event, create ground
  transport need, open MEL workflow.
- **Counters near labels:** use compact local counters where they answer the
  user's immediate question, not global summary chips that duplicate the page.
- **Context menu cleanup:** when cards or bars get short, remove inline actions
  and move them into menus.

## Module Plans

### Dashboard

Role: daily command board.

Recommended direction:

- Keep the dashboard compact and flight-centered.
- Make active FlightLeg rows/cards the primary surface.
- Keep top tiles for true operational summaries only: Release Review, Active
  Alerts, Enroute, Delayed, Available Aircraft.
- Use the FlightLeg drawer as the primary action surface.
- Avoid adding deep aircraft, crew, or customer management directly to the
  dashboard body.

Near-term slices:

- Tighten the dashboard row/card layout around FlightLeg identity, schedule,
  aircraft, customer, crew, release state, and readiness beacons.
- Continue turning drawer cards into direct issue-fix surfaces.
- Add explicit "needs action" grouping for release, crew, MX, manifest, and
  locating warnings.

### Operations Control And Flights

Role: command center for active and upcoming FlightLegs.

Recommended direction:

- Merge the mental model of `/flights` and `/operations-control` over time:
  one is the daily workbench, the other can remain a broader flight list if
  useful.
- Use FlightLeg cards/rows with quick review drawers.
- Keep full FlightLeg detail for deep release/preflight/postflight work.
- Make Ops Release, Preflight, and Postflight phase state obvious without
  turning warnings into blockers.

Near-term slices:

- Rework Operations Control into a denser FlightLeg board with status groups.
- Add a compact phase strip per FlightLeg: Ops Release, Preflight, Postflight,
  Manifest, W&B, Fuel, Locating, MX, Crew.
- Move secondary filters into a popover.
- Keep "New FlightLeg" prominent but not oversized.

### Crew Scheduling

Role: schedule availability planning, separate from aircraft assignment truth.

Recommended direction:

- Continue board polish before adding new scheduling policy depth.
- Use 56-day max visible rolling context in planning with explicit previous,
  today, next, and date-jump controls.
- Keep monthly counters compact beside the crew identity.
- Add warning thresholds later as operator-configurable policy, not hard-coded
  compliance.
- Keep the schedule block model: create, resize, right-click, status change,
  remove, template repeat.

Near-term slices:

- Finish conflict behavior: adjacent block push/shrink, no overlaps, clear
  visual preview while resizing.
- Add template edit/delete/search and a more deliberate pattern builder.
- Add a small month-count configuration surface later: 18 days/month default,
  rolling-30 option, and operator-specific warning rules.
- Browser-test middle-mouse/horizontal panning and add drag-to-pan if needed.

### Crew Roster And Crew Detail

Role: crew record, readiness, assignments, and personnel context.

Recommended direction:

- Keep `/crew` as a compact roster, not a scheduling clone.
- Use drawers for add/edit/detail/time-off review.
- Make the crew detail page the full personnel workspace for compliance,
  schedule, logistics, active assignments, and time-off history.
- Cross-link from any crew row into scheduling at that crew member and date
  later.

Near-term slices:

- Tighten roster rows around name, base, active assignment, qualification risk,
  schedule status, and open requests.
- Move low-frequency fields out of the row and into the drawer/detail page.
- Add drawer subviews for schedule, compliance, logistics, and assignments.

### Aircraft

Role: fleet status board plus aircraft-specific workspace.

Recommended direction:

- Keep `/aircraft` as the six-tile fleet board: Aircraft, Available, In flight,
  AOG, Open MELs, Open write-ups.
- Use the aircraft drawer for immediate review and links into deep workflows.
- Put maintenance depth into an aircraft maintenance/airworthiness workspace,
  not more top-level board counters.

Near-term slices:

- Add aircraft create drawer.
- Refine aircraft drawer summary: status, current location/flight, crew block,
  fuel context, open MELs/write-ups, next scheduled leg.
- Plan a focused maintenance board or aircraft detail tab for AOG, write-ups,
  MELs, CDL, NEF/EFL, operational limitations, and next service due.

### Customers And Passengers

Role: reusable customer and passenger relationship management.

Recommended direction:

- Rework `/customers` away from side-by-side forms and lists into a relationship
  workspace.
- Customers and passengers are reusable records; manifest participation is
  flight-specific.
- Make the default experience search-first, then drawer-first.

Near-term slices:

- Replace always-visible create forms with "New customer" and "New passenger"
  drawer actions.
- Add compact customer rows with linked passenger count, active/recent flights,
  contact, and notes marker.
- Add passenger rows with customer links, ID document status, manifest history,
  and contact.
- In a selected customer drawer, show linked passengers first and provide quick
  create/link actions.
- In a selected passenger drawer, show customer links, ID details, manifest
  history, and edit action.

### Manifest

Role: FlightLeg-specific passenger list using reusable passenger data.

Recommended direction:

- Keep manifest work attached to the FlightLeg context.
- Use passenger/customer data as lookup and identity source, not as the flight
  manifest itself.
- In drawers, support fast add/remove and status review; use full page for
  larger manifest management.

Near-term slices:

- Improve add-passenger selector search and customer-linked suggestions.
- Add clear passenger statuses later: planned, onboard, no-show, removed.
- Add identity/passport/no-fly/watchlist workflow planning as separate warning
  surfaces before implementation.

### Crew Logistics

Role: manual coordination for crew movement and needs.

Recommended direction:

- Keep logistics manual and warning-first.
- Use a central workbench for open needs, plus crew-scoped pages for history.
- Tie logistics needs back to crew schedule, FlightLeg, aircraft, and station
  context where available.

Near-term slices:

- Make logistics workbench rows more action-first: crew, need type, due time,
  from/to, status, provider placeholder, related FlightLeg.
- Add drawer edit/review for a logistics need.
- Add cross-links from scheduling blocks and FlightLeg crew drawers.

## Page-Level UI Shape

### Top Navigation

Keep app navigation simple:

- Dashboard
- Operations
- Flights
- Customers
- Aircraft
- Crew
- Scheduling
- Admin

Scheduling should remain distinct from Crew because the work mode is different:
timeline planning vs personnel records.

### Toolbar Pattern

Use the compact scheduling toolbar model across boards:

- left: board mode or primary view selector,
- center: horizon/date/search where relevant,
- right: filters, tools/actions, focus/expand when useful.

Avoid duplicating state in multiple pills. If the nav or active tab already
tells the user the page mode, do not repeat it in another chip.

### Drawer Pattern

Standard drawer header:

- object identity,
- lifecycle/status pills,
- primary action,
- Back/Expand/Contract where relevant.

Standard drawer body:

- summary first,
- actionable warnings second,
- focused workflow sections,
- full-page link last.

### Detail Page Pattern

Full pages should use:

- compact header,
- command bar,
- primary work section,
- supporting evidence sections,
- audit/history lower on the page.

Avoid long pages where every section has equal visual weight.

## Suggested Implementation Order

1. **Finish Scheduling Hardening**
   - overlap rules,
   - adjacent block shrink/push,
   - resize preview,
   - template management,
   - panning ergonomics,
   - month-count policy planning.

2. **Aircraft Create And Drawer Polish**
   - create drawer,
   - aircraft drawer summary cleanup,
   - maintenance workflow planning.

3. **Customers Workspace Cleanup**
   - remove always-visible create forms,
   - drawer-first customer/passenger create/edit,
   - relationship-focused rows and drawers.

4. **Operations Control Board Pass**
   - compact FlightLeg command board,
   - phase strip,
   - filters popover,
   - drawer action alignment.

5. **Crew Roster And Crew Detail Pass**
   - compact roster rows,
   - schedule/compliance/logistics drawer subviews,
   - cross-links into scheduling.

6. **Maintenance Workspace Planning**
   - define AOG/write-up/MEL/CDL/NEF/EFL workflow surface,
   - keep warnings visible in release review,
   - avoid hard airworthiness blocking unless separately planned.

## QA Approach

Each UI slice should include:

- typecheck,
- lint,
- focused smoke if the slice touches DB-backed workflow,
- browser check on the exact route,
- light/dark spot check where practical,
- mobile-width or narrow-window check for text overlap,
- route/query reload check for drawer and filter state.

Scheduling-specific QA should continue to include:

- no sign-in redirect in local prototype actions,
- no smoke-test crew leaking into real boards,
- no overlap after create/resize/status change,
- monthly counters update correctly,
- published vs draft lanes remain visually distinct,
- horizontal scroll and sticky labels work in focused mode.

## Open Product Decisions

- Should scheduling eventually use a dedicated timeline/canvas renderer? Not
  immediately. The current Next.js/React approach can support the present
  workflow. Revisit a dedicated renderer if row counts, drag complexity, or
  virtualization needs exceed what the DOM board can handle cleanly.
- Should monthly schedule limits be per calendar month, rolling 30 days, or
  operator configurable? Treat this as operator policy. Start with visible
  calendar-month counters, then add policy configuration.
- Should block splitting be explicit? Defer. The cleaner v1 workflow is shrink
  one block, then create a new adjacent block. Add a split action only if users
  consistently need it.
- Should right-click menus be app-wide? Yes, but only for object actions where
  inline controls crowd the interface. Keep primary actions visible when they
  are obvious and frequent.
- Should focus mode exist beyond scheduling? Use it selectively. It helps large
  boards and timelines, but ordinary record pages should not need it.

## UI Variant Review

This section compares possible layouts and records the current recommendation
for each module.

### Dashboard Variants

Option A: flight board with top summary tiles.

- Best for daily operations.
- Keeps FlightLegs as the working object.
- Works with the existing FlightLeg drawer.
- Recommended.

Option B: alert-first dashboard.

- Useful when the operation is large enough that alerts dominate.
- Risk: hides ordinary release/preflight work until something is already late.
- Not recommended for the current app.

Option C: module launcher dashboard.

- Simple but low-value for a working ops console.
- Creates extra clicks and does not help the dispatcher.
- Do not use.

Recommendation: keep a compact flight board with high-signal summary tiles and
make the drawer the place where the user fixes the issue.

### Operations Control Variants

Option A: dense FlightLeg board grouped by operational phase.

- Best for dispatch/ops scanning.
- Makes late, release-needed, enroute, and completed work easy to separate.
- Allows phase strips on each row.
- Recommended.

Option B: table-first workbench.

- Good for power filtering and exports.
- Less approachable for normal daily work.
- Keep as a secondary view if needed, not the default.

Option C: kanban-style columns.

- Good for lifecycle movement, but can hide time sequence.
- Risky for flights because schedule time matters more than card movement.
- Consider only for a narrow "today status" subview.

Recommendation: use a grouped board with optional table view later. Do not make
kanban the primary dispatch interface.

### Crew Scheduling Variants

Option A: current DOM timeline board.

- Good for the current prototype and near-term iteration.
- Easier to maintain inside the existing Next.js app.
- Supports sticky labels, toolbars, context menus, and forms.
- Recommended now.

Option B: dedicated timeline component.

- Useful if virtualization, hundreds of crew rows, or more complex drag behavior
  becomes necessary.
- Adds dependency and integration risk.
- Revisit after conflict rules and panning are stable.

Option C: canvas/SVG schedule renderer.

- Best for very high-density drawing and custom interactions.
- More work to make accessible and form-friendly.
- Not needed yet.

Recommendation: continue the DOM board. Reconsider only if performance or
interaction complexity becomes the blocker.

### Crew Roster Variants

Option A: compact roster plus drawer.

- Best for personnel management.
- Keeps the row readable and moves details into the drawer.
- Recommended.

Option B: card grid.

- Looks friendly but wastes vertical space for a roster.
- Harder to scan for qualifications, base, assignment, and warnings.
- Not recommended.

Option C: schedule-first crew page.

- Duplicates scheduling.
- Blurs personnel records with planning work.
- Do not use.

Recommendation: compact roster, drawer for quick review/edit, full crew detail
for compliance/schedule/logistics.

### Aircraft Variants

Option A: fleet status board with aircraft drawer.

- Best for the current fleet workflow.
- Supports the six top-level filters already chosen.
- Recommended.

Option B: maintenance-first aircraft page.

- Useful for a maintenance module, but too narrow as the aircraft home page.
- Keep maintenance in detail/workflow surfaces.

Option C: aircraft schedule timeline.

- Useful later for aircraft utilization.
- Should not replace fleet status as the aircraft landing view.

Recommendation: fleet status board first; maintenance and utilization as
focused subviews.

### Customers And Passengers Variants

Option A: search-first relationship workspace.

- Best for reusable customer/passenger records.
- Starts from how users find people and companies.
- Recommended.

Option B: customer CRM board.

- Better for sales/account management than operations.
- Risk: too much account detail for manifest workflows.

Option C: passenger database first.

- Good for identity cleanup, but weak for charter/customer workflows.
- Keep as a tab or filtered view, not the default.

Recommendation: search-first customer/passenger workspace with drawer actions
and customer-linked passengers shown prominently.

### Manifest Variants

Option A: FlightLeg-attached manifest panel.

- Best because manifest is flight-specific.
- Uses reusable passenger data without making passengers the workflow anchor.
- Recommended.

Option B: standalone manifest module.

- Useful later for large operators.
- Overkill for the current flow.

Option C: customer-driven manifest builder.

- Helpful when building repeat trips for the same customer.
- Better as a future template/preset feature than the default workflow.

Recommendation: keep manifest attached to FlightLeg; add passenger search,
linked-customer suggestions, and later manifest presets.

## Detailed Slice Backlog

### Slice 1: Scheduling Hardening

Goal: make the current planning board dependable before spreading the pattern.

Scope:

- Enforce no draft block overlap after create, resize, status change, and
  template placement.
- Make adjacent block behavior predictable: dragged block takes priority;
  neighboring block shrinks only when they touch with no gap.
- Add resize ghost preview for left and right handles.
- Keep right-click menu as the action surface for status change and remove.
- Add template edit/delete/search in the Reusable Templates drawer.
- Confirm horizontal panning behavior in focused and normal modes.

Acceptance:

- User can create, resize, shrink, change status, and remove blocks without
  visual overlap.
- Click-away from menus does not create blocks.
- Workbench smoke crew do not appear.
- Typecheck and lint pass.
- Browser check the focused planning URL.

### Slice 2: Aircraft Board And Create Drawer

Goal: make aircraft feel as polished as scheduling without adding maintenance
depth prematurely.

Scope:

- Add "New aircraft" drawer from `/aircraft`.
- Tighten aircraft drawer summary.
- Add clearer links to detail, crew block, fuel, and airworthiness.
- Keep top-level filters unchanged.

Acceptance:

- Create drawer opens, validates, saves, and returns to the board.
- Aircraft rows do not become crowded with maintenance details.
- AOG/Open MEL/Open write-up filters remain clear.

### Slice 3: Customers Workspace

Goal: turn `/customers` into a relationship workspace instead of visible forms
plus lists.

Scope:

- Replace always-visible forms with drawer create/edit flows.
- Add a compact search/results header.
- Show customer and passenger rows with operationally useful fields.
- Customer drawer: profile, linked passengers, recent manifest use, quick link
  passenger.
- Passenger drawer: identity/contact, customer links, manifest history.

Acceptance:

- User can search, create, edit, link, and unlink without losing context.
- Customer/passenger distinction remains obvious.
- Manifest-specific data stays attached to FlightLeg/ManifestItem.

### Slice 4: Operations Control Board Pass

Goal: make `/operations-control` the primary dispatch workbench.

Scope:

- Group FlightLegs by useful operational state.
- Add compact phase readiness strip.
- Move secondary filters into a popover.
- Align row click and drawer behavior with Dashboard.

Acceptance:

- Operator can scan release state, schedule, aircraft, customer, crew, and
  warnings without opening every row.
- Drawer provides direct actions or full-workflow links.
- No release behavior becomes hard-blocking.

### Slice 5: Crew Roster Pass

Goal: make `/crew` a roster and personnel workspace, not another planner.

Scope:

- Tighten roster row fields.
- Add drawer subviews for profile, schedule, compliance, logistics, assignments.
- Add scheduling cross-links from crew drawer/detail.
- Keep compliance and duty/rest warning-first.

Acceptance:

- Crew row is readable at normal desktop width.
- Open requests, assignment, base, and qualification issues are visible.
- Deeper compliance/logistics data stays in drawer/detail views.

### Slice 6: Maintenance Workspace Planning

Goal: design maintenance depth before expanding aircraft UI.

Scope:

- Define where AOG, open write-ups, MELs, CDL, NEF/EFL, next service, and
  operational limitations live.
- Decide whether maintenance is aircraft-detail-first or a separate board.
- Define how maintenance warnings appear in FlightLeg release review.

Acceptance:

- Maintenance terms are aviation-native and consistent.
- Release review can show MX warnings without acting like a legal release
  block.
- Aircraft board remains a fleet status board.

## QA Review Pass

Questions to ask before implementing any slice:

- Does this page open to the work the operator actually needs to do?
- Is the main object still visible while the user acts?
- Are filters and secondary controls hidden until needed?
- Are warnings visible without becoming hard blocks?
- Does the workflow preserve `FlightLeg`, `AircraftCrewAssignment`, and crew
  schedule boundaries?
- Are we adding backend/schema depth, or can this be handled with existing
  contracts?
- Does the UI still work with enough rows to resemble real operations?
- Can a user recover from a mistaken click without losing context?
- Does the route reload with the same drawer/filter state?
- Is the page still readable in focused mode, normal desktop, and narrower
  viewport widths?

## Recommendation After Review

The strongest next product move is still Scheduling Hardening, not a broad
redesign. The scheduling board is close to becoming a reusable interaction
standard, but it needs overlap rules, resize previews, panning confidence, and
template management before the same pattern is copied elsewhere.

After that, the best order is Aircraft Create Drawer, Customers Workspace, then
Operations Control Board. That sequence gives quick visible wins, improves
record creation, and avoids taking on the full dispatch board while scheduling
is still actively settling.
