# AeroOps Complete Codebase Audit

**Audit date:** 2026-07-26
**Repository:** `E:\Codex\Airline Operations\Airline Operations`
**Branch:** `codex/aeroops-integration`
**HEAD:** `bb5bf36187c42b5d8663b2f27f28c4ae927aed23`
**Baseline worktree:** clean
**Tracked files:** 615
**Files in the required code/configuration/schema/script/test ledger:** 244
**Audit disposition:** complete, with explicitly identified runtime-test limitations
**Application changes made:** none

## Executive risk summary

AeroOps has a coherent domain model and several strong local safeguards, but it is not ready for exposure to an untrusted network. The highest-risk defect is a set of scheduling Server Actions that perform draft, template, cancellation, and publish mutations without requiring an authenticated or authorized user. This is a P0 because the associated scheduling page is also anonymously readable and Next.js exposes Server Actions as callable HTTP endpoints.

The wider authorization model is incomplete. Thirty-two operational or internal page routes, four API endpoints, and the root dashboard do not reject anonymous users. Local production-mode HTTP checks with test authentication disabled confirmed anonymous `200` responses from aircraft, crew, customer, scheduling, operations-control, import-diagnostic, and API surfaces. Those pages expose operational schedules, crew identity/qualification data, customer and passenger contact data, and internal readiness state. Existing role guards work where they are present, but they are not applied consistently.

Five additional P1 themes require prompt attention:

1. Nine dependency vulnerabilities are present in the lockfile, including eight high-severity findings and a non-major Next.js patch.
2. Seeded default credentials are accepted without enforcing `mustChangePassword`, and the login path has no throttling or lockout.
3. The destructive seed and multiple write-heavy smoke/seed scripts do not fail closed when pointed at a non-local database.
4. Three crew-resolution APIs and the health endpoint are anonymous; health performs 63 database counts and exposes table cardinalities.
5. A broad non-production crew identity fallback can silently impersonate the first active crew user outside production.

The architecture is functional but expensive to change safely. Approximately 93,000 code/schema lines include several 2,000–3,400-line modules. Duplication is measurable but not dominant: `jscpd` found 36 clone regions covering 1,487 lines (1.66%). `knip` produced seven unused-file candidates, but manual verification cleared five script false positives and confirmed only two file-removal candidates. Legacy `Flight`, `/crew/portal`, and direct aircraft logbook compatibility surfaces are intentional and must be preserved until a separately approved cutover.

## Severity and confidence

| Level | Meaning |
| --- | --- |
| P0 | Direct unauthenticated mutation or immediate integrity/confidentiality compromise. Contain before any untrusted deployment. |
| P1 | High-likelihood or high-impact security/operational failure. Address in the next containment release. |
| P2 | Material defense-in-depth, privacy, reliability, performance, or maintainability weakness. |
| P3 | Lower-impact hygiene, drift, or future-risk issue. |

All findings below have **high confidence** unless explicitly marked otherwise. Absence of a guard was verified at the page/route/action entry point and, for the principal anonymous surfaces, with a production-mode local HTTP process using `AEROOPS_ENABLE_TEST_AUTH=0`.

## Findings

### P0-01 — Scheduling Server Actions permit anonymous operational mutation

**Evidence**

- `app/crew/scheduling/planning-actions.ts:124-128` resolves a current user only to obtain an optional actor ID; a missing user produces `null`, not a rejection.
- The following exported mutation entry points have no `requireRole`, `requireCurrentUser`, or equivalent guard:
  - `savePlanningDraftAction` at `app/crew/scheduling/planning-actions.ts:188`
  - `upsertPlanningDraftChangeAction` at `:204`
  - `setPlanningDraftSelectionAction` at `:262`
  - `cancelSelectedPlanningDraftChangesAction` at `:282`
  - `cancelPlanningDraftChangesAction` at `:310`
  - `publishPlanningDraftChangesAction` at `:343`
  - `createReusableTemplateAction` at `:525`
- `app/crew/scheduling/page.tsx` has no authentication or role guard and returned `200` anonymously in a production-mode local run.

**Affected roles/data:** all scheduling periods, planning drafts, changes, selections, reusable templates, and published crew schedule state. An unauthenticated caller is the attacker role.

**Reasoning/reproduction:** Next.js Server Actions are HTTP-callable server entry points. The page exposes the action-backed UI and serialized action references. Each action proceeds with `actorId=null`; publication and cancellation are not blocked.

**Recommended correction:** require `ADMIN` or `OPS` at the first line of every exported action. Centralize that requirement in one scheduling-action guard, reject missing users before parsing or querying attacker-controlled IDs, and ensure actor columns are non-null for auditable mutation types where the domain permits.

**Regression risk:** adding the guard can expose development tests that depended on implicit local identity. It must not change the documented rule that crew schedule publication does not automatically create `AircraftCrewAssignment` staffing truth.

**Required tests:** anonymous invocation of all seven actions; allowed `ADMIN` and `OPS`; denied `CREW`, `DISPATCH`, `MAINTENANCE`, `SAFETY`, and `VIEWER`; cross-period and cross-draft object IDs; malformed IDs; concurrent publish/cancel; audit actor persistence; production-mode test-bypass disabled.

### P1-01 — Operational, internal, crew-PII, and passenger-PII pages are anonymously readable

**Evidence**

- `app/layout.tsx:41-53` fetches the current user for `AppShell` presentation but does not reject an anonymous request.
- The login page itself says route protection is staged: `app/login/page.tsx:36-37`.
- `app/crew/page.tsx:388-524` performs an unbounded crew query selecting date of birth, phone, email, qualifications, medicals, training, and other related data. The page renders DOB and contact data at `:1413-1419`.
- `app/customers/page.tsx:545-674` selects customers and passengers, including email, phone, DOB, and identity-document metadata. It renders DOB/contact details at `:1126-1128`.
- Production-mode local checks, with test auth explicitly disabled, returned:

