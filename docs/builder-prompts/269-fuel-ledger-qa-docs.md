# Prompt 269: Fuel Ledger QA And Docs

## Summary

Validate the fuel ledger and release fuel readiness chain.

## QA Targets

- Admin edits Jet A density.
- Aircraft fuel uplift/defuel/correction routes render.
- FlightLeg release fuel snapshot route renders.
- FlightLeg postflight fuel snapshot route renders.
- `/api/health` exposes fuel setting and fuel event counts.
- Dashboard drawer shows fuel context.
- W&B route shows release fuel context.
- Release behavior remains warning-only.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
npm run smoke:app
npm run smoke:browser
```
