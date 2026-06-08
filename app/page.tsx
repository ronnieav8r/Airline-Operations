import {
  AlertSeverity,
  FlightLegStatus,
  FlightStatus,
  ReleaseStatus,
  SeatRole,
} from "@prisma/client";
import Link from "next/link";

import { DashboardFlight, getDashboardData } from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

function toTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function statusBadgeClasses(status: DashboardFlight["status"]): string {
  if (status === FlightStatus.ENROUTE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === FlightLegStatus.RELEASED || status === FlightLegStatus.READY_FOR_RELEASE) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === FlightStatus.DELAYED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === FlightStatus.CANCELLED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function sourceBadgeClasses(readSource: DashboardFlight["readSource"]): string {
  if (readSource === "FLIGHT_LEG") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function sourceLabel(readSource: DashboardFlight["readSource"]): string {
  if (readSource === "FLIGHT_LEG") {
    return "FlightLeg read";
  }

  return "Fallback Flight read";
}

function severityBadgeClasses(severity: AlertSeverity): string {
  if (severity === AlertSeverity.CRITICAL) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (severity === AlertSeverity.HIGH) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }
  if (severity === AlertSeverity.MEDIUM) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function evidenceBadgeClasses(flight: DashboardFlight): string {
  if (flight.releaseEvidence?.complete) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (flight.releaseEvidence) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function evidenceLabel(flight: DashboardFlight): string {
  if (flight.releaseEvidence?.complete) {
    return "Evidence ready";
  }

  if (flight.releaseEvidence) {
    return "Evidence partial";
  }

  return "No evidence";
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

function releaseLabel(status: ReleaseStatus | null): string {
  return status ?? "NO RELEASE";
}

function attentionBadgeClasses(state: "Ready" | "Needs attention" | "Missing"): string {
  if (state === "Ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "Missing") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function DashboardActionLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      className={
        primary
          ? "inline-flex rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
          : "inline-flex rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
      }
      href={href}
    >
      {label}
    </Link>
  );
}

export default async function Home() {
  const dashboard = await getDashboardData();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Operations Dashboard
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            AeroOps Center
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Operations view for {dashboard.dateLabel}. Live data from Prisma reads.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Total flights today</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.totalFlights}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Enroute flights</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.enroute}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Delayed flights</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.delayed}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active alerts</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.activeAlerts}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Aircraft count</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.aircraftCount}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Crew count</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.crewCount}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">FlightLeg reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.flightLegReads}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Fallback reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.fallbackFlightReads}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Evidence ready</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.releaseEvidenceComplete}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Evidence partial/missing</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {dashboard.statusSummary.releaseEvidenceMissing}
            </p>
          </article>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Operations Attention
                </p>
                <h2 className="mt-1 text-lg font-semibold">Today + release priorities</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Quick scan for release state, evidence gaps, and crew coverage before
                  moving into the full Operations Control workbench.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <DashboardActionLink href="/operations-control" label="Open workbench" primary />
                <DashboardActionLink
                  href="/operations-control?release=planned"
                  label="Planned releases"
                />
                <DashboardActionLink
                  href="/operations-control?evidence=missing"
                  label="Missing evidence"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
                <p className="text-xs uppercase tracking-wide text-sky-700">
                  Planned/unreleased
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-sky-950">
                  {dashboard.statusSummary.plannedOrUnreleased}
                </p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Released</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">
                  {dashboard.statusSummary.released}
                </p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">
                  Evidence ready
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">
                  {dashboard.statusSummary.operationsEvidenceReady}
                </p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs uppercase tracking-wide text-amber-700">
                  Partial/missing
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-950">
                  {dashboard.statusSummary.operationsEvidencePartialMissing}
                </p>
              </div>
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs uppercase tracking-wide text-rose-700">
                  Crew gaps today
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-950">
                  {dashboard.coverageGaps.length}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Priority FlightLegs
              </h3>
              {dashboard.operationsAttention.priorityFlightLegs.length === 0 ? (
                <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  No current FlightLeg attention items found.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  {dashboard.operationsAttention.priorityFlightLegs.map((flightLeg) => {
                    const detailHref = `/operations-control/${flightLeg.id}`;

                    return (
                      <article
                        className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                        key={flightLeg.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <Link
                              className="font-semibold text-sky-700 hover:text-sky-900"
                              href={detailHref}
                            >
                              {flightLeg.flightNumber}
                            </Link>
                            <p className="mt-1 text-sm text-zinc-600">
                              {flightLeg.route} · {flightLeg.tailNumber}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {flightLeg.scheduledDeparture
                                ? toTime(flightLeg.scheduledDeparture)
                                : "Not scheduled"}
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-1 sm:items-end">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(
                                flightLeg.releaseStatus,
                              )}`}
                            >
                              {releaseLabel(flightLeg.releaseStatus)}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${attentionBadgeClasses(
                                flightLeg.evidenceState,
                              )}`}
                            >
                              Evidence {flightLeg.evidenceState}
                            </span>
                          </div>
                        </div>
                        {flightLeg.attentionReasons.length > 0 ? (
                          <p className="mt-3 text-xs text-zinc-600">
                            {flightLeg.attentionReasons.slice(0, 4).join(" · ")}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <DashboardActionLink href={detailHref} label="Detail" primary />
                          <DashboardActionLink href={`${detailHref}/manifest`} label="Manifest" />
                          <DashboardActionLink
                            href={`${detailHref}/weight-balance`}
                            label="W&B"
                          />
                          <DashboardActionLink href={`${detailHref}/locating`} label="Locating" />
                          <DashboardActionLink href={`${detailHref}/dispatch`} label="Dispatch" />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-md border border-dashed border-sky-300 bg-sky-50/60 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
              Future Placeholder
            </p>
            <h2 className="mt-1 text-lg font-semibold text-sky-950">AI Review Notes</h2>
            <p className="mt-2 text-sm text-sky-900">
              Reserved space for future AI-generated operational observations,
              suggested follow-ups, and release-readiness review notes.
            </p>
            <div className="mt-4 rounded-md border border-sky-200 bg-white/80 p-3 text-sm text-sky-900">
              No AI provider is connected in this slice. This panel does not call
              external services, store notes, or automate recommendations.
            </div>
          </aside>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-zinc-200 bg-white p-4">
              <h2 className="text-lg font-semibold">Today&apos;s flight board</h2>
            {dashboard.flights.length === 0 ? (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No flights found for today.
                <br />
                Run <code>npm run prisma:seed</code> from the Render shell to
                load demo operations data.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500">
                      <th className="px-3 py-2 font-medium">Departure</th>
                      <th className="px-3 py-2 font-medium">Flight</th>
                      <th className="px-3 py-2 font-medium">Route</th>
                      <th className="px-3 py-2 font-medium">Aircraft</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Crew coverage</th>
                      <th className="px-3 py-2 font-medium">Release</th>
                      <th className="px-3 py-2 font-medium">Release evidence</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.flights.map((flight) => {
                      const hasCoverage = flight.coverage !== null;
                      const coverageText =
                        !hasCoverage || !flight.coverage
                          ? "No data"
                          : flight.coverage.isCovered
                            ? "Covered"
                            : `Missing ${flight.coverage.missingRoles.map(formatRoleLabel).join(", ")}`;

                      return (
                        <tr
                          className="border-b border-zinc-100 align-middle"
                          key={flight.id}
                        >
                          <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600">
                            {toTime(flight.scheduledDeparture)}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-zinc-900">
                            <div>{flight.flightNumber}</div>
                            <span
                              className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${sourceBadgeClasses(
                                flight.readSource,
                              )}`}
                            >
                              {sourceLabel(flight.readSource)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-zinc-700">
                            {flight.departureCode}
                            {" -> "}
                            {flight.arrivalCode}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-zinc-700">
                            {flight.tailNumber}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
                                flight.status,
                              )}`}
                            >
                              {flight.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                                hasCoverage && flight.coverage?.isCovered
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : hasCoverage
                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                    : "border-zinc-200 bg-zinc-50 text-zinc-500"
                              }`}
                            >
                              {coverageText}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(
                                flight.releaseStatus,
                              )}`}
                            >
                              {releaseLabel(flight.releaseStatus)}
                            </span>
                            {flight.releasedAt ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                {toTime(flight.releasedAt)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${evidenceBadgeClasses(
                                flight,
                              )}`}
                            >
                              {evidenceLabel(flight)}
                            </span>
                            {flight.releaseEvidence ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                M:{flight.releaseEvidence.manifestStatus ?? "none"} W&B:
                                {flight.releaseEvidence.weightBalanceStatus ?? "none"}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5">
                            {flight.flightLegId ? (
                              <div className="flex min-w-64 flex-wrap gap-2">
                                <DashboardActionLink
                                  href={`/operations-control/${flight.flightLegId}`}
                                  label="Detail"
                                  primary
                                />
                                <DashboardActionLink
                                  href={`/operations-control/${flight.flightLegId}/manifest`}
                                  label="Manifest"
                                />
                                <DashboardActionLink
                                  href={`/operations-control/${flight.flightLegId}/weight-balance`}
                                  label="W&B"
                                />
                                <DashboardActionLink
                                  href={`/operations-control/${flight.flightLegId}/locating`}
                                  label="Locating"
                                />
                                <DashboardActionLink
                                  href={`/operations-control/${flight.flightLegId}/dispatch`}
                                  label="Dispatch"
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400">No FlightLeg actions</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-md border border-zinc-200 bg-white p-4">
              <h2 className="text-lg font-semibold">Coverage gaps</h2>
              {dashboard.coverageGaps.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600">
                  No flights missing CPT/FO coverage in today&apos;s board.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {dashboard.coverageGaps.map((gap) => (
                    <li
                      className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-sm"
                      key={`${gap.id}-gap`}
                    >
                      <div className="font-medium text-rose-900">
                        {gap.flightNumber} - {toTime(gap.scheduledDeparture)}
                      </div>
                      <div className="text-rose-800">
                        Missing{" "}
                        {gap.missingRoles.map((role) => formatRoleLabel(role)).join(", ")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-4">
              <h2 className="text-lg font-semibold">Active alerts</h2>
              {dashboard.alerts.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600">No active alerts.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {dashboard.alerts.map((alert) => (
                    <li className="rounded-md border border-zinc-200 p-2.5 text-sm" key={alert.id}>
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${severityBadgeClasses(alert.severity)}`}
                        >
                          {alert.severity}
                        </span>
                        <span className="font-medium text-zinc-800">{alert.type}</span>
                        {(alert.flightNumber || alert.aircraftTail) && (
                          <span className="ml-auto text-xs text-zinc-500">
                            {alert.flightNumber && `Flight ${alert.flightNumber}`}
                            {alert.flightNumber && alert.aircraftTail && " - "}
                            {alert.aircraftTail && `Aircraft ${alert.aircraftTail}`}
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-zinc-900">{alert.title}</div>
                      <div className="text-zinc-600">{alert.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Fleet snapshot</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {dashboard.fleetSnapshot.map((bucket) => (
              <div
                className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                key={bucket.status}
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">{bucket.status}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{bucket.count}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