| Anonymous request | Result | Response bytes |
| --- | ---: | ---: |
| `/` | 200 | 33,377 |
| `/aircraft` | 200 | 46,773 |
| `/crew` | 200 | 279,358 |
| `/customers` | 200 | 26,692 |
| `/crew/scheduling` | 200 | 1,091,829 |
| `/operations-control` | 200 | 762,700 |
| `/internal/import-batches` | 200 | 40,305 |

**Affected roles/data:** anonymous users can read operational control state, fleet and maintenance context, crew schedules, crew contact/DOB/qualification data, customer and passenger contact/DOB/document metadata, and internal diagnostic state.

**Recommended correction:** establish a default authenticated boundary for all non-login application routes, then add explicit least-privilege role policies per workflow. Do not rely on navigation visibility or the root layout's user fetch. Apply object-level checks to crew-self-service and flight-specific data.

**Regression risk:** blanket middleware can accidentally block health probes, login, static assets, or intentional crew self-service. Define public routes explicitly and keep role checks in server components/actions/handlers as defense in depth.

**Required tests:** anonymous matrix for every page; every applicable role; cross-user and cross-flight object access; revoked/expired sessions; production-mode test bypass; sensitive text/body checks. Local runtime testing confirmed existing `OPS` is denied from `/admin/settings`, `/maintenance`, and `/crew/portal` with `307`, while `/customers` remains `200`. A revoked session is redirected to login.

### P1-02 — Four APIs expose operational identities and database cardinalities anonymously

**Evidence**

- No authentication appears in:
  - `app/api/aircraft/[id]/crew-assignments/route.ts:12`
  - `app/api/flights/[id]/coverage/route.ts:12`
  - `app/api/flights/[id]/crew/route.ts:12`
  - `app/api/health/route.ts:6`
- `lib/crew-resolution.ts:30-48` includes crew member IDs and names in API result types; later resolution includes qualifications, eligibility warnings, and assignments.
- `app/api/health/route.ts:73-135` performs 63 Prisma `count()` operations, including credentials and sessions.
- Production-mode local requests with no cookie returned `200` for all three crew APIs using valid local IDs and `200` for `/api/health`.

**Affected roles/data:** anonymous users; crew identity, assignment, qualification/readiness data; operational identifiers; database table cardinalities; database capacity.

**Recommended correction:** authenticate all operational APIs, authorize the requested aircraft/flight object, minimize result fields, and replace health with cheap liveness/readiness responses that do not reveal counts. Put deeper diagnostics behind an admin-only endpoint or offline command.

**Regression risk:** external consumers may currently rely on anonymous access. Inventory callers before tightening, but do not preserve anonymous behavior solely for compatibility.

**Required tests:** anonymous `401/403`; role allow/deny matrix; invalid and cross-object IDs; no crew PII in disallowed responses; constant-size health body; bounded database queries; rate/latency test.

### P1-03 — Default credential bootstrap bypasses mandatory password change and lacks abuse controls

**Evidence**

- Known fallback passwords are embedded at `prisma/seed.ts:49-50`.
- Seeded credentials set `mustChangePassword=true` when defaults are used at `prisma/seed.ts:1253-1268`.
- `app/login/actions.ts:15-40` validates the password and immediately creates a session; it never reads or enforces `mustChangePassword`.
- `app/login/page.tsx` publishes seeded account email addresses and default-credential guidance.
- No login rate limiter, attempt counter, lockout, MFA, or failed-login audit path exists in the reviewed authentication code.

**Affected roles/data:** seeded `ADMIN` and `OPS` accounts; all data reachable by those roles.

**Recommended correction:** fail production startup/seed when default credentials would be used; remove hard-coded operational defaults or restrict them to an unmistakably local-only fixture; enforce password change before normal session access; add rate limiting, failure audit, and session invalidation after credential change.

**Regression risk:** local onboarding and smoke scripts may depend on defaults. Replace them with explicit local setup commands and ephemeral fixture credentials.

**Required tests:** default credential rejected outside explicit local mode; forced-change flow; repeated failed login throttling; inactive user; revoked/expired session; password-change session revocation; generic failure messages.

### P1-04 — Destructive seed and write-heavy scripts do not consistently fail closed on remote databases

**Evidence**

- `prisma/seed.ts:1163` enters `main()` without validating `DATABASE_URL`, environment, host, or an explicit destructive-operation flag.
- `prisma/seed.ts:1173-1235` unconditionally performs roughly 60 `deleteMany()` calls before rebuilding data.
- Several scripts do have local guards, such as `scripts/seed-crew-me-demo.ts:43-53`, `scripts/seed-scheduling-demo-pilots.ts:82-85`, and `scripts/smoke-workflows.ts:82-90`.
- Many other write-heavy smoke/seed/backfill scripts begin without an equivalent guard. Examples include schedule publishing, rotation patterns, reusable templates, crew requests, crew portal, logistics workflow, coverage eligibility, customer manifest, maintenance lifecycle, and fuel workflow.

**Affected roles/data:** any database reachable through a mistakenly configured shell, CI job, or operator workstation; potentially the entire operational dataset.

**Recommended correction:** use one shared database-target guard that parses the URL, recognizes the Docker host/port, rejects Render/remote hosts by default, requires a typed confirmation plus a dedicated opt-in for destructive operations, and is invoked before Prisma initialization or writes.

**Regression risk:** CI and intentionally isolated ephemeral databases need an explicit safe opt-in. Host substring checks alone are insufficient.

**Required tests:** local Docker allowed; localhost variants; remote hostname denied; malformed URL denied; missing URL denied; production environment denied without two-part opt-in; guard runs before the first write.

### P1-05 — Lockfile contains eight high-severity dependency findings

`npm audit --json` reported 9 vulnerabilities: 8 high, 1 low, 0 critical.

