import {
  AirworthinessReleaseStatus,
  AircraftStatus,
  AlertSeverity,
  AlertType,
  DiscrepancyStatus,
  FlightLegStatus,
  FlightStatus,
  SeatRole,
} from "@prisma/client";
import Link from "next/link";

import { ContextDrawer } from "@/components/context-drawer";
import { getAircraftBoard } from "@/lib/aircraft-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    filter?: string | string[];
    panel?: string | string[];
    selected?: string | string[];
  }>;
};

type AircraftBoardRow = Awaited<ReturnType<typeof getAircraftBoard>>["aircraft"][number];
type AircraftFilter = "all" | "aog" | "available" | "in-flight" | "open-mels" | "open-writeups";

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseAircraftFilter(value: string | string[] | undefined): AircraftFilter {
  const firstValue = firstParam(value);

  if (
    firstValue === "aog" ||
    firstValue === "available" ||
    firstValue === "in-flight" ||
    firstValue === "open-mels" ||
    firstValue === "open-writeups"
  ) {
    return firstValue;
  }

  return "all";
}

function aircraftHref(
  options: {
    filter?: AircraftFilter | null;
    panel?: "aircraft" | null;
    selected?: string | null;
  } = {},
) {
  const params = new URLSearchParams();

  if (options.filter && options.filter !== "all") {
    params.set("filter", options.filter);
  }

  if (options.panel) {
    params.set("panel", options.panel);
  }

  if (options.selected) {
    params.set("selected", options.selected);
  }

  const query = params.toString();
  return query ? `/aircraft?${query}` : "/aircraft";
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

function toOptionalDateTime(value: Date | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return toDateTime(value);
}

function isCurrentAirworthinessRelease(
  release: {
    status: AirworthinessReleaseStatus;
    expiresAt: Date | null;
  } | null,
): boolean {
  return (
    !!release &&
    release.status === AirworthinessReleaseStatus.RELEASED &&
    (!release.expiresAt || release.expiresAt > new Date())
  );
}

function airworthinessReleaseStatusLabel(
  latestRelease: {
    releaseNumber: string;
    status: AirworthinessReleaseStatus;
    expiresAt: Date | null;
  } | null,
  currentRelease: {
    releaseNumber: string;
    status: AirworthinessReleaseStatus;
    expiresAt: Date | null;
  } | null,
): string {
  if (currentRelease && isCurrentAirworthinessRelease(currentRelease)) {
    return `Current: ${currentRelease.releaseNumber}`;
  }

  if (currentRelease?.expiresAt && currentRelease.expiresAt <= new Date()) {
    return `Expired: ${currentRelease.releaseNumber}`;
  }

  if (latestRelease) {
    return `Latest ${latestRelease.status}: ${latestRelease.releaseNumber}`;
  }

  return "No airworthiness release history";
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

function aircraftStatusLabel(status: AircraftStatus): string {
  if (status === AircraftStatus.OUT_OF_SERVICE) {
    return "AOG";
  }

  return status.replaceAll("_", " ");
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

function hasOpenMel(item: AircraftBoardRow): boolean {
  return item.deferrals.length > 0;
}

function openWriteUps(item: AircraftBoardRow) {
  return item.discrepancies.filter((discrepancy) => discrepancy.status === DiscrepancyStatus.OPEN);
}

function hasOpenWriteUp(item: AircraftBoardRow): boolean {
  return openWriteUps(item).length > 0;
}

function aircraftMatchesFilter(item: AircraftBoardRow, filter: AircraftFilter): boolean {
  if (filter === "available") {
    return item.status === AircraftStatus.AVAILABLE;
  }
  if (filter === "in-flight") {
    return item.status === AircraftStatus.IN_FLIGHT;
  }
  if (filter === "aog") {
    return item.status === AircraftStatus.OUT_OF_SERVICE;
  }
  if (filter === "open-mels") {
    return hasOpenMel(item);
  }
  if (filter === "open-writeups") {
    return hasOpenWriteUp(item);
  }

  return true;
}

function SummaryTile({
  active,
  href,
  label,
  tone,
  value,
}: {
  active: boolean;
  href: string;
  label: string;
  tone: "amber" | "blue" | "emerald" | "rose" | "zinc";
  value: number;
}) {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-300",
    blue: "border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300",
    rose: "border-rose-200 bg-rose-50 text-rose-950 hover:border-rose-300",
    zinc: "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300",
  }[tone];

  return (
    <Link
      className={`rounded-xl border px-3 py-2 transition ${toneClasses} ${
        active ? "ring-2 ring-zinc-950/15" : ""
      }`}
      href={href}
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </Link>
  );
}

function AircraftDrawer({
  aircraft,
  selectedFilter,
  selectedId,
}: {
  aircraft: AircraftBoardRow[];
  selectedFilter: AircraftFilter;
  selectedId: string | null;
}) {
  if (!selectedId) {
    return null;
  }

  const item = aircraft.find((aircraftRow) => aircraftRow.id === selectedId);
  const closeHref = aircraftHref({ filter: selectedFilter });

  if (!item) {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Aircraft quick review" title="Aircraft">
        <p className="text-sm text-zinc-600">No aircraft found for this selection.</p>
      </ContextDrawer>
    );
  }

  const now = new Date();
  const currentFlight =
    item.flights.find(
      (flight) =>
        flight.status === FlightStatus.ENROUTE ||
        (flight.scheduledDeparture <= now && flight.scheduledArrival >= now),
    ) ?? null;
  const nextFlight = item.flights.find((flight) => flight.scheduledDeparture > now) ?? null;
  const displayedFlight = currentFlight ?? nextFlight;
  const currentAirworthinessRelease =
    item.airworthinessReleases.find(
      (release) => release.status === AirworthinessReleaseStatus.RELEASED,
    ) ?? null;
  const latestAirworthinessRelease = item.airworthinessReleases[0] ?? null;
  const currentAirworthinessReleaseUsable = isCurrentAirworthinessRelease(
    currentAirworthinessRelease,
  );

  return (
    <ContextDrawer
      closeHref={closeHref}
      eyebrow="Aircraft quick review"
      title={`${item.tailNumber} | ${formatAircraftType(item.type)}`}
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${aircraftStatusBadgeClasses(item.status)}`}>
              {aircraftStatusLabel(item.status)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                currentAirworthinessReleaseUsable
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              MX {currentAirworthinessReleaseUsable ? "Current" : "Review"}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Home station {item.homeStation ? `${item.homeStation.code} - ${item.homeStation.city}` : "not assigned"}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {airworthinessReleaseStatusLabel(latestAirworthinessRelease, currentAirworthinessRelease)}
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Current / next leg
          </h3>
          {displayedFlight ? (
            <div className="mt-2 text-sm">
              <p className="font-semibold text-zinc-950">
                {displayedFlight.flightNumber} | {displayedFlight.departureStation.code} -&gt;{" "}
                {displayedFlight.arrivalStation.code}
              </p>
              <p className="mt-1 text-zinc-600">
                Out {toDateTime(displayedFlight.scheduledDeparture)} | In{" "}
                {toDateTime(displayedFlight.scheduledArrival)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No current or upcoming leg in view.</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Crew block
          </h3>
          {item.crewAssignments.length ? (
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              {item.crewAssignments.map((assignment) => (
                <li key={assignment.id}>
                  {formatRoleLabel(assignment.seatRole)} {assignment.crewMember.firstName}{" "}
                  {assignment.crewMember.lastName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No active aircraft crew block.</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Maintenance state
          </h3>
          <p className="mt-2 text-sm text-zinc-700">
            {openWriteUps(item).length} open write-up
            {openWriteUps(item).length === 1 ? "" : "s"} | {item.deferrals.length} open MEL
            {item.deferrals.length === 1 ? "" : "s"}
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white" href={`/aircraft/${item.id}`}>
            Aircraft context
          </Link>
          <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/aircraft/${item.id}/crew`}>
            Manage crew
          </Link>
          <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/aircraft/${item.id}/fuel`}>
            Fuel ledger
          </Link>
          <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/aircraft/${item.id}/airworthiness`}>
            MX release
          </Link>
        </div>
      </div>
    </ContextDrawer>
  );
}

