# Builder Prompt 24: Release Evidence Mutation Planning

## Summary

Plan the release-evidence mutation sequence after FlightLeg create/edit,
crew-snapshot sync, and release-control actions. This is a docs/planning slice;
it does not add code, schema, or runtime mutation.

## Decision

Start release-evidence mutation with the manifest workflow.

Next implementation prompt:

```text
Prompt 25: Manifest mutation foundation
```

## Rationale

- Manifest is already modeled as one-to-one with `FlightLeg`.
- Manifest items are simple operational evidence and do not need external
  providers.
- Manifest readiness should come before useful weight-and-balance mutation.
- Manual manifest entries avoid premature passenger identity redesign.
- The workflow can be built without schema migration.

## Planned Evidence Mutation Order

1. Manifest mutation foundation.
2. Flight locating mutation.
3. Weight-and-balance run mutation.
4. Manual dispatch-package evidence mutation.
5. Release gating against required evidence.
6. Weather, NOTAM, and flight-plan provider integrations.

## Prompt 25 Scope

Implement a simple manifest workflow for a FlightLeg:

- Create the manifest if missing.
- Add manual `ManifestItem` rows.
- Edit manual `ManifestItem` rows.
- Remove draft/manual rows if needed.
- Mark manifest `READY`.
- Show manifest status and item count on the existing FlightLeg detail page.

Keep `LOCKED`, `AMENDED`, and `VOIDED` deferred unless the slice explicitly
includes an amendment/unlock policy.

## Boundaries

- No schema migration.
- No weight-and-balance calculation.
- No flight locating mutation.
- No dispatch-package assembly.
- No weather, NOTAM, or flight-plan provider calls.
- No passenger identity redesign.
- No release gating yet.
- No auth or user attribution.

## Validation

Prompt 25 should run:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

Runtime checks:

- Open a FlightLeg detail page.
- Add a manual manifest item.
- Edit the manifest item.
- Mark the manifest `READY`.
- Confirm the detail page shows updated manifest status and item count.
- Confirm `/operations-control`, `/api/health`,
  `/internal/flightleg-parity`, and `/internal/flightleg-write-readiness`
  still return 200.
