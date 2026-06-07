# Builder Prompt 31: Release Readiness Guardrails Planning

## Summary

Plan the first release-readiness guardrails after manual manifest, locating,
weight-and-balance, and dispatch-package workflows exist. This slice is
planning/docs only. It does not add schema, actions, release blocking, provider
integrations, or release-package modeling.

## Decision

Build release readiness as a warning-only checklist on the existing FlightLeg
detail page.

Chosen implementation slice:

```text
Prompt 32: Release readiness guardrails foundation
```

## Prompt 32 Scope

Prompt 32 should add a readiness checklist to:

```text
/operations-control/[flightLegId]
```

The checklist should appear near the current Release Control section so the
operator sees evidence readiness before using release actions.

## Checklist Policy

Use warning-first behavior only.

- Do not block `Mark Released`.
- Do not block `Cancel Release`.
- Do not block `Void Release`.
- Do not mutate release evidence from the checklist.
- Do not create new evidence rows automatically.
- Do not add schema.

This app is still in development and has no users, but preserving explicit
warning-only behavior avoids hiding product-policy decisions inside early code.

## Evidence Checks

Prompt 32 should read existing `FlightLeg` detail evidence and show these
checks:

- Manifest: ready when a manifest exists, has at least one item, and status is
  `READY` or `LOCKED`.
- Weight and balance: ready when the latest non-voided W&B run is `CALCULATED`
  or `APPROVED`.
- Flight locating: ready when the locating record is `FILED`, `ACTIVE`, or
  `CLOSED`.
- Dispatch package: ready when the dispatch package exists and links weather,
  NOTAM, and flight-plan records.
- Weather: ready when linked weather has a route summary.
- NOTAM: ready when linked NOTAM has affected station codes.
- Flight plan: ready when linked flight plan has an external reference and
  route text.

## Display Policy

The checklist should show:

- Overall evidence status: `READY` only when every checklist item passes.
- Individual item status: `Ready` or `Needs attention`.
- A short explanation for each failed item.
- A clear note that release actions are not blocked yet.

## Deferred

Do not include these in Prompt 32:

- Hard release blocking.
- ReleasePackage.
- Evidence auto-generation.
- Provider calls.
- Auth, roles, or approval attribution.
- New database columns or migrations.
- Audit logging.

## Validation

Prompt 32 should run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open `/operations-control/[flightLegId]`.
- Confirm the readiness checklist appears near Release Control.
- Confirm release action buttons remain visible.
- Confirm a FlightLeg with complete local manual evidence shows all checklist
  items ready.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return 200.

## Stop Conditions

Stop before implementation if:

- Hard release blocking becomes required.
- A schema migration appears necessary.
- Provider integration becomes tempting.
- The checklist needs approval authority, user identity, or audit policy.
