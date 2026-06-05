import { FlightStatus, ReleaseStatus, SeatRole } from "@prisma/client";

import { FlightCoverage } from "@/lib/crew-resolution";
import { FlightListItem, getFlightList } from "@/lib/flight-queries";

export const dynamic = "force-dynamic";

function toDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function toTime(value: Date | null): string {
  if (!value) {
    return "Not posted";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function formatAircraftType(value: string): string {
  return value.replaceAll("_", "-");
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
  if (status === FlightStatus.COMPLETE) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function coverageBadgeClasses(coverage: FlightCoverage | null): string {
  if (!coverage) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  if (coverage.isCovered && coverage.warnings.length === 0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (coverage.isCovered) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function releaseBadgeClasses(status: ReleaseStatus | null): string {
  if (status === ReleaseStatus.RELEASED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === ReleaseStatus.CANCELLED || status === ReleaseStatus.VOIDED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === ReleaseStatus.PLANNED) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function coverageLabel(coverage: FlightCoverage | null): string {
  if (!coverage) {
    return "No coverage data";
  }

  if (!coverage.isCovered) {
    return `Missing ${coverage.missingRoles.map(formatRoleLabel).join(", ")}`;
  }

  if (coverage.warnings.length > 0) {
    return `${coverage.warnings.length} qual warning${coverage.warnings.length === 1 ? "" : "s"}`;
  }

  return "Covered";
}

function crewLine(coverage: FlightCoverage | null): string {
  if (!coverage || coverage.assignedCrew.length === 0) {
    return "No active crew assignments";
  }

  return coverage.assignedCrew
    .map((assignment) => `${formatRoleLabel(assignment.seatRole)} ${assignment.crewMemberName}`)
    .join(" | ");
}

function releaseStatus(flight: FlightListItem): ReleaseStatus | null {
  return flight.operationalControlRecord?.release?.status ?? null;
}

function controlLabel(flight: FlightListItem): string {
  const control = flight.operationalControlRecord;

  if (!control) {
    return "No control record";
  }

  return `${control.controllingEntity} | ${control.operatingAuthority.operatingPart} | ${control.authorityRevision.revisionLabel}`;
}

function releaseLabel(flight: FlightListItem): string {
  const release = flight.operationalControlRecord?.release;

  if (!flight.operationalControlRecord) {
    return "Control not assigned";
  }

  if (!release) {
    return "No release";
  }

  if (release.releasedAt) {
    return `${release.status} ${toTime(release.releasedAt)}`;
  }

  return release.status;
}

function getSummary(flights: FlightListItem[]) {
  return {
    total: flights.length,
    scheduled: flights.filter((flight) => flight.status === FlightStatus.SCHEDULED).length,
    enroute: flights.filter((flight) => flight.status === FlightStatus.ENROUTE).length,
    delayed: flights.filter((flight) => flight.status === FlightStatus.DELAYED).length,
    coverageGaps: flights.filter((flight) => flight.coverage && !flight.coverage.isCovered).length,
    released: flights.filter((flight) => releaseStatus(flight) === ReleaseStatus.RELEASED).length,
  };
}

export default async function FlightsPage() {
  const flights = await getFlightList();
  const summary = getSummary(flights);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Operations Flight Board
          </p>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Flights
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Read-only operational list ordered by scheduled departure.
              </p>
            </div>
            <div className="text-sm text-zinc-500">Showing latest 80 scheduled rows</div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Flights</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.total}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Scheduled</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.scheduled}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Enroute</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.enroute}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Delayed</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.delayed}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Coverage gaps</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.coverageGaps}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Released</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.released}</p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          {flights.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">No flights found.</p>
              <p className="mt-1">
                The read-only flight board is ready, but the database has no flight rows to display.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2 font-semibold">Flight</th>
                    <th className="px-3 py-2 font-semibold">Route</th>
                    <th className="px-3 py-2 font-semibold">Aircraft</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Schedule</th>
                    <th className="px-3 py-2 font-semibold">Crew Coverage</th>
                    <th className="px-3 py-2 font-semibold">Control / Release</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((flight) => {
                    const release = releaseStatus(flight);

                    return (
                      <tr className="border-b border-zinc-100 align-top" key={flight.id}>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="font-semibold text-zinc-950">{flight.flightNumber}</div>
                          <div className="text-xs text-zinc-500">{flight.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-zinc-900">
                            {flight.departureStation.code} -&gt; {flight.arrivalStation.code}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {flight.departureStation.city} to {flight.arrivalStation.city}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-mono text-zinc-900">{flight.aircraft.tailNumber}</div>
                          <div className="text-xs text-zinc-500">
                            {formatAircraftType(flight.aircraft.type)} | {flight.aircraft.status}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
                              flight.status,
                            )}`}
                          >
                            {flight.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-zinc-700">
                          <div>Out {toDateTime(flight.scheduledDeparture)}</div>
                          <div>In {toDateTime(flight.scheduledArrival)}</div>
                          {(flight.actualDeparture || flight.actualArrival) && (
                            <div className="mt-1 text-xs text-zinc-500">
                              Actual {toTime(flight.actualDeparture)} / {toTime(flight.actualArrival)}
                            </div>
                          )}
                        </td>
                        <td className="min-w-64 px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${coverageBadgeClasses(
                              flight.coverage,
                            )}`}
                          >
                            {coverageLabel(flight.coverage)}
                          </span>
                          <div className="mt-2 text-xs leading-5 text-zinc-600">
                            {crewLine(flight.coverage)}
                          </div>
                        </td>
                        <td className="min-w-64 px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(
                              release,
                            )}`}
                          >
                            {releaseLabel(flight)}
                          </span>
                          <div className="mt-2 text-xs leading-5 text-zinc-600">
                            {controlLabel(flight)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
