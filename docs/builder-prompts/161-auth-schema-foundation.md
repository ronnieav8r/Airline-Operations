# Prompt 161: Auth Schema Foundation

## Summary

Add the schema foundation for local app auth. This slice expands operational
roles and adds local password credential plus DB-backed session primitives.

## Implemented Scope

- Expanded `UserRole` with `DISPATCH`, `MAINTENANCE`, `SAFETY`, and `VIEWER`.
- Added `UserPasswordCredential` for password hashes.
- Added `UserSession` for hashed opaque session tokens.
- Added user relations for credentials and sessions.
- Added health counts for auth credential/session tables.
- Updated current and planning DBML docs.

## Boundaries Preserved

- No login UI.
- No logout action.
- No route protection.
- No server action role guards.
- No password reset.
- No MFA.
- No SSO/provider auth.
- No legal signatures.
- No hard release blocking.

## Prompt 162 Target

- Add `/login`.
- Add login/logout server actions.
- Add session cookie and current-user helpers.
- Add safe local/demo credential seed behavior.
- Keep broad mutation route protection for Prompt 163.
