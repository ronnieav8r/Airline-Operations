# Builder Prompt 33: Release Evidence QA And Deploy Verification

## Summary

Run a focused QA pass after the release-evidence workflow batch. This slice does
not add schema, migrations, seed behavior, or new write workflows.

## QA Finding

Operations Control had working links to FlightLeg evidence detail and edit
routes, but the links were small text inside the evidence cell. On the live web
page this made the page feel like the only obvious action was `New FlightLeg`.

## Remediation

Improve discoverability only:

- Make the flight number link to FlightLeg detail when a FlightLeg is linked.
- Add a clear Actions column to Operations Control.
- Include buttons for Detail, Edit, Manifest, W&B, Locating, and Dispatch where
  a FlightLeg ID is available.
- Keep existing evidence badges and links.
- Do not add new workflows or schema.

## Validation

Run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Local `/operations-control` returns 200.
- Local Operations Control shows visible action buttons.
- Local FlightLeg detail shows release readiness guardrails.
- Local release-evidence workflow routes return 200.
- `/api/health`, `/internal/flightleg-parity`, and
  `/internal/flightleg-write-readiness` return 200.
- Render public routes return successfully after deploy from `origin main`.

## Boundary

Do not include:

- Schema changes.
- Seed or backfill changes.
- New write workflows.
- Release blocking.
- Provider integrations.
- `ReleasePackage`.
