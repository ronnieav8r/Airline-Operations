# Prompt 162: Login And Session Foundation

## Summary

Prompt 162 adds the first local login/logout workflow on top of the Prompt 161
auth schema. This is a session foundation only. Broad mutation protection,
role gates, password reset, MFA, signatures, and managed provider auth remain
deferred.

## Implemented Scope

- Added local password hashing and verification helpers using Node built-in
  crypto.
- Added DB-backed session helpers with an HttpOnly opaque session cookie.
- Added `/login` with a plain server-side form and login/logout server actions.
- Added app shell current-user display and logout action.
- Added safe local/demo seed credential behavior for seeded admin and ops users.
- Updated auth docs and project status.

## Deferred

- Route/action protection.
- Role gates.
- Attribution changes in mutation workflows.
- Password reset, MFA, SSO, email verification, and signatures.
- Crew self-service auth scoping.

## Prompt 163 Target

Prompt 163 should protect mutation routes/actions and populate existing nullable
user attribution fields from the current authenticated user where the action is
already protected.
