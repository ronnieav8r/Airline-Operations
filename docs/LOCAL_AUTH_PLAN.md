# Local Auth Plan

Last updated: 2026-06-10

## Summary

AeroOps should use local app-owned authentication for the first auth foundation:
email/password credentials, HttpOnly DB-backed sessions, and operational roles.
The app remains a single-customer deployment with one database per customer or
operator group.

Auth is required before stronger release blocking, overrides, signatures,
crew self-service, and trustworthy user attribution.

## Roles

Use these roles in the first auth schema foundation:

- `ADMIN`: full app administration and all operational workflows.
- `OPS`: operations control, FlightLeg, release, crew scheduling, and aircraft
  assignment workflows.
- `DISPATCH`: dispatch, release evidence, flight locating, W&B, manifest, and
  Operations Control read access.
- `MAINTENANCE`: aircraft, airworthiness, discrepancy, deferral, maintenance,
  and airworthiness release workflows.
- `CREW`: crew portal, own profile/schedule/request views, and request
  submission.
- `SAFETY`: future safety/SMS workflows and read access to relevant operational
  context.
- `VIEWER`: read-only operational visibility.

## Session Policy

- Store sessions in the database.
- Set a random opaque session token in an HttpOnly cookie.
- Store only a hash of the session token in the database.
- Default session lifetime: 12 hours.
- Sliding refresh can be deferred; renewing sessions can be a later slice.
- Logout deletes the current session and clears the cookie.
- Inactive users cannot create or use sessions.

## Password Policy

- Store password hashes only; never store plaintext passwords.
- Use Node built-in crypto password hashing for the first local implementation.
- Minimum password length: 12 characters.
- Admin-created demo credentials are allowed only for local/demo seed behavior.
- Password reset, email verification, MFA, and magic links remain deferred.

## Route And Action Protection

First implementation should protect mutation surfaces before read surfaces.

Minimum action gates:

- `ADMIN`: all actions.
- `OPS`: FlightLeg create/edit, release actions, crew scheduling admin, time
  off review, aircraft crew assignment, import metadata.
- `DISPATCH`: manifest, W&B, locating, dispatch package workflows, release
  snapshot capture.
- `MAINTENANCE`: aircraft airworthiness, discrepancies, deferrals, maintenance
  events, airworthiness releases.
- `CREW`: crew portal request submission only.
- `SAFETY`: no mutation gates in the first auth chain unless a safety route is
  added later.
- `VIEWER`: no mutations.

Read route protection can be staged:

- `/login` remains public.
- Internal diagnostics should require `ADMIN` or `OPS`.
- Crew portal should require `CREW` and only show the current user's linked
  `CrewMember` context.
- Public unauthenticated reads may remain temporarily during the first auth
  implementation only if mutation actions are protected first.

## User Attribution Policy

When a nullable user field already exists, populate it from the current user
after the route/action is protected:

- Flight/control: `OperationalControlRecord.createdById`,
  `FlightRelease.releasedById`, `ReleaseReadinessSnapshot.evaluatedById`,
  `ReleaseAuditEvent.actorUserId`.
- Crew/aircraft assignment: `AircraftCrewAssignment.assignedById`,
  `AircraftAssignment.assignedById`, `CrewLegAssignment.assignedById`.
- Evidence: `Manifest.lockedById`, `WeightBalanceRun.approvedById`,
  `DispatchPackage.createdById`, `DispatchPackage.reviewedById`.
- Airworthiness: `Discrepancy.reportedById`, `Deferral.authorizedById`,
  `MaintenanceEvent.approvedById`, `AirworthinessRelease.releasedById`.
- Scheduling: `TimeOffRequest.requestedById`, `TimeOffRequest.reviewedById`,
  `CrewSchedulePeriod.createdById`, `CrewSchedulePeriod.publishedById`,
  `CrewScheduleRequest.submittedById`, `CrewScheduleRequest.reviewedById`,
  `CrewRotationPattern.createdById`, `CrewScheduleEntry.createdById`,
  `CrewScheduleEntry.publishedById`.
- Import staging: `ImportBatch.createdById`, `ImportBatch.reviewedById`,
  `ImportMappingDecision.decidedById`.

Do not add signature semantics in the auth chain. A populated user field is
attribution, not legal signature.

## Prompt 161 Schema Target

Add only auth schema primitives:

- Expand `UserRole`.
- Add a one-to-one or one-to-many password credential table for `User`.
- Add DB-backed session table with token hash, expiry, revoked timestamp,
  user agent/IP metadata placeholders, and indexes.
- Add any necessary relation fields to `User`.

No route protection, login UI, password reset, MFA, signatures, tenant
membership, or provider auth in Prompt 161.

Prompt 161 implementation status: complete. `UserRole` now includes the planned
operational roles, and the schema has local password credential plus DB-backed
session primitives.

## Prompt 162 Login Target

- Add `/login`.
- Add login/logout server actions.
- Add current-user/session helpers.
- Add safe local/demo seed credential behavior.
- Keep broad route protection for Prompt 163.

Prompt 162 implementation status: complete. The app now has local login/logout,
DB-backed session helpers, an app-shell user indicator, and seeded local/demo
credentials for the demo admin and ops users. Mutation protection and
attribution remain Prompt 163 scope.

## Prompt 163 Protection Target

- Add role guard helpers.
- Protect mutation server actions.
- Populate user attribution fields where already present.
- Start with write protection before fully locking read routes.

## Deferred

- SSO or managed auth.
- Email verification.
- Password reset.
- MFA.
- Legal e-signatures.
- Fine-grained permission tables.
- Shared multi-tenant SaaS user membership.
