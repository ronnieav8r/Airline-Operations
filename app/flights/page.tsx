import { FlightLegStatus, FlightStatus, ReleaseStatus, SeatRole } from "@prisma/client";
import Link from "next/link";

import { createFlightLegAction } from "@/app/operations-control/actions";
import { FlightLegForm } from "@/app/operations-control/flightleg-form";
import { ContextDrawer } from "@/components/context-drawer";
import { FlightCoverage, ResolvedCrewAssignment } from "@/lib/crew-resolution";
import { FlightListItem, getFlightListData, resolveFlightListCoverage } from "@/lib/flight-queries";
import { getFlightLegFormOptions, FlightLegFormOptions } from "@/lib/flightleg-form-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    from?: string | string[];
    issue?: string | string[];
    panel?: string | string[];
    range?: string | string[];
    release?: string | string[];
    selected?: string | string[];
    status?: string | string[];
    to?: string | string[];
  }>;
};

type DateRangeFilter = "7d" | "30d" | "all" | "custom" | "today" | "tomorrow";
type FlightStatusFilter = "all" | "cancelled" | "complete" | "delayed" | "enroute" | "released" | "scheduled";
type ReleaseFilter = "all" | "released" | "unreleased";
type IssueFilter = "all" | "crew-open" | "crew-pending" | "crew-warning" | "delayed" | "release-review";
type FlightPanel = "crew" | "flight" | "new-flight" | "release";

const RANGE_OPTIONS: Array<{ label: string; value: DateRangeFilter }> = [
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "All time", value: "all" },
];

