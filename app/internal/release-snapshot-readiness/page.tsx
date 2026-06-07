import Link from "next/link";

import {
  getReleaseSnapshotDiagnosticReport,
  ReleaseSnapshotDiagnosticRow,
} from "@/lib/release-snapshot-diagnostics";

export const dynamic = "force-dynamic";

function toDateTimeLabel(value: Date | null): string {
  if (!value) {
    return "No snapshot";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function statusClasses(status: ReleaseSnapshotDiagnosticRow["status"]): string {
  if (status === "CURRENT") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "NO_SNAPSHOT") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function FindingCounts({
  counts,
}: {
  counts: {
    fail: number;
    pass: number;
    warning: number;
    notApplicable?: number;
  };
}) {
  return (
    <dl className="grid grid-cols-3 gap-2 text-xs">
      <div>
        <dt className="text-zinc-500">Pass</dt>
        <dd className="font-semibold">{counts.pass}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Fail</dt>
        <dd className="font-semibold">{counts.fail}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Warn</dt>
        <dd className="font-semibold">{counts.warning}</dd>
      </div>
      {typeof counts.notApplicable === "number" ? (
        <div>
          <dt className="text-zinc-500">N/A</dt>
          <dd className="font-semibold">{counts.notApplicable}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function SnapshotRow({ row }: { row: ReleaseSnapshotDiagnosticRow }) {
  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="px-3 py-2.5">
        <p className="font-medium text-zinc-900">{row.flightNumber ?? "Unnumbered"}</p>
        <p className="mt-1 text-xs text-zinc-500">{row.routeLabel}</p>
        <p className="mt-1 font-mono text-xs text-zinc-400">{row.flightLegId}</p>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        <p>{row.authorityName}</p>
        <p className="mt-1 text-xs text-zinc-500">Release {row.releaseStatus ?? "Missing"}</p>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        <p>{row.latestSnapshotStatus ?? "Missing"}</p>
        <p className="mt-1 text-xs text-zinc-500">{toDateTimeLabel(row.latestSnapshotAt)}</p>
        {row.latestSnapshotId ? (
          <Link
            className="mt-2 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
            href={`/operations-control/${row.flightLegId}/snapshots/${row.latestSnapshotId}`}
          >
            View findings
          </Link>
        ) : null}
      </td>
      <td className="min-w-44 px-3 py-2.5">
        <FindingCounts counts={row.liveCounts} />
      </td>
      <td className="min-w-44 px-3 py-2.5">
        <FindingCounts counts={row.snapshotCounts} />
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
            row.status,
          )}`}
        >
          {row.status}
        </span>
        <p className="mt-1 text-xs text-zinc-500">{row.mismatchCount} mismatch(es)</p>
      </td>
      <td className="min-w-96 px-3 py-2.5 text-zinc-700">
        {row.mismatches.length === 0 ? (
          <span className="text-zinc-500">Latest snapshot matches live readiness.</span>
        ) : (
          <ul className="space-y-1">
            {row.mismatches.slice(0, 6).map((mismatch) => (
              <li className="text-xs" key={`${mismatch.category}:${mismatch.ruleKey}:${mismatch.reason}`}>
                <span className="font-mono">{mismatch.category}/{mismatch.ruleKey}</span>:{" "}
                {mismatch.reason}
              </li>
            ))}
            {row.mismatches.length > 6 ? (
              <li className="text-xs text-zinc-500">
                {row.mismatches.length - 6} additional mismatch(es).
              </li>
            ) : null}
          </ul>
        )}
      </td>
    </tr>
  );
}

export default async function ReleaseSnapshotReadinessPage() {
  const report = await getReleaseSnapshotDiagnosticReport();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Internal Diagnostic
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Release Snapshot Readiness
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Compares each FlightLeg&apos;s current live release-readiness checklist with its latest
            explicit preview snapshot. This is read-only and does not enforce release blocking.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Generated {toDateTimeLabel(report.generatedAt)}
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="FlightLegs checked" value={report.summary.flightLegs} />
          <SummaryCard label="Current snapshots" value={report.summary.currentSnapshots} />
          <SummaryCard label="Drifted snapshots" value={report.summary.driftedSnapshots} />
          <SummaryCard label="Missing snapshots" value={report.summary.missingSnapshots} />
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="px-3 py-2 font-medium">FlightLeg</th>
                  <th className="px-3 py-2 font-medium">Authority</th>
                  <th className="px-3 py-2 font-medium">Latest snapshot</th>
                  <th className="px-3 py-2 font-medium">Live counts</th>
                  <th className="px-3 py-2 font-medium">Snapshot counts</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Mismatch details</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <SnapshotRow key={row.flightLegId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
