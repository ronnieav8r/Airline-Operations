# Prompt 171: ReleasePackage Read-Only Preview

## Summary

Prompt 171 adds read-only ReleasePackage visibility to the FlightLeg detail page.
It does not add package capture, package finalization, hard release blocking, or
FlightRelease mutation changes.

## Implemented Scope

- Extended the FlightLeg detail query to include recent ReleasePackage headers
  and evidence links.
- Added a `Release Package` section to `/operations-control/[flightLegId]`.
- Added section navigation for the new package section.
- Shows live completeness context for operational control, FlightRelease,
  readiness snapshot, manifest, W&B, locating, dispatch, and aircraft
  airworthiness release.
- Shows latest captured package metadata/evidence links when packages exist.
- Shows a clear empty state when no package has been captured.

## Validation

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.

Runtime/browser smoke remains pending because Docker Desktop was unavailable.

## Prompt 172 Target

Add an explicit ReleasePackage preview capture action. It must not run
automatically and must not mutate `FlightRelease.status`.
