import {
  AlertSeverity,
  AlertStatus,
  AircraftStatus,
  FlightStatus,
  SeatRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";

type DashboardFlight = {
  id: string;
  flightNumber: string;
  scheduledDeparture: Date;
  status: FlightStatus;
  departureCode: string;
  arrivalCode: string;
  tailNumber: string;
  coverage: FlightCoverage | null;
};

type AlertRow = {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  flightNumber: string | null;
  aircraftTail: string | null;
};

export const dynamic = "force-dynamic";

function getTodayRange(now: Date) {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return { start, end };
}

function toTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function toDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function statusBadgeClasses(status: FlightStatus): string {
  if (status === FlightStatus.ENROUTE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === FlightStatus.DELAYED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === FlightStatus.CANCELLED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
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

function buildFleetSnapshot(statusCounts: Array<{ status: AircraftStatus; count: number }>) {
  const order = [
    AircraftStatus.AVAILABLE,
    AircraftStatus.IN_FLIGHT,
    AircraftStatus.RESERVED,
    AircraftStatus.IN_MAINTENANCE,
    AircraftStatus.OUT_OF_SERVICE,
  ];

  const map = Object.fromEntries(
    Object.values(AircraftStatus).map((status) => [status, 0]),
  ) as Record<AircraftStatus, number>;

  for (const item of statusCounts) {
    map[item.status] = item.count;
  }

  return order.map((status) => ({ status, count: map[status] ?? 0 }));
}

async function getDashboardData() {
  const now = new Date();
  const { start, end } = getTodayRange(now);

  const [aircraftCount, crewCount, todayFlights, alerts, fleetStatusGroups] =
    await Promise.all([
      prisma.aircraft.count(),
      prisma.crewMember.count(),
      prisma.flight.findMany({
        where: {
          scheduledDeparture: {
            gte: start,
            lt: end,
          },
        },
        select: {
          id: true,
          flightNumber: true,
          scheduledDeparture: true,
          status: true,
          departureStation: {
            select: { code: true },
          },
          arrivalStation: {
            select: { code: true },
          },
          aircraft: {
            select: { tailNumber: true },
          },
        },
        orderBy: { scheduledDeparture: "asc" },
      }),
      prisma.alert.findMany({
        where: {
          status: AlertStatus.ACTIVE,
        },
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          message: true,
          flight: {
            select: {
              flightNumber: true,
            },
          },
          aircraft: {
            select: {
              tailNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.aircraft.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

  const aircraftWithCoverage: DashboardFlight[] = await Promise.all(
    todayFlights.map(async (flight) => {
      const coverage = await resolveFlightCoverage(flight.id);

      return {
        id: flight.id,
        flightNumber: flight.flightNumber,
        scheduledDeparture: flight.scheduledDeparture,
        status: flight.status,
        departureCode: flight.departureStation.code,
        arrivalCode: flight.arrivalStation.code,
        tailNumber: flight.aircraft.tailNumber,
        coverage,
      };
    }),
  );

  const statusSummary = {
    totalFlights: aircraftWithCoverage.length,
    enroute: aircraftWithCoverage.filter((flight) => flight.status === FlightStatus.ENROUTE).length,
    delayed: aircraftWithCoverage.filter((flight) => flight.status === FlightStatus.DELAYED).length,
    activeAlerts: alerts.length,
    aircraftCount,
    crewCount,
  };

  const alertsWithContext: AlertRow[] = alerts.map((alert) => ({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    flightNumber: alert.flight?.flightNumber ?? null,
    aircraftTail: alert.aircraft?.tailNumber ?? null,
  }));

  const coverageGaps = aircraftWithCoverage
    .map((flight) => {
      if (!flight.coverage) {
        return null;
      }

      if (flight.coverage.isCovered) {
        return null;
      }

      return {
        ...flight,
        missingRoles: flight.coverage.missingRoles,
      };
    })
    .filter((item): item is DashboardFlight & { missingRoles: SeatRole[] } => Boolean(item));

  const fleetSnapshot = buildFleetSnapshot(
    fleetStatusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    })),
  );

  return {
    dateLabel: toDateLabel(now),
    statusSummary,
    flights: aircraftWithCoverage,
    coverageGaps,
    alerts: alertsWithContext,
    fleetSnapshot,
  };
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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
                            {flight.flightNumber}
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