| Package | Direct | Severity | Runtime exposure assessment | Correction |
| --- | --- | --- | --- | --- |
| `next@16.2.7` | yes | high | Runtime. Advisories cover App Router proxy bypass, Server Action DoS/SSRF/disclosure, cache confusion, image optimization, and rewrites. The app uses App Router and Server Actions. | Patch to `16.2.12` or later compatible 16.2.x; update `eslint-config-next` in lockstep. |
| `postcss` via Next | no | high | Mostly build-time, but disclosure/path behavior can affect build inputs and source maps. | Resolved by the compatible Next dependency refresh. |
| `sharp` via Next | no | high | Runtime if Next image optimization processes attacker-influenced images; otherwise reduced. | Resolved by the compatible Next dependency refresh; verify installed `sharp >=0.35.0`. |
| `prisma` / `@prisma/config` / `effect` | direct tool/transitive | high | Development/CLI path, not the application request path. A clean install follows the vulnerable lock even though local `node_modules` has drifted. | Refresh lock to Prisma `6.19.3` or later compatible 6.x and confirm `effect >=3.20.0`. |
| `brace-expansion` | no | high | Tooling/CLI DoS, dependent on attacker-controlled patterns. | Refresh transitive tree. |
| `js-yaml` | no | high | Tooling/config parse DoS, dependent on attacker-controlled YAML. | Refresh transitive tree. |
| `esbuild` | no | low | Development server arbitrary file read on Windows; relevant if the dev server is exposed. | Refresh transitive tree and bind dev servers to loopback. |

**Regression risk:** Next and Prisma patches can change generated types/build behavior. Use a clean install and full static, smoke, and browser gates.

**Required tests:** clean `npm ci`; `npm audit --json`; Prisma generate/validate; typecheck/lint/build; anonymous/Server Action regression tests; image route tests; all focused smoke suites.

### P2-01 — Crew self-service dev fallback is broader than the documented test-auth flag

**Evidence**

- `lib/auth/crew-portal.ts:9-10` enables the fallback whenever `NODE_ENV !== "production"`.
- It then selects the preferred or first active crew user (`lib/auth/crew-portal.ts:20-60`).
- The main admin bypass is narrower: `lib/auth/session.ts:21-23` requires both `AEROOPS_ENABLE_TEST_AUTH=1` and non-production.

**Affected roles/data:** staging, preview, test, and development environments; crew identity and object-level flight/passenger data.

**Recommended correction:** require the same explicit test-auth flag plus an explicit crew email; fail when that identity does not exist. Never silently choose the first active crew user.

**Regression risk:** existing local crew demos may stop auto-opening. Make the local setup command explicit.

**Required tests:** flag absent/present; production always denied; preferred user absent; non-crew current user; two crew users to prove no first-row impersonation.

### P2-02 — Upload validation and PII object lifecycle need stronger integrity controls

**Evidence**

- Storage adapters derive behavior from the client-supplied MIME type and persist `file.type`: `lib/passenger-identity-document-storage.ts:51-69,134-175` and `lib/aircraft-logbook-storage.ts:53-78,142-188`.
- There is no magic-byte validation, image decode, PDF validation, malware scan, or quarantine stage.
- Logbook attachments are served inline with the stored original filename interpolated into `Content-Disposition`: `app/aircraft/[aircraftId]/logbook/attachments/[attachmentId]/route.ts:33-34`.
- Passenger replacement reads existing active state before the transaction and soft-deletes/creates without a schema-level one-active-document invariant: `lib/passenger-identity-documents.ts:127-198`; schema only indexes `[passengerId, deletedAt]` at `prisma/schema.prisma:3230`.
- Passenger deletion commits the database soft-delete before external object deletion at `lib/passenger-identity-documents.ts:245-273`; an object-store failure can leave sensitive orphan data without a durable retry record.

**Existing controls that reduce risk:** 5 MB/10 MB size caps, allowlists, random storage keys, private read routes, production S3 requirement, AES-256 server-side-encryption requests, role/object checks on document routes, and access logging.

**Recommended correction:** verify signatures/decodability, canonicalize served filenames, force safe disposition for risky types, add `nosniff`, scan/quarantine uploads, create a durable object-deletion outbox/reconciler, and enforce one active identity document per passenger using a safe database invariant.

**Regression risk:** HEIC/browser compatibility and existing stored attachments need migration-safe handling. Do not rewrite historical evidence in place.

**Required tests:** malformed and polyglot files; MIME/extension mismatch; oversized upload; hostile filename with CR/LF/quotes; cross-passenger/cross-flight access; concurrent replacements; object-store failure; retry/reconciliation; retention and hard-delete policy.

### P2-03 — Application responses lack baseline browser security headers

**Evidence**

- `next.config.ts:1-5` contains no `headers()` policy.
- Production-mode local HTTP responses lacked Content-Security-Policy, Strict-Transport-Security, X-Frame-Options/frame-ancestors, and X-Content-Type-Options.

**Affected roles/data:** all browser users; impact increases if an injection or unsafe inline document is introduced.

**Recommended correction:** define CSP, `frame-ancestors`, `nosniff`, referrer policy, permissions policy, and HSTS at the actual HTTPS edge. Confirm reverse-proxy behavior.

**Required tests:** header assertions on HTML, APIs, uploads, redirects, and errors; CSP report-only rollout; attachment rendering; local HTTP does not falsely claim HSTS enforcement.

### P2-04 — Dashboard return URL validation can be converted to a cross-origin redirect

**Evidence**

- `app/dashboard-actions.ts:29-32` accepts any string starting with `/` except `//`.
- A value such as `/\evil.example/path` passes that check. Standard URL parsing normalizes the leading slash/backslash pair to an authority, producing `http://evil.example/path`.
- A safer shared parser already exists in `lib/same-app-return.ts:3-27`.

**Affected roles/data:** authenticated release/assignment users; phishing and post-action redirect integrity.

**Recommended correction:** use the shared same-origin parser everywhere and add path allowlists where a workflow only needs one page family.

**Required tests:** absolute URL, protocol-relative URL, backslash, encoded slash/backslash, username/password authority, fragments, valid query/hash, and known local paths.

### P2-05 — Large unbounded reads and response payloads create scaling and availability risk

**Evidence**

- `app/crew/page.tsx:388-524` reads all crew with many nested relations; nested child lists are bounded, but the top-level crew list is not.
- `lib/maintenance-workbench-queries.ts:1483-1540` reads all aircraft logbook entries and their attachments without top-level pagination.
- `/api/health` performs 63 counts per request (`app/api/health/route.ts:73-135`).
- Measured anonymous HTML bodies reached 1,091,829 bytes for scheduling and 762,700 bytes for operations control.
- `app/customers/page.tsx:545-601` does use `take:100`; that specific top-level query was cleared.

