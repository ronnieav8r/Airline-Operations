# AeroOps Agent Instructions

## Start Of Work

- The active repo is `E:\Codex\Airline Operations\Airline Operations`; the parent folder is only a workspace container.
- Before changing code, read `docs/CURRENT_HANDOFF.md`, `docs/PROJECT_STATUS.md`, `docs/README.md`, and the relevant domain doc for the requested area.
- Treat old `docs/builder-prompts/*` files as audit history. Current handoff, status, and domain docs supersede older prompt text.

## Documentation Discipline

- After every meaningful product, schema, workflow, or UI change, update `docs/CURRENT_HANDOFF.md` and `docs/PROJECT_STATUS.md`.
- If the change alters a durable product rule, also update the relevant domain doc and `docs/README.md` when discoverability changes.
- Keep docs in present tense when the app behavior has changed. Mark superseded decisions clearly instead of leaving conflicting old guidance.

## Maintenance Serviceability Rule

- Aircraft maintenance serviceability is computed in `lib/aircraft-serviceability.ts`.
- Do not reintroduce "current airworthiness release" as the normal everyday maintenance gate.
- `AirworthinessRelease` remains historical or operator-specific release evidence. It is not the default source of serviceability truth.
- A new official discrepancy starts as `OPEN` and makes the aircraft not serviceable until it is deferred or cleared by signed Return to Service.
- Valid clearing paths:
  - `OPEN` discrepancy -> active approved deferral -> `DEFERRED`.
  - `OPEN` discrepancy -> completed corrective maintenance event -> `CORRECTED_PENDING_RTS`.
  - `CORRECTED_PENDING_RTS` -> signed `ReturnToServiceRecord` -> `CLEARED`.
- Do not directly edit an official discrepancy to `CLEARED`. Use the Return to Service flow.
- Erroneous write-ups use a maintenance-only void/cancel action with a required reason and audit metadata.
- Ops can view maintenance state. Crew can create assigned-flight squawks and see crew-relevant status or limitations. Maintenance signoff remains maintenance-authorized.

## Validation

- For schema or workflow changes, run `npm run prisma:validate`, `npm run typecheck`, `npm run lint`, and `npm run build` when practical.
- For UI changes, browser-check the affected route at the current drawer/desktop size and phone-width when the surface is crew-facing or mobile-sensitive.
