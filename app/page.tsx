import {
  AlertSeverity,
  FlightLegStatus,
  FlightStatus,
  SeatRole,
} from "@prisma/client";

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
                      <th className="px-3 py-2 font-medium">Release evidence</th>
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
