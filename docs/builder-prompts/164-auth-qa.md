# Prompt 164: Auth QA

## Summary

Prompt 164 validates the local auth schema, login/session foundation, and
mutation role guard foundation added in Prompts 161-163.

## QA Results

- `npm run prisma:validate`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- Server-action guard coverage: pass. Every non-login `app/**/actions.ts` file
  includes the shared `requireRole` guard.
- Local Docker DB/runtime workflow QA: pending. Docker Desktop was not available
  in this environment, so `npm run db:local:up` could not start Postgres.

## Runtime QA Pending When Docker Is Available

- Run local migration and seed.
- Confirm `/login` renders.
- Sign in as seeded admin or ops user.
- Confirm app shell shows the current user and sign-out button.
- Confirm sign-out clears the session.
- Confirm unauthenticated mutation attempts redirect to login.
- Confirm allowed roles can execute existing workflows.
- Confirm warning-first release behavior is unchanged.

## Stop Boundary

No further auth behavior was implemented in Prompt 164. Full read-route
protection, crew portal self-service scoping, password reset, MFA, SSO, and
signature semantics remain deferred.
