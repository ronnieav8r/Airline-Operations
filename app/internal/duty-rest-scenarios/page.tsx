import Link from "next/link";

import { evaluateDutyRestForFlightLeg } from "@/lib/duty-rest-evaluator";
import { getReleaseEvidenceDetail } from "@/lib/release-evidence-detail-queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SCENARIO_PREFIX = "DUTY_REST_SCENARIO:";

const expectedOutcomes: Record<string, string> = {
  "135-DEFERRED": "Deferred/missing-input items remain visible for unavailable external data.",
  "135-MISSING-INPUT": "Missing-input findings should appear instead of false pass.",
  "135-MISSING-REST": "10-hour rest finding should warn.",
  "135-OVERLAP": "No-duty-during-rest finding should warn.",
  "135-PASS": "Supported checks should pass while outside-flying/transportation gaps remain visible.",
  "P91-GUARDRAIL": "Part 91 guardrail/info findings only; no Part 135 limits.",
};

function scenarioKey(note: string | null): string {
  return note?.startsWith(SCENARIO_PREFIX) ? note.slice(SCENARIO_PREFIX.length) : "UNKNOWN";
}

function toDateTimeLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function statusClasses(status: string): string {
  if (status === "PASS" || status === "NOT_APPLICABLE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "DEFERRED" || status === "MISSING_INPUT") {
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

async function getScenarioRows() {
  const legs = await prisma.flightLeg.findMany({
    where: {
      notes: {
        startsWith: SCENARIO_PREFIX,
      },
    },
    orderBy: [{ flightNumber: "asc" }],
    select: {
      id: true,
      flightNumber: true,
      notes: true,
      scheduledArrival: true,
      scheduledDeparture: true,
    },
  });

  const rows = [];

  for (const leg of legs) {
    const detail = await getReleaseEvidenceDetail(leg.id);

    if (!detail) {
      continue;
    }

    const evaluation = evaluateDutyRestForFlightLeg(detail);
    const key = scenarioKey(leg.notes);

    rows.push({
      detail,
      evaluation,
      key,
      leg,
    });
  }

  return rows;
}

export default async function DutyRestScenariosPage() {
  const rows = await getScenarioRows();
  const findingCounts = rows.reduce(
    (counts, row) => {
      for (const finding of row.evaluation.findings) {
        counts[finding.status] = (counts[finding.status] ?? 0) + 1;
      }

      return counts;
    },
    {} as Record<string, number>,
  );

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Internal Diagnostic
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Duty/Rest Scenario Diagnostics
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Read-only view of seeded duty/rest scenario FlightLegs and live evaluator findings.
            Seed scenarios with `RUN_DUTY_REST_SCENARIOS=1 npm run seed:duty-rest-scenarios`.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Scenario legs" value={rows.length} />
          <SummaryCard label="Pass" value={findingCounts.PASS ?? 0} />
          <SummaryCard label="Warn" value={findingCounts.WARNING ?? 0} />
          <SummaryCard label="Missing input" value={findingCounts.MISSING_INPUT ?? 0} />
          <SummaryCard label="Deferred" value={findingCounts.DEFERRED ?? 0} />
        </section>

        {rows.length === 0 ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No duty/rest scenario fixtures found. Run the gated scenario seed locally to populate this
            diagnostic.
          </section>
        ) : (
          <section className="space-y-4">
            {rows.map((row) => (
              <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={row.leg.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {row.key}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {row.detail.flightNumber ?? "Unnumbered"} |{" "}
                      {row.detail.departureStation.code} to {row.detail.arrivalStation.code}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {row.detail.operatingAuthority.operatingPart} | depart{" "}
                      {toDateTimeLabel(row.leg.scheduledDeparture)} | arrive{" "}
                      {toDateTimeLabel(row.leg.scheduledArrival)}
                    </p>
                    <p className="mt-2 text-sm text-zinc-600">
                      Expected: {expectedOutcomes[row.key] ?? "No expected outcome documented."}
                    </p>
                  </div>
                  <Link
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                    href={`/operations-control/${row.leg.id}`}
                  >
                    FlightLeg detail
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {row.evaluation.findings.map((finding) => (
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={finding.ruleKey}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-zinc-900">{finding.label}</p>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                            finding.status,
                          )}`}
                        >
                          {finding.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600">{finding.message}</p>
                      <p className="mt-2 font-mono text-xs text-zinc-500">{finding.ruleKey}</p>
                      {finding.details ? (
                        <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-white p-2 text-xs text-zinc-700">
                          {JSON.stringify(finding.details, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
