import Link from "next/link";

import {
  FlightLegWriteReadinessRow,
  getFlightLegWriteReadinessReport,
} from "@/lib/flightleg-write-readiness";

export const dynamic = "force-dynamic";

function toDateTimeLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function statusClasses(issueCount: number): string {
  if (issueCount === 0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
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

function ReadinessRow({ row }: { row: FlightLegWriteReadinessRow }) {
  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="px-3 py-2.5">
        <Link className="font-medium text-sky-700 hover:text-sky-900" href={`/operations-control/${row.id}`}>
          {row.flightNumber}
        </Link>
        <p className="mt-1 font-mono text-xs text-zinc-400">{row.id.slice(0, 10)}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">
        {toDateTimeLabel(row.scheduledDeparture)}
      </td>
      <td className="px-3 py-2.5 text-zinc-700">{row.currentAircraft ?? "Missing"}</td>
      <td className="px-3 py-2.5 text-zinc-700">{row.tripNumber ?? "Missing"}</td>
      <td className="px-3 py-2.5 text-zinc-700">{row.releaseStatus ?? "Missing"}</td>
      <td className="px-3 py-2.5">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
            row.issueCount,
          )}`}
        >
          {row.issueCount === 0 ? "READY" : "ISSUES"}
        </span>
      </td>
      <td className="min-w-80 px-3 py-2.5 text-zinc-700">
        {row.issues.length === 0 ? (
          <span className="text-zinc-500">No write-readiness issues found.</span>
        ) : (
          <ul className="space-y-1">
            {row.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

export default async function FlightLegWriteReadinessPage() {
  const report = await getFlightLegWriteReadinessReport();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Internal Diagnostic
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            FlightLeg Write Readiness
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Checks whether FlightLeg write-workflow records have the expected bridge,
            trip, aircraft assignment, control, release, and turnaround data.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Generated {toDateTimeLabel(report.generatedAt)}
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="FlightLegs" value={report.summary.totalFlightLegs} />
          <SummaryCard label="Ready" value={report.summary.readyFlightLegs} />
          <SummaryCard label="With issues" value={report.summary.issueFlightLegs} />
          <SummaryCard label="Total issues" value={report.summary.totalIssues} />
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="px-3 py-2 font-medium">FlightLeg</th>
                  <th className="px-3 py-2 font-medium">Scheduled</th>
                  <th className="px-3 py-2 font-medium">Aircraft</th>
                  <th className="px-3 py-2 font-medium">Trip</th>
                  <th className="px-3 py-2 font-medium">Release</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Issues</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <ReadinessRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
