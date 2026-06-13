import {
  AlertSeverity,
  FlightLegStatus,
  FlightStatus,
  ReleaseStatus,
  SeatRole,
} from "@prisma/client";
import Link from "next/link";

import { ContextDrawer } from "@/components/context-drawer";
import {
  getSchedulingData,
  SCHEDULE_WINDOW_DAYS,
  ScheduleFlight,
} from "@/lib/scheduling-queries";
import { FlightCoverage } from "@/lib/crew-resolution";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    panel?: string | string[];
    selected?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function schedulingHref(options: { panel?: "flight" | null; selected?: string | null } = {}) {
  const params = new URLSearchParams();

  if (options.panel) {
    params.set("panel", options.panel);
  }

  if (options.selected) {
    params.set("selected", options.selected);
  }

  const query = params.toString();
  return query ? `/scheduling?${query}` : "/scheduling";
}

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

function formatOperatingPart(value: string): string {
  return value.replace("PART_", "Part ");
}

function statusBadgeClasses(status: FlightStatus | FlightLegStatus): string {
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

function sourceBadgeClasses(readSource: ScheduleFlight["readSource"]): string {
  if (readSource === "FLIGHT_LEG") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function sourceLabel(readSource: ScheduleFlight["readSource"]): string {
  if (readSource === "FLIGHT_LEG") {
    return "FlightLeg read";
  }

  return "Fallback Flight read";
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

function alertBadgeClasses(severity: AlertSeverity): string {
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

function releaseStatus(flight: ScheduleFlight): ReleaseStatus | null {
  return flight.operationalControlRecord?.release?.status ?? null;
}

function releaseLabel(flight: ScheduleFlight): string {
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

function controlLabel(flight: ScheduleFlight): string {
  const control = flight.operationalControlRecord;

  if (!control) {
    return "No control record";
  }

  return `${control.controllingEntity} | ${formatOperatingPart(
    control.operatingAuthority.operatingPart,
  )} | ${control.authorityRevision.revisionLabel}`;
}

function SchedulingDrawer({
  flights,
  selectedId,
}: {
  flights: ScheduleFlight[];
  selectedId: string | null;
}) {
  if (!selectedId) {
    return null;
  }

  const closeHref = schedulingHref();
  const flight = flights.find(
    (item) => item.flightLegId === selectedId || item.legacyFlightId === selectedId || item.id === selectedId,
  );

  if (!flight) {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Schedule quick review" title="FlightLeg">
        <p className="text-sm text-zinc-600">No scheduled leg found for this selection.</p>
      </ContextDrawer>
    );
  }

  const release = releaseStatus(flight);

  return (
    <ContextDrawer
      closeHref={closeHref}
      eyebrow="Schedule quick review"
      title={`${flight.flightNumber} | ${flight.departureStation.code} -> ${flight.arrivalStation.code}`}
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold text-zinc-950">
            {flight.aircraft.tailNumber} | {formatAircraftType(flight.aircraft.type)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Out {toDateTime(flight.scheduledDeparture)} | In {toDateTime(flight.scheduledArrival)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(flight.status)}`}>
              {flight.status}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${releaseBadgeClasses(release)}`}>
              {releaseLabel(flight)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${coverageBadgeClasses(flight.coverage)}`}>
              {coverageLabel(flight.coverage)}
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Crew</h3>
          <p className="mt-2 text-sm text-zinc-700">{crewLine(flight.coverage)}</p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Control / Release
          </h3>
          <p className="mt-2 text-sm text-zinc-700">{controlLabel(flight)}</p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Alerts
          </h3>
          {flight.alerts.length ? (
            <ul className="mt-2 space-y-2">
              {flight.alerts.map((alert) => (
                <li className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900" key={alert.id}>
                  <span className="font-semibold">{alert.severity}</span> {alert.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No active alerts.</p>
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          {flight.flightLegId ? (
            <>
              <Link className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white" href={`/operations-control/${flight.flightLegId}`}>
                Release workspace
              </Link>
              <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/operations-control/${flight.flightLegId}/edit`}>
                Edit FlightLeg
              </Link>
            </>
          ) : null}
          <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/aircraft/${flight.aircraft.id}`}>
            Aircraft context
          </Link>
        </div>
      </div>
    </ContextDrawer>
  );
}

export default async function SchedulingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const schedule = await getSchedulingData();
  const selectedId = firstParam(params.panel) === "flight" ? firstParam(params.selected) : null;
  const allFlights = schedule.groups.flatMap((group) => group.flights);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Scheduling
          </p>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Upcoming Leg Schedule
              </h1>
              <p className="mt-1 max-w-3xl text-xs text-zinc-600">
                Read-only schedule view for upcoming flight legs, aircraft, crew
                coverage, release status, and active operational alerts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling"
              >
                Crew scheduling
              </Link>
              <span className="text-sm text-zinc-500">{schedule.windowLabel}</span>
            </div>
          </div>
        </header>

        <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Legs</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{schedule.summary.total}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Delayed</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {schedule.summary.delayed}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Crew gaps</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {schedule.summary.coverageGaps}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Released</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {schedule.summary.released}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Alerts</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {schedule.summary.activeAlerts}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">FlightLeg</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {schedule.summary.flightLegReads}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Fallback</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {schedule.summary.fallbackFlightReads}
            </p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          {schedule.groups.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">No upcoming legs found.</p>
              <p className="mt-1">
                The read-only scheduling board is ready, but there are no flight
                rows in the next {SCHEDULE_WINDOW_DAYS} days.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {schedule.groups.map((group) => (
                <div key={group.key}>
                  <div className="flex flex-col gap-1 border-b border-zinc-200 pb-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{group.label}</h2>
                      <p className="text-sm text-zinc-600">
                        {group.flights.length} leg{group.flights.length === 1 ? "" : "s"} scheduled
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                          <th className="px-3 py-2 font-semibold">Time</th>
                          <th className="px-3 py-2 font-semibold">Flight</th>
                          <th className="px-3 py-2 font-semibold">Route</th>
                          <th className="px-3 py-2 font-semibold">Aircraft</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                          <th className="px-3 py-2 font-semibold">Crew Coverage</th>
                          <th className="px-3 py-2 font-semibold">Control / Release</th>
                          <th className="px-3 py-2 font-semibold">Active Alerts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.flights.map((flight) => {
                          const release = releaseStatus(flight);

                          return (
                            <tr className="border-b border-zinc-100 align-top" key={flight.id}>
                              <td className="whitespace-nowrap px-3 py-3 text-zinc-700">
                                <div>Out {toTime(flight.scheduledDeparture)}</div>
                                <div className="text-xs text-zinc-500">
                                  In {toTime(flight.scheduledArrival)}
                                </div>
                                {(flight.actualDeparture || flight.actualArrival) && (
                                  <div className="mt-1 text-xs text-zinc-500">
                                    Actual {toTime(flight.actualDeparture)} /{" "}
                                    {toTime(flight.actualArrival)}
                                  </div>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3">
                                <Link
                                  className="font-semibold text-sky-700 hover:text-sky-900"
                                  href={schedulingHref({
                                    panel: "flight",
                                    selected: flight.flightLegId ?? flight.legacyFlightId,
                                  })}
                                >
                                  {flight.flightNumber}
                                </Link>
                                <div className="text-xs text-zinc-500">{toDateTime(flight.scheduledDeparture)}</div>
                                <span
                                  className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${sourceBadgeClasses(
                                    flight.readSource,
                                  )}`}
                                >
                                  {sourceLabel(flight.readSource)}
                                </span>
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
                                <div className="font-mono text-zinc-900">
                                  {flight.aircraft.tailNumber}
                                </div>
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
                              <td className="min-w-56 px-3 py-3">
                                {flight.alerts.length === 0 ? (
                                  <span className="text-xs text-zinc-500">No active alerts</span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {flight.alerts.map((alert) => (
                                      <div key={alert.id} className="flex flex-wrap items-center gap-1.5">
                                        <span
                                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${alertBadgeClasses(
                                            alert.severity,
                                          )}`}
                                        >
                                          {alert.severity}
                                        </span>
                                        <span className="text-xs font-medium text-zinc-700">
                                          {alert.title}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <SchedulingDrawer flights={allFlights} selectedId={selectedId} />
      </div>
    </main>
  );
}
