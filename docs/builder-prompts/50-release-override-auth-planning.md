# Prompt 50: Release Override and Auth Planning

## Summary

Plan release override, auth, role, and signature requirements before any hard
release-blocking implementation.

This is a docs/planning slice only. Do not add schema, auth, code enforcement,
signature capture, override UI, provider integrations, file uploads, or release
mutation changes.

## Planning Goal

Define the first product policy for future FlightLeg release blocker overrides:

- Who may override.
- Which blockers should be non-overridable.
- What reason, evidence, identity, timestamp, and signature fields must be
  captured.
- Whether override policy differs by authority class.
- What data-model planning is needed before implementation.

## Durable Output

Create or update:

```text
docs/RELEASE_OVERRIDE_AUTH_POLICY.md
```

## Key Decisions

- Do not implement overrides without user identity.
- Do not implement signatures until the app has an approved auth model and
  signature/attestation policy.
- Treat overrides as exception records, not as evidence replacement.
- Keep `FlightRelease` as the operational release record.
- Keep `AirworthinessRelease` as aircraft maintenance airworthiness release
  state.
- Future overrides should be tied to the FlightLeg, release attempt, blocker
  key, authority context, actor identity, timestamp, reason, and supporting
  evidence.

## Future Role Direction

Use planning roles only for now:

- `RELEASE_ACTOR`: may attempt normal release.
- `OPERATIONAL_CONTROL_MANAGER`: may approve operational-control or dispatch
  overrides where policy allows.
- `MAINTENANCE_RELEASE_APPROVER`: may resolve or override maintenance-side
  airworthiness blockers where policy allows.
- `ADMIN`: may configure policy, but should not automatically bypass release
  rules without an explicit override record.

## Non-Overridable Direction

These should not be normal operational overrides until stronger policy exists:

- Missing FlightLeg.
- Missing assigned aircraft.
- Missing operational-control record.
- Missing controlling entity.
- Missing operating authority or authority revision.
- Missing planned `FlightRelease` row.
- Missing active aircraft configuration.
- Missing or expired current aircraft maintenance airworthiness release.

Maintenance-specific release concerns may need a separate maintenance approval
path, not an operations-control override.

## Potentially Overridable Direction

These may be overridable only with role, reason, and audit capture once policy
exists:

- Manual evidence accepted in place of provider-backed weather evidence.
- Manual evidence accepted in place of provider-backed NOTAM evidence.
- Manual evidence accepted in place of provider-backed flight-plan evidence.
- Baseline Part 91 missing manifest, locating, or dispatch evidence when the
  operator policy allows it.
- Stale dispatch/current-information evidence when a qualified actor confirms
  updated information outside the system.

## Prompt 51 Target

Prompt 51 should plan the data model needed for hard blocking, authority policy,
readiness snapshots, override records, and audit events. It should remain
docs-only unless a later implementation prompt explicitly approves schema.

## Deferred

- Actual hard release blocking.
- Override workflow implementation.
- Auth implementation.
- Roles and permissions implementation.
- Signature or attestation implementation.
- Schema changes.
- Provider integrations.
- File uploads.
- `ReleasePackage`.

## Validation

Docs-only slice:

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```
