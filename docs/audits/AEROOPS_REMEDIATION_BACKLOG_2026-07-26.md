# AeroOps Remediation Backlog

**Source audit:** `docs/audits/AEROOPS_CODEBASE_AUDIT_2026-07-26.md`
**Prepared:** 2026-07-26
**Status:** proposed only; no slice in this backlog was implemented during the audit

## Delivery rules

- Keep slices small and non-overlapping. One slice may depend on another, but it must not silently absorb its work.
- Preserve `FlightLeg` as operational truth, `AircraftCrewAssignment` as staffing truth, warning-first release behavior, immutable release/maintenance evidence, and the centralized aircraft-serviceability calculation.
- Do not delete or redesign legacy `Flight`, `/crew/portal`, or direct aircraft-logbook compatibility surfaces in ordinary cleanup work.
- Use forward-only migrations. Never edit an applied migration.
- Security acceptance is not satisfied by typecheck, lint, or build alone.
- Every implementation slice must finish with a clean-install/static gate appropriate to its scope and a production-mode test with test authentication disabled.

## Required shared security acceptance matrix

Every security-facing slice must add the applicable cases below. Slices may share test helpers, but each slice owns assertions for the routes/actions it changes.

1. Anonymous request.
2. Every applicable role: `ADMIN`, `OPS`, `DISPATCH`, `CREW`, `MAINTENANCE`, `SAFETY`, `VIEWER`.
3. Cross-user, cross-crew-member, cross-flight, cross-aircraft, cross-passenger, and cross-draft object IDs.
4. Missing, malformed, overlong, duplicate, stale, and hostile inputs.
5. Oversized upload and MIME/extension/signature mismatch.
6. Absolute, protocol-relative, slash/backslash, encoded, and credential-bearing return URLs.
7. Expired and revoked sessions.
8. Production-mode behavior with all test bypasses disabled.
9. Response-body, redirect, header, and log checks for sensitive internals.
10. Concurrent duplicate submissions, publish/cancel races, and retry behavior where the operation writes data.

## 1. Immediate P0/P1 containment and dependency patches

### SEC-001 — Guard all planning-draft Server Actions

**Scope**

- Add an `ADMIN`/`OPS` entry guard to all seven exports in `app/crew/scheduling/planning-actions.ts`.
- Reject before parsing IDs or querying domain objects.
- Persist a non-null actor for publish, cancel, and template mutations where schema permits.
- Do not change schedule-to-aircraft-assignment semantics.

**Dependencies:** none. This is the first containment slice.

**Acceptance tests**

- Direct anonymous invocation of each action is rejected without a write.
- `ADMIN` and `OPS` succeed; all other roles are denied.
- Cross-draft, cross-period, stale change, malformed ID, duplicate publish, and concurrent cancel/publish cases.
- Audit actor is recorded.
- `npm run typecheck`, `npm run lint`, `npm run build`, focused scheduling smokes, and production-mode action tests.

**Rollback:** revert the guard-only change and its tests as one commit. No schema change belongs in this slice.

**Documentation:** update `CURRENT_HANDOFF.md`, the authorization matrix, and scheduling workflow notes.

### SEC-002 — Establish the default authenticated page boundary

**Scope**

- Define an explicit public-route list containing login and required static assets only.
- Require authentication for every other page route.
- Keep page-local role guards as defense in depth.
- Do not assign final least-privilege roles in this slice; that is SEC-003.

**Dependencies:** SEC-001.

**Acceptance tests**

- Anonymous matrix across all 44 page routes.
- Login and assets remain reachable.
- Revoked/expired/malformed session redirects are safe.
- Production-mode test bypass disabled.
- No redirect loop, asset failure, health-probe failure, or Server Action regression.

**Rollback:** remove the default boundary as one reversible routing change; retain SEC-001 action guards.

**Documentation:** public-route policy, deployment probe paths, and authentication architecture.

### DEP-001 — Patch Next.js and refresh the reproducible lockfile

**Scope**

- Update `next` and `eslint-config-next` together to at least `16.2.12` within the current major/minor line.
- Refresh compatible transitive `postcss` and `sharp`.
- Align Prisma CLI/client/config on a compatible patched 6.x version and ensure `effect >=3.20.0`.
- Refresh `brace-expansion`, `js-yaml`, and `esbuild` transitively.
- Resolve the local `node_modules`/lockfile drift.