**Recommended correction:** add cursor pagination, bounded date windows, summary/detail query separation, parallelize independent bounded reads, and make health constant-cost.

**Regression risk:** operational screens currently rely on comprehensive in-memory views. Preserve warning-first release, maintenance serviceability, and crew-assignment semantics when introducing pagination.

**Required tests:** query-count budgets; payload-size budgets; empty/large datasets; pagination stability under concurrent inserts; no N+1 regression; equivalent domain warnings.

### P2-06 — Raw exception messages are frequently reflected into redirect query strings

**Evidence**

Multiple Server Action modules use `error instanceof Error ? error.message` or domain errors directly in `?error=` redirects, including dashboard, aircraft airworthiness, crew, maintenance, customers, scheduling, and operations-control workflows. `app/dashboard-actions.ts:286` is one concrete example.

**Affected roles/data:** authenticated users and logs/history containing redirect URLs; Prisma, storage, or internal invariant messages can disclose implementation details.

**Recommended correction:** map known domain errors to stable public codes/messages, log correlation IDs server-side, and never reflect unknown exception text.

**Required tests:** forced Prisma/storage exceptions; response and `Location` header contain no SQL, table, bucket, path, stack, or credential material.

### P2-07 — Test strategy does not cover the authorization boundary that failed

**Evidence**

- Only one tracked Playwright spec exists: `tests/browser/aeroops-browser-smoke.spec.ts`.
- There is no unit-test runner, coverage threshold, or comprehensive negative-security test script.
- Typecheck, lint, build, and existing positive smoke scripts all passed while anonymous operational access and an anonymous mutation surface remained.

**Recommended correction:** add a production-mode authorization suite, object-access tests, domain invariant tests, upload abuse cases, and transaction/concurrency tests. Keep positive smoke scripts but do not treat them as security evidence.

**Required tests:** the complete acceptance matrix in the remediation backlog.

### P3-01 — Installed dependency tree has drifted from the lockfile

**Evidence**

- Lockfile: `prisma`, `@prisma/client`, and `@prisma/config` are `6.19.0`; `effect` is `3.18.4`.
- Local installation: Prisma CLI is `6.19.3`, while `@prisma/client` remains `6.19.0`.
- A clean `npm ci` will not reproduce the exact local validation environment.

**Recommended correction:** update package and lock intentionally, delete/reinstall dependencies in the remediation branch, and make clean-install CI authoritative.

### P3-02 — Two files are removable; duplication and monoliths should be refactored separately

**Confirmed removal candidates**

- `app/crew/me/flights/[flightLegId]/actions.ts` — exports two actions with no static, dynamic, page, route, script, or package-script references. The active crew flight page uses `app/crew/me/actions.ts`.
- `lib/crew-scheduling-planner-queries.ts` — no runtime/package/script references; only historical documentation mentions it.

**Consolidation candidates**

- Aircraft and operations-control crew assignment actions.
- `app/crew/me` and intentional `/crew/portal` compatibility logic.
- Aircraft context/query helpers.
- Crew scheduling workbench/read models.
- Passenger identity and aircraft logbook storage-provider boilerplate.
- Backfill loaders and smoke harness setup.

`jscpd` reported 36 clone regions, 1,487 duplicate lines, and 1.66% duplication. The largest modules are `prisma/schema.prisma` (3,411 lines), `app/aircraft/page.tsx` (3,149), `app/maintenance/page.tsx` (2,934), `app/crew/scheduling/planning-draft-canvas.tsx` (2,207), `app/page.tsx` (2,150), and `app/crew/scheduling/page.tsx` (2,089).

**Required cleanup proof:** absence of static imports, dynamic imports, Next conventions, CLI calls, package scripts, PowerShell wrappers, schema/migration use, and runtime traffic before deletion.

## Authorization matrix

### Pages

`Public` means intentionally public. `Missing` means no entry-point rejection was found. A missing page guard remains a confidentiality defect even when its mutation actions are guarded.

