import { FlightLegParityRow, getFlightLegParityReport } from "@/lib/flightleg-parity";

export const dynamic = "force-dynamic";

function toDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function statusClasses(status: FlightLegParityRow["status"]): string {
  if (status === "PASS") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function checkClasses(pass: boolean): string {
  return pass
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function CheckPill({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${checkClasses(pass)}`}>
      {label}
    </span>
  );
}

function CompactList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <span className="text-zinc-400">{emptyLabel}</span>;
  }

  return <span>{items.join(" | ")}</span>;
}

function ParityRow({ row }: { row: FlightLegParityRow }) {
  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="whitespace-nowrap px-3 py-3">
        <div className="font-semibold text-zinc-950">{row.flightNumber}</div>
        <div className="text-xs text-zinc-500">Flight {row.flightId.slice(0, 8)}</div>
        <div className="text-xs text-zinc-500">
          Leg {row.flightLegId ? row.flightLegId.slice(0, 8) : "missing"}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="font-medium text-zinc-900">{row.route}</div>
        <div className="text-xs text-zinc-500">{toDateTime(row.scheduledDeparture)}</div>
        <div className="font-mono text-xs text-zinc-500">{row.aircraftTailNumber}</div>
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
            row.status,
          )}`}
        >
          {row.status}
        </span>
        <div className="mt-1 text-xs text-zinc-500">{row.issueCount} issue(s)</div>
      </td>
      <td className="min-w-80 px-3 py-3">
        <div className="flex flex-wrap gap-1">
          <CheckPill label="Bridge" pass={row.checks.bridge} />
          <CheckPill label="Core" pass={row.checks.core} />
          <CheckPill label="Aircraft" pass={row.checks.aircraft} />
          <CheckPill label="Crew" pass={row.checks.crew} />
          <CheckPill label="Control" pass={row.checks.control} />
          <CheckPill label="Turnaround" pass={row.checks.turnaround} />
        </div>
        <div className="mt-3 text-xs leading-5 text-zinc-600">
          <div>
            Status expected {row.expected.status}; actual {row.actual.status ?? "missing"}
          </div>
          <div>
            Crew expected <CompactList emptyLabel="none" items={row.expected.crew} />
          </div>
          <div>
            Crew actual <CompactList emptyLabel="none" items={row.actual.crew} />
          </div>
          <div>
            Turnarounds expected{" "}
            <CompactList emptyLabel="none" items={row.expected.turnarounds} />
          </div>
          <div>
            Turnarounds actual <CompactList emptyLabel="none" items={row.actual.turnarounds} />
          </div>
        </div>
      </td>
      <td className="min-w-80 px-3 py-3 text-sm text-zinc-700">
        {row.issues.length === 0 ? (
          <span className="text-emerald-700">No mismatches found.</span>
        ) : (
          <ul className="list-disc space-y-1 pl-4">
            {row.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

export default async function FlightLegParityPage() {
  const report = await getFlightLegParityReport();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Internal Diagnostic
          </p>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                FlightLeg Parity
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Read-only comparison between current Flight rows and additive FlightLeg bridge
                records. This page is intentionally hidden from primary navigation.
              </p>
            </div>
            <div className="text-sm text-zinc-500">
              Generated {toDateTime(report.generatedAt)}
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Flights" value={report.summary.totalFlights} />
          <SummaryCard label="Linked legs" value={report.summary.linkedLegs} />
          <SummaryCard label="Passing rows" value={report.summary.passingRows} />
          <SummaryCard label="Failing rows" value={report.summary.failingRows} />
          <SummaryCard label="Missing legs" value={report.summary.missingFlightLegRows} />
          <SummaryCard label="Crew mismatches" value={report.summary.crewMismatches} />
          <SummaryCard label="Aircraft mismatches" value={report.summary.aircraftMismatches} />
          <SummaryCard label="Control mismatches" value={report.summary.controlMismatches} />
          <SummaryCard label="Turnaround mismatches" value={report.summary.turnaroundMismatches} />
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          {report.rows.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">No flights found.</p>
              <p className="mt-1">
                Seed or backfill flight data before using this parity diagnostic.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2 font-semibold">Flight / Leg</th>
                    <th className="px-3 py-2 font-semibold">Route</th>
                    <th className="px-3 py-2 font-semibold">Result</th>
                    <th className="px-3 py-2 font-semibold">Checks</th>
                    <th className="px-3 py-2 font-semibold">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <ParityRow key={row.flightId} row={row} />
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
