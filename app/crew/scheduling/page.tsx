import { AircraftType, SeatRole } from "@prisma/client";
import Link from "next/link";

import { ContextDrawer } from "@/components/context-drawer";
import {
  CREW_SCHEDULING_WORKBENCH_DRAWERS,
  CREW_SCHEDULING_WORKBENCH_LAYERS,
  CREW_SCHEDULING_WORKBENCH_TABS,
  CREW_SCHEDULING_WORKBENCH_VIEWS,
  CrewCoverageCalendarDay,
  CrewCoverageCrewDetail,
  CrewCoverageRoleBucket,
  CrewSchedulingWorkbenchData,
  CrewSchedulingWorkbenchDrawer,
  CrewSchedulingWorkbenchFilters,
  CrewSchedulingWorkbenchLayer,
  CrewSchedulingWorkbenchTab,
  CrewSchedulingWorkbenchView,
  getCrewSchedulingWorkbenchData,
} from "@/lib/crew-scheduling-workbench-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    aircraftId?: string | string[];
    aircraftType?: string | string[];
    base?: string | string[];
    bucketDate?: string | string[];
    crewMemberId?: string | string[];
    date?: string | string[];
    drawer?: string | string[];
    layer?: string | string[];
    role?: string | string[];
    sort?: string | string[];
    tab?: string | string[];
    view?: string | string[];
  }>;
};

type PersonnelSort = "status" | "name";

