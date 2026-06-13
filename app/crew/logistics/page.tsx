import {
  CrewLogisticsNeedStatus,
  CrewLogisticsNeedType,
  EmploymentStatus,
  UserRole,
} from "@prisma/client";
import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    aircraft?: string | string[];
    crew?: string | string[];
    from?: string | string[];
    groupBy?: string | string[];
    status?: string | string[];
    to?: string | string[];
    type?: string | string[];
  }>;
};

type LogisticsNeed = Awaited<ReturnType<typeof getCrewLogisticsWorkbenchData>>["needs"][number];

type Filters = {
  aircraft: string;
  crew: string;
  from: string;
  groupBy: "aircraft" | "needType" | "neededBy" | "status";
  status:
    | "all"
    | "booked"
    | "cancelled"
    | "completed"
    | "missing-details"
    | "open"
    | "overdue"
    | "planned"
    | "requested";
  to: string;
  type: string;
};

const OPEN_STATUSES: readonly CrewLogisticsNeedStatus[] = [
  CrewLogisticsNeedStatus.PLANNED,
  CrewLogisticsNeedStatus.REQUESTED,
  CrewLogisticsNeedStatus.BOOKED,
];

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Open", value: "open" },
  { label: "Overdue", value: "overdue" },
  { label: "Missing details", value: "missing-details" },
  { label: "Planned", value: "planned" },
  { label: "Requested", value: "requested" },
  { label: "Booked", value: "booked" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const;

const GROUP_OPTIONS = [
  { label: "Group by status", value: "status" },
  { label: "Group by need type", value: "needType" },
  { label: "Group by aircraft", value: "aircraft" },
  { label: "Group by needed-by window", value: "neededBy" },
] as const;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function parseFilters(searchParams: Awaited<PageProps["searchParams"]>): Filters {
  const statusValues = STATUS_OPTIONS.map((option) => option.value);
  const groupValues = GROUP_OPTIONS.map((option) => option.value);

  return {
    aircraft: firstParam(searchParams.aircraft) ?? "all",
    crew: firstParam(searchParams.crew) ?? "all",
    from: firstParam(searchParams.from) ?? "all",
    groupBy: oneOf(firstParam(searchParams.groupBy), groupValues, "status"),
    status: oneOf(firstParam(searchParams.status), statusValues, "open"),
    to: firstParam(searchParams.to) ?? "all",
    type: firstParam(searchParams.type) ?? "all",
  };
}

function isOpenNeed(need: LogisticsNeed): boolean {
  return OPEN_STATUSES.includes(need.status);
}

function isOverdueNeed(need: LogisticsNeed, now: Date): boolean {
  return isOpenNeed(need) && !!need.neededBy && need.neededBy.getTime() < now.getTime();
}

function isMissingProviderDetails(need: LogisticsNeed): boolean {
  if (!isOpenNeed(need)) {
    return false;
  }

  if (
    need.needType === CrewLogisticsNeedType.POSITIONING ||
    need.needType === CrewLogisticsNeedType.OTHER
  ) {
    return false;
  }

  return !need.providerName || !need.confirmationNumber;
}

function statusBadgeClasses(status: CrewLogisticsNeedStatus): string {
  if (status === CrewLogisticsNeedStatus.BOOKED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === CrewLogisticsNeedStatus.REQUESTED) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === CrewLogisticsNeedStatus.PLANNED) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === CrewLogisticsNeedStatus.CANCELLED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getNeededByGroup(need: LogisticsNeed, now: Date): string {
  if (!need.neededBy) {
    return "No needed-by time";
  }
  if (isOverdueNeed(need, now)) {
    return "Overdue";
  }

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  if (need.neededBy.getTime() <= endOfToday.getTime()) {
    return "Due today";
  }

  const nextSevenDays = new Date(now);
  nextSevenDays.setDate(nextSevenDays.getDate() + 7);
  if (need.neededBy.getTime() <= nextSevenDays.getTime()) {
    return "Next 7 days";
  }

  return "Later";
}

function getGroupLabel(need: LogisticsNeed, filters: Filters, now: Date): string {
  if (filters.groupBy === "needType") {
    return formatLabel(need.needType);
  }
  if (filters.groupBy === "aircraft") {
    return need.aircraft?.tailNumber ?? "Unassigned aircraft";
  }
  if (filters.groupBy === "neededBy") {
    return getNeededByGroup(need, now);
  }

  return formatLabel(need.status);
}

function applyFilters(needs: LogisticsNeed[], filters: Filters, now: Date): LogisticsNeed[] {
  return needs.filter((need) => {
    if (filters.crew !== "all" && need.crewMemberId !== filters.crew) {
      return false;
    }
    if (filters.aircraft !== "all" && need.aircraftId !== filters.aircraft) {
      return false;
    }
    if (filters.from !== "all" && need.fromStationId !== filters.from) {
      return false;
    }
    if (filters.to !== "all" && need.toStationId !== filters.to) {
      return false;
    }
    if (filters.type !== "all" && need.needType !== filters.type) {
      return false;
    }

    if (filters.status === "open") {
      return isOpenNeed(need);
    }
    if (filters.status === "overdue") {
      return isOverdueNeed(need, now);
    }
    if (filters.status === "missing-details") {
      return isMissingProviderDetails(need);
    }
    if (filters.status === "all") {
      return true;
    }

    return need.status.toLowerCase() === filters.status;
  });
}

function buildQuery(filters: Filters, updates: Partial<Filters>): string {
  const next = { ...filters, ...updates };
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(next)) {
    if (value && value !== "all" && !(key === "status" && value === "open") && !(key === "groupBy" && value === "status")) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/crew/logistics?${query}` : "/crew/logistics";
}

async function getCrewLogisticsWorkbenchData() {
  const [needs, crewMembers, aircraft, stations] = await Promise.all([
    prisma.crewLogisticsNeed.findMany({
      orderBy: [{ neededBy: "asc" }, { createdAt: "desc" }],
      take: 250,
      select: {
        id: true,
        aircraftId: true,
        completedAt: true,
        confirmationNumber: true,
        crewMemberId: true,
        flightLegId: true,
        fromStationId: true,
        needType: true,
        neededBy: true,
        notes: true,
        providerName: true,
        status: true,
        toStationId: true,
        aircraft: {
          select: {
            id: true,
            tailNumber: true,
          },
        },
        crewMember: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            baseStation: {
              select: {
                code: true,
              },
            },
            locationRecords: {
              orderBy: [{ effectiveAt: "desc" }],
              take: 1,
              select: {
                effectiveAt: true,
                locationText: true,
                station: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
        flightLeg: {
          select: {
            id: true,
            flightNumber: true,
            scheduledDeparture: true,
            departureStation: {
              select: {
                code: true,
              },
            },
            arrivalStation: {
              select: {
                code: true,
              },
            },
          },
        },
        fromStation: {
          select: {
            code: true,
          },
        },
        toStation: {
          select: {
            code: true,
          },
        },
      },
    }),
    prisma.crewMember.findMany({
      where: { employmentStatus: { not: EmploymentStatus.TERMINATED } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        locationRecords: {
          orderBy: [{ effectiveAt: "desc" }],
          take: 1,
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.aircraft.findMany({
      orderBy: [{ tailNumber: "asc" }],
      select: {
        id: true,
        tailNumber: true,
      },
    }),
    prisma.station.findMany({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        city: true,
      },
    }),
  ]);

  return { aircraft, crewMembers, needs, stations };
}

function SelectFilter({
  children,
  label,
  name,
  value,
}: {
  children: React.ReactNode;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={value}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function LogisticsCard({ need, now }: { need: LogisticsNeed; now: Date }) {
  const location = need.crewMember.locationRecords[0] ?? null;
  const latestLocation = location
    ? `${location.station?.code ?? location.locationText ?? "Location"} as of ${formatDateTime(location.effectiveAt)}`
    : "No location context";
  const routeLabel =
    need.fromStation || need.toStation
      ? `${need.fromStation?.code ?? "TBD"} -> ${need.toStation?.code ?? "TBD"}`
      : "No station route";
  const flightLegLabel = need.flightLeg
    ? `${need.flightLeg.flightNumber ?? "FlightLeg"} ${need.flightLeg.departureStation.code}-${need.flightLeg.arrivalStation.code}`
    : null;

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-950">
              {need.crewMember.firstName} {need.crewMember.lastName}
            </h3>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(need.status)}`}>
              {formatLabel(need.status)}
            </span>
            {isOverdueNeed(need, now) ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                Overdue
              </span>
            ) : null}
            {isMissingProviderDetails(need) ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                Missing provider details
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {formatLabel(need.needType)} | {routeLabel} | needed by {formatDateTime(need.neededBy)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Latest location: {latestLocation} | Base {need.crewMember.baseStation.code}
          </p>
        </div>
        <Link
          className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-950"
          href={`/crew/${need.crewMemberId}/logistics`}
        >
          Manage logistics
        </Link>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Aircraft</dt>
          <dd className="mt-1 text-zinc-800">{need.aircraft?.tailNumber ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">FlightLeg</dt>
          <dd className="mt-1 text-zinc-800">{flightLegLabel ?? "Unlinked"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Provider</dt>
          <dd className="mt-1 text-zinc-800">{need.providerName ?? "Missing"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Confirmation</dt>
          <dd className="mt-1 text-zinc-800">{need.confirmationNumber ?? "Missing"}</dd>
        </div>
      </dl>

      {need.notes ? <p className="mt-4 text-sm text-zinc-600">{need.notes}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link className="font-medium text-sky-700 hover:text-sky-900" href={`/crew/${need.crewMemberId}`}>
          Crew detail
        </Link>
        {need.aircraftId ? (
          <>
            <Link className="font-medium text-sky-700 hover:text-sky-900" href={`/aircraft/${need.aircraftId}`}>
              Aircraft context
            </Link>
            <Link className="font-medium text-sky-700 hover:text-sky-900" href={`/aircraft/${need.aircraftId}/crew`}>
              Aircraft crew
            </Link>
          </>
        ) : null}
        {need.flightLegId ? (
          <Link className="font-medium text-sky-700 hover:text-sky-900" href={`/operations-control/${need.flightLegId}`}>
            FlightLeg detail
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default async function CrewLogisticsWorkbenchPage({ searchParams }: PageProps) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  const now = new Date();
  const params = await searchParams;
  const filters = parseFilters(params);
  const { aircraft, crewMembers, needs, stations } = await getCrewLogisticsWorkbenchData();
  const filteredNeeds = applyFilters(needs, filters, now);
  const groupedNeeds = new Map<string, LogisticsNeed[]>();

  for (const need of filteredNeeds) {
    const label = getGroupLabel(need, filters, now);
    groupedNeeds.set(label, [...(groupedNeeds.get(label) ?? []), need]);
  }

  const openNeeds = needs.filter(isOpenNeed);
  const overdueNeeds = needs.filter((need) => isOverdueNeed(need, now));
  const missingDetails = needs.filter(isMissingProviderDetails);
  const missingLocationCrew = crewMembers.filter((crewMember) => crewMember.locationRecords.length === 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1680px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm font-medium text-zinc-500 hover:text-zinc-800" href="/crew">
            Back to crew
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            Crew Logistics Workbench
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Coordinate crew positioning, deadheads, tickets, hotels, ground transport, and location context.
            This workbench is read-only; use crew-scoped logistics pages for edits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:border-zinc-300" href="/crew/scheduling">
            Crew planner
          </Link>
          <Link className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:border-zinc-300" href="/aircraft">
            Aircraft context
          </Link>
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <SummaryCard label="Open needs" value={openNeeds.length} />
        <SummaryCard label="Requested" value={needs.filter((need) => need.status === CrewLogisticsNeedStatus.REQUESTED).length} />
        <SummaryCard label="Booked" value={needs.filter((need) => need.status === CrewLogisticsNeedStatus.BOOKED).length} />
        <SummaryCard label="Overdue" value={overdueNeeds.length} />
        <SummaryCard label="Missing details" value={missingDetails.length} />
        <SummaryCard label="No location" value={missingLocationCrew.length} />
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          <SelectFilter label="Status" name="status" value={filters.status}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter label="Need type" name="type" value={filters.type}>
            <option value="all">All need types</option>
            {Object.values(CrewLogisticsNeedType).map((type) => (
              <option key={type} value={type}>
                {formatLabel(type)}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter label="Crew" name="crew" value={filters.crew}>
            <option value="all">All crew</option>
            {crewMembers.map((crewMember) => (
              <option key={crewMember.id} value={crewMember.id}>
                {crewMember.firstName} {crewMember.lastName}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter label="Aircraft" name="aircraft" value={filters.aircraft}>
            <option value="all">All aircraft</option>
            {aircraft.map((item) => (
              <option key={item.id} value={item.id}>
                {item.tailNumber}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter label="From station" name="from" value={filters.from}>
            <option value="all">Any origin</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.code} - {station.city}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter label="To station" name="to" value={filters.to}>
            <option value="all">Any destination</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.code} - {station.city}
              </option>
            ))}
          </SelectFilter>
          <SelectFilter label="Group" name="groupBy" value={filters.groupBy}>
            {GROUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectFilter>
          <div className="flex items-end gap-2 md:col-span-3 xl:col-span-7">
            <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800" type="submit">
              Apply filters
            </button>
            <Link className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-950" href="/crew/logistics">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">Logistics needs</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Showing {filteredNeeds.length} of {needs.length} tracked needs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="font-medium text-sky-700 hover:text-sky-900" href={buildQuery(filters, { status: "overdue" })}>
              Overdue
            </Link>
            <Link className="font-medium text-sky-700 hover:text-sky-900" href={buildQuery(filters, { status: "missing-details" })}>
              Missing details
            </Link>
            <Link className="font-medium text-sky-700 hover:text-sky-900" href={buildQuery(filters, { status: "booked" })}>
              Booked
            </Link>
          </div>
        </div>

        {filteredNeeds.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-950">No logistics needs match these filters.</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Reset filters or create a crew-scoped logistics need from a crew member page.
            </p>
            <Link className="mt-4 inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white" href="/crew/logistics">
              Show all open needs
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {Array.from(groupedNeeds.entries()).map(([label, groupNeeds]) => (
              <section key={label}>
                <div className="mb-3 flex items-center justify-between border-b border-zinc-200 pb-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{label}</h3>
                  <span className="text-sm text-zinc-500">{groupNeeds.length} need(s)</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {groupNeeds.map((need) => (
                    <LogisticsCard key={need.id} need={need} now={now} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
