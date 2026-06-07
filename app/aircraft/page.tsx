import {
  AircraftStatus,
  AlertSeverity,
  AlertType,
  FlightLegStatus,
  FlightStatus,
  SeatRole,
} from "@prisma/client";
import Link from "next/link";

import { getAircraftBoard } from "@/lib/aircraft-queries";

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

function toOptionalDateTime(value: Date | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return toDateTime(value);
}

function formatAircraftType(value: string): string {
  return value.replaceAll("_", "-");
}

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function aircraftStatusBadgeClasses(status: AircraftStatus): string {
  if (status === AircraftStatus.IN_FLIGHT) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === AircraftStatus.IN_MAINTENANCE || status === AircraftStatus.OUT_OF_SERVICE) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === AircraftStatus.RESERVED) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function flightStatusBadgeClasses(status: FlightStatus | FlightLegStatus): string {
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

function sourceBadgeClasses(readSource: "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT"): string {
  if (readSource === "FLIGHT_LEG") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function sourceLabel(readSource: "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT"): string {
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

function missingCockpitRoles(assignments: Array<{ seatRole: SeatRole }>): SeatRole[] {
  const assignedRoles = new Set(assignments.map((assignment) => assignment.seatRole));

  return [SeatRole.CPT, SeatRole.FO].filter((role) => !assignedRoles.has(role));
}

export default async function AircraftPage() {
  const { aircraft, summary } = await getAircraftBoard();
  const now = new Date();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Fleet Operations Board
          </p>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Aircraft
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Read-only aircraft status, crew blocks, and upcoming flight context.
              </p>
            </div>
            <div className="text-sm text-zinc-500">Live Prisma read at {toDateTime(now)}</div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Aircraft</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.total}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Available</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.available}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">In flight</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.inFlight}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Maintenance signals</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.maintenance}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active alerts</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.activeAlerts}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Crew gaps</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{summary.crewGaps}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">FlightLeg reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {summary.flightLegReads}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Fallback reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {summary.fallbackFlightReads}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Configured</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {summary.configuredAircraft}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">A/W released</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {summary.aircraftWithAirworthinessRelease}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Open discrepancies</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {summary.aircraftWithOpenDiscrepancies}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active deferrals</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {summary.aircraftWithActiveDeferrals}
            </p>
          </article>
        </section>

        {aircraft.length === 0 ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">No aircraft found.</p>
            <p className="mt-1">
              The read-only aircraft page is ready, but the database has no aircraft rows to
              display.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {aircraft.map((item) => {
              const currentFlight =
                item.flights.find(
                  (flight) =>
                    flight.status === FlightStatus.ENROUTE ||
                    (flight.scheduledDeparture <= now && flight.scheduledArrival >= now),
                ) ?? null;
              const nextFlight =
                item.flights.find((flight) => flight.scheduledDeparture > now) ?? null;
              const displayedFlight = currentFlight ?? nextFlight;
              const missingRoles = missingCockpitRoles(item.crewAssignments);
              const maintenanceAlerts = item.alerts.filter(
                (alert) => alert.type === AlertType.MAINTENANCE,
              );
              const currentConfiguration = item.configurations[0] ?? null;
              const latestMaintenanceEvent = item.maintenanceEvents[0] ?? null;
              const latestAirworthinessRelease = item.airworthinessReleases[0] ?? null;
              const activeCapabilityCodes = item.capabilities
                .map((capability) => capability.capabilityCode)
                .join(", ");

              return (
                <article
                  className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
                  key={item.id}
                >
                  <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-mono text-xl font-semibold tracking-tight text-zinc-950">
                          {item.tailNumber}
                        </h2>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${aircraftStatusBadgeClasses(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">
                        {item.name ?? "Unnamed aircraft"} | {formatAircraftType(item.type)}
                        {item.seats ? ` | ${item.seats} seats` : ""}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Home station{" "}
                        {item.homeStation
                          ? `${item.homeStation.code} - ${item.homeStation.city}`
                          : "not assigned"}
                      </p>
                    </div>
                    <div className="text-left text-xs text-zinc-500 sm:text-right">
                      <p>Aircraft ID</p>
                      <p className="font-mono text-zinc-700">{item.id.slice(0, 8)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Current / next flight
                      </h3>
                      {displayedFlight ? (
                        <div className="mt-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-zinc-950">
                              {displayedFlight.flightNumber}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${flightStatusBadgeClasses(
                                displayedFlight.status,
                              )}`}
                            >
                              {displayedFlight.status}
                            </span>
                          </div>
                          <span
                            className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${sourceBadgeClasses(
                              displayedFlight.readSource,
                            )}`}
                          >
                            {sourceLabel(displayedFlight.readSource)}
                          </span>
                          <p className="mt-2 font-medium text-zinc-800">
                            {displayedFlight.departureStation.code} -&gt;{" "}
                            {displayedFlight.arrivalStation.code}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {displayedFlight.departureStation.city} to{" "}
                            {displayedFlight.arrivalStation.city}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-zinc-600">
                            Out {toDateTime(displayedFlight.scheduledDeparture)}
                            <br />
                            In {toDateTime(displayedFlight.scheduledArrival)}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-zinc-600">
                          No current or upcoming flight found for this aircraft.
                        </p>
                      )}
                    </section>

                    <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Maintenance / status signals
                      </h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="text-zinc-700">
                          Aircraft status is{" "}
                          <span className="font-semibold text-zinc-950">{item.status}</span>.
                        </p>
                        {maintenanceAlerts.length === 0 ? (
                          <p className="text-zinc-600">
                            No active maintenance alerts are attached to this aircraft.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {maintenanceAlerts.map((alert) => (
                              <li
                                className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-800"
                                key={alert.id}
                              >
                                <p className="font-medium">{alert.title}</p>
                                <p className="text-xs">{alert.message}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </section>
                  </div>

                  <section className="mt-3 rounded-md border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Airworthiness summary
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            item.discrepancies.length === 0 && item.deferrals.length === 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {item.discrepancies.length === 0 && item.deferrals.length === 0
                            ? "No open A/W warnings"
                            : "A/W warnings"}
                        </span>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/airworthiness`}
                        >
                          Manage airworthiness
                        </Link>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold text-zinc-900">Configuration</p>
                        <p className="mt-1 text-zinc-700">
                          {currentConfiguration?.configurationLabel ?? "No active configuration"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Seats{" "}
                          {currentConfiguration?.passengerSeatCount ??
                            item.seats ??
                            "not set"}{" "}
                          | Empty weight{" "}
                          {currentConfiguration?.emptyWeight?.toString() ?? "not set"} | CG{" "}
                          {currentConfiguration?.emptyWeightCg ?? "not set"}
                        </p>
                      </div>
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold text-zinc-900">Release</p>
                        <p className="mt-1 text-zinc-700">
                          {latestAirworthinessRelease?.releaseNumber ??
                            "No released airworthiness record"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Released {toOptionalDateTime(latestAirworthinessRelease?.releasedAt)} |
                          Expires {toOptionalDateTime(latestAirworthinessRelease?.expiresAt)}
                        </p>
                      </div>
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold text-zinc-900">Capabilities</p>
                        <p className="mt-1 text-zinc-700">
                          {activeCapabilityCodes || "No active capability records"}
                        </p>
                      </div>
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold text-zinc-900">Last maintenance</p>
                        <p className="mt-1 text-zinc-700">
                          {latestMaintenanceEvent
                            ? `${latestMaintenanceEvent.maintenanceNumber} | ${latestMaintenanceEvent.eventType}`
                            : "No completed maintenance event"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Completed {toOptionalDateTime(latestMaintenanceEvent?.completedAt)} |
                          RTS {toOptionalDateTime(latestMaintenanceEvent?.returnToServiceAt)}
                        </p>
                      </div>
                    </div>

                    {item.discrepancies.length > 0 || item.deferrals.length > 0 ? (
                      <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-semibold">Open discrepancies</p>
                          {item.discrepancies.length === 0 ? (
                            <p className="mt-1 text-amber-800">None.</p>
                          ) : (
                            <ul className="mt-2 space-y-1">
                              {item.discrepancies.map((discrepancy) => (
                                <li key={discrepancy.id}>
                                  {discrepancy.discrepancyNumber}: {discrepancy.title} (
                                  {discrepancy.status})
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-semibold">Active deferrals</p>
                          {item.deferrals.length === 0 ? (
                            <p className="mt-1 text-amber-800">None.</p>
                          ) : (
                            <ul className="mt-2 space-y-1">
                              {item.deferrals.map((deferral) => (
                                <li key={deferral.id}>
                                  {deferral.deferralNumber}: {deferral.discrepancy.title}
                                  {deferral.dueAt ? ` due ${toDateTime(deferral.dueAt)}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="mt-3 rounded-md border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Active crew assignment block
                      </h3>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          missingRoles.length === 0
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {missingRoles.length === 0
                          ? "CPT/FO covered"
                          : `Missing ${missingRoles.map(formatRoleLabel).join(", ")}`}
                      </span>
                    </div>
                    {item.crewAssignments.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-600">
                        No active aircraft-block crew assignments.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {item.crewAssignments.map((assignment) => {
                          const crewMemberName = `${assignment.crewMember.firstName} ${assignment.crewMember.lastName}`;
                          const matchingQualification =
                            assignment.crewMember.qualifications.find(
                              (qualification) =>
                                qualification.aircraftType === item.type &&
                                qualification.seatRole === assignment.seatRole,
                            ) ?? null;
                          const isExpired =
                            Boolean(matchingQualification?.expiresAt) &&
                            matchingQualification!.expiresAt!.getTime() < now.getTime();

                          return (
                            <div
                              className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm"
                              key={assignment.id}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
                                  {formatRoleLabel(assignment.seatRole)}
                                </span>
                                <span className="font-semibold text-zinc-950">
                                  {crewMemberName}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                {assignment.crewMember.employeeNumber} |{" "}
                                {assignment.crewMember.dutyStatus} |{" "}
                                {assignment.crewMember.employmentStatus}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-zinc-600">
                                Starts {toDateTime(assignment.startsAt)}
                                <br />
                                Ends{" "}
                                {assignment.endsAt ? toDateTime(assignment.endsAt) : "open block"}
                              </p>
                              {!matchingQualification ? (
                                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                  No matching qualification found for this aircraft type and seat.
                                </p>
                              ) : isExpired ? (
                                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                  Qualification expired{" "}
                                  {matchingQualification.expiresAt
                                    ? toDateTime(matchingQualification.expiresAt)
                                    : ""}.
                                </p>
                              ) : (
                                <p className="mt-2 text-xs text-emerald-700">
                                  Matching qualification on file.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="mt-3 rounded-md border border-zinc-200 p-3">
                    <h3 className="text-sm font-semibold text-zinc-900">Active alerts</h3>
                    {item.alerts.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-600">
                        No active alerts attached to this aircraft.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {item.alerts.map((alert) => (
                          <li className="rounded-md border border-zinc-200 p-2.5 text-sm" key={alert.id}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${severityBadgeClasses(
                                  alert.severity,
                                )}`}
                              >
                                {alert.severity}
                              </span>
                              <span className="font-medium text-zinc-800">{alert.type}</span>
                              {alert.flight?.flightNumber && (
                                <span className="ml-auto text-xs text-zinc-500">
                                  Flight {alert.flight.flightNumber}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-medium text-zinc-950">{alert.title}</p>
                            <p className="text-zinc-600">{alert.message}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