const STATUS_OPTIONS: Array<{ label: string; value: FlightStatusFilter }> = [
  { label: "All status", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Released", value: "released" },
  { label: "Enroute", value: "enroute" },
  { label: "Delayed", value: "delayed" },
  { label: "Complete", value: "complete" },
  { label: "Cancelled", value: "cancelled" },
];

const RELEASE_OPTIONS: Array<{ label: string; value: ReleaseFilter }> = [
  { label: "All release", value: "all" },
  { label: "Released", value: "released" },
  { label: "Not released", value: "unreleased" },
];

const ISSUE_OPTIONS: Array<{ label: string; value: IssueFilter }> = [
  { label: "All", value: "all" },
  { label: "Crew open", value: "crew-open" },
  { label: "Crew pending", value: "crew-pending" },
  { label: "Crew warnings", value: "crew-warning" },
  { label: "Release needs review", value: "release-review" },
  { label: "Delayed", value: "delayed" },
];

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return value && options.includes(value as T) ? (value as T) : fallback;
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDateInput(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
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

function releaseStatus(flight: FlightListItem): ReleaseStatus | null {
  return flight.operationalControlRecord?.release?.status ?? null;
}

function parseFilters(searchParams: Awaited<PageProps["searchParams"]>) {
  const range = oneOf<DateRangeFilter>(
    firstParam(searchParams.range),
    ["today", "tomorrow", "7d", "30d", "all", "custom"],
    "7d",
  );
  const status = oneOf<FlightStatusFilter>(
    firstParam(searchParams.status),
    ["all", "cancelled", "complete", "delayed", "enroute", "released", "scheduled"],
    "all",
  );
  const release = oneOf<ReleaseFilter>(
    firstParam(searchParams.release),
    ["all", "released", "unreleased"],
    "all",
  );
  const issue = oneOf<IssueFilter>(
    firstParam(searchParams.issue),
    ["all", "crew-open", "crew-pending", "crew-warning", "delayed", "release-review"],
    "all",
  );
  const panel = oneOf<FlightPanel | "none">(
    firstParam(searchParams.panel),
    ["crew", "flight", "new-flight", "release", "none"],
    "none",
  );
  const today = startOfUtcDay(new Date());
  const customStart = parseDateInput(firstParam(searchParams.from));
  const customEnd = parseDateInput(firstParam(searchParams.to));
  let start: Date | undefined = today;
  let end: Date | undefined = addDays(today, 7);

  if (range === "today") {
    start = today;
    end = addDays(today, 1);
  } else if (range === "tomorrow") {
    start = addDays(today, 1);
    end = addDays(today, 2);
  } else if (range === "30d") {
    start = today;
    end = addDays(today, 30);
  } else if (range === "all") {
    start = undefined;
    end = undefined;
  } else if (range === "custom") {
    start = customStart ?? today;
    end = customEnd ? addDays(customEnd, 1) : addDays(start, 1);
  }

  return {
    customEnd,
    customStart,
    end,
    issue,
    panel: panel === "none" ? null : panel,
    range,
    release,
    selected: firstParam(searchParams.selected),
    start,
    status,
  };
}

type Filters = ReturnType<typeof parseFilters>;

function flightsHref(filters: Filters, next: Partial<Pick<Filters, "issue" | "range" | "release" | "selected" | "status">> & {
  customEnd?: Date | null;
  customStart?: Date | null;
  panel?: FlightPanel | null;
} = {}) {
  const merged = { ...filters, ...next };
  const params = new URLSearchParams();

  if (merged.range !== "7d") {
    params.set("range", merged.range);
  }

  if (merged.range === "custom") {
    const fallbackStart = merged.start ?? startOfUtcDay(new Date());
    const fallbackEnd = merged.end ?? addDays(fallbackStart, 1);
    params.set("from", toDateInput(merged.customStart ?? fallbackStart));
    params.set("to", toDateInput(merged.customEnd ?? addDays(fallbackEnd, -1)));
  }

  if (merged.status !== "all") {
    params.set("status", merged.status);
  }

  if (merged.release !== "all") {
    params.set("release", merged.release);
  }

  if (merged.issue !== "all") {
    params.set("issue", merged.issue);
  }

  if (next.panel) {
    params.set("panel", next.panel);
  }

  if (merged.selected) {
    params.set("selected", merged.selected);
  }

  const query = params.toString();
  return query ? `/flights?${query}` : "/flights";
}

function flightStatusMatches(flight: FlightListItem, status: FlightStatusFilter) {
  if (status === "all") {
    return true;
  }
  if (status === "released") {
    return flight.status === FlightLegStatus.RELEASED;
  }
  return flight.status.toLowerCase() === status;
}

function releaseMatches(flight: FlightListItem, release: ReleaseFilter) {
  const releaseValue = releaseStatus(flight);

  if (release === "all") {
    return true;
  }
  if (release === "released") {
    return releaseValue === ReleaseStatus.RELEASED;
  }
  return releaseValue !== ReleaseStatus.RELEASED;
}

function hasCrewOpen(flight: FlightListItem) {
  return Boolean(flight.coverage && flight.coverage.missingRoles.length > 0);
}

function hasCrewPending(flight: FlightListItem) {
  return Boolean(flight.coverage && flight.coverage.pendingAssignments.length > 0);
}

function hasCrewWarning(flight: FlightListItem) {
  return Boolean(flight.coverage && flight.coverage.warnings.length > 0);
}

function hasReleaseReview(flight: FlightListItem) {
  return (
    releaseStatus(flight) !== ReleaseStatus.RELEASED ||
    !flight.coverage ||
    !flight.coverage.isCovered ||
    flight.coverage.warnings.length > 0 ||
    flight.status === FlightStatus.DELAYED
  );
}

function issueMatches(flight: FlightListItem, issue: IssueFilter) {
  if (issue === "all") {
    return true;
  }
  if (issue === "crew-open") {
    return hasCrewOpen(flight);
  }
  if (issue === "crew-pending") {
    return hasCrewPending(flight);
  }
  if (issue === "crew-warning") {
    return hasCrewWarning(flight);
  }
  if (issue === "delayed") {
    return flight.status === FlightStatus.DELAYED;
  }
  return hasReleaseReview(flight);
}

function filterFlights(flights: FlightListItem[], filters: Filters) {
  return flights.filter(
    (flight) =>
      flightStatusMatches(flight, filters.status) &&
      releaseMatches(flight, filters.release) &&
      issueMatches(flight, filters.issue),
  );
}

function filterFlightsBeforeCoverage(flights: FlightListItem[], filters: Filters) {
  return flights.filter(
    (flight) => flightStatusMatches(flight, filters.status) && releaseMatches(flight, filters.release),
  );
}

function statusBadgeClasses(status: FlightListItem["status"]): string {
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
  if (status === FlightStatus.COMPLETE) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  return "border-zinc-200 bg-white text-zinc-700";
}

function coverageBadgeClasses(coverage: FlightCoverage | null): string {
  if (!coverage) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  if (coverage.pendingAssignments.length > 0) {
    return "border-amber-200 bg-amber-50 text-amber-700";
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

  if (coverage.pendingAssignments.length > 0) {
    return `Crew pending: ${coverage.pendingAssignments
      .map((assignment) => `${formatRoleLabel(assignment.seatRole)} ${assignment.crewMemberName}`)
      .join(", ")}`;
  }

  if (!coverage.isCovered) {
    return `Crew open: ${coverage.missingRoles.map(formatRoleLabel).join(", ")}`;
  }

  if (coverage.warnings.length > 0) {
    return `Crew warning: ${coverage.warnings.length}`;
  }

  return "Crew covered";
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

function controlLabel(flight: FlightListItem): string {
  const control = flight.operationalControlRecord;

  if (!control) {
    return "No control record";
  }

  return `${control.controllingEntity} | ${control.operatingAuthority.operatingPart} | ${control.authorityRevision.revisionLabel}`;
}

function getSummary(flights: FlightListItem[]) {
  return {
    crewOpen: flights.filter(hasCrewOpen).length,
    crewPending: flights.filter(hasCrewPending).length,
    crewWarnings: flights.filter(hasCrewWarning).length,
    delayed: flights.filter((flight) => flight.status === FlightStatus.DELAYED).length,
    released: flights.filter((flight) => releaseStatus(flight) === ReleaseStatus.RELEASED).length,
    total: flights.length,
    unreleased: flights.filter((flight) => releaseStatus(flight) !== ReleaseStatus.RELEASED).length,
  };
}

function FilterLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={
        active
          ? "rounded-lg bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white"
          : "rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
      }
      href={href}
    >
      {label}
    </Link>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-950">{value}</p>
    </div>
  );
}

function CrewName({
  assignment,
  filters,
}: {
  assignment: ResolvedCrewAssignment;
  filters: Filters;
}) {
  const hasWarning = assignment.hasQualificationWarning;

  return (
    <Link
      className={
        hasWarning
          ? "rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-900"
          : "font-medium text-zinc-800 hover:text-zinc-950"
      }
      href={flightsHref(filters, {
        panel: "crew",
        selected: assignment.crewMemberId,
      })}
    >
      {formatRoleLabel(assignment.seatRole)} {assignment.crewMemberName}
    </Link>
  );
}

function FlightsDrawer({
  filters,
  flights,
  formOptions,
}: {
  filters: Filters;
  flights: FlightListItem[];
  formOptions: FlightLegFormOptions | null;
}) {
  if (!filters.panel) {
    return null;
  }

  const closeHref = flightsHref(filters, { panel: null, selected: null });

  if (filters.panel === "new-flight") {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Flights" size="expanded" title="New FlightLeg">
        {formOptions ? (
          <FlightLegForm
            action={createFlightLegAction}
            backHref={closeHref}
            cancelHref={closeHref}
            mode="create"
            options={formOptions}
            variant="drawer"
          />
        ) : (
          <p className="text-sm text-zinc-600">FlightLeg form options are not available.</p>
        )}
      </ContextDrawer>
    );
  }

  if (!filters.selected) {
    return null;
  }

  const selectedFlight = flights.find(
    (flight) => flight.flightLegId === filters.selected || flight.id === filters.selected || flight.legacyFlightId === filters.selected,
  );
  const selectedCrew = flights
    .flatMap((flight) => flight.coverage?.assignedCrew ?? [])
    .find((assignment) => assignment.crewMemberId === filters.selected);

  if (filters.panel === "crew") {
    if (!selectedCrew) {
      return (
        <ContextDrawer closeHref={closeHref} eyebrow="Flights quick review" title="Crew Member">
          <p className="text-sm text-zinc-600">No crew member found for this selection.</p>
        </ContextDrawer>
      );
    }

    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Flights quick review" title={selectedCrew.crewMemberName}>
        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-semibold text-zinc-950">
              {formatRoleLabel(selectedCrew.seatRole)} assignment
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Starts {toDateTime(selectedCrew.startsAt)}
              {selectedCrew.endsAt ? ` | Ends ${toDateTime(selectedCrew.endsAt)}` : " | Open-ended block"}
            </p>
          </section>
          <section className="rounded-xl border border-zinc-200 bg-white p-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Qualification status
            </h3>
            {selectedCrew.qualificationWarnings.length === 0 ? (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                No qualification warnings for this selected assignment.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {selectedCrew.qualificationWarnings.map((warning) => (
                  <li className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" key={warning.message}>
                    <p className="font-semibold">{warning.code.replaceAll("_", " ")}</p>
                    <p className="mt-1">{warning.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white"
              href={`/crew/${selectedCrew.crewMemberId}`}
            >
              Open crew profile
            </Link>
          </div>
        </div>
      </ContextDrawer>
    );
  }

  if (!selectedFlight) {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Flights quick review" title="Flight">
        <p className="text-sm text-zinc-600">No flight found for this selection.</p>
      </ContextDrawer>
    );
  }

  return (
    <ContextDrawer
      closeHref={closeHref}
      eyebrow="Flights quick review"
      title={`${selectedFlight.flightNumber} | ${selectedFlight.departureStation.code} -> ${selectedFlight.arrivalStation.code}`}
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold text-zinc-950">
            {selectedFlight.aircraft.tailNumber} | {formatAircraftType(selectedFlight.aircraft.type)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Out {toDateTime(selectedFlight.scheduledDeparture)} | In{" "}
            {toDateTime(selectedFlight.scheduledArrival)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(selectedFlight.status)}`}>
              {selectedFlight.status}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${releaseBadgeClasses(releaseStatus(selectedFlight))}`}>
              {releaseLabel(selectedFlight)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${coverageBadgeClasses(selectedFlight.coverage)}`}>
              {coverageLabel(selectedFlight.coverage)}
            </span>
          </div>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Crew</h3>
          {selectedFlight.coverage?.assignedCrew.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {selectedFlight.coverage.assignedCrew.map((assignment) => (
                <li className="rounded-lg border border-zinc-200 bg-zinc-50 p-2" key={assignment.assignmentId}>
                  <CrewName assignment={assignment} filters={filters} />
                  {assignment.qualificationWarnings.length > 0 ? (
                    <p className="mt-1 text-xs text-amber-800">
                      {assignment.qualificationWarnings.map((warning) => warning.message).join(" ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No active crew assignments.</p>
          )}
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Control / Release
          </h3>
          <p className="mt-2 text-sm text-zinc-700">{controlLabel(selectedFlight)}</p>
        </section>
        <div className="flex flex-wrap gap-2">
          {selectedFlight.flightLegId ? (
            <>
              <Link
                className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white"
                href={`/operations-control/${selectedFlight.flightLegId}`}
              >
                Open release workspace
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
                href={`/operations-control/${selectedFlight.flightLegId}/edit`}
              >
                Edit FlightLeg
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </ContextDrawer>
  );
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const { flights: rawFlights, readSummary } = await getFlightListData({
    end: filters.end,
    includeCoverage: false,
    start: filters.start,
    take: filters.range === "all" ? 1000 : 220,
  });
  const candidateFlights = filterFlightsBeforeCoverage(rawFlights, filters);
  const flightsWithCoverage = await resolveFlightListCoverage(candidateFlights);
  const flights = filterFlights(flightsWithCoverage, filters);
  const formOptions =
    filters.panel === "new-flight" ? await getFlightLegFormOptions() : null;
  const summary = getSummary(flights);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[minmax(14rem,0.8fr)_minmax(28rem,1.5fr)_auto] xl:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Operations Flight Board
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Flights</h1>
              <p className="mt-1 text-xs text-zinc-600">
                Drill-down flight list for schedules, release state, aircraft, and crew coverage.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              <SummaryChip label="Flights" value={summary.total} />
              <SummaryChip label="Released" value={summary.released} />
              <SummaryChip label="Needs release" value={summary.unreleased} />
              <SummaryChip label="Crew open" value={summary.crewOpen} />
              <SummaryChip label="Crew pending" value={summary.crewPending} />
              <SummaryChip label="Crew warnings" value={summary.crewWarnings} />
              <SummaryChip label="Delayed" value={summary.delayed} />
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Link
                className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                href={flightsHref(filters, { panel: "new-flight", selected: null })}
              >
                New FlightLeg
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
                href="/operations-control"
              >
                Operations Control
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-fit">
              <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                Range
              </p>
              <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                {RANGE_OPTIONS.map((option) => (
                  <FilterLink
                    active={filters.range === option.value}
                    href={flightsHref(filters, { range: option.value })}
                    key={option.value}
                    label={option.label}
                  />
                ))}
              </div>
            </div>
            <form action="/flights" className="flex flex-wrap items-end gap-2">
                <input name="range" type="hidden" value="custom" />
                <label className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                  From
                  <input
                    className="mt-1 block w-32 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900"
                    defaultValue={toDateInput(filters.customStart ?? filters.start ?? startOfUtcDay(new Date()))}
                    name="from"
                    type="date"
                  />
                </label>
                <label className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                  To
                  <input
                    className="mt-1 block w-32 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900"
                    defaultValue={toDateInput(
                      filters.customEnd ??
                        (filters.end ? addDays(filters.end, -1) : startOfUtcDay(new Date())),
                    )}
                    name="to"
                    type="date"
                  />
                </label>
                <button
                  className="rounded-md bg-zinc-950 px-3 py-2 text-xs font-semibold text-white"
                  type="submit"
                >
                  Apply dates
                </button>
              </form>

              <div className="min-w-fit">
                <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Status</p>
                <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                  {STATUS_OPTIONS.map((option) => (
                    <FilterLink
                      active={filters.status === option.value}
                      href={flightsHref(filters, { status: option.value })}
                      key={option.value}
                      label={option.label}
                    />
                  ))}
                </div>
              </div>
              <div className="min-w-fit">
                <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Release</p>
                <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                  {RELEASE_OPTIONS.map((option) => (
                    <FilterLink
                      active={filters.release === option.value}
                      href={flightsHref(filters, { release: option.value })}
                      key={option.value}
                      label={option.label}
                    />
                  ))}
                </div>
              </div>
              <div className="min-w-fit">
                <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Attention</p>
                <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                  {ISSUE_OPTIONS.map((option) => (
                    <FilterLink
                      active={filters.issue === option.value}
                      href={flightsHref(filters, { issue: option.value })}
                      key={option.value}
                      label={option.label}
                    />
                  ))}
                </div>
              </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          {flights.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">No flights match the selected filters.</p>
              <p className="mt-1">Change the date range or clear filters to broaden the view.</p>
            </div>
          ) : (
            <div className="max-h-[42rem] space-y-2 overflow-y-auto pr-1">
              {flights.map((flight) => {
                const release = releaseStatus(flight);

                return (
                  <article
                    className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm lg:grid-cols-[minmax(10rem,0.8fr)_minmax(18rem,1.4fr)_minmax(15rem,1fr)_minmax(14rem,1fr)]"
                    key={`${flight.readSource}-${flight.flightLegId ?? flight.legacyFlightId}`}
                  >
                    <div>
                      <Link
                        className="text-base font-semibold text-sky-700 hover:text-sky-900"
                        href={flightsHref(filters, {
                          panel: "flight",
                          selected: flight.flightLegId ?? flight.legacyFlightId,
                        })}
                      >
                        {flight.flightNumber}
                      </Link>
                      <p className="mt-1 text-xs text-zinc-500">
                        {flight.departureStation.code} -&gt; {flight.arrivalStation.code}
                      </p>
                      <p className="mt-1 font-mono text-xs text-zinc-600">
                        {flight.aircraft.tailNumber} | {formatAircraftType(flight.aircraft.type)}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(flight.status)}`}>
                          {flight.status}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(release)}`}>
                          {releaseLabel(flight)}
                        </span>
                        <Link
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${coverageBadgeClasses(flight.coverage)}`}
                          href={flightsHref(filters, {
                            panel: "flight",
                            selected: flight.flightLegId ?? flight.legacyFlightId,
                          })}
                        >
                          {coverageLabel(flight.coverage)}
                        </Link>
                      </div>
                      <p className="mt-2 text-xs text-zinc-600">
                        Out {toDateTime(flight.scheduledDeparture)} | In {toDateTime(flight.scheduledArrival)}
                      </p>
                      {(flight.actualDeparture || flight.actualArrival) && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Actual {toTime(flight.actualDeparture)} / {toTime(flight.actualArrival)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Crew</p>
                      {flight.coverage?.assignedCrew.length ? (
                        <div className="mt-1 flex flex-wrap gap-1.5 text-xs leading-6 text-zinc-700">
                          {flight.coverage.assignedCrew.map((assignment) => (
                            <CrewName assignment={assignment} filters={filters} key={assignment.assignmentId} />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-zinc-500">No active crew assignments</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Control</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-600">{controlLabel(flight)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700"
                          href={flightsHref(filters, {
                            panel: "release",
                            selected: flight.flightLegId ?? flight.legacyFlightId,
                          })}
                        >
                          Review
                        </Link>
                        {flight.flightLegId ? (
                          <Link
                            className="rounded-md bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white"
                            href={`/operations-control/${flight.flightLegId}`}
                          >
                            Release
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            Showing {flights.length} filtered rows from {readSummary.total} loaded rows
            {filters.range === "all" ? " (All time capped at 1,000 rows for this view)." : "."}
          </p>
        </section>
      </div>
      <FlightsDrawer filters={filters} flights={flights} formOptions={formOptions} />
    </main>
  );
}
