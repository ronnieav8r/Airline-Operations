# Prompt 132: Crew Planner Date/Window Controls Foundation

## Summary

Implement URL-driven planning window controls for the read-only crew scheduling
planner.

## Scope

- Extend the crew scheduling planner query to accept a selected window start
  date and supported window length.
- Add `date=YYYY-MM-DD` and `days=1|3|7|14` controls to `/crew/scheduling`.
- Preserve existing planner filters, grouping, cards, summary counts, and crew
  detail links.
- Apply the selected window to schedule blocks, time-off overlap, upcoming
  coverage, summaries, and warning-only availability messages.
- Keep all behavior read-only.

## Status

Implemented. Prompt 133 should validate default and query-param planner
windows, filters, grouping, links, and unchanged workflow behavior.