| Route | Current entry-point policy | Audit result |
| --- | --- | --- |
| `/login` | Public | Intentional public route |
| `/` | `getCurrentUser` only | Missing; anonymous 200 |
| `/admin/settings` | `ADMIN` | Enforced; anonymous and OPS denied |
| `/aircraft` | None | Missing; anonymous 200 |
| `/aircraft/[aircraftId]` | None | Missing |
| `/aircraft/[aircraftId]/airworthiness` | None | Missing |
| `/aircraft/[aircraftId]/crew` | None | Missing |
| `/aircraft/[aircraftId]/fuel` | `ADMIN, OPS, DISPATCH, MAINTENANCE` | Enforced |
| `/aircraft/[aircraftId]/logbook` | `ADMIN, OPS, DISPATCH, MAINTENANCE, SAFETY, VIEWER` | Enforced; compatibility surface |
| `/crew` | None | Missing; anonymous 200 with PII |
| `/crew/[crewMemberId]` | None | Missing |
| `/crew/logistics` | `ADMIN, OPS` | Enforced |
| `/crew/[crewMemberId]/logistics` | `ADMIN, OPS` | Enforced |
| `/crew/[crewMemberId]/compliance` | `ADMIN, OPS` | Enforced |
| `/crew/me` | Crew portal identity/object checks | Enforced, but dev fallback is overbroad |
| `/crew/me/flights/[flightLegId]` | Crew portal identity/object checks | Enforced |
| `/crew/me/flights/[flightLegId]/passengers` | Crew portal identity/object checks | Enforced |
| `/crew/portal` | `CREW` | Enforced; intentional compatibility |
| `/crew/scheduling` | None | Missing; anonymous 200 |
| `/crew/scheduling/patterns` | None | Missing read; actions are `ADMIN, OPS` |
| `/crew/scheduling/periods` | None | Missing read; actions are `ADMIN, OPS` |
| `/crew/scheduling/periods/[periodId]` | None | Missing read; actions are `ADMIN, OPS` |
| `/crew/scheduling/time-off` | None | Missing read; actions are `ADMIN, OPS` |
| `/customers` | None | Missing; anonymous 200 with PII |
| `/flights` | None | Missing |
| `/maintenance` | `ADMIN, MAINTENANCE` | Enforced; anonymous and OPS denied |
| `/operations-control` | None | Missing; anonymous 200 |
| `/operations-control/new` | None | Missing |
| `/operations-control/[flightLegId]` | None | Missing |
| `/operations-control/[flightLegId]/edit` | None | Missing |
| `/operations-control/[flightLegId]/dispatch` | None | Missing read; actions are `ADMIN, OPS, DISPATCH` |
| `/operations-control/[flightLegId]/fuel` | `ADMIN, OPS, DISPATCH, CREW, MAINTENANCE` | Enforced |
| `/operations-control/[flightLegId]/locating` | None | Missing read; actions are `ADMIN, OPS, DISPATCH` |
| `/operations-control/[flightLegId]/manifest` | None | Missing read; actions are `ADMIN, OPS, DISPATCH` |
| `/operations-control/[flightLegId]/weight-balance` | None | Missing read; actions are `ADMIN, OPS, DISPATCH` |
| `/operations-control/[flightLegId]/snapshots/[snapshotId]` | None | Missing |
| `/scheduling` | None | Missing |
| `/internal/duty-rest-policy-readiness` | None | Missing |
| `/internal/duty-rest-scenarios` | None | Missing |
| `/internal/flightleg-parity` | None | Missing |
| `/internal/flightleg-write-readiness` | None | Missing |
| `/internal/import-batches` | None | Missing read; anonymous 200; actions `ADMIN, OPS` |
| `/internal/import-staging-readiness` | None | Missing |
| `/internal/release-policy-readiness` | None | Missing |
| `/internal/release-snapshot-readiness` | None | Missing |

### Route handlers

| Route handler | Current policy | Result |
| --- | --- | --- |
| Aircraft logbook attachment GET | broad authenticated operational roles plus aircraft/object match | Enforced; sanitize disposition |
| Aircraft logbook export GET | broad authenticated operational roles | Enforced |
| Crew passenger identity document GET/POST/DELETE | crew identity plus flight/passenger assignment | Enforced |
| Customer passenger identity document GET/POST/DELETE | authenticated `ADMIN` or `OPS` | Enforced |
| `/api/aircraft/[id]/crew-assignments` | None | Missing; anonymous 200 |
| `/api/flights/[id]/coverage` | None | Missing; anonymous 200 |
| `/api/flights/[id]/crew` | None | Missing; anonymous 200 |
| `/api/health` | None | Missing; anonymous 200 and excessive disclosure/work |

### Server Action modules

| Module group | Current policy | Result |
| --- | --- | --- |
| Admin settings | `ADMIN` | Enforced |
| Aircraft create/update | `ADMIN, OPS` | Enforced |
| Aircraft crew | `ADMIN, OPS` | Enforced |
| Aircraft airworthiness | role varies; maintenance-sensitive actions restricted | Enforced |
| Aircraft/operations fuel | explicit operational roles | Enforced |
| Aircraft logbook | `MAINTENANCE`, with admin allowed for attachment | Enforced |
| Crew core/logistics/compliance | `ADMIN, OPS` | Enforced |
| Crew `/me` and passenger actions | crew identity/object checks | Enforced, subject to dev fallback |
| `/crew/portal` actions | `CREW` | Enforced compatibility surface |
| Scheduling patterns/periods/time off | `ADMIN, OPS` | Enforced |
| Scheduling planning actions | Optional `getCurrentUser` only | **Missing on all seven exports; P0** |
| Customer/passenger actions | `ADMIN, OPS` | Enforced |
| Dashboard release/crew actions | current-user plus operation-specific role/credential checks | Enforced; unsafe return URL |
| Internal import-batch actions | `ADMIN, OPS` | Enforced |
| Login/logout | intentionally public/auth lifecycle | Public; lacks abuse controls |
| Maintenance actions | `ADMIN/MAINTENANCE` variants | Enforced |
| Operations-control actions | `ADMIN/OPS/DISPATCH/CREW` variants | Enforced |

## Data model and domain invariants

### Preserved and cleared

- `FlightLeg` is the operational primary model. `legacyFlightId` remains unique at `prisma/schema.prisma:1654-1674`. Legacy `Flight` bridges are intentional.
- `AircraftCrewAssignment` remains staffing truth. Crew schedule publication does not automatically create aircraft assignments.
- Warning-first release behavior remains a documented operational boundary; this audit does not propose converting every warning into a hard stop.
- Aircraft serviceability is computed through `lib/aircraft-serviceability.ts`; maintenance statuses are not to be inferred independently by UI refactors.
- Return-to-service numbers are unique per aircraft at `prisma/schema.prisma:2038-2074`.
- Logbook signatures enforce one signature per entry/purpose at `prisma/schema.prisma:2249-2268` and `prisma/migrations/20260726210000_logbook_signature_purpose_uniqueness/migration.sql:1-2`.
- The simplified maintenance migration adds a partial unique index for one active maintenance-control hold per aircraft at `prisma/migrations/20260726200000_simplified_maintenance_lifecycle/migration.sql:46`.
- Reviewed migrations are additive/forward-oriented; no migration-history rewrite is recommended.

### Confirmed gap

- `PassengerIdentityDocument` has no database-level invariant ensuring only one non-deleted document per passenger. Application replacement logic can race.

### Schema complexity

The schema contains 101 models, 95 enums, 365 indexes, 31 model-level uniqueness declarations, 87 cascading relations, and 33 restrictive relations. That breadth raises migration and deletion risk; new invariants should be added through forward migrations with explicit backfill/validation.

## Cleanup classification