type WorkbenchState = {
  aircraftId: string;
  bucketDate: string;
  crewMemberId: string;
  date: Date;
  dateInput: string;
  drawer: CrewSchedulingWorkbenchDrawer | "none";
  filters: CrewSchedulingWorkbenchFilters;
  layer: CrewSchedulingWorkbenchLayer;
  sort: PersonnelSort;
  tab: CrewSchedulingWorkbenchTab;
  view: CrewSchedulingWorkbenchView;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

function parseInputDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function inputDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

function startOfWeekDate(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function toDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
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

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function formatAircraftType(value: AircraftType): string {
  return value.replaceAll("_", "-");
}

function formatRole(role: SeatRole): string {
  return role;
}

function parseState(searchParams: Awaited<PageProps["searchParams"]>): WorkbenchState {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requestedDate = parseInputDate(firstParam(searchParams.date)) ?? today;
  const requestedRole = oneOf(firstParam(searchParams.role), ["all", ...Object.values(SeatRole)] as const, "all");
  const requestedAircraftType = oneOf(
    firstParam(searchParams.aircraftType),
    ["all", ...Object.values(AircraftType)] as const,
    "all",
  );

  return {
    aircraftId: firstParam(searchParams.aircraftId) ?? "",
    bucketDate: firstParam(searchParams.bucketDate) ?? "",
    crewMemberId: firstParam(searchParams.crewMemberId) ?? "",
    date: requestedDate,
    dateInput: inputDate(requestedDate),
    drawer: oneOf(
      firstParam(searchParams.drawer),
      ["none", ...CREW_SCHEDULING_WORKBENCH_DRAWERS] as const,
      "none",
    ),
    filters: {
      aircraftType: requestedAircraftType,
      base: firstParam(searchParams.base) ?? "all",
      role: requestedRole,
    },
    layer: oneOf(firstParam(searchParams.layer), CREW_SCHEDULING_WORKBENCH_LAYERS, "schedule"),
    sort: oneOf(firstParam(searchParams.sort), ["status", "name"] as const, "status"),
    tab: oneOf(firstParam(searchParams.tab), CREW_SCHEDULING_WORKBENCH_TABS, "coverage"),
    view: oneOf(firstParam(searchParams.view), CREW_SCHEDULING_WORKBENCH_VIEWS, "week"),
  };
}

function buildHref(state: WorkbenchState, overrides: Partial<{
  aircraftId: string;
  aircraftType: AircraftType | "all";
  base: string;
  bucketDate: string;
  crewMemberId: string;
  date: string;
  drawer: CrewSchedulingWorkbenchDrawer | "none";
  layer: CrewSchedulingWorkbenchLayer;
  role: SeatRole | "all";
  sort: PersonnelSort;
  tab: CrewSchedulingWorkbenchTab;
  view: CrewSchedulingWorkbenchView;
}> = {}): string {
  const params = new URLSearchParams();
  const next = {
    aircraftId: state.aircraftId,
    aircraftType: state.filters.aircraftType,
    base: state.filters.base,
    bucketDate: state.bucketDate,
    crewMemberId: state.crewMemberId,
    date: state.dateInput,
    drawer: state.drawer,
    layer: state.layer,
    role: state.filters.role,
    sort: state.sort,
    tab: state.tab,
    view: state.view,
    ...overrides,
  };

  params.set("date", next.date);
  params.set("view", next.view);
  params.set("tab", next.tab);
  params.set("layer", next.layer);
  params.set("aircraftType", next.aircraftType);
  params.set("role", next.role);
  params.set("base", next.base);
  params.set("sort", next.sort);

  if (next.drawer !== "none") {
    params.set("drawer", next.drawer);
  }
  if (next.bucketDate) {
    params.set("bucketDate", next.bucketDate);
  }
  if (next.crewMemberId) {
    params.set("crewMemberId", next.crewMemberId);
  }
  if (next.aircraftId) {
    params.set("aircraftId", next.aircraftId);
  }

  return `/crew/scheduling?${params.toString()}`;
}

function resetDrawerHref(state: WorkbenchState): string {
  return buildHref(state, {
    aircraftId: "",
    bucketDate: "",
    crewMemberId: "",
    drawer: "none",
  });
}

function CountPill({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  value: number;
}) {
  const toneClasses = {
    bad: "border-rose-200 bg-rose-50 text-rose-800",
    good: "border-emerald-200 bg-emerald-50 text-emerald-800",
    neutral: "border-zinc-200 bg-white text-zinc-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <span className={`inline-flex whitespace-nowrap items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${toneClasses[tone]}`}>
      {label} <span className="tabular-nums">{value}</span>
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-950">{value}</p>
    </article>
  );
}

function TopTabs({ state }: { state: WorkbenchState }) {
  const tabs: Array<{ label: string; value: CrewSchedulingWorkbenchTab }> = [
    { label: "Coverage Board", value: "coverage" },
    { label: "Schedule Planning", value: "planning" },
    { label: "Assignment Overlay", value: "assignment" },
    { label: "Requests", value: "requests" },
  ];

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          className={
            state.tab === tab.value
              ? "rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white"
              : "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          }
          href={buildHref(state, { tab: tab.value, drawer: "none" })}
          key={tab.value}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function WorkbenchFilters({ data, state }: { data: CrewSchedulingWorkbenchData; state: WorkbenchState }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <form className="grid gap-3 lg:grid-cols-8" method="get">
        <input name="tab" type="hidden" value={state.tab} />
        <input name="layer" type="hidden" value={state.layer} />
        <input name="sort" type="hidden" value={state.sort} />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">View</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            defaultValue={state.view}
            name="view"
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            defaultValue={state.dateInput}
            name="date"
            type="date"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Airframe</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            defaultValue={state.filters.aircraftType}
            name="aircraftType"
          >
            <option value="all">All airframes</option>
            {data.aircraftTypeOptions.map((aircraftType) => (
              <option key={aircraftType} value={aircraftType}>
                {formatAircraftType(aircraftType)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Role</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            defaultValue={state.filters.role}
            name="role"
          >
            <option value="all">All roles</option>
            {data.roleOptions.map((role) => (
              <option key={role} value={role}>
                {formatRole(role)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Base</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            defaultValue={state.filters.base}
            name="base"
          >
            <option value="all">All bases</option>
            {data.stationOptions.map((station) => (
              <option key={station.code} value={station.code}>
                {station.code}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Layer</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            defaultValue={state.layer}
            name="layer"
          >
            <option value="schedule">Schedule coverage</option>
            <option value="assignment">Assignment overlay</option>
          </select>
        </label>
        <div className="flex items-end gap-2 lg:col-span-2">
          <button
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            type="submit"
          >
            Apply
          </button>
          <Link
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            href="/crew/scheduling"
          >
            Reset
          </Link>
        </div>
      </form>
    </section>
  );
}

function BucketCard({
  bucket,
  day,
  state,
}: {
  bucket: CrewCoverageRoleBucket;
  day: CrewCoverageCalendarDay;
  state: WorkbenchState;
}) {
  return (
    <Link
      className="block rounded-md border border-zinc-200 bg-white p-2 hover:border-sky-300 hover:bg-sky-50"
      href={buildHref(state, {
        aircraftType: bucket.aircraftType,
        bucketDate: "",
        date: day.dayKey,
        drawer: "none",
        role: bucket.seatRole,
        tab: "coverage",
        view: "day",
      })}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-950">
          {formatAircraftType(bucket.aircraftType)} {formatRole(bucket.seatRole)}
        </p>
        {bucket.flightGaps.length > 0 ? (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-800">
            Gap {bucket.flightGaps.length}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <CountPill label="Sched" tone="good" value={bucket.counts.scheduled} />
        <CountPill label="Res" tone="good" value={bucket.counts.reserve} />
        <CountPill label="Asg" value={bucket.counts.assigned} />
        <CountPill label="Pend" tone="warn" value={bucket.counts.pendingOff} />
        <CountPill label="Off" value={bucket.counts.off} />
        <CountPill label="Unav" tone="bad" value={bucket.counts.unavailable + bucket.counts.approvedOff} />
      </div>
    </Link>
  );
}

type PersonnelStatusKey =
  | "scheduled"
  | "reserve"
  | "assigned"
  | "pendingOff"
  | "approvedOff"
  | "occupied"
  | "off"
  | "unavailable";

type PersonnelStatusConfig = {
  key: PersonnelStatusKey;
  label: string;
  tone: "neutral" | "good" | "warn" | "bad";
};

type PersonnelRow = {
  crewMember: CrewCoverageCrewDetail;
  primaryStatus: PersonnelStatusConfig;
  statuses: PersonnelStatusConfig[];
};

const PERSONNEL_STATUSES: PersonnelStatusConfig[] = [
  { key: "scheduled", label: "Scheduled", tone: "good" },
  { key: "reserve", label: "Reserve", tone: "good" },
  { key: "assigned", label: "Assigned", tone: "neutral" },
  { key: "pendingOff", label: "Pending off", tone: "warn" },
  { key: "approvedOff", label: "Approved off", tone: "bad" },
  { key: "occupied", label: "Occupied", tone: "warn" },
  { key: "off", label: "Off", tone: "neutral" },
  { key: "unavailable", label: "Unavailable", tone: "bad" },
];

function buildPersonnelRows(bucket: CrewCoverageRoleBucket, sort: PersonnelSort): PersonnelRow[] {
  const rows = new Map<string, PersonnelRow>();

  for (const status of PERSONNEL_STATUSES) {
    for (const crewMember of bucket.crew[status.key]) {
      const current = rows.get(crewMember.crewMemberId);

      if (current) {
        current.statuses.push(status);
        continue;
      }

      rows.set(crewMember.crewMemberId, {
        crewMember,
        primaryStatus: status,
        statuses: [status],
      });
    }
  }

  return Array.from(rows.values()).sort((first, second) => {
    if (sort === "name") {
      return first.crewMember.name.localeCompare(second.crewMember.name);
    }

    const firstStatus = PERSONNEL_STATUSES.findIndex((status) => status.key === first.primaryStatus.key);
    const secondStatus = PERSONNEL_STATUSES.findIndex((status) => status.key === second.primaryStatus.key);

    if (firstStatus !== secondStatus) {
      return firstStatus - secondStatus;
    }

    return first.crewMember.name.localeCompare(second.crewMember.name);
  });
}

function WeekGroups({ days }: { days: CrewCoverageCalendarDay[] }) {
  const groups = new Map<string, CrewCoverageCalendarDay[]>();

  for (const day of days) {
    const weekStart = inputDate(startOfWeekDate(day.date));
    groups.set(weekStart, [...(groups.get(weekStart) ?? []), day]);
  }

  return Array.from(groups.entries()).map(([weekStart, weekDays]) => ({
    days: weekDays,
    label: `Week of ${toDate(parseInputDate(weekStart) ?? weekDays[0].date)}`,
    weekStart,
  }));
}

function DayHeader({ day, state }: { day: CrewCoverageCalendarDay; state: WorkbenchState }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-2">
      <Link
        className="min-w-0 rounded-sm hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        href={buildHref(state, {
          bucketDate: "",
          date: day.dayKey,
          drawer: "none",
          tab: "coverage",
          view: "day",
        })}
      >
        <p className="truncate text-sm font-semibold text-zinc-950">{day.label}</p>
        <p className="truncate text-xs text-zinc-500">
          Sched {day.totals.scheduled} | Res {day.totals.reserve} | Asg {day.totals.assigned}
        </p>
      </Link>
      {day.totals.flightGaps > 0 ? (
        <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold leading-none text-rose-800">
          {day.totals.flightGaps} crew gap{day.totals.flightGaps === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}

function FocusedBucketPersonnel({
  bucket,
  day,
  state,
}: {
  bucket: CrewCoverageRoleBucket;
  day: CrewCoverageCalendarDay;
  state: WorkbenchState;
}) {
  const rows = buildPersonnelRows(bucket, state.sort);

  return (
    <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{day.label}</p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">
            {formatAircraftType(bucket.aircraftType)} {formatRole(bucket.seatRole)}
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Personnel grouped by current planning status for this day and role.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={
              state.sort === "status"
                ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            }
            href={buildHref(state, { sort: "status" })}
          >
            Status
          </Link>
          <Link
            className={
              state.sort === "name"
                ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            }
            href={buildHref(state, { sort: "name" })}
          >
            Name
          </Link>
        </div>
      </div>

      <section className="mt-3 grid gap-2 sm:grid-cols-4">
        <SummaryCard label="Scheduled" value={bucket.counts.scheduled} />
        <SummaryCard label="Reserve" value={bucket.counts.reserve} />
        <SummaryCard label="Assigned" value={bucket.counts.assigned} />
        <SummaryCard label="Crew gaps" value={bucket.flightGaps.length} />
      </section>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500">
          No personnel rows for this day, airframe, and role.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <Link
              className="rounded-md border border-zinc-200 bg-white p-3 hover:border-sky-300 hover:bg-sky-50"
              href={buildHref(state, {
                crewMemberId: row.crewMember.crewMemberId,
                drawer: "crew",
              })}
              key={row.crewMember.crewMemberId}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-950">{row.crewMember.name}</p>
                    <span className="text-xs text-zinc-500">#{row.crewMember.employeeNumber}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Base {row.crewMember.baseStationCode} | {row.crewMember.locationLabel}
                  </p>
                  {row.crewMember.notes.length > 0 ? (
                    <p className="mt-1 text-xs text-zinc-500">{row.crewMember.notes.slice(0, 2).join(" | ")}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1 sm:justify-end">
                  {row.statuses.map((status) => (
                    <span
                      className={
                        status.tone === "good"
                          ? "inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-semibold text-emerald-800"
                          : status.tone === "warn"
                            ? "inline-flex whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.68rem] font-semibold text-amber-800"
                            : status.tone === "bad"
                              ? "inline-flex whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[0.68rem] font-semibold text-rose-800"
                              : "inline-flex whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[0.68rem] font-semibold text-zinc-700"
                      }
                      key={status.key}
                    >
                      {status.label}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {bucket.flightGaps.length > 0 ? (
        <section className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3">
          <h4 className="text-sm font-semibold text-rose-950">Flight-derived gaps</h4>
          <div className="mt-2 grid gap-2">
            {bucket.flightGaps.map((gap) => (
              <article className="rounded-md border border-rose-200 bg-white p-3" key={`${gap.flightNumber}-${gap.scheduledDeparture.toISOString()}`}>
                <p className="text-sm font-semibold text-zinc-950">{gap.flightNumber} | {gap.route}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {gap.tailNumber} | {toDateTime(gap.scheduledDeparture)} | Missing {gap.missingRoles.map(formatRole).join(", ")}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function CoverageBoard({ data, state }: { data: CrewSchedulingWorkbenchData; state: WorkbenchState }) {
  const gridClasses =
    state.view === "month"
      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
      : state.view === "week"
        ? "grid gap-3 lg:grid-cols-7"
        : "grid gap-3";
  const isFocusedDay =
    state.view === "day" &&
    state.filters.aircraftType !== "all" &&
    state.filters.role !== "all";

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Coverage Board</h2>
          <p className="text-sm text-zinc-600">
            {state.view === "day"
              ? "Day view shows time-block coverage detail."
              : "Month and week views stay count-first for scanability."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["month", "week", "day"] as const).map((view) => (
            <Link
              className={
                state.view === view
                  ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              }
              href={buildHref(state, { view })}
              key={view}
            >
              {view}
            </Link>
          ))}
        </div>
      </div>
      {state.view === "month" ? (
        <div className="mt-4 grid gap-4">
          {WeekGroups({ days: data.calendarDays }).map((week) => (
            <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={week.weekStart}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-950">{week.label}</p>
                <Link
                  className="shrink-0 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-sky-50"
                  href={buildHref(state, {
                    bucketDate: "",
                    date: week.weekStart,
                    drawer: "none",
                    tab: "coverage",
                    view: "week",
                  })}
                >
                  Week view
                </Link>
              </div>
              <div className={gridClasses}>
                {week.days.map((day) => (
                  <article className="min-h-48 rounded-md border border-zinc-200 bg-white p-3" key={day.dayKey}>
                    <DayHeader day={day} state={state} />
                    {day.buckets.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-500">No coverage rows for active filters.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {day.buckets.map((bucket) => (
                          <BucketCard
                            bucket={bucket}
                            day={day}
                            key={`${day.dayKey}-${bucket.aircraftType}-${bucket.seatRole}`}
                            state={state}
                          />
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={gridClasses + " mt-4"}>
          {data.calendarDays.map((day) => {
            const focusedBucket = isFocusedDay
              ? day.buckets.find(
                  (bucket) =>
                    bucket.aircraftType === state.filters.aircraftType &&
                    bucket.seatRole === state.filters.role,
                )
              : null;

            return (
          <article
            className={
              state.view === "day"
                ? "rounded-md border border-zinc-200 bg-zinc-50 p-4"
                : "min-h-48 rounded-md border border-zinc-200 bg-zinc-50 p-3"
            }
            key={day.dayKey}
          >
            <DayHeader day={day} state={state} />
            {focusedBucket ? (
              <div className="mt-3">
                <FocusedBucketPersonnel bucket={focusedBucket} day={day} state={state} />
              </div>
            ) : day.buckets.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No coverage rows for active filters.</p>
            ) : (
              <div className={state.view === "day" ? "mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3" : "mt-3 space-y-2"}>
                {day.buckets.map((bucket) => (
                  <BucketCard
                    bucket={bucket}
                    day={day}
                    key={`${day.dayKey}-${bucket.aircraftType}-${bucket.seatRole}`}
                    state={state}
                  />
                ))}
              </div>
            )}
          </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PlanningTab({ data }: { data: CrewSchedulingWorkbenchData }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Schedule Planning</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Use the existing period workflow to review requests, draft entries, generate patterns, and publish availability.
            </p>
          </div>
          <Link className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800" href="/crew/scheduling/periods">
            Periods
          </Link>
        </div>
        <div className="mt-4 grid gap-2">
          {data.activePeriods.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No schedule periods overlap this workbench window.
            </p>
          ) : (
            data.activePeriods.map((period) => (
              <Link
                className="rounded-md border border-zinc-200 bg-zinc-50 p-3 hover:bg-sky-50"
                href={`/crew/scheduling/periods/${period.id}`}
                key={period.id}
              >
                <p className="text-sm font-semibold text-zinc-950">{period.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatStatus(period.status)} | {toDate(period.startsAt)} - {toDate(period.endsAt)}
                </p>
              </Link>
            ))
          )}
        </div>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Planning Tools</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-800 hover:bg-sky-50" href="/crew/scheduling/patterns">
            Rotation patterns
          </Link>
          <Link className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-800 hover:bg-sky-50" href="/crew/scheduling/time-off">
            Time-off review
          </Link>
          <Link className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-800 hover:bg-sky-50" href="/crew/logistics">
            Logistics workbench
          </Link>
          <Link className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-800 hover:bg-sky-50" href="/crew">
            Crew roster
          </Link>
        </div>
        <p className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          This workbench reads schedule planning data. Edits still happen in existing workflows.
        </p>
      </article>
    </section>
  );
}

function AssignmentTab({
  data,
  state,
}: {
  data: CrewSchedulingWorkbenchData;
  state: WorkbenchState;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Assignment Overlay</h2>
          <p className="text-sm text-zinc-600">
            Aircraft-block and flight-leg context grouped by aircraft and date.
          </p>
        </div>
        <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href="/scheduling">
          Flight schedule
        </Link>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {data.assignmentOverlay.length === 0 ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
            No aircraft or flight-leg assignment context in this window.
          </p>
        ) : (
          data.assignmentOverlay.map((overlay) => (
            <Link
              className="rounded-md border border-zinc-200 bg-zinc-50 p-3 hover:bg-sky-50"
              href={buildHref(state, {
                aircraftId: overlay.aircraftId,
                bucketDate: overlay.dayKey,
                drawer: "assignment",
                tab: "assignment",
              })}
              key={`${overlay.dayKey}-${overlay.aircraftId}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    {overlay.tailNumber} | {formatAircraftType(overlay.aircraftType)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{overlay.dayKey}</p>
                </div>
                {overlay.flightGaps.length > 0 ? (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">
                    Gap {overlay.flightGaps.length}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-zinc-700">
                {overlay.assignedCrew.length} assigned crew | {overlay.flightLegs.length} flight leg{overlay.flightLegs.length === 1 ? "" : "s"}
              </p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function RequestsTab({ data }: { data: CrewSchedulingWorkbenchData }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Schedule Requests</h2>
            <p className="text-sm text-zinc-600">Submitted and approved requests inside active periods.</p>
          </div>
          <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href="/crew/scheduling/periods">
            Periods
          </Link>
        </div>
        <div className="mt-4 grid gap-2">
          {data.pendingRequests.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">No schedule requests in this window.</p>
          ) : (
            data.pendingRequests.map((request) => (
              <Link className="rounded-md border border-zinc-200 bg-zinc-50 p-3 hover:bg-sky-50" href={`/crew/${request.crewMemberId}`} key={request.id}>
                <p className="text-sm font-semibold text-zinc-950">{request.crewMemberName}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatStatus(request.requestType)} | {formatStatus(request.status)} | {request.periodName}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {request.startDate ? toDate(request.startDate) : "No start"} - {request.endDate ? toDate(request.endDate) : "No end"}
                </p>
              </Link>
            ))
          )}
        </div>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Time Off</h2>
            <p className="text-sm text-zinc-600">Pending and approved requests that affect the selected window.</p>
          </div>
          <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href="/crew/scheduling/time-off">
            Time-off queue
          </Link>
        </div>
        <div className="mt-4 grid gap-2">
          {data.pendingTimeOff.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">No time-off requests in this window.</p>
          ) : (
            data.pendingTimeOff.map((request) => (
              <Link className="rounded-md border border-zinc-200 bg-zinc-50 p-3 hover:bg-sky-50" href={`/crew/${request.crewMemberId}`} key={request.id}>
                <p className="text-sm font-semibold text-zinc-950">{request.crewMemberName}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatStatus(request.requestType)} | {formatStatus(request.status)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {toDate(request.startDate)} - {toDate(request.endDate)}
                </p>
              </Link>
            ))
          )}
        </div>
      </article>
    </section>
  );
}

function CrewList({
  crew,
  state,
}: {
  crew: CrewCoverageCrewDetail[];
  state: WorkbenchState;
}) {
  if (crew.length === 0) {
    return <p className="text-sm text-zinc-500">None</p>;
  }

  return (
    <div className="grid gap-2">
      {crew.map((crewMember) => (
        <Link
          className="rounded-md border border-zinc-200 bg-white p-3 hover:bg-sky-50"
          href={buildHref(state, {
            crewMemberId: crewMember.crewMemberId,
            drawer: "crew",
          })}
          key={crewMember.crewMemberId}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-950">{crewMember.name}</p>
            <span className="text-xs text-zinc-500">#{crewMember.employeeNumber}</span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-600">
              {formatRole(crewMember.seatRole)}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Base {crewMember.baseStationCode} | {crewMember.locationLabel}
          </p>
          {crewMember.notes.length > 0 ? (
            <p className="mt-1 text-xs text-zinc-600">{crewMember.notes.slice(0, 2).join("; ")}</p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function CoverageDrawer({
  data,
  state,
}: {
  data: CrewSchedulingWorkbenchData;
  state: WorkbenchState;
}) {
  const day = data.calendarDays.find((candidate) => candidate.dayKey === state.bucketDate);
  const bucket = day?.buckets.find(
    (candidate) =>
      candidate.aircraftType === state.filters.aircraftType &&
      candidate.seatRole === state.filters.role,
  );

  return (
    <ContextDrawer
      closeHref={resetDrawerHref(state)}
      eyebrow="Coverage bucket"
      size="wide"
      title={
        bucket && day
          ? `${formatAircraftType(bucket.aircraftType)} ${formatRole(bucket.seatRole)} | ${day.label}`
          : "Coverage"
      }
    >
      {!bucket || !day ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Coverage bucket was not found for the active filters.
        </p>
      ) : (
        <div className="space-y-4">
          <section className="grid gap-2 sm:grid-cols-4">
            <SummaryCard label="Scheduled" value={bucket.counts.scheduled} />
            <SummaryCard label="Reserve" value={bucket.counts.reserve} />
            <SummaryCard label="Assigned" value={bucket.counts.assigned} />
            <SummaryCard label="Flight gaps" value={bucket.flightGaps.length} />
          </section>
          {[
            ["Scheduled", bucket.crew.scheduled],
            ["Reserve", bucket.crew.reserve],
            ["Assigned", bucket.crew.assigned],
            ["Pending off", bucket.crew.pendingOff],
            ["Approved off", bucket.crew.approvedOff],
            ["Occupied", bucket.crew.occupied],
            ["Off", bucket.crew.off],
            ["Unavailable", bucket.crew.unavailable],
          ].map(([label, crew]) => (
            <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={label as string}>
              <h3 className="mb-2 text-sm font-semibold text-zinc-950">{label as string}</h3>
              <CrewList crew={crew as CrewCoverageCrewDetail[]} state={state} />
            </section>
          ))}
          {bucket.flightGaps.length > 0 ? (
            <section className="rounded-md border border-rose-200 bg-rose-50 p-3">
              <h3 className="text-sm font-semibold text-rose-950">Flight-derived gaps</h3>
              <div className="mt-2 grid gap-2">
                {bucket.flightGaps.map((gap) => (
                  <article className="rounded-md border border-rose-200 bg-white p-3" key={`${gap.flightNumber}-${gap.scheduledDeparture.toISOString()}`}>
                    <p className="text-sm font-semibold text-zinc-950">{gap.flightNumber} | {gap.route}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {gap.tailNumber} | {toDateTime(gap.scheduledDeparture)} | Missing {gap.missingRoles.map(formatRole).join(", ")}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </ContextDrawer>
  );
}

function CrewDrawer({
  data,
  state,
}: {
  data: CrewSchedulingWorkbenchData;
  state: WorkbenchState;
}) {
  const crewMember = data.crewMembers.find((candidate) => candidate.crewMemberId === state.crewMemberId);

  return (
    <ContextDrawer closeHref={resetDrawerHref(state)} eyebrow="Crew drill-down" size="standard" title={crewMember?.name ?? "Crew"}>
      {!crewMember ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Crew member was not found in the active workbench window.
        </p>
      ) : (
        <div className="space-y-3">
          <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-semibold text-zinc-950">{crewMember.name}</p>
            <p className="mt-1 text-sm text-zinc-600">
              #{crewMember.employeeNumber} | {formatRole(crewMember.seatRole)} | {formatAircraftType(crewMember.aircraftType)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">Location: {crewMember.locationLabel}</p>
          </section>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800" href={`/crew/${crewMember.crewMemberId}`}>
              Crew profile
            </Link>
            <Link className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" href={buildHref(state, { drawer: "location" })}>
              Location
            </Link>
            {crewMember.assignmentHref ? (
              <Link className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" href={crewMember.assignmentHref}>
                Assignment fit
              </Link>
            ) : null}
          </div>
          {crewMember.notes.length > 0 ? (
            <section className="rounded-md border border-zinc-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-zinc-950">Window notes</h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                {crewMember.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </ContextDrawer>
  );
}

function LocationDrawer({ data, state }: { data: CrewSchedulingWorkbenchData; state: WorkbenchState }) {
  const crewMember = data.crewMembers.find((candidate) => candidate.crewMemberId === state.crewMemberId);

  return (
    <ContextDrawer closeHref={resetDrawerHref(state)} eyebrow="Location" size="standard" title={crewMember?.name ?? "Location"}>
      {!crewMember ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Crew member was not found in the active workbench window.
        </p>
      ) : (
        <div className="space-y-3">
          <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-semibold text-zinc-950">Latest location</p>
            <p className="mt-1 text-sm text-zinc-700">{crewMember.locationLabel}</p>
          </section>
          <Link className="inline-flex rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" href={`/crew/${crewMember.crewMemberId}/logistics`}>
            Manage logistics
          </Link>
        </div>
      )}
    </ContextDrawer>
  );
}

function AssignmentDrawer({ data, state }: { data: CrewSchedulingWorkbenchData; state: WorkbenchState }) {
  const overlay = data.assignmentOverlay.find(
    (candidate) => candidate.aircraftId === state.aircraftId && candidate.dayKey === state.bucketDate,
  );

  return (
    <ContextDrawer closeHref={resetDrawerHref(state)} eyebrow="Assignment overlay" size="wide" title={overlay?.tailNumber ?? "Assignment"}>
      {!overlay ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Assignment context was not found for this aircraft/date.
        </p>
      ) : (
        <div className="space-y-4">
          <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-semibold text-zinc-950">{overlay.tailNumber} | {formatAircraftType(overlay.aircraftType)}</p>
            <p className="mt-1 text-sm text-zinc-600">{overlay.dayKey}</p>
            <Link className="mt-3 inline-flex rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800" href={`/aircraft/${overlay.aircraftId}/crew`}>
              Open aircraft crew workflow
            </Link>
          </section>
          <section className="rounded-md border border-zinc-200 bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold text-zinc-950">Assigned crew</h3>
            <CrewList crew={overlay.assignedCrew} state={state} />
          </section>
          <section className="rounded-md border border-zinc-200 bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold text-zinc-950">Flight legs</h3>
            {overlay.flightLegs.length === 0 ? (
              <p className="text-sm text-zinc-500">No flight-leg context in this window.</p>
            ) : (
              <div className="grid gap-2">
                {overlay.flightLegs.map((flightLeg) => (
                  <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={`${flightLeg.flightNumber}-${flightLeg.scheduledDeparture.toISOString()}`}>
                    <p className="text-sm font-semibold text-zinc-950">{flightLeg.flightNumber} | {flightLeg.route}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {toDateTime(flightLeg.scheduledDeparture)}
                      {flightLeg.missingRoles.length > 0 ? ` | Missing ${flightLeg.missingRoles.map(formatRole).join(", ")}` : " | Covered"}
                    </p>
                    {flightLeg.flightLegId ? (
                      <Link className="mt-2 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900" href={`/operations-control/${flightLeg.flightLegId}`}>
                        Operations detail
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </ContextDrawer>
  );
}

function ActiveDrawer({ data, state }: { data: CrewSchedulingWorkbenchData; state: WorkbenchState }) {
  if (state.drawer === "coverage") {
    return <CoverageDrawer data={data} state={state} />;
  }
  if (state.drawer === "crew") {
    return <CrewDrawer data={data} state={state} />;
  }
  if (state.drawer === "location") {
    return <LocationDrawer data={data} state={state} />;
  }
  if (state.drawer === "assignment") {
    return <AssignmentDrawer data={data} state={state} />;
  }

  return null;
}

export default async function CrewSchedulingPage({ searchParams }: PageProps) {
  const queryParams = await searchParams;
  const state = parseState(queryParams);
  const data = await getCrewSchedulingWorkbenchData({
    date: state.date,
    filters: state.filters,
    view: state.view,
  });

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Crew Scheduling
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Crew Coverage Workbench
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Month, week, and day coverage views for crew scheduling. This screen is read-only:
                schedule edits, request review, and aircraft staffing stay in their existing workflows.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="/crew/scheduling/periods">
                Periods
              </Link>
              <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="/crew/scheduling/time-off">
                Time off
              </Link>
              <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="/crew/scheduling/patterns">
                Patterns
              </Link>
              <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="/scheduling">
                Flight schedule
              </Link>
            </div>
          </div>
        </header>

        <TopTabs state={state} />
        <WorkbenchFilters data={data} state={state} />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <SummaryCard label="Window" value={`${toDate(data.viewStart)}-${toDate(data.viewEnd)}`} />
          <SummaryCard label="Active crew" value={data.summary.activeCrew} />
          <SummaryCard label="Scheduled" value={data.summary.scheduledCrew} />
          <SummaryCard label="Reserve" value={data.summary.reserveCrew} />
          <SummaryCard label="Assigned" value={data.summary.aircraftAssignedCrew} />
          <SummaryCard label="Flight gaps" value={data.summary.flightGaps} />
          <SummaryCard label="Requests" value={data.summary.pendingRequests} />
          <SummaryCard label="Time off" value={data.summary.pendingTimeOff} />
        </section>

        {state.tab === "coverage" ? <CoverageBoard data={data} state={state} /> : null}
        {state.tab === "planning" ? <PlanningTab data={data} /> : null}
        {state.tab === "assignment" ? <AssignmentTab data={data} state={state} /> : null}
        {state.tab === "requests" ? <RequestsTab data={data} /> : null}
      </div>
      <ActiveDrawer data={data} state={state} />
    </main>
  );
}
