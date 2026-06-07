import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getReleaseSnapshotDetail,
  ReleaseSnapshotDetail,
} from "@/lib/release-snapshot-detail-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    flightLegId: string;
    snapshotId: string;
  }>;
};

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

function formatJson(value: unknown): string {
  if (!value) {
    return "{}";
  }

  return JSON.stringify(value, null, 2);
}

function snapshotSummaryValue(summary: unknown, key: string): number {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return 0;
  }

  const value = (summary as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
}

function statusBadgeClasses(value: string): string {
  if (["PASS", "READY", "RELEASED", "INFO"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["BLOCKED", "FAIL", "BLOCK"].includes(value)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (["WARNING", "WARNING_ONLY", "WARN"].includes(value)) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(value)}`}>
      {value}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function FindingRows({ snapshot }: { snapshot: ReleaseSnapshotDetail }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="px-3 py-2 font-medium">Finding</th>
            <th className="px-3 py-2 font-medium">Severity</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Evidence</th>
            <th className="px-3 py-2 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.findings.map((finding) => (
            <tr className="border-b border-zinc-100 align-top" key={finding.id}>
              <td className="min-w-80 px-3 py-2.5">
                <p className="font-medium text-zinc-900">{finding.readinessCategory}</p>
                <p className="mt-1 font-mono text-xs text-zinc-500">{finding.ruleKey}</p>
                <p className="mt-2 text-sm text-zinc-700">{finding.summary}</p>
                {finding.rule ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Policy rule: {finding.rule.readinessCategory}, {finding.rule.severity}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <StatusBadge value={finding.severity} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <StatusBadge value={finding.status} />
                <p className="mt-2 text-xs text-zinc-500">
                  {finding.isOverridable ? "Overridable later" : "Not overridable"}
                </p>
              </td>
              <td className="min-w-56 px-3 py-2.5 text-zinc-700">
                <p>{finding.evidenceRefType ?? "No evidence reference"}</p>
                <p className="mt-1 font-mono text-xs text-zinc-400">
                  {finding.evidenceRefId ?? "missing"}
                </p>
              </td>
              <td className="min-w-96 px-3 py-2.5">
                <pre className="max-h-56 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
                  {formatJson(finding.details)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReleaseSnapshotDetailPage({ params }: PageProps) {
  const { flightLegId, snapshotId } = await params;
  const snapshot = await getReleaseSnapshotDetail(flightLegId, snapshotId);

  if (!snapshot) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="text-sm font-medium text-sky-700 hover:text-sky-900"
              href={`/operations-control/${snapshot.flightLeg.id}`}
            >
              Back to FlightLeg detail
            </Link>
            <Link
              className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
              href="/internal/release-snapshot-readiness"
            >
              Snapshot diagnostic
            </Link>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Preview Snapshot Detail
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {snapshot.flightLeg.flightNumber ?? "Unnumbered FlightLeg"}
            </h1>
            <StatusBadge value={snapshot.snapshotStatus} />
          </div>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Historical preview snapshot for {snapshot.flightLeg.departureStation.code} to{" "}
            {snapshot.flightLeg.arrivalStation.code}, evaluated{" "}
            {toDateTimeLabel(snapshot.evaluatedAt)}. This page is read-only and
            does not enforce release blocking.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Pass" value={snapshotSummaryValue(snapshot.summary, "pass")} />
          <SummaryCard label="Fail" value={snapshotSummaryValue(snapshot.summary, "fail")} />
          <SummaryCard label="Warn" value={snapshotSummaryValue(snapshot.summary, "warning")} />
          <SummaryCard label="Findings" value={snapshot.findings.length} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">FlightLeg</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">Route</dt>
                <dd className="font-medium">
                  {snapshot.flightLeg.departureStation.code} {"->"}{" "}
                  {snapshot.flightLeg.arrivalStation.code}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Scheduled departure</dt>
                <dd className="font-medium">{toDateTimeLabel(snapshot.flightLeg.scheduledDeparture)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Authority</dt>
                <dd className="font-medium">{snapshot.flightLeg.operatingAuthority.displayName}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Release</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">FlightRelease status</dt>
                <dd className="mt-1">
                  <StatusBadge value={snapshot.flightRelease.status} />
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Released at</dt>
                <dd className="font-medium">{toDateTimeLabel(snapshot.flightRelease.releasedAt)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Snapshot ID</dt>
                <dd className="font-mono text-xs">{snapshot.id}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Policy</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">Profile</dt>
                <dd className="font-medium">{snapshot.policyProfile.name}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Profile key</dt>
                <dd className="font-mono text-xs">{snapshot.policyProfile.profileKey}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Authority class</dt>
                <dd className="mt-1">
                  <StatusBadge value={snapshot.authorityClass} />
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Snapshot Findings</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Stored historical findings from this explicit preview capture.
              These are not recomputed on page load.
            </p>
          </div>
          <div className="mt-4">
            <FindingRows snapshot={snapshot} />
          </div>
        </section>
      </div>
    </main>
  );
}
