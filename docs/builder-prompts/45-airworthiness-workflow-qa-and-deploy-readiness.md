# Prompt 45: Airworthiness Workflow QA And Deploy Readiness

## Summary

Run a focused QA pass after the airworthiness release workflow and readiness
refresh. This slice should not add product features unless validation exposes a
bug that must be fixed to keep the current workflow working.

## Scope

- Validate the aircraft-level airworthiness workflow end to end.
- Confirm release create/edit lifecycle behavior still works:
  - create draft,
  - create released,
  - supersede prior current released record,
  - void a record.
- Confirm warning-only readiness views still render.
- Confirm existing routes still return successfully.
- Update durable QA/status docs.
- Commit and push the QA slice.

## Do Not Add

- Schema changes.
- Auth, signatures, roles, or user attribution.
- Hard release blocking.
- Provider integrations.
- File uploads.
- Operational `FlightRelease` mutation.
- FlightLeg-specific airworthiness release snapshots.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- `/`
- `/aircraft`
- `/aircraft/[aircraftId]/airworthiness`
- `/operations-control`
- `/operations-control/[flightLegId]`
- `/api/health`
- `/internal/flightleg-parity`
- `/internal/flightleg-write-readiness`

Workflow smoke:

- Create draft aircraft airworthiness release.
- Create a released aircraft airworthiness release.
- Create a second released aircraft airworthiness release and confirm the prior
  released record becomes `SUPERSEDED`.
- Void a draft release.

## Stop Conditions

Stop before Prompt 46 if:

- Any validation fails and requires a product decision.
- Release blocking policy becomes ambiguous.
- A schema change appears necessary.
- Provider integration, auth, signature, or upload scope becomes tempting.