| Category | Items |
| --- | --- |
| Safe removal candidate | `app/crew/me/flights/[flightLegId]/actions.ts`; `lib/crew-scheduling-planner-queries.ts` |
| Consolidation/refactor candidate | Large aircraft, maintenance, crew, scheduling, dashboard, and operations-control modules; duplicated crew assignment logic; duplicated storage adapters; repeated script environment loaders |
| Intentional compatibility — preserve | `/crew/portal`; direct `/aircraft/[aircraftId]/logbook`; `Flight` read/write bridges; `FlightLeg.legacyFlightId` |
| Separate legacy cutover required | Removal of `Flight`, `/crew/portal`, direct logbook route/schema bridges, or legacy crew-resolution paths |
| Uncertain — runtime evidence needed | Unused export markers reported by `knip`; historical helper exports that may be used by external scripts; some clone regions across smoke/backfill harnesses |

The five `knip` script-file findings were cleared because `package.json` scripts and PowerShell wrappers invoke them:

- `scripts/seed-aircraft-logbook-demo.ts`
- `scripts/seed-maintenance-program-demo.ts`
- `scripts/smoke-aircraft-logbook.ts`
- `scripts/smoke-maintenance-logbook-drawer.ts`
- `scripts/smoke-passenger-identity-documents.ts`

Fourteen unused exports and eighteen unused exported types are candidates to de-export, not evidence that their containing files are removable. Recheck after the security fixes so cleanup does not obscure containment diffs.

## Important hypotheses cleared (“not a finding”)

1. **Production admin test bypass:** cleared. `lib/auth/session.ts:21-23` requires `AEROOPS_ENABLE_TEST_AUTH=1` and non-production. Local production-mode checks with the flag forced to `0` did not auto-authenticate.
2. **Session token storage/cookie basics:** cleared. Tokens use 32 random bytes, only SHA-256 hashes are stored, cookies are HTTP-only, `SameSite=Lax`, and secure in production (`lib/auth/session.ts:65-90`).
3. **Storage-key traversal:** cleared for reviewed upload code. Keys are generated server-side from random identifiers rather than accepted from the client.
4. **Production local-filesystem PII storage:** cleared. Both reviewed storage adapters require S3-compatible storage in production.
5. **Passenger-document route authorization:** cleared. Admin/ops access and crew flight/passenger object checks are present.
6. **Upload size allowlists:** cleared as an absence finding. Identity documents and logbook attachments have size/type allowlists; content verification remains a separate P2.
7. **Customer list unbounded:** cleared. Customer and passenger top-level queries use `take:100`.
8. **Recent maintenance/logbook uniqueness:** cleared. Forward migrations establish active-hold and signature-purpose uniqueness.
9. **Thirty-six clone regions imply thirty-six deletions:** disproved. Most are consolidation opportunities; several are intentional compatibility or test harness duplication.
10. **Seven unused files:** disproved as stated. Five are script-entry false positives; two are confirmed.

## Tool and runtime evidence

| Check | Result |
| --- | --- |
| `npm run prisma:validate` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass; Prisma package-config deprecation warning |
| `npm audit --json` | 9 vulnerabilities: 8 high, 1 low |
| `npx --yes knip` | 7 unused files, 14 exports, 18 exported types; manually adjudicated |
| `npx --yes jscpd --min-lines 20 --min-tokens 120 --reporters console` | 36 clones; 1,487 duplicate lines; 1.66% |
| Redacted tracked-secret scan | No OpenAI/AWS/private-key pattern; only documented/demo defaults |
| Tracked environment-file check | `.env.example`, `.env.local.example`, `next-env.d.ts`; real `.env` files are ignored |
| Maintenance lifecycle smoke | Pass; expected active-hold unique violation was exercised |
| Aircraft logbook smoke | Pass |
| Maintenance logbook drawer smoke | Pass |
| Passenger identity document smoke | Pass: upload/read/metadata/access-log/delete |
| Crew scheduling workbench smoke | Pass |
| Rendered browser check | Scheduling workbench rendered against local Docker data; no browser console errors |
| Production-mode anonymous HTTP | Confirmed exposures and protected-route redirects described above |
| Production-mode role/revocation HTTP | OPS denied from admin/maintenance/crew portal; revoked session denied |

The local Docker PostgreSQL service at `127.0.0.1:5434` was healthy. No production/Render connection was made. No shared local reseed was performed. A temporary local OPS session used for role-denial testing was revoked and deleted immediately. Environment and token values were not printed.

Secret scanning covered the current tracked tree, not Git history. A history scan was not run because indiscriminate output could disclose old secrets; perform any future history scan with a redacting secret scanner and controlled output.

## Complete 244-file review ledger

Legend: **A** active; **A/C** active plus consolidation candidate; **A/IC** active plus intentional compatibility; **T** test/tooling/configuration; **R** confirmed removal candidate. “Reviewed” includes inventory, static/reference analysis, automated gates, and the applicable manual security/domain pass.

### Configuration and dependency files — 13 (`T`)

```text
.env.example
.env.local.example
.gitattributes
.gitignore
docker-compose.yml
eslint.config.mjs
next.config.ts
next-env.d.ts
package.json
package-lock.json
playwright.config.ts
postcss.config.mjs
tsconfig.json
```

### Application files — 87

**R**

```text
app/crew/me/flights/[flightLegId]/actions.ts
```

**A/IC**

```text
app/aircraft/[aircraftId]/logbook/actions.ts
app/aircraft/[aircraftId]/logbook/attachments/[attachmentId]/route.ts
app/aircraft/[aircraftId]/logbook/export/route.ts
app/aircraft/[aircraftId]/logbook/page.tsx
app/crew/portal/actions.ts
app/crew/portal/page.tsx
```

**A/C**

```text
app/aircraft/[aircraftId]/crew/actions.ts
app/aircraft/aircraft-coverage-staging-client.tsx
app/aircraft/page.tsx
app/crew/actions.ts
app/crew/me/actions.ts
app/crew/page.tsx
app/crew/scheduling/page.tsx
app/crew/scheduling/planning-actions.ts
app/crew/scheduling/planning-draft-canvas.tsx
app/maintenance/actions.ts
app/maintenance/page.tsx
app/operations-control/actions.ts
app/operations-control/[flightLegId]/page.tsx
app/operations-control/page.tsx
app/page.tsx
```