**Dependencies:** none; may proceed in parallel with SEC-001, but land separately.

**Acceptance tests**

- Clean dependency directory followed by `npm ci`.
- `npm audit --json` has no unresolved high finding without a documented, time-bounded exception.
- Prisma generate/validate, typecheck, lint, build, all focused smoke suites, and production-mode auth suite.
- Next Server Action behavior, image handling, and route redirects are exercised.

**Rollback:** restore `package.json` and `package-lock.json` together; never roll back only one.

**Documentation:** dependency baseline, advisory disposition, and any temporary exception owner/date.

### OPS-001 — Add a fail-closed database-target guard to destructive tooling

**Scope**

- Create one shared guard used by `prisma/seed.ts` and every write-capable seed, backfill, and smoke script.
- Parse the URL structurally; do not use substring matching alone.
- Permit the known local Docker endpoint and explicitly declared disposable CI databases.
- Require an additional destructive-operation confirmation for full seed/reset behavior.
- Execute before Prisma writes.

**Dependencies:** none.

**Acceptance tests**

- Local Docker allowed.
- Remote/Render-like host, missing URL, malformed URL, misleading username/query, and localhost substring in a remote hostname are denied.
- Production environment requires explicit two-part opt-in and still logs the target host only, never credentials.
- Instrumented test proves no write occurs before the guard.

**Rollback:** retain the previous wrapper commands on a short-lived branch; do not provide an undocumented bypass.

**Documentation:** local setup, CI disposable-database contract, destructive-command runbook, and incident warning.

## 2. Authentication, authorization, object access, and test-bypass hardening

### SEC-003 — Apply least-privilege page and API policies

**Scope**

- Assign explicit roles to all operational and internal pages currently marked “Missing.”
- Authenticate and authorize the three crew-resolution APIs.
- Define object-level aircraft/flight/crew/passenger checks.
- Return consistent `401` for unauthenticated API calls and `403` for authenticated denials.

**Dependencies:** SEC-002.

**Acceptance tests**

- Full page/API role matrix.
- Cross-object IDs do not disclose whether the object exists.
- Allowed operational workflows still render and mutate through their separately guarded actions.
- Crew/customer PII is absent from denied response bodies and RSC payloads.

**Rollback:** policy map and tests revert together. Never restore anonymous API access as a compatibility shortcut.

**Documentation:** authoritative authorization matrix and role definitions.

### AUTH-001 — Enforce credential bootstrap and login-abuse controls

**Scope**

- Remove or hard-localize known default operational passwords.
- Fail closed if production seed/startup would use a default.
- Enforce `mustChangePassword` before granting ordinary application access.
- Add rate limiting, generic failures, failed-login audit, and session revocation after password change.

**Dependencies:** SEC-002; DEP-001 recommended first.

**Acceptance tests**

- Default credential rejected outside explicit local fixture mode.
- Forced-change flow cannot navigate to operational pages first.
- Repeated failures throttle without account-enumeration differences.
- Inactive account, wrong password, expired session, revoked session, and changed-password old sessions.
- Concurrent successful login/session limits if a limit is chosen.

**Rollback:** feature-flag the new forced-change UI if necessary, but keep production default-password rejection and generic failures.

**Documentation:** credential bootstrap/runbook, lockout recovery, local fixture setup, and session policy.

### AUTH-002 — Narrow and unify test-auth bypasses

**Scope**

- Require explicit test-auth enablement for both admin and crew bypasses.
- Require an explicit target user email.
- Prohibit all bypasses in production.
- Remove “first active crew user” fallback behavior.

**Dependencies:** SEC-002.

**Acceptance tests**

- Flag absent, malformed, and present.
- Production always rejects bypass.
- Missing/inactive/wrong-role target user fails closed.
- Two active crew users prove deterministic identity.
- Browser and HTTP tests use explicit fixture identities.

**Rollback:** provide a documented local fixture login, not an implicit identity fallback.

**Documentation:** test-auth contract and environment-variable examples without secrets.

### SEC-004 — Replace ad hoc return-url validation

**Scope**

