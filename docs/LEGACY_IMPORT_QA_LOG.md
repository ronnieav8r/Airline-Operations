# Legacy Import QA Log

Last updated: 2026-06-08

## Prompt 91: Legacy Import Staging Schema QA

Scope: validate the additive staging schema from Prompt 90 without adding
importer execution, parser code, file uploads, operational writes,
review/apply workflow, auth/signatures, destructive cleanup, provider
integrations, or source-specific mapping.

Results:

- Local Docker Postgres was already running.
- Local migration deploy reported no pending migrations after the Prompt 90
  migration was applied.
- `npm run prisma:validate` passed.
- Initial `npm run typecheck` hit the known generated Next route-types timing
  issue before build output existed.
- `npm run build` passed and regenerated route types.
- Post-build `npm run typecheck` passed.
- `npm run lint` passed.
- Local route smoke returned 200 for `/`, `/operations-control`, `/aircraft`,
  `/api/health`, `/flights`, `/crew`, and `/scheduling`.
- `/api/health` exposed the expected import staging keys:
  `importBatches`, `importSources`, `importStagingRows`,
  `importValidationFindings`, and `importMappingDecisions`.
- Local import staging counts were all zero, as expected.
- Browser smoke confirmed `/operations-control` rendered and showed
  `Operations Control` and `New FlightLeg`.

Conclusion: Prompt 90 staging schema and diagnostics are ready for the next
planning slice. No operational import behavior exists yet.

## Prompt 96: Import Staging Diagnostic QA

Scope: validate the read-only `/internal/import-staging-readiness` diagnostic
added in Prompt 95.

Results:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local route smoke returned 200 for `/internal/import-staging-readiness`, `/`,
  `/operations-control`, `/aircraft`, `/api/health`, `/flights`, `/crew`, and
  `/scheduling`.
- `/api/health` still exposed zero-count import staging keys:
  `importBatches`, `importSources`, `importStagingRows`,
  `importValidationFindings`, and `importMappingDecisions`.
- Browser smoke confirmed `/internal/import-staging-readiness` rendered
  `Import Staging Readiness`, the empty-state message, and summary count
  labels.

Conclusion: the read-only import staging diagnostic is ready. No mutation,
parser, upload, staging-row write, or operational import behavior exists.

## Prompt 99: Import Batch Metadata QA

Scope: validate the metadata-only `/internal/import-batches` workflow added in
Prompt 98.

Results:

- `npm run prisma:validate` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Local route smoke returned 200 for `/internal/import-batches`,
  `/internal/import-staging-readiness`, `/`, `/operations-control`,
  `/aircraft`, `/api/health`, `/flights`, `/crew`, and `/scheduling`.
- Browser QA created a metadata-only import batch.
- Browser QA edited the batch source-system metadata.
- Browser QA added source metadata.
- Browser QA confirmed `/internal/import-staging-readiness` reflected the new
  batch and source.
- `/api/health` confirmed local metadata-only counts:
  `importBatches = 2`, `importSources = 2`, `importStagingRows = 0`,
  `importValidationFindings = 0`, and `importMappingDecisions = 0`.

Conclusion: the metadata workflow is working and remains bounded to
`ImportBatch` and `ImportSource`. No parser, upload, dry-run, staging-row,
finding, mapping-decision, review/apply, or operational import behavior exists.
