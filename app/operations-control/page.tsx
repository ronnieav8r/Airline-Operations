import { OperatingPart, ReleaseStatus } from "@prisma/client";

import {
  getFlightLegOperationsControlData,
  OperationsControlRecordRead,
} from "@/lib/flightleg-operations-control-queries";

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

function formatOperatingPart(part: OperatingPart): string {
  return part.replace("PART_", "Part ");
}

function formatReleaseStatus(status: ReleaseStatus | null): string {
  return status ?? "NO RELEASE";
}

function releaseBadgeClasses(status: ReleaseStatus | null): string {
  if (status === ReleaseStatus.RELEASED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === ReleaseStatus.PLANNED) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === ReleaseStatus.CANCELLED || status === ReleaseStatus.VOIDED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function evidenceBadgeClasses(ready: boolean): string {
  if (ready) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function sourceLabel(record: OperationsControlRecordRead): string {
  if (record.readSource === "FLIGHT_LEG") {
    return "FlightLeg read";
  }

  if (record.readSource === "LEG_MISSING_FALLBACK_FLIGHT") {
    return "Fallback Flight read";
  }

  return "Unassigned";
}

function sourceClasses(record: OperationsControlRecordRead): string {
  if (record.readSource === "FLIGHT_LEG") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (record.readSource === "LEG_MISSING_FALLBACK_FLIGHT") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function EvidenceCell({ record }: { record: OperationsControlRecordRead }) {
  const evidence = record.leg?.releaseEvidence;

  if (!evidence) {
    return <span className="text-zinc-400">No FlightLeg evidence</span>;
  }

  const dispatchReady =
    evidence.dispatchPackageReady &&
    evidence.weatherSnapshotReady &&
    evidence.notamSnapshotReady &&
    Boolean(evidence.flightPlanStatus);

  return (
    <div className="min-w-52 space-y-1.5">
      <div className="flex flex-wrap gap-1">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${evidenceBadgeClasses(
            Boolean(evidence.manifestStatus),
          )}`}
        >
          Manifest {evidence.manifestStatus ?? "missing"} ({evidence.manifestItemCount})
        </span>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${evidenceBadgeClasses(
            Boolean(evidence.weightBalanceStatus),
          )}`}
        >
          W&B {evidence.weightBalanceStatus ?? "missing"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${evidenceBadgeClasses(
            Boolean(evidence.locatingStatus),
          )}`}
        >
          Locate {evidence.locatingStatus ?? "missing"}
        </span>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${evidenceBadgeClasses(
            dispatchReady,
          )}`}
        >
          Dispatch {dispatchReady ? "ready" : "partial"}
        </span>
      </div>
    </div>
  );
}

function FlightCell({ record }: { record: OperationsControlRecordRead }) {
  if (!record.leg) {
    return (
      <div>
        <p className="font-medium text-zinc-900">Unassigned</p>
        <p className="text-xs text-amber-700">No linked flight leg</p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-medium text-zinc-900">{record.leg.flightNumber}</p>
      <p className="text-xs text-zinc-500">{record.leg.status}</p>
      <span
        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${sourceClasses(
          record,
        )}`}
      >
        {sourceLabel(record)}
      </span>
    </div>
  );
}

export default async function OperationsControlPage() {
  const data = await getFlightLegOperationsControlData();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Operations Control
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Authority and Release Board
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Read-only control view for the governing authority, controlling entity,
            release state, aircraft, and scheduled leg timing in effect.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Total control records</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.totalControlRecords}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Released</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.released}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Planned</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.planned}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Other release states</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.otherReleaseStates}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">FlightLeg reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.flightLegReads}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Fallback reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.fallbackFlightReads}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Manifests ready</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.manifestReadyOrLocked}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">W&B calculated</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.weightBalanceCalculatedOrApproved}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Locating filed/active</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.locatingFiledOrActiveOrClosed}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Dispatch packages</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.dispatchPackagesReady}
            </p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Authority mix</h2>
              <p className="text-sm text-zinc-600">
                Control records grouped by operating part.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {data.summary.authorityMix.map((bucket) => (
              <div
                className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                key={bucket.part}
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {formatOperatingPart(bucket.part)}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{bucket.count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Control records</h2>
              <p className="text-sm text-zinc-600">
                Flight-linked operating authority and release details.
              </p>
            </div>
          </div>

          {data.records.length === 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">No operational-control records found.</p>
              <p className="mt-1">
                This page is ready for runtime data, but there are no control records
                to display in the connected database.
              </p>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Flight</th>
                    <th className="px-3 py-2 font-medium">Operator</th>
                    <th className="px-3 py-2 font-medium">Operating part</th>
                    <th className="px-3 py-2 font-medium">Authority revision</th>
                    <th className="px-3 py-2 font-medium">Controlling entity</th>
                    <th className="px-3 py-2 font-medium">Release</th>
                    <th className="px-3 py-2 font-medium">Evidence</th>
                    <th className="px-3 py-2 font-medium">Route</th>
                    <th className="px-3 py-2 font-medium">Aircraft</th>
                    <th className="px-3 py-2 font-medium">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((record) => (
                    <tr className="border-b border-zinc-100 align-top" key={record.id}>
                      <td className="px-3 py-2.5">
                        <FlightCell record={record} />
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-zinc-900">{record.operator.name}</p>
                        <p className="font-mono text-xs text-zinc-500">{record.operator.code}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-zinc-900">
                          {formatOperatingPart(record.operatingAuthority.operatingPart)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {record.operatingAuthority.displayName}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-zinc-900">
                          {record.authorityRevision.revisionLabel}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Effective {toDateTimeLabel(record.authorityRevision.effectiveStart)}
                        </p>
                      </td>
                      <td className="min-w-48 px-3 py-2.5 text-zinc-700">
                        {record.controllingEntity}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(
                            record.release?.status ?? null,
                          )}`}
                        >
                          {formatReleaseStatus(record.release?.status ?? null)}
                        </span>
                        {record.release?.releasedAt ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            {toDateTimeLabel(record.release.releasedAt)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <EvidenceCell record={record} />
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700">
                        {record.leg?.departureStation && record.leg.arrivalStation ? (
                          <>
                            {record.leg.departureStation.code}
                            {" -> "}
                            {record.leg.arrivalStation.code}
                          </>
                        ) : (
                          <span className="text-zinc-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {record.leg?.aircraft ? (
                          <>
                            <p className="font-mono text-zinc-800">
                              {record.leg.aircraft.tailNumber}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {record.leg.aircraft.type}
                            </p>
                          </>
                        ) : (
                          <span className="text-zinc-400">Not assigned</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">
                        {record.leg?.scheduledDeparture ? (
                          toDateTimeLabel(record.leg.scheduledDeparture)
                        ) : (
                          <span className="text-zinc-400">Not scheduled</span>
                        )}
                      </td>
                    </tr>
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