- Replace dashboard and crew ad hoc checks with `safeSameAppReturnDestination`.
- Add workflow-specific path allowlists where appropriate.
- Audit every `redirect(returnTo)` call.

**Dependencies:** none.

**Acceptance tests**

- Absolute, `//`, `/\`, encoded backslash/slash, username/password authority, control characters, fragments, and valid local paths.
- Error-message appending cannot change origin.

**Rollback:** revert consumers to fixed internal destinations, not the vulnerable parser.

**Documentation:** shared redirect helper contract.

## 3. Upload, PII, API, session, headers, and operational security

### DATA-001 — Verify and safely serve uploaded content

**Scope**

- Validate magic bytes and decodability for identity images.
- Validate PDF structure and supported image/text formats for logbook attachments.
- Canonicalize or replace download filenames.
- Apply safe content disposition and `nosniff`.
- Add a pluggable scan/quarantine status before content is available.

**Dependencies:** DEP-001.

**Acceptance tests**

- Oversized files; empty files; extension/MIME/signature mismatch; polyglots; malformed image/PDF; hostile filename; unsupported HEIC behavior.
- Content not retrievable before validation/scan.
- Existing valid fixtures remain readable.

**Rollback:** retain metadata and object keys; a rollback may disable scanning enforcement but must keep signature validation and safe headers.

**Documentation:** accepted formats, limits, scanning states, and operator recovery.

### DATA-002 — Make PII replacement/deletion durable and race-safe

**Scope**

- Add a forward migration enforcing one active identity document per passenger.
- Rework replacement into a retry-safe transaction.
- Add an object-deletion outbox/reconciler and retention policy.
- Preserve immutable access/audit evidence.

**Dependencies:** DATA-001 design agreement; database migration review.

**Acceptance tests**

- Concurrent replacement leaves exactly one active row.
- Object-store deletion failure commits a retry job and eventually removes the object.
- Repeated delete is idempotent.
- Cross-passenger and cross-flight access denied.
- Migration validates existing duplicates before adding the invariant.

**Rollback:** forward corrective migration; do not edit or remove the applied migration. Reconciler can be paused without discarding queued work.

**Documentation:** PII retention/deletion runbook, reconciliation monitoring, and incident procedure.

### SEC-005 — Add response security headers

**Scope**

- Define CSP, frame protection, `nosniff`, referrer policy, permissions policy, and HTTPS-edge HSTS.
- Begin CSP in report-only mode if inline behavior requires inventory.

**Dependencies:** DATA-001 for final inline attachment policy.

**Acceptance tests**

- Headers on HTML, APIs, redirects, errors, and attachment routes.
- No application workflow breaks under CSP.
- HSTS asserted only at HTTPS edge.
- Clickjacking frame test and MIME-sniff test.

**Rollback:** CSP can return to report-only; retain `nosniff` and frame protection unless a documented incompatibility exists.

**Documentation:** header ownership between Next and reverse proxy, CSP exceptions, and rollout stages.

### OPS-002 — Replace health cardinality dump with liveness/readiness

**Scope**

- Make liveness constant-cost and database-independent.
- Make readiness a bounded connectivity probe.
- Remove model counts and auth-table counts from public output.
- Put deep diagnostics behind admin authorization or an offline script.

**Dependencies:** SEC-003 for any admin diagnostic route.

**Acceptance tests**

- Anonymous liveness contains no counts or internal names.
- Readiness query budget is fixed.
- Database-down behavior is fast and correctly classified.
- Load test cannot multiply into 63 counts per request.

**Rollback:** deploy a static liveness response while investigating; do not restore the count dump publicly.

**Documentation:** deployment probe configuration and operator diagnostic procedure.

### SEC-006 — Sanitize public error handling and audit attribution

**Scope**

- Map known failures to stable public codes/messages.
- Add correlation IDs and structured server-side logs.
- Stop reflecting unknown exception text in query strings.
- Define trusted-proxy handling before accepting forwarded client IPs.

**Dependencies:** SEC-002; logging destination decision.

**Acceptance tests**

- Forced Prisma, object-store, validation, and unknown exceptions.
- No SQL, table, stack, bucket, filesystem, environment, or credential text in responses/locations.
- Trusted and untrusted forwarded headers produce correct attribution.

**Rollback:** retain generic user messages even if structured logging is rolled back.

**Documentation:** error catalog, log redaction policy, and proxy trust configuration.

## 4. Domain integrity, transactions, concurrency, and schema safeguards

### DOM-001 — Codify release, maintenance, and staffing invariants in tests

**Scope**

- Add executable tests for warning-first release rules, immutable release evidence, RTS lifecycle, one active maintenance hold, signature-purpose uniqueness, FlightLeg primacy, and aircraft staffing truth.
- Do not change behavior in this slice.

**Dependencies:** TEST-001 harness.

**Acceptance tests**

- Warning-only findings remain warning-only where documented.
- AOG/maintenance hard stops remain hard stops.
- Published crew schedules do not create `AircraftCrewAssignment`.
- Legacy Flight bridges resolve consistently to FlightLeg.
- Repeated release/RTS operations are idempotent or explicitly rejected.

**Rollback:** tests can be reverted independently; no data change.

**Documentation:** domain invariant catalog linked to controlling documents.

### DOM-002 — Review transaction and idempotency boundaries for write workflows

**Scope**

- One bounded workflow per pull request: planning publish, maintenance RTS, release authorization, passenger identity replacement, manifest, fuel, and crew assignment.
- Add idempotency/concurrency protection only where a failing test demonstrates the gap.

**Dependencies:** DOM-001; DATA-002 owns identity documents and must not overlap.

**Acceptance tests**

- Double submit, concurrent update, stale version, partial external failure, retry, and rollback for the chosen workflow.
- Immutable evidence remains append-only.

**Rollback:** workflow-specific; use compensating forward changes for schema constraints.

**Documentation:** transaction boundary and retry contract for each completed workflow.

## 5. Proven dead-code removal and duplication consolidation

### CLEAN-001 — Remove the two confirmed orphan files

**Scope**

- Delete only:
  - `app/crew/me/flights/[flightLegId]/actions.ts`
  - `lib/crew-scheduling-planner-queries.ts`
- Re-run reference checks after security branches land.

**Dependencies:** SEC-001 through SEC-004 landed or rebased, so deletion proof reflects the new graph.

**Acceptance tests**

- `rg`, TypeScript, Next route conventions, dynamic imports, package scripts, PowerShell wrappers, migrations, and runtime routes show no references.
- Typecheck, lint, build, browser smoke, crew flight workflow, and scheduling smoke pass.

**Rollback:** restore each file independently from the deletion commit.

**Documentation:** cleanup log and ledger disposition update.

### CLEAN-002 — Remove unnecessary export markers

**Scope**

- Review the 14 unused exports and 18 exported types one module at a time.
- Prefer de-exporting symbols over deleting code when internal use remains.

**Dependencies:** CLEAN-001.

**Acceptance tests**

- No static/dynamic/CLI consumer.
- Package/script and external integration search recorded in the PR.
- Build and relevant workflow tests pass.

**Rollback:** restore individual `export` modifiers.

**Documentation:** public/internal module-boundary notes.

### CLEAN-003 — Consolidate one clone family per slice

**Scope order**

1. Storage-provider shared plumbing, while keeping domain-specific validation separate.
2. Crew assignment action/query helpers.
3. Crew schedule/read-model helpers.
4. Backfill/smoke environment loaders.
5. Crew `/me` and `/crew/portal` shared internals without removing the compatibility route.

**Dependencies:** relevant security/data slices first.

**Acceptance tests:** before/after behavior snapshots, targeted domain tests, no new cross-domain coupling, and `jscpd` reduction for that family.

**Rollback:** each clone family is one independently reversible change.

**Documentation:** module ownership and compatibility boundaries.

## 6. Large-module refactoring and test-coverage improvements

### TEST-001 — Add a production-mode security test harness

**Scope**

- Add isolated local-database fixtures and session helpers for all roles.
- Run the full shared security acceptance matrix without relying on development bypass.
- Ensure cleanup of sessions and fixtures.

**Dependencies:** OPS-001.

**Acceptance tests**

- Harness itself proves isolation, cleanup, bypass-off behavior, and no production URL use.
- At least one allowed and one denied assertion for every route/action family before security remediation is marked complete.

**Rollback:** tests and fixtures only; retain any discovered regression case in an issue if temporarily disabled.

**Documentation:** local/CI test setup and safety contract.

### ARCH-001 — Split oversized pages into bounded server/query/view modules

**Scope order**

1. `app/aircraft/page.tsx`
2. `app/maintenance/page.tsx`
3. `app/crew/scheduling/page.tsx` and planning canvas
4. `app/page.tsx`
5. `app/operations-control/page.tsx` and detail
6. `app/crew/page.tsx`

Extract one coherent responsibility at a time: parsing, authorization, query, domain transformation, or view component. Do not combine domain-policy changes with moves.

**Dependencies:** TEST-001 and the relevant authorization slices.

**Acceptance tests**

- Rendered screenshot/DOM parity for changed screens.
- Query-count and payload-size budgets.
- Existing domain and authorization suites.
- No new client bundle for server-only logic.

**Rollback:** one extraction per commit; preserve old adapter until parity is proven.

**Documentation:** module map and ownership.

### PERF-001 — Add pagination and bounded operational windows

**Scope**

- Paginate crew and maintenance-logbook top-level reads.
- Separate summary and detail payloads for scheduling and operations control.
- Add query/payload instrumentation.

**Dependencies:** ARCH-001; SEC-003.

**Acceptance tests**

- Stable cursor behavior under concurrent inserts.
- Large-dataset response-time, query-count, and payload thresholds.
- Filters and warning counts remain correct.
- No missing active/AOG/release-critical item at page boundaries.

**Rollback:** retain server-side limit caps even if UI pagination is rolled back.

**Documentation:** pagination contracts and operational default windows.

## 7. Separately planned legacy Flight/route/schema cutover

### LEGACY-001 — Inventory and approve a legacy cutover plan

**Scope**

- Read-only inventory of all `Flight`, `legacyFlightId`, `/crew/portal`, direct aircraft-logbook, crew-resolution, import, script, and migration dependencies.
- Define traffic/runtime evidence, data parity, rollback window, and stakeholder approval.
- Produce a dedicated cutover document; make no deletion.

**Dependencies:** security containment complete; TEST-001 and DOM-001.

**Acceptance tests**

- Static, dynamic, CLI, package-script, migration, import, and runtime references inventoried.
- Flight-to-FlightLeg parity queries show no unresolved operational rows.
- Crew portal and direct logbook traffic measured over an agreed window.
- Rollback can restore routing/read bridges without data loss.

**Rollback:** not applicable to the planning slice.

**Documentation:** dedicated legacy cutover plan, owner, approval record, telemetry window, migration steps, and rollback runbook.

### LEGACY-002 — Execute only an approved, staged cutover

**Scope**

To be defined by LEGACY-001. Route redirects, read-bridge removal, write-bridge removal, and schema removal must be separate deployable stages. Schema removal is last.

**Dependencies:** explicit user/stakeholder approval of LEGACY-001; successful telemetry window; backup/restore rehearsal.

**Acceptance tests**

- Stage-specific parity and rollback tests.
- No legacy writes before dropping read compatibility.
- Forward migration only.
- Full browser, security, domain, import, and operational smoke suite.

**Rollback:** route/read adapters retained through the rollback window; schema drop only after rollback no longer depends on the columns/tables.

**Documentation:** release checklist, operator notice, final schema decision, and post-cutover audit.

## Recommended landing order

1. SEC-001 and OPS-001.
2. DEP-001.
3. SEC-002, SEC-003, AUTH-002, and SEC-004.
4. AUTH-001, OPS-002, SEC-006, and TEST-001.
5. DATA-001, DATA-002, and SEC-005.
6. DOM-001, then bounded DOM-002 slices.
7. CLEAN-001, CLEAN-002, and bounded CLEAN-003 slices.
8. ARCH-001 and PERF-001.
9. LEGACY-001 planning; LEGACY-002 only after separate approval.

## Completion definition

The remediation program is complete only when:

- P0/P1 findings are closed by runtime tests, not prose or static gates.
- Every page, handler, and action has an explicit public/authenticated/role/object policy.
- A clean install has no unexplained high-severity advisory.
- Destructive tools fail closed before their first write.
- Upload, PII deletion, session, error, health, and header controls pass abuse tests.
- Domain invariant and concurrency suites pass.
- Only proven orphans are removed.
- Legacy compatibility remains until its separately approved staged cutover.
