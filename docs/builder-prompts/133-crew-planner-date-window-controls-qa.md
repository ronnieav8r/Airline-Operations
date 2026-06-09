# Prompt 133: Crew Planner Date/Window Controls QA

## Summary

Validate the URL-driven crew planner date/window controls added in Prompt 132.

Prompt 133 is QA/docs only unless a defect is found.

## QA Scope

- Confirm default `/crew/scheduling` still renders.
- Confirm `days=1`, `days=3`, `days=7`, and `days=14` planner windows render.
- Confirm `date=YYYY-MM-DD` changes the selected planning window.
- Confirm grouping and filters still work with selected windows.
- Confirm crew detail links still render.
- Confirm main app routes and diagnostics still load.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local route smoke.
- Browser checks for planner window controls, shortcuts, filters, grouping, and
  crew detail links.

## Status

QA complete. Planner date/window controls render locally, query-param windows
work with filters and grouping, and workflow behavior remains read-only.