**A**

```text
app/admin/settings/actions.ts
app/admin/settings/page.tsx
app/aircraft/[aircraftId]/airworthiness/actions.ts
app/aircraft/[aircraftId]/airworthiness/page.tsx
app/aircraft/[aircraftId]/crew/page.tsx
app/aircraft/[aircraftId]/fuel/actions.ts
app/aircraft/[aircraftId]/fuel/page.tsx
app/aircraft/[aircraftId]/page.tsx
app/aircraft/actions.ts
app/aircraft/aircraft-schedule-dropdown.tsx
app/api/aircraft/[id]/crew-assignments/route.ts
app/api/flights/[id]/coverage/route.ts
app/api/flights/[id]/crew/route.ts
app/api/health/route.ts
app/crew/[crewMemberId]/compliance/actions.ts
app/crew/[crewMemberId]/compliance/page.tsx
app/crew/[crewMemberId]/logistics/actions.ts
app/crew/[crewMemberId]/logistics/page.tsx
app/crew/[crewMemberId]/page.tsx
app/crew/logistics/page.tsx
app/crew/me/flights/[flightLegId]/page.tsx
app/crew/me/flights/[flightLegId]/passengers/[passengerId]/identity-document/route.ts
app/crew/me/flights/[flightLegId]/passengers/actions.ts
app/crew/me/flights/[flightLegId]/passengers/page.tsx
app/crew/me/page.tsx
app/crew/scheduling/patterns/actions.ts
app/crew/scheduling/patterns/page.tsx
app/crew/scheduling/periods/[periodId]/page.tsx
app/crew/scheduling/periods/actions.ts
app/crew/scheduling/periods/page.tsx
app/crew/scheduling/time-off/actions.ts
app/crew/scheduling/time-off/page.tsx
app/customers/actions.ts
app/customers/page.tsx
app/customers/passengers/[passengerId]/identity-document/route.ts
app/dashboard-actions.ts
app/flights/page.tsx
app/globals.css
app/internal/duty-rest-policy-readiness/page.tsx
app/internal/duty-rest-scenarios/page.tsx
app/internal/flightleg-parity/page.tsx
app/internal/flightleg-write-readiness/page.tsx
app/internal/import-batches/actions.ts
app/internal/import-batches/page.tsx
app/internal/import-staging-readiness/page.tsx
app/internal/release-policy-readiness/page.tsx
app/internal/release-snapshot-readiness/page.tsx
app/layout.tsx
app/login/actions.ts
app/login/page.tsx
app/operations-control/[flightLegId]/dispatch/actions.ts
app/operations-control/[flightLegId]/dispatch/page.tsx
app/operations-control/[flightLegId]/edit/page.tsx
app/operations-control/[flightLegId]/fuel/actions.ts
app/operations-control/[flightLegId]/fuel/page.tsx
app/operations-control/[flightLegId]/locating/actions.ts
app/operations-control/[flightLegId]/locating/page.tsx
app/operations-control/[flightLegId]/manifest/actions.ts
app/operations-control/[flightLegId]/manifest/page.tsx
app/operations-control/[flightLegId]/snapshots/[snapshotId]/page.tsx
app/operations-control/[flightLegId]/weight-balance/actions.ts
app/operations-control/[flightLegId]/weight-balance/page.tsx
app/operations-control/flightleg-form.tsx
app/operations-control/new/page.tsx
app/scheduling/page.tsx
```

### Components — 8

**A/C**

```text
components/maintenance-logbook-drawer.tsx
components/time-off-assignment-coverage-review.tsx
components/time-off-coverage-impact.tsx
```

**A**

```text
components/app-shell/app-shell.tsx
components/app-shell/theme-toggle.tsx
components/context-drawer.tsx
components/maintenance-logbook-dialog-shell.tsx
components/passenger-identity-document-capture.tsx
```

### Library files — 57

**R**

```text
lib/crew-scheduling-planner-queries.ts
```

**A/IC**

```text
lib/crew-resolution.ts
lib/flight-queries.ts
lib/flight-workflow.ts
lib/scheduling-queries.ts
```

**A/C**

```text
lib/aircraft-context-queries.ts
lib/aircraft-crew-workflow-queries.ts
lib/aircraft-logbook-storage.ts
lib/aircraft-queries.ts
lib/crew-me-queries.ts
lib/crew-schedule-period-queries.ts
lib/crew-schedule-publishing.ts
lib/crew-scheduling-workbench-queries.ts
lib/flightleg-operations-control-queries.ts
lib/maintenance-workbench-queries.ts
lib/passenger-identity-document-storage.ts
```

**A**

```text
lib/aircraft-logbook.ts
lib/aircraft-serviceability.ts
lib/airworthiness-workflow-queries.ts
lib/api-errors.ts
lib/auth/crew-portal.ts
lib/auth/guards.ts
lib/auth/password.ts
lib/auth/session.ts
lib/crew-compliance-demo-seed.ts
lib/crew-compliance-evaluator.ts
lib/crew-compliance-rule-defaults.ts
lib/crew-member-context-queries.ts
lib/crew-rotation-pattern-queries.ts
lib/crew-schedule-pattern-generation.ts
lib/dashboard-queries.ts
lib/dispatch-package-workflow-queries.ts
lib/duty-rest-evaluator.ts
lib/duty-rest-policy-defaults.ts
lib/duty-rest-policy-readiness.ts
lib/flightleg-form-queries.ts
lib/flightleg-parity.ts
lib/flightleg-upcoming-coverage.ts
lib/flightleg-write-readiness.ts
lib/flight-locating-workflow-queries.ts
lib/fuel.ts
lib/import-staging-diagnostics.ts
lib/maintenance-lifecycle.ts
lib/maintenance-logbook-drawer.ts
lib/manifest-workflow-queries.ts
lib/passenger-identity-documents.ts
lib/performance-monitor.ts
lib/prisma.ts
lib/release-evidence-detail-queries.ts
lib/release-policy-defaults.ts
lib/release-policy-readiness.ts
lib/release-readiness.ts
lib/release-snapshot-detail-queries.ts
lib/release-snapshot-diagnostics.ts
lib/same-app-return.ts
lib/time-off-workflow-queries.ts
lib/weight-balance-workflow-queries.ts
```

