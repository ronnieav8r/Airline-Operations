# Prompt 163: Role And Attribution Foundation

## Summary

Prompt 163 adds the first role guard and attribution layer for existing
server-action write workflows. It protects mutations before read routes, keeps
release behavior warning-first, and does not add signatures, MFA, SSO, crew
self-service scoping, or hard release blocking.

## Implemented Scope

- Added a shared role guard helper for authenticated server actions.
- Protected Operations Control, release actions, release snapshot capture,
  release evidence workflows, aircraft airworthiness workflows, aircraft crew
  assignment workflows, crew scheduling admin workflows, time-off review, and
  import metadata writes.
- Populated existing nullable user attribution fields where the current action
  directly owns the write:
  - FlightLeg control creation and aircraft assignment authorship.
  - FlightRelease release attribution and release audit actor.
  - Release readiness snapshot evaluator.
  - W&B approver and dispatch reviewer/creator.
  - Aircraft discrepancy, deferral, maintenance, and airworthiness release
    attribution.
  - Aircraft crew assignment author.
  - Schedule period, rotation pattern, schedule entry, time-off, and import
    batch creator/reviewer fields.

## Deferred

- Full read-route protection.
- Crew portal per-user scoping.
- Legal signatures.
- Password reset, MFA, SSO, or email verification.
- Hard release blocking.
- Fine-grained permission tables.

## Prompt 164 Target

Prompt 164 should QA login/logout, unauthenticated write protection, allowed role
paths, seeded demo login behavior, existing page loads, and preserved
warning-first release behavior.
