# Prompt 46: Release Blocking Policy Planning

## Summary

Plan the first operational release-blocking policy for FlightLeg release
actions.

This is a docs/planning slice only. Do not change code, schema, release
actions, auth, signatures, provider integrations, file uploads, seed data, or
backfill behavior.

## Current Context

FlightLeg detail currently shows warning-only readiness checks near Release
Control. Release actions remain available even when readiness warnings are
present.

The current warning-only readiness checklist covers:

- Manifest.
- Weight and balance.
- Flight locating.
- Dispatch package.
- Weather briefing.
- NOTAM snapshot.
- Flight plan reference.
- Aircraft configuration.
- Aircraft maintenance airworthiness release.
- Open/deferred discrepancies.
- Active deferrals.

`FlightRelease` remains the operational FlightLeg release record.
`AirworthinessRelease` remains aircraft maintenance airworthiness release
state, not the full operational release.

## Planning Goals

- Decide which readiness issues should become hard blockers in a future
  implementation slice.
- Decide which issues should remain warnings until richer policy exists.
- Identify where authority-specific rules may be needed for Part 91, Part 91K,
  and Part 135-style operation.
- Define what cannot be implemented safely until auth/user attribution,
  signatures, and override policy exist.

## Recommended Initial Classification

### Future Hard Blockers

These should likely block a normal `FlightRelease` transition to `RELEASED`
once blocking is implemented:

- Missing FlightLeg.
- Missing operational control record.
- Missing planned `FlightRelease` row.
- Missing assigned aircraft.
- Missing controlling entity.
- Missing operating authority or authority revision.
- Missing manifest, empty manifest, or manifest not `READY`/`LOCKED`.
- Missing latest non-voided weight-and-balance run.
- Latest non-voided W&B run not `CALCULATED` or `APPROVED`.
- Missing flight locating record.
- Flight locating record not `FILED`, `ACTIVE`, or `CLOSED`.
- Missing dispatch package.
- Missing weather briefing evidence.
- Missing NOTAM evidence.
- Missing flight-plan reference.
- Missing active aircraft configuration.
- Missing current `RELEASED` aircraft airworthiness release.
- Expired current aircraft airworthiness release.

### Future Warnings

These should remain warnings until more policy exists:

- Open discrepancies without severity/category blocker policy.
- Active deferrals without MEL/CDL, due-date, or category policy.
- Weather evidence present but manually entered.
- NOTAM evidence present but manually entered.
- Flight-plan evidence present but manually entered.
- Superseded, voided, or draft airworthiness release history when a current
  non-expired `RELEASED` aircraft release exists.
- Missing crew qualification, recency, duty, or rest checks until richer crew
  compliance tables exist.

### Authority-Specific Review Needed

These may vary by operating authority and should not be hardcoded globally
without a later policy decision:

- Whether Part 91 operations can release with incomplete dispatch-package
  evidence.
- Whether Part 91K or Part 135 operations require stricter locating,
  manifest, operational-control, and dispatch evidence.
- Which discrepancy severities or categories block release.
- Which deferral categories, due dates, or MEL/CDL statuses block release.
- Whether approval or override is allowed for a given operating authority.

## Prompt 47 Target

Prompt 47 should implement a read-only release-blocking preview, not blocking
itself.

Minimum behavior:

- Add a clear `Would block release` / `Would warn` classification to the
  existing FlightLeg release readiness checklist.
- Keep release action buttons available.
- Do not prevent `FlightRelease` status changes.
- Do not mutate evidence.
- Do not add schema.
- Do not add auth, signatures, or overrides.

This preview lets the policy be tested visually before release actions are
actually blocked.

## Deferred

- Actual release blocking.
- Override workflow.
- Auth, roles, user identity, and signatures.
- Authority-specific policy engine.
- MEL/CDL legal policy.
- Crew compliance enforcement.
- Provider-backed weather, NOTAM, or flight-plan integrations.
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

## Stop Conditions

Stop before implementation if:

- Blocking policy differs by authority and needs user/product decision.
- Override/signature behavior becomes required.
- MEL/CDL interpretation becomes necessary.
- Schema changes appear necessary.
- Provider integration, auth, signature, or upload scope becomes tempting.