### Prisma schema, seed, migration lock, and migrations — 36

**A/IC**

```text
prisma/schema.prisma
prisma/migrations/20260601234500_init/migration.sql
prisma/migrations/20260605160000_authority_operational_control_foundation/migration.sql
prisma/migrations/20260606150000_flightleg_transition_foundation/migration.sql
prisma/migrations/20260606190000_release_evidence_schema_foundation/migration.sql
prisma/migrations/20260607102904_airworthiness_foundation/migration.sql
prisma/migrations/20260607145711_release_blocking_schema_foundation/migration.sql
prisma/migrations/20260608012933_position_report_foundation/migration.sql
prisma/migrations/20260608023655_dispatch_package_review_state_foundation/migration.sql
prisma/migrations/20260608101052_legacy_import_staging_schema_foundation/migration.sql
prisma/migrations/20260609084342_crew_scheduling_schema_foundation/migration.sql
prisma/migrations/20260610120000_auth_schema_foundation/migration.sql
prisma/migrations/20260610170000_releasepackage_schema_foundation/migration.sql
prisma/migrations/20260610180000_crew_compliance_schema_foundation/migration.sql
prisma/migrations/20260610190000_crew_logistics_schema_foundation/migration.sql
prisma/migrations/20260611024326_duty_rest_policy_settings/migration.sql
prisma/migrations/20260612135847_fuel_ledger_release_readiness/migration.sql
prisma/migrations/20260613120000_crew_planned_compliance_events/migration.sql
prisma/migrations/20260613143000_ops_release_preflight_postflight/migration.sql
prisma/migrations/20260613170000_performance_alerts/migration.sql
prisma/migrations/20260613190000_customer_flightleg_form/migration.sql
prisma/migrations/20260613203000_customer_passenger_manifest_workflow/migration.sql
prisma/migrations/20260615230000_crew_planning_draft_canvas/migration.sql
prisma/migrations/20260616120000_add_personal_duty_status/migration.sql
prisma/migrations/20260618130000_passenger_service_profile/migration.sql
prisma/migrations/20260619143000_crew_compliance_rule_calculation/migration.sql
prisma/migrations/20260619170000_crew_compliance_evidence_coverage/migration.sql
prisma/migrations/20260630120000_passenger_identity_documents/migration.sql
prisma/migrations/20260630153000_aircraft_logbook_foundation/migration.sql
prisma/migrations/20260630190000_return_to_service_lifecycle/migration.sql
prisma/migrations/20260701100000_discrepancy_aog_phase/migration.sql
prisma/migrations/20260701130023_scheduled_maintenance_program/migration.sql
prisma/migrations/20260726200000_simplified_maintenance_lifecycle/migration.sql
prisma/migrations/20260726210000_logbook_signature_purpose_uniqueness/migration.sql
```

**T**

```text
prisma/migrations/migration_lock.toml
prisma/seed.ts
```

### Scripts — 42 (`T`)

```text
scripts/backfill-airworthiness-demo.ts
scripts/backfill-authority-demo.ts
scripts/backfill-crew-compliance-demo.ts
scripts/backfill-crew-compliance-rules.ts
scripts/backfill-duty-rest-policy-demo.ts
scripts/backfill-flightleg-demo.ts
scripts/backfill-fuel-demo.ts
scripts/backfill-release-evidence-demo.ts
scripts/backfill-release-policy-demo.ts
scripts/local-docker-compose.ps1
scripts/local-prisma.ps1
scripts/local-tsx.ps1
scripts/seed-aircraft-coverage-demo.ts
scripts/seed-aircraft-logbook-demo.ts
scripts/seed-crew-me-demo.ts
scripts/seed-duty-rest-scenarios.ts
scripts/seed-maintenance-program-demo.ts
scripts/seed-ops-month-demo.ts
scripts/seed-scheduling-demo-pilots.ts
scripts/setup-smoke-users.ts
scripts/smoke-aircraft-logbook.ts
scripts/smoke-app.ts
scripts/smoke-crew-compliance-evaluator.ts
scripts/smoke-crew-core-fit.ts
scripts/smoke-crew-coverage-eligibility.ts
scripts/smoke-crew-logistics-workbench.ts
scripts/smoke-crew-logistics-workflow.ts
scripts/smoke-crew-portal-backend.ts
scripts/smoke-crew-requests-time-off.ts
scripts/smoke-crew-scheduling-workbench.ts
scripts/smoke-customer-passenger-manifest.ts
scripts/smoke-duty-rest-snapshot.ts
scripts/smoke-fuel-workflow.ts
scripts/smoke-maintenance-logbook-drawer.ts
scripts/smoke-passenger-identity-documents.ts
scripts/smoke-release-workflow-phases.ts
scripts/smoke-reusable-templates.ts
scripts/smoke-rotation-patterns.ts
scripts/smoke-schedule-publishing.ts
scripts/smoke-simplified-maintenance-lifecycle.ts
scripts/smoke-test-auth.ts
scripts/smoke-workflows.ts
```

### Browser tests — 1 (`T`)

```text
tests/browser/aeroops-browser-smoke.spec.ts
```

Ledger total: **13 + 87 + 8 + 57 + 36 + 42 + 1 = 244 files**.

## Audit limitations and completion statement

The complete tracked review ledger is finished. Runtime checks were deliberately limited to the healthy local Docker PostgreSQL database. No production data, Render service, deployment, commit, push, dependency update, schema change, migration, reseed, or application-code change was performed.

The audit did not exercise every role through every page in a rendered browser because doing so would require changing credentials or creating a large set of persistent fixtures. It did verify anonymous production-mode behavior, an existing OPS role's denied routes, revoked-session behavior, the rendered scheduling page, and the relevant positive local smoke workflows. The remediation backlog makes the missing exhaustive role/object matrix a required acceptance gate rather than representing it as complete runtime coverage.
