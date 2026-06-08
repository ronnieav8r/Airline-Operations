# Prompt 104: Operations Control Workbench Planning

## Summary

Plan a UI-only Operations Control workbench upgrade for `/operations-control`.

The chosen direction is a filterable board plus the existing table. Prompt 105
should add grouped FlightLeg cards above the current table, keep the table below
for full detail, and let the user switch grouping between Release State,
Schedule Window, and Aircraft.

## Key Decisions

- Prompt 104 is docs/planning only.
- Prompt 105 should implement the workbench UI without schema changes.
- Keep the existing table and summary cards, but make the new board the primary
  scanning surface.
- Add server-rendered controls using URL query params, not client-only state.
- Keep all release behavior warning-only.
- Do not add mutations, schema, auth, hard release blocking, imports, provider
  integrations, file uploads, or new release policy.

## Grouping Model

Prompt 105 should support these `groupBy` modes:

- `release`: Planned, Released, Needs Attention, and Closed/Other.
- `schedule`: Today, Upcoming, and Past/Completed.
- `aircraft`: one group per assigned tail number, plus Unassigned.

Default grouping: `release`.

## Filters

Prompt 105 should support these server-rendered filters:

- `release`: `all`, `planned`, `released`, `cancelled-voided`, `no-release`.
- `evidence`: `all`, `ready`, `needs-attention`, `missing`.
- `part`: `all`, `PART_91`, `PART_91K`, `PART_135`.
- `aircraft`: `all` or selected tail number.

Use URL query params so filtered views are shareable:

```text
/operations-control?groupBy=release&release=planned&evidence=needs-attention
```

## Prompt 105 Target

- Update `/operations-control` to accept `searchParams` for `groupBy`,
  `release`, `evidence`, `part`, and `aircraft`.
- Add a compact workbench control bar above the board with dropdowns or
  link-style filters.
- Add grouped FlightLeg cards showing flight number, route, scheduled
  departure, aircraft, release status, operating part, evidence summary, and
  primary links.
- Card links should preserve current destinations for Detail, Edit, Manifest,
  W&B, Locating, and Dispatch.
- Keep the existing Control Records table below the board with no behavior
  loss.
- If no records match filters, show a readable empty state and a link back to
  all records.
- Prefer page-level helpers in `app/operations-control/page.tsx` and small query
  helper changes in `lib/flightleg-operations-control-queries.ts` only if
  needed.

## Prompt 106 Target

- Confirm all grouping modes render: release, schedule, and aircraft.
- Confirm filters work independently and in combination.
- Confirm board cards preserve links to detail, edit, manifest, W&B, locating,
  and dispatch.
- Confirm the existing table still renders below the board.
- Confirm fallback or unassigned records do not break the board.
- Confirm no release actions or evidence workflows changed.

## Test Plan

Prompt 104 is docs/planning only.

For Prompt 105 and Prompt 106:

- Run `npm run prisma:validate`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check `/operations-control` with the default view.
- Smoke-check query views such as `?groupBy=release`, `?groupBy=schedule`,
  `?groupBy=aircraft`, `?release=planned`, and combined filters.
- Smoke-check `/operations-control/[flightLegId]`, `/flights`, `/aircraft`,
  `/crew`, `/scheduling`, `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness`.
- Browser-check the workbench board, grouping selector, filters, card links,
  and retained table.

## Assumptions

- The existing Operations Control query already contains enough data for this
  first workbench slice.
- Filtering is server-rendered through URL query params so links are shareable
  and no new client component is required unless implementation proves
  otherwise.
- Prompt 105 is UI/read-only behavior only.
- Legacy import work remains deferred.
