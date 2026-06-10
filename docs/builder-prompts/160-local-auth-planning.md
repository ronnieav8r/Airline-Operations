# Prompt 160: Local Auth Planning

## Summary

Plan the local auth foundation before schema or route implementation. AeroOps
will use local email/password credentials, HttpOnly DB-backed sessions, and
expanded operational roles for a single-customer deployment.

## Decisions

- Auth model: local app-owned email/password.
- Sessions: DB-backed opaque session token stored as a hash, with HttpOnly
  cookie.
- Session lifetime: 12 hours.
- Roles: `ADMIN`, `OPS`, `DISPATCH`, `MAINTENANCE`, `CREW`, `SAFETY`, `VIEWER`.
- First protection policy: protect mutation actions before fully locking read
  routes.
- User attribution: populate existing nullable user fields after actions are
  protected.
- Signatures: deferred; attribution is not a legal signature.
- Tenant model: no SaaS tenant membership; one customer/operator deployment per
  database.

## Prompt 161 Target

- Expand `UserRole`.
- Add password credential and session tables.
- Add relations to `User`.
- Keep this schema-only.

## Prompt 162 Target

- Add `/login`, login/logout actions, session helpers, and safe demo/local
  credential seed behavior.

## Prompt 163 Target

- Protect mutation server actions with role guards.
- Populate existing nullable attribution fields where available.
- Keep read-route lockdown staged unless needed for sensitive internal routes.

## Boundaries

- No SSO.
- No password reset.
- No MFA.
- No signatures.
- No provider auth.
- No multi-tenant membership model.
- No hard release blocking.