export default async function AircraftPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { aircraft, summary } = await getAircraftBoard();
  const now = new Date();
  const selectedFilter = parseAircraftFilter(params.filter);
  const selectedId = firstParam(params.panel) === "aircraft" ? firstParam(params.selected) : null;
  const visibleAircraft = aircraft.filter((item) => aircraftMatchesFilter(item, selectedFilter));

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Fleet Operations Board
          </p>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Aircraft
              </h1>
              <p className="mt-1 text-xs text-zinc-600">
                Fleet status, AOG aircraft, open MELs, and open write-ups.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling?groupBy=assignment"
              >
                Crew planner
              </Link>
              <span className="text-sm text-zinc-500">Live Prisma read at {toDateTime(now)}</span>
            </div>
          </div>
        </header>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <SummaryTile
            active={selectedFilter === "all"}
            href={aircraftHref({ filter: "all" })}
            label="Aircraft"
            tone="zinc"
            value={summary.total}
          />
          <SummaryTile
            active={selectedFilter === "available"}
            href={aircraftHref({ filter: "available" })}
            label="Available"
            tone={summary.available > 0 ? "emerald" : "zinc"}
            value={summary.available}
          />
          <SummaryTile
            active={selectedFilter === "in-flight"}
            href={aircraftHref({ filter: "in-flight" })}
            label="In flight"
            tone={summary.inFlight > 0 ? "blue" : "zinc"}
            value={summary.inFlight}
          />
          <SummaryTile
            active={selectedFilter === "aog"}
            href={aircraftHref({ filter: "aog" })}
            label="AOG"
            tone={summary.aog > 0 ? "rose" : "zinc"}
            value={summary.aog}
          />
          <SummaryTile
            active={selectedFilter === "open-mels"}
            href={aircraftHref({ filter: "open-mels" })}
            label="Open MELs"
            tone={summary.aircraftWithOpenMels > 0 ? "amber" : "zinc"}
            value={summary.aircraftWithOpenMels}
          />
          <SummaryTile
            active={selectedFilter === "open-writeups"}
            href={aircraftHref({ filter: "open-writeups" })}
            label="Open write-ups"
            tone={summary.aircraftWithOpenWriteUps > 0 ? "amber" : "zinc"}
            value={summary.aircraftWithOpenWriteUps}
          />
        </section>

        {visibleAircraft.length === 0 ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">No aircraft found for this view.</p>
            <p className="mt-1">
              Select a different summary tile to broaden the aircraft board.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {visibleAircraft.map((item) => {
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
              const maintenanceAlerts = item.alerts.filter((alert) => alert.type === AlertType.MAINTENANCE);
              const openWriteUpItems = openWriteUps(item);
              const currentConfiguration = item.configurations[0] ?? null;
              const latestMaintenanceEvent = item.maintenanceEvents[0] ?? null;
              const latestAirworthinessRelease = item.airworthinessReleases[0] ?? null;
              const currentAirworthinessRelease =
                item.airworthinessReleases.find(
                  (release) => release.status === AirworthinessReleaseStatus.RELEASED,
                ) ?? null;
              const currentAirworthinessReleaseUsable = isCurrentAirworthinessRelease(
                currentAirworthinessRelease,
              );
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
                        <Link
                          className="font-mono text-xl font-semibold tracking-tight text-sky-700 hover:text-sky-900"
                          href={aircraftHref({
                            filter: selectedFilter,
                            panel: "aircraft",
                            selected: item.id,
                          })}
                        >
                          {item.tailNumber}
                        </Link>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${aircraftStatusBadgeClasses(
                            item.status,
                          )}`}
                        >
                          {aircraftStatusLabel(item.status)}
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
                      <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
                        <Link
                          className="rounded-md bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
                          href={`/aircraft/${item.id}`}
                        >
                          Aircraft context
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/crew`}
                        >
                          Manage crew
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/fuel`}
                        >
                          Fuel ledger
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/crew/scheduling?aircraft=${item.id}&assignment=assigned`}
                        >
                          Crew planner
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/airworthiness`}
                        >
                          Airworthiness
                        </Link>
                      </div>
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
                        Aircraft status
                      </h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="text-zinc-700">
                          Aircraft status is{" "}
                          <span className="font-semibold text-zinc-950">
                            {aircraftStatusLabel(item.status)}
                          </span>.
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
                            openWriteUpItems.length === 0 &&
                            item.deferrals.length === 0 &&
                            currentAirworthinessReleaseUsable
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {openWriteUpItems.length === 0 &&
                          item.deferrals.length === 0 &&
                          currentAirworthinessReleaseUsable
                            ? "A/W current"
                            : "A/W warnings"}
                        </span>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/airworthiness`}
                        >
                          Manage airworthiness
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/crew`}
                        >
                          Manage crew
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/fuel`}
                        >
                          Fuel ledger
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/crew/scheduling?aircraft=${item.id}&assignment=assigned`}
                        >
                          Crew planner
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
                          {airworthinessReleaseStatusLabel(
                            latestAirworthinessRelease,
                            currentAirworthinessRelease,
                          )}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Released {toOptionalDateTime(currentAirworthinessRelease?.releasedAt)} |
                          Expires {toOptionalDateTime(currentAirworthinessRelease?.expiresAt)}
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

                    {openWriteUpItems.length > 0 || item.deferrals.length > 0 ? (
                      <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-semibold">Open write-ups</p>
                          {openWriteUpItems.length === 0 ? (
                            <p className="mt-1 text-amber-800">None.</p>
                          ) : (
                            <ul className="mt-2 space-y-1">
                              {openWriteUpItems.map((discrepancy) => (
                                <li key={discrepancy.id}>
                                  {discrepancy.discrepancyNumber}: {discrepancy.title} (
                                  {discrepancy.status})
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-semibold">Open MELs</p>
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
        <AircraftDrawer
          aircraft={aircraft}
          selectedFilter={selectedFilter}
          selectedId={selectedId}
        />
      </div>
    </main>
  );
}
