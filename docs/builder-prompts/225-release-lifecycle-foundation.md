# Prompt 225: Release Lifecycle Foundation

## Summary

Tighten the existing warning-only release action lifecycle without changing
release blocking behavior or adding final ReleasePackage capture.

## Implemented Scope

- Release attempt snapshots now include actor user and role metadata.
- Release audit events now store `actorRole` plus actor metadata in the audit
  JSON.
- Mark Released, Cancel Release, and Void Release continue using the same
  warning-only action path.
- Smoke workflow audit assertions now verify the stored actor role.

## Boundaries

- No schema changes.
- No hard release blocking.
- No legal signature behavior.
- No override workflow.
- No final ReleasePackage capture.
- No provider integrations or file uploads.

## Validation

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- local DB migrate/seed
- `npm run smoke:workflows`
- `npm run smoke:app`
- `npm run smoke:browser`

## Next Slice

Prompt 226 should plan explicit final ReleasePackage capture.
