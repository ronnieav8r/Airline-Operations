import {
  getImportStagingDiagnosticReport,
  ImportStagingRecentBatch,
  ImportStagingSourceSummary,
} from "@/lib/import-staging-diagnostics";
import Link from "next/link";

export const dynamic = "force-dynamic";

function toDateTimeLabel(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function CountList({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: Array<{ key: string; count: number }>;
  title: string;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{emptyLabel}</p>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <div className="flex items-center justify-between gap-3" key={item.key}>
              <dt className="break-all text-zinc-600">{item.key}</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">{item.count}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function BatchRow({ batch }: { batch: ImportStagingRecentBatch }) {
  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="px-3 py-2.5">
        <p className="font-medium text-zinc-900">{batch.batchKey ?? "No batch key"}</p>
        <p className="mt-1 font-mono text-xs text-zinc-400">{batch.id}</p>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        <p>{batch.importDomain}</p>
        <p className="mt-1 text-xs text-zinc-500">{batch.sourceSystem ?? "No source system"}</p>
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800">
          {batch.status}
        </span>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        <p>{batch.sourceCount} source(s)</p>
        <p>{batch.rowCount} row(s)</p>
        <p>{batch.findingCount} finding(s)</p>
        <p>{batch.decisionCount} decision(s)</p>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        <p>{toDateTimeLabel(batch.createdAt)}</p>
        <p className="mt-1 text-xs text-zinc-500">Reviewed {toDateTimeLabel(batch.reviewedAt)}</p>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">{batch.notesPresent ? "Yes" : "No"}</td>
    </tr>
  );
}

function SourceRow({ source }: { source: ImportStagingSourceSummary }) {
  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="px-3 py-2.5">
        <p className="font-medium text-zinc-900">{source.sourceName}</p>
        <p className="mt-1 font-mono text-xs text-zinc-400">{source.id}</p>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">{source.batchKey ?? "No batch key"}</td>
      <td className="px-3 py-2.5 text-zinc-700">{source.sourceType}</td>
      <td className="px-3 py-2.5 text-zinc-700">{source.sourceHash ?? "No hash"}</td>
      <td className="px-3 py-2.5 text-zinc-700">{source.rowCount}</td>
      <td className="px-3 py-2.5 text-zinc-700">{toDateTimeLabel(source.createdAt)}</td>
    </tr>
  );
}

export default async function ImportStagingReadinessPage() {
  const report = await getImportStagingDiagnosticReport();
  const hasNoBatches = report.summary.importBatches === 0;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Internal Diagnostic
          </p>
          <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Import Staging Readiness
              </h1>
            </div>
            <Link
              className="inline-flex rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              href="/internal/import-batches"
            >
              Manage batch metadata
            </Link>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Summarizes import staging counts, batch coverage, validation findings, and
            mapping decisions. This page is read-only and does not parse, stage, import,
            apply, or mutate operational records.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Generated {toDateTimeLabel(report.generatedAt)}
          </p>
        </header>

        {hasNoBatches ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
            Import staging schema is installed. No import batches have been staged yet.
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Import batches" value={report.summary.importBatches} />
          <SummaryCard label="Sources" value={report.summary.importSources} />
          <SummaryCard label="Staging rows" value={report.summary.importStagingRows} />
          <SummaryCard label="Findings" value={report.summary.importValidationFindings} />
          <SummaryCard label="Mapping decisions" value={report.summary.importMappingDecisions} />
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <CountList
            emptyLabel="No batch domains yet."
            items={report.batchDomainCounts}
            title="Batch counts by domain"
          />
          <CountList
            emptyLabel="No batch statuses yet."
            items={report.batchStatusCounts}
            title="Batch counts by status"
          />
          <CountList
            emptyLabel="No row validation statuses yet."
            items={report.rowValidationCounts}
            title="Rows by validation status"
          />
          <CountList
            emptyLabel="No mapped target types yet."
            items={report.rowTargetTypeCounts}
            title="Rows by mapped target type"
          />
          <CountList
            emptyLabel="No finding severities yet."
            items={report.findingSeverityCounts}
            title="Findings by severity"
          />
          <CountList
            emptyLabel="No finding codes yet."
            items={report.findingCodeCounts}
            title="Findings by code"
          />
          <CountList
            emptyLabel="No mapping decisions yet."
            items={report.mappingDecisionCounts}
            title="Mapping decisions by status"
          />
          <CountList
            emptyLabel="No mapping target types yet."
            items={report.mappingTargetTypeCounts}
            title="Mapping decisions by target type"
          />
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Recent batches</h2>
          {report.recentBatches.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No import batches have been staged.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Batch</th>
                    <th className="px-3 py-2 font-medium">Domain</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Coverage</th>
                    <th className="px-3 py-2 font-medium">Dates</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentBatches.map((batch) => (
                    <BatchRow batch={batch} key={batch.id} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Recent sources</h2>
          {report.recentSources.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No import sources have been staged.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Batch</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Hash</th>
                    <th className="px-3 py-2 font-medium">Rows</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentSources.map((source) => (
                    <SourceRow key={source.id} source={source} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
