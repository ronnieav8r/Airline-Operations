import { AircraftType, SeatRole } from "@prisma/client";
import Link from "next/link";

import { ContextDrawer } from "@/components/context-drawer";
import { PlanningDraftCanvas } from "@/app/crew/scheduling/planning-draft-canvas";
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
    detail?: string | string[];
    drawer?: string | string[];
    focus?: string | string[];
    layer?: string | string[];
    role?: string | string[];
    sort?: string | string[];
    tab?: string | string[];
    view?: string | string[];
  }>;
};

type PersonnelSort = "status" | "name";
type CalendarDetailMode = "summary" | "names";

type WorkbenchState = {
  aircraftId: string;
  bucketDate: string;
  crewMemberId: string;
  date: Date;
  dateInput: string;
  detail: CalendarDetailMode;
  drawer: CrewSchedulingWorkbenchDrawer | "none";
  focus: "board" | "normal";
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

function addDaysDate(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
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
  const requestedTab = oneOf(firstParam(searchParams.tab), CREW_SCHEDULING_WORKBENCH_TABS, "coverage");
  const planningDate = requestedTab === "planning" && requestedDate < today ? today : requestedDate;
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
    date: planningDate,
    dateInput: inputDate(planningDate),
    detail: oneOf(firstParam(searchParams.detail), ["summary", "names"] as const, "summary"),
    drawer: oneOf(
      firstParam(searchParams.drawer),
      ["none", ...CREW_SCHEDULING_WORKBENCH_DRAWERS] as const,
      "none",
    ),
    focus: firstParam(searchParams.focus) === "board" ? "board" : "normal",
    filters: {
      aircraftType: requestedAircraftType,
      base: firstParam(searchParams.base) ?? "all",
      role: requestedRole,
    },
    layer: oneOf(firstParam(searchParams.layer), CREW_SCHEDULING_WORKBENCH_LAYERS, "schedule"),
    sort: oneOf(firstParam(searchParams.sort), ["status", "name"] as const, "status"),
    tab: requestedTab,
    view: oneOf(firstParam(searchParams.view), CREW_SCHEDULING_WORKBENCH_VIEWS, "four-week"),
  };
}

function buildHref(state: WorkbenchState, overrides: Partial<{
  aircraftId: string;
  aircraftType: AircraftType | "all";
  base: string;
  bucketDate: string;
  crewMemberId: string;
  date: string;
  detail: CalendarDetailMode;
  drawer: CrewSchedulingWorkbenchDrawer | "none";
  focus: "board" | "normal";
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
    detail: state.detail,
    drawer: state.drawer,
    focus: state.focus,
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
  params.set("detail", next.detail);

  if (next.drawer !== "none") {
    params.set("drawer", next.drawer);
  }
  if (next.focus === "board") {
    params.set("focus", "board");
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

function rollingStepDays(view: CrewSchedulingWorkbenchView): number {
  if (view === "eight-week") {
    return 56;
  }

  if (view === "four-week") {
    return 28;
  }

  if (view === "week") {
    return 7;
  }

  if (view === "day") {
    return 1;
  }

  return 7;
}

function shiftedWindowDate(state: WorkbenchState, direction: -1 | 1): string {
  if (state.view === "month") {
    const next = new Date(state.date.getFullYear(), state.date.getMonth() + direction, 1);
    return inputDate(next);
  }

  return inputDate(addDaysDate(state.date, rollingStepDays(state.view) * direction));
}

function planningMinDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function canShiftWindowBack(state: WorkbenchState, viewStart: Date): boolean {
  if (state.tab !== "planning") {
    return true;
  }

  return viewStart > planningMinDate();
}

function CountPill({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "good" | "warn" | "bad" | "assigned";
  value: number;
}) {
  const toneClasses = {
    assigned: "border-sky-200 bg-sky-50 text-sky-800",
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

function ScheduledRollupPill({
  scheduled,
}: {
  scheduled: number;
}) {
  return (
    <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-md border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[0.68rem] font-semibold text-zinc-800">
      Sched total <span className="tabular-nums">{scheduled}</span>
    </span>
  );
}

function SummaryCard({
  description,
  emphasis = "normal",
  label,
  value,
}: {
  description?: string;
  emphasis?: "normal" | "rollup";
  label: string;
  value: number | string;
}) {
  const className =
    emphasis === "rollup"
      ? "rounded-md border border-zinc-300 bg-zinc-100 p-3"
      : "rounded-md border border-zinc-200 bg-white p-3";

  return (
    <article className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-950">{value}</p>
      {description ? <p className="mt-1 text-[0.68rem] font-medium leading-snug text-zinc-500">{description}</p> : null}
    </article>
  );
}

function BoardFiltersPopover({ data, state }: { data: CrewSchedulingWorkbenchData; state: WorkbenchState }) {
  const inputClass = "mt-0.5 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900";
  const labelClass = "text-[0.62rem] font-semibold uppercase tracking-wide text-zinc-500";

  return (
    <details className="relative">
      <summary className="list-none rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50">
        Filters
      </summary>
      <form className="fixed right-2 top-14 z-50 grid w-[min(420px,calc(100vw-1rem))] gap-2 rounded-md border border-zinc-300 bg-white p-3 shadow-2xl sm:grid-cols-2" method="get">
        <input name="tab" type="hidden" value={state.tab} />
        <input name="view" type="hidden" value={state.view} />
        <input name="detail" type="hidden" value={state.detail} />
        {state.focus === "board" ? <input name="focus" type="hidden" value="board" /> : null}
        <label className="block">
          <span className={labelClass}>Jump date</span>
          <input
            className={inputClass}
            defaultValue={state.dateInput}
            name="date"
            type="date"
          />
        </label>
        <label className="block">
          <span className={labelClass}>Airframe</span>
          <select
            className={inputClass}
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
          <span className={labelClass}>Role</span>
          <select
            className={inputClass}
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
          <span className={labelClass}>Base</span>
          <select
            className={inputClass}
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
          <span className={labelClass}>Layer</span>
          <select
            className={inputClass}
            defaultValue={state.layer}
            name="layer"
          >
            <option value="schedule">Schedule coverage</option>
            <option value="assignment">Assignment overlay</option>
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Sort</span>
          <select
            className={inputClass}
            defaultValue={state.sort}
            name="sort"
          >
            <option value="status">Status</option>
            <option value="name">Name</option>
          </select>
        </label>
        <div className="flex items-end gap-2 sm:col-span-2">
          <button
            className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            type="submit"
          >
            Apply
          </button>
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            href="/crew/scheduling?view=four-week&tab=coverage"
          >
            Reset
          </Link>
        </div>
      </form>
    </details>
  );
}

function planningBoardMinWidth(data: CrewSchedulingWorkbenchData): string {
  return `${360 + data.calendarDays.length * 56}px`;
}

function BoardToolbar({
  data,
  minWidth,
  state,
}: {
  data: CrewSchedulingWorkbenchData;
  minWidth?: string;
  state: WorkbenchState;
}) {
  const isFocusedPosition = state.filters.aircraftType !== "all" && state.filters.role !== "all";
  const scopeLabel =
    state.filters.aircraftType === "all" || state.filters.role === "all"
      ? "All crew"
      : `${formatAircraftType(state.filters.aircraftType)} ${formatRole(state.filters.role)}`;
  const canGoBack = canShiftWindowBack(state, data.viewStart);
  const todayDate = inputDate(planningMinDate());

  return (
    <div
      className="sticky top-0 z-40 -mx-1 mb-2 rounded-md border border-zinc-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur"
      style={minWidth ? { minWidth: `max(100%, ${minWidth})` } : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
            {scopeLabel}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
            {toDate(data.viewStart)}-{toDate(data.viewEnd)}
          </span>
          <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-0.5">
            {canGoBack ? (
              <Link
                aria-label="Previous schedule window"
                className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                href={buildHref(state, { date: shiftedWindowDate(state, -1) })}
              >
                Prev
              </Link>
            ) : (
              <span className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-400">Prev</span>
            )}
            <Link
              className="rounded-full px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-50"
              href={buildHref(state, { date: todayDate })}
            >
              Today
            </Link>
            <form action="/crew/scheduling" className="flex items-center" method="get">
              <input name="view" type="hidden" value={state.view} />
              <input name="tab" type="hidden" value={state.tab} />
              <input name="layer" type="hidden" value={state.layer} />
              <input name="aircraftType" type="hidden" value={state.filters.aircraftType} />
              <input name="role" type="hidden" value={state.filters.role} />
              <input name="base" type="hidden" value={state.filters.base} />
              <input name="sort" type="hidden" value={state.sort} />
              <input name="detail" type="hidden" value={state.detail} />
              {state.focus === "board" ? <input name="focus" type="hidden" value="board" /> : null}
              <input
                aria-label="Jump schedule date"
                className="h-7 w-32 rounded-full border border-zinc-200 bg-zinc-50 px-2 text-xs font-semibold text-zinc-800"
                min={state.tab === "planning" ? todayDate : undefined}
                name="date"
                type="date"
                defaultValue={state.dateInput}
              />
              <button className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
                Go
              </button>
            </form>
            <Link
              aria-label="Next schedule window"
              className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              href={buildHref(state, { date: shiftedWindowDate(state, 1) })}
            >
              Next
            </Link>
          </div>
          <span className="hidden rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 md:inline-flex">
            Active {data.summary.activeCrew}
          </span>
          <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 md:inline-flex">
            Gaps {data.summary.flightGaps}
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          <div className="flex rounded-full border border-zinc-200 bg-white p-0.5">
            {([
              { label: "Schedule", value: "coverage" },
              { label: "Planning", value: "planning" },
            ] as const).map((tab) => (
              <Link
                className={
                  state.tab === tab.value
                    ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                }
                href={buildHref(state, { tab: tab.value })}
                key={tab.value}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="flex rounded-full border border-zinc-200 bg-white p-0.5">
            {([
              { label: "4", value: "four-week" },
              { label: "8", value: "eight-week" },
              { label: "Mo", value: "month" },
              { label: "Wk", value: "week" },
              { label: "Day", value: "day" },
            ] as const).map((view) => (
              <Link
                className={
                  state.view === view.value
                    ? "rounded-full bg-sky-700 px-2.5 py-1 text-xs font-semibold text-white"
                    : "rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-sky-50 hover:text-sky-800"
                }
                href={buildHref(state, { view: view.value })}
                key={view.value}
              >
                {view.label}
              </Link>
            ))}
          </div>
          {!isFocusedPosition ? (
            <div className="flex rounded-full border border-zinc-200 bg-white p-0.5">
              {([
                { label: "Summary", value: "summary" },
                { label: "Names", value: "names" },
              ] as const).map((detail) => (
                <Link
                  className={
                    state.detail === detail.value
                      ? "rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white"
                      : "rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                  }
                  href={buildHref(state, { detail: detail.value })}
                  key={detail.value}
                >
                  {detail.label}
                </Link>
              ))}
            </div>
          ) : null}
          <BoardFiltersPopover data={data} state={state} />
          <Link
            className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
            href={buildHref(state, { focus: state.focus === "board" ? "normal" : "board" })}
          >
            {state.focus === "board" ? "Exit focus" : "Focus"}
          </Link>
        </div>
      </div>
    </div>
  );
}

type BucketCrewNameRow = {
  crewMember: CrewCoverageCrewDetail;
  label: string;
  tone: "neutral" | "good" | "warn" | "bad";
};

function bucketCrewNameRows(bucket: CrewCoverageRoleBucket): BucketCrewNameRow[] {
  const rows = new Map<string, BucketCrewNameRow>();
  const groups: Array<{
    crew: CrewCoverageCrewDetail[];
    label: string;
    tone: BucketCrewNameRow["tone"];
  }> = [
    { crew: bucket.crew.assigned, label: "Assigned", tone: "neutral" },
    { crew: bucket.crew.reserve, label: "Reserve", tone: "good" },
    { crew: bucket.crew.scheduled, label: "Reserve", tone: "good" },
    { crew: bucket.crew.pendingOff, label: "Pending", tone: "warn" },
    { crew: bucket.crew.approvedOff, label: "Approved off", tone: "bad" },
    { crew: bucket.crew.occupied, label: "Occupied", tone: "warn" },
    { crew: bucket.crew.off, label: "Off", tone: "neutral" },
    { crew: bucket.crew.unavailable, label: "Unavailable", tone: "bad" },
  ];

  for (const group of groups) {
    for (const crewMember of group.crew) {
      if (!rows.has(crewMember.crewMemberId)) {
        rows.set(crewMember.crewMemberId, {
          crewMember,
          label: group.label,
          tone: group.tone,
        });
      }
    }
  }

  return Array.from(rows.values()).sort((first, second) =>
    planningCrewDisplayName(first.crewMember.name).localeCompare(planningCrewDisplayName(second.crewMember.name)),
  );
}

function CrewNameRows({ rows }: { rows: BucketCrewNameRow[] }) {
  const toneClasses = {
    bad: "border-rose-200 bg-rose-50 text-rose-800",
    good: "border-emerald-200 bg-emerald-50 text-emerald-800",
    neutral: "border-zinc-200 bg-white text-zinc-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
  };

  if (rows.length === 0) {
    return <p className="mt-2 text-[0.7rem] font-medium text-zinc-500">No listed crew</p>;
  }

  return (
    <div className="mt-2 grid gap-1">
      {rows.map((row) => (
        <div
          className="min-w-0 rounded-md border border-zinc-200 bg-white px-2 py-1"
          key={row.crewMember.crewMemberId}
        >
          <p className="truncate text-[0.72rem] font-semibold leading-tight text-zinc-950">
            {planningCrewDisplayName(row.crewMember.name)}
          </p>
          <span
            className={`mt-1 inline-flex max-w-full items-center rounded-full border px-1.5 py-0.5 text-[0.58rem] font-semibold leading-none ${toneClasses[row.tone]}`}
          >
            {row.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function BucketCard({
  bucket,
  day,
  selected = false,
  state,
}: {
  bucket: CrewCoverageRoleBucket;
  day: CrewCoverageCalendarDay;
  selected?: boolean;
  state: WorkbenchState;
}) {
  return (
    <Link
      aria-label={`View ${formatAircraftType(bucket.aircraftType)} ${formatRole(bucket.seatRole)} coverage for ${day.label}`}
      className={
        selected
          ? "block rounded-md border border-sky-500 bg-sky-50 p-2 shadow-sm ring-2 ring-sky-300 transition hover:border-sky-600 hover:bg-sky-100 hover:ring-sky-400 hover:shadow-[0_0_0_3px_rgba(14,165,233,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          : "schedule-action-row schedule-hover-surface block rounded-md border border-zinc-300 p-2 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      }
      href={buildHref(state, {
        aircraftType: bucket.aircraftType,
        bucketDate: "",
        date: day.dayKey,
        drawer: "none",
        role: bucket.seatRole,
        tab: "coverage",
        view: state.view,
      })}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-zinc-950">
          {formatAircraftType(bucket.aircraftType)} {formatRole(bucket.seatRole)}
        </p>
        <div className="flex shrink-0 items-center">
          <span aria-hidden="true" className="text-sm font-semibold leading-none text-sky-700">
            &gt;
          </span>
        </div>
      </div>
      {bucket.flightGaps.length > 0 ? (
        <div className="mt-1">
          <span className="schedule-gap-pulse inline-flex min-h-6 min-w-14 items-center justify-center rounded-full border border-fuchsia-300 bg-fuchsia-50 px-2 py-0.5 text-center text-[0.65rem] font-semibold leading-none text-fuchsia-800">
            Gap {bucket.flightGaps.length}
          </span>
        </div>
      ) : null}
      {state.detail === "names" ? (
        <CrewNameRows rows={bucketCrewNameRows(bucket)} />
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">
          <ScheduledRollupPill scheduled={bucket.counts.scheduled} />
          <CountPill label="Res" tone="good" value={bucket.counts.reserve} />
          <CountPill label="Asg" tone="assigned" value={bucket.counts.assigned} />
          <CountPill label="Pend" tone="warn" value={bucket.counts.pendingOff} />
          <CountPill label="Off" value={bucket.counts.off} />
          <CountPill label="Unav" tone="bad" value={bucket.counts.unavailable + bucket.counts.approvedOff} />
        </div>
      )}
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

const TIMELINE_STATUSES: PersonnelStatusConfig[] = [
  { key: "assigned", label: "Assigned", tone: "neutral" },
  { key: "reserve", label: "Reserve", tone: "good" },
  { key: "scheduled", label: "Reserve", tone: "good" },
  { key: "pendingOff", label: "Pending off", tone: "warn" },
  { key: "approvedOff", label: "Approved off", tone: "bad" },
  { key: "occupied", label: "Occupied", tone: "warn" },
  { key: "off", label: "Off", tone: "neutral" },
  { key: "unavailable", label: "Unavailable", tone: "bad" },
];

const AVAILABLE_STATUS = {
  key: "available",
  label: "Unscheduled",
  tone: "neutral",
} as const;

type TimelineStatusConfig = PersonnelStatusConfig | typeof AVAILABLE_STATUS;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function WeekGroups({ days }: { days: CrewCoverageCalendarDay[] }) {
  const groups = new Map<string, Array<CrewCoverageCalendarDay | null>>();

  for (const day of days) {
    const weekStart = inputDate(startOfWeekDate(day.date));
    const slots = groups.get(weekStart) ?? Array<CrewCoverageCalendarDay | null>(7).fill(null);
    slots[day.date.getDay()] = day;
    groups.set(weekStart, slots);
  }

  return Array.from(groups.entries()).map(([weekStart, slots]) => ({
    label: `Week of ${toDate(parseInputDate(weekStart) ?? slots.find(Boolean)?.date ?? new Date())}`,
    slots,
    weekStart,
  }));
}

function DayHeader({
  day,
  showTotals = true,
  selected = false,
  state,
}: {
  day: CrewCoverageCalendarDay;
  showTotals?: boolean;
  selected?: boolean;
  state: WorkbenchState;
}) {
  return (
    <div className="border-b border-zinc-200 pb-2">
      <Link
        aria-label={`Open day view for ${day.label}`}
        className={
          selected
            ? "schedule-hover-surface flex min-h-12 items-start justify-between gap-2 rounded-md border border-sky-700 bg-white px-3 py-2 text-zinc-950 shadow-sm ring-2 ring-sky-500 hover:border-sky-700 hover:bg-sky-50 hover:ring-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            : "schedule-action-row schedule-hover-surface flex min-h-12 items-start justify-between gap-2 rounded-md border border-zinc-300 px-3 py-2 text-zinc-950 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        }
        href={buildHref(state, {
          bucketDate: "",
          date: day.dayKey,
          drawer: "none",
          tab: "coverage",
          view: "day",
        })}
      >
        <span className="min-w-0">
          {showTotals ? (
            <span className="flex flex-wrap items-baseline gap-x-1 text-sm font-semibold">
              <span>{WEEKDAY_LABELS[day.date.getDay()]},</span>
              <span>{toDate(day.date)}</span>
            </span>
          ) : (
            <span className="block text-sm font-semibold">{toDate(day.date)}</span>
          )}
        </span>
        <span aria-hidden="true" className="shrink-0 text-base font-semibold leading-5 text-sky-700">
          &gt;
        </span>
      </Link>
      {day.totals.flightGaps > 0 ? (
        <span className="schedule-gap-pulse mt-2 inline-flex min-h-7 min-w-24 items-center justify-center whitespace-nowrap rounded-full border border-fuchsia-300 bg-fuchsia-50 px-3 py-1 text-center text-xs font-semibold leading-none text-fuchsia-800">
          {day.totals.flightGaps} crew gap{day.totals.flightGaps === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}

function dayCardClass({
  compact,
  past,
  selected,
}: {
  compact: boolean;
  past: boolean;
  selected: boolean;
}) {
  const size = compact ? "min-h-48 p-3" : "p-4";
  const selectedStyle = selected
    ? "schedule-selected-day border-sky-500 ring-2 ring-sky-400"
    : past
      ? "schedule-past-day border-zinc-300"
      : "schedule-hover-surface border-zinc-300";

  return `schedule-day-card rounded-md border ${size} shadow-sm transition ${selectedStyle}`;
}

function statusToneStyle(status: TimelineStatusConfig) {
  const styles: Record<
    TimelineStatusConfig["key"],
    { backgroundColor: string; borderColor: string; color: string }
  > = {
    approvedOff: { backgroundColor: "#be123c", borderColor: "#9f1239", color: "#ffffff" },
    assigned: { backgroundColor: "#075985", borderColor: "#0c4a6e", color: "#ffffff" },
    available: { backgroundColor: "#ffffff", borderColor: "#a1a1aa", color: "#18181b" },
    occupied: { backgroundColor: "#92400e", borderColor: "#78350f", color: "#ffffff" },
    off: { backgroundColor: "#52525b", borderColor: "#3f3f46", color: "#ffffff" },
    pendingOff: { backgroundColor: "#b45309", borderColor: "#92400e", color: "#ffffff" },
    reserve: { backgroundColor: "#059669", borderColor: "#047857", color: "#ffffff" },
    scheduled: { backgroundColor: "#059669", borderColor: "#047857", color: "#ffffff" },
    unavailable: { backgroundColor: "#991b1b", borderColor: "#7f1d1d", color: "#ffffff" },
  };

  return styles[status.key];
}

function statusShortLabel(status: TimelineStatusConfig): string {
  const labels: Record<TimelineStatusConfig["key"], string> = {
    approvedOff: "Off",
    assigned: "Asg",
    available: "",
    occupied: "Occ",
    off: "Off",
    pendingOff: "Pend",
    reserve: "Res",
    scheduled: "Res",
    unavailable: "Unav",
  };

  return labels[status.key];
}

function bucketForPosition(
  day: CrewCoverageCalendarDay,
  state: WorkbenchState,
): CrewCoverageRoleBucket | null {
  if (state.filters.aircraftType === "all" || state.filters.role === "all") {
    return null;
  }

  return (
    day.buckets.find(
      (bucket) =>
        bucket.aircraftType === state.filters.aircraftType &&
        bucket.seatRole === state.filters.role,
    ) ?? null
  );
}

function assignedTailLabel(bucket: CrewCoverageRoleBucket, crewMemberId: string): string {
  const assignedCrew = bucket.crew.assigned.find(
    (crewMember) => crewMember.crewMemberId === crewMemberId,
  );
  const tailNumbers = Array.from(
    new Set(
      (assignedCrew?.notes ?? [])
        .map((note) => note.match(/\bN[A-Z0-9]+\b/)?.[0] ?? null)
        .filter((tailNumber): tailNumber is string => Boolean(tailNumber)),
    ),
  );

  return tailNumbers.length > 0 ? `Assigned ${tailNumbers.join(", ")}` : "Assigned";
}

function bucketForAircraftRole(
  day: CrewCoverageCalendarDay,
  aircraftType: AircraftType,
  seatRole: SeatRole,
): CrewCoverageRoleBucket | null {
  return (
    day.buckets.find(
      (bucket) => bucket.aircraftType === aircraftType && bucket.seatRole === seatRole,
    ) ?? null
  );
}

function statusForCrewInBucket(
  day: CrewCoverageCalendarDay,
  aircraftType: AircraftType,
  seatRole: SeatRole,
  crewMemberId: string,
): TimelineStatusConfig {
  const bucket = bucketForAircraftRole(day, aircraftType, seatRole);

  if (!bucket) {
    return AVAILABLE_STATUS;
  }

  for (const status of TIMELINE_STATUSES) {
    if (bucket.crew[status.key].some((crewMember) => crewMember.crewMemberId === crewMemberId)) {
      if (status.key === "assigned") {
        return { ...status, label: assignedTailLabel(bucket, crewMemberId) };
      }

      return status;
    }
  }

  return AVAILABLE_STATUS;
}

function statusForCrewOnDay(
  day: CrewCoverageCalendarDay,
  crewMemberId: string,
  state: WorkbenchState,
): TimelineStatusConfig {
  const bucket = bucketForPosition(day, state);

  if (!bucket) {
    return AVAILABLE_STATUS;
  }

  for (const status of TIMELINE_STATUSES) {
    if (bucket.crew[status.key].some((crewMember) => crewMember.crewMemberId === crewMemberId)) {
      if (status.key === "assigned") {
        return { ...status, label: assignedTailLabel(bucket, crewMemberId) };
      }

      return status;
    }
  }

  return AVAILABLE_STATUS;
}

function runLabel(run: { length: number; status: TimelineStatusConfig }) {
  if (run.status.key === "assigned") {
    return run.length >= 3 ? "Assigned" : "Asn";
  }

  return run.length >= 3 ? run.status.label : statusShortLabel(run.status);
}

function timelineRunMergeKey(status: TimelineStatusConfig): string {
  if (status.key === "reserve" || status.key === "scheduled") {
    return "reserve";
  }

  if (status.key === "assigned") {
    return `${status.key}:${status.label}`;
  }

  return status.key;
}

function sameTimelineRunStatus(first: TimelineStatusConfig, second: TimelineStatusConfig): boolean {
  return timelineRunMergeKey(first) === timelineRunMergeKey(second);
}

function planningCrewDisplayName(name: string): string {
  const cleaned = name
    .replace(/\s+\d{3,4}[A-Z]{2}(Captain|Firstofficer|FirstOfficer|Flightattendant|FlightAttendant)$/i, "")
    .replace(/\s+\d{3,4}\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(Captain|First\s*Officer|Flight\s*Attendant)$/i, "")
    .trim();

  return cleaned || name;
}

function statusRunsForCrew(
  days: CrewCoverageCalendarDay[],
  crewMemberId: string,
  state: WorkbenchState,
): Array<{
  endDay: CrewCoverageCalendarDay;
  length: number;
  startIndex: number;
  startDay: CrewCoverageCalendarDay;
  status: TimelineStatusConfig;
}> {
  const runs: Array<{
    endDay: CrewCoverageCalendarDay;
    length: number;
    startIndex: number;
    startDay: CrewCoverageCalendarDay;
    status: TimelineStatusConfig;
  }> = [];

  for (const [index, day] of days.entries()) {
    const status = statusForCrewOnDay(day, crewMemberId, state);
    const current = runs[runs.length - 1];

    if (current && sameTimelineRunStatus(current.status, status)) {
      current.endDay = day;
      current.length += 1;
      continue;
    }

    runs.push({
      endDay: day,
      length: 1,
      startDay: day,
      startIndex: index,
      status,
    });
  }

  return runs;
}

function statusRunsForCrewInBucket(
  days: CrewCoverageCalendarDay[],
  aircraftType: AircraftType,
  seatRole: SeatRole,
  crewMemberId: string,
): Array<{
  endDay: CrewCoverageCalendarDay;
  length: number;
  startIndex: number;
  startDay: CrewCoverageCalendarDay;
  status: TimelineStatusConfig;
}> {
  const runs: Array<{
    endDay: CrewCoverageCalendarDay;
    length: number;
    startIndex: number;
    startDay: CrewCoverageCalendarDay;
    status: TimelineStatusConfig;
  }> = [];

  for (const [index, day] of days.entries()) {
    const status = statusForCrewInBucket(day, aircraftType, seatRole, crewMemberId);
    const current = runs[runs.length - 1];

    if (current && sameTimelineRunStatus(current.status, status)) {
      current.endDay = day;
      current.length += 1;
      continue;
    }

    runs.push({
      endDay: day,
      length: 1,
      startDay: day,
      startIndex: index,
      status,
    });
  }

  return runs;
}

function sortFocusedCrew(
  crew: CrewCoverageCrewDetail[],
  days: CrewCoverageCalendarDay[],
  state: WorkbenchState,
) {
  return [...crew].sort((first, second) => {
    if (state.sort === "name") {
      return planningCrewDisplayName(first.name).localeCompare(planningCrewDisplayName(second.name));
    }

    const firstStatus = statusForCrewOnDay(days[0], first.crewMemberId, state);
    const secondStatus = statusForCrewOnDay(days[0], second.crewMemberId, state);
    const firstIndex = TIMELINE_STATUSES.findIndex((status) => status.key === firstStatus.key);
    const secondIndex = TIMELINE_STATUSES.findIndex((status) => status.key === secondStatus.key);
    const normalizedFirst = firstIndex === -1 ? TIMELINE_STATUSES.length : firstIndex;
    const normalizedSecond = secondIndex === -1 ? TIMELINE_STATUSES.length : secondIndex;

    if (normalizedFirst !== normalizedSecond) {
      return normalizedFirst - normalizedSecond;
    }

    return planningCrewDisplayName(first.name).localeCompare(planningCrewDisplayName(second.name));
  });
}

type TimelinePositionGroup = {
  aircraftType: AircraftType;
  crew: CrewCoverageCrewDetail[];
  seatRole: SeatRole;
};

function allPositionTimelineGroups(data: CrewSchedulingWorkbenchData): TimelinePositionGroup[] {
  const groups = new Map<string, TimelinePositionGroup & { crewMap: Map<string, CrewCoverageCrewDetail> }>();

  for (const day of data.calendarDays) {
    for (const bucket of day.buckets) {
      const key = `${bucket.aircraftType}-${bucket.seatRole}`;
      const current =
        groups.get(key) ??
        {
          aircraftType: bucket.aircraftType,
          crew: [],
          crewMap: new Map<string, CrewCoverageCrewDetail>(),
          seatRole: bucket.seatRole,
        };

      for (const status of TIMELINE_STATUSES) {
        for (const crewMember of bucket.crew[status.key]) {
          if (!current.crewMap.has(crewMember.crewMemberId)) {
            current.crewMap.set(crewMember.crewMemberId, crewMember);
          }
        }
      }

      groups.set(key, current);
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      aircraftType: group.aircraftType,
      crew: Array.from(group.crewMap.values()).sort((first, second) =>
        planningCrewDisplayName(first.name).localeCompare(planningCrewDisplayName(second.name)),
      ),
      seatRole: group.seatRole,
    }))
    .sort((first, second) => {
      const aircraftTypeSort = formatAircraftType(first.aircraftType).localeCompare(
        formatAircraftType(second.aircraftType),
      );

      if (aircraftTypeSort !== 0) {
        return aircraftTypeSort;
      }

      return formatRole(first.seatRole).localeCompare(formatRole(second.seatRole));
    });
}

function planningDraftCanvasProps(data: CrewSchedulingWorkbenchData) {
  return {
    activeDraft: data.activePlanningDraft
      ? {
          autosavedAt: data.activePlanningDraft.autosavedAt?.toISOString() ?? null,
          changes: data.activePlanningDraft.changes.map((change) => ({
            changeType: change.changeType,
            crewMemberId: change.crewMemberId,
            date: inputDate(change.date),
            dutyStatus: change.dutyStatus,
            endDate: inputDate(change.endDate),
            id: change.id,
            selectedForPublish: change.selectedForPublish,
            sourcePublishedEntryId: change.sourcePublishedEntryId,
            status: change.status,
          })),
          id: data.activePlanningDraft.id,
          name: data.activePlanningDraft.name,
        }
      : null,
    currentPeriodId: data.activePlanningDraft?.periodId ?? data.activePeriods[0]?.id ?? null,
    countMonths: data.countMonths.map((month) => ({
      end: inputDate(month.end),
      key: month.key,
      label: month.label,
      start: inputDate(month.start),
    })),
    days: data.calendarDays.map((day) => ({
      dayKey: day.dayKey,
      dayNumber: day.date.getDate(),
      label: day.label,
      weekday: WEEKDAY_LABELS[day.date.getDay()],
    })),
    groups: allPositionTimelineGroups(data).map((group) => ({
      aircraftType: group.aircraftType,
      crew: group.crew.map((crewMember) => ({
        baseStationCode: crewMember.baseStationCode,
        crewMemberId: crewMember.crewMemberId,
        name: planningCrewDisplayName(crewMember.name),
        publishedScheduledMonths: data.monthlyScheduledCounts
          .filter((count) => count.crewMemberId === crewMember.crewMemberId)
          .map((count) => ({
            monthKey: count.monthKey,
            published: count.published,
          })),
        publishedRuns: statusRunsForCrewInBucket(
          data.calendarDays,
          group.aircraftType,
          group.seatRole,
          crewMember.crewMemberId,
        )
          .filter((run) => run.status.key !== "available")
          .map((run) => ({
            endDayKey: run.endDay.dayKey,
            label: runLabel(run),
            length: run.length,
            startDayKey: run.startDay.dayKey,
            startIndex: run.startIndex,
            statusKey: run.status.key,
            style: statusToneStyle(run.status),
          })),
      })),
      label: `${formatAircraftType(group.aircraftType)} ${formatRole(group.seatRole)}`,
      seatRole: group.seatRole,
    })),
    rotationPatterns: data.rotationPatterns,
    viewEnd: inputDate(data.viewEnd),
    viewStart: inputDate(data.viewStart),
  };
}

function AllPositionsNamesTimeline({
  data,
  state,
}: {
  data: CrewSchedulingWorkbenchData;
  state: WorkbenchState;
}) {
  const groups = allPositionTimelineGroups(data);
  const compactTimeline = state.view === "four-week" || state.view === "month";
  const columnWidth = compactTimeline ? "minmax(42px, 1fr)" : "minmax(82px, 1fr)";
  const gridTemplateColumns = `minmax(185px, 230px) repeat(${data.calendarDays.length}, ${columnWidth})`;

  if (groups.length === 0) {
    return (
      <p className="mt-4 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500">
        No crew rows found for the active filters.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-4">
      {groups.map((group) => {
        const positionLabel = `${formatAircraftType(group.aircraftType)} ${formatRole(group.seatRole)}`;

        return (
          <section
            className="schedule-week-band rounded-md border border-zinc-300 p-3 shadow-sm"
            key={`${group.aircraftType}-${group.seatRole}`}
          >
            <div className="flex flex-col gap-2 border-b border-zinc-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Position timeline
                </p>
                <h3 className="text-base font-semibold text-zinc-950">{positionLabel}</h3>
              </div>
              <Link
                className="w-fit rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-sky-50 hover:text-sky-800"
                href={buildHref(state, {
                  aircraftType: group.aircraftType,
                  role: group.seatRole,
                })}
              >
                Open position
              </Link>
            </div>
            <div className="mt-3 overflow-x-auto rounded-md border border-zinc-300 bg-white shadow-sm">
              <div className="min-w-full" style={{ width: compactTimeline ? "max-content" : "100%" }}>
                <div
                  className="grid border-b border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-500"
                  style={{ gridTemplateColumns }}
                >
                  <div className="sticky left-0 z-10 border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-zinc-700">
                    Crew
                  </div>
                  {data.calendarDays.map((day) => (
                    <Link
                      aria-label={`Open day view for ${day.label}`}
                      className={
                        state.dateInput === day.dayKey
                          ? "border-r border-sky-200 bg-sky-50 px-2 py-2 text-center text-sky-900 ring-1 ring-inset ring-sky-200 hover:bg-sky-100"
                          : "schedule-action-row border-r border-zinc-200 px-2 py-2 text-center text-zinc-700 hover:bg-sky-50 hover:text-sky-800"
                      }
                      href={buildHref(state, { date: day.dayKey, view: "day" })}
                      key={day.dayKey}
                    >
                      <span className="block text-[0.65rem] uppercase">{WEEKDAY_LABELS[day.date.getDay()]}</span>
                      <span className="block text-xs font-semibold">{day.date.getDate()}</span>
                    </Link>
                  ))}
                </div>
                {group.crew.map((crewMember) => {
                  const displayName = planningCrewDisplayName(crewMember.name);
                  const runs = statusRunsForCrewInBucket(
                    data.calendarDays,
                    group.aircraftType,
                    group.seatRole,
                    crewMember.crewMemberId,
                  );

                  return (
                    <div
                      className="grid border-b border-zinc-100 last:border-b-0"
                      key={crewMember.crewMemberId}
                      style={{ gridTemplateColumns }}
                    >
                      <Link
                        className="sticky left-0 z-20 border-r border-zinc-200 bg-white px-3 py-2 hover:bg-sky-50"
                        href={buildHref(state, {
                          crewMemberId: crewMember.crewMemberId,
                          drawer: "crew",
                        })}
                      >
                        <p className="truncate text-sm font-semibold text-zinc-950">{displayName}</p>
                        <p className="truncate text-[0.68rem] text-zinc-500">
                          {formatRole(group.seatRole)} | Base {crewMember.baseStationCode}
                        </p>
                      </Link>
                      <div
                        className="grid min-h-11"
                        style={{
                          gridColumn: `2 / span ${data.calendarDays.length}`,
                          gridTemplateColumns: `repeat(${data.calendarDays.length}, ${columnWidth})`,
                        }}
                      >
                        {data.calendarDays.map((day, index) => (
                          <Link
                            aria-label={`${displayName} ${day.label}`}
                            className={
                              state.dateInput === day.dayKey
                                ? "border-r border-sky-100 bg-sky-50/70 hover:bg-sky-100"
                                : "border-r border-zinc-100 hover:bg-sky-50"
                            }
                            href={buildHref(state, { date: day.dayKey, view: "day" })}
                            key={day.dayKey}
                            style={{ gridColumn: index + 1, gridRow: 1 }}
                          />
                        ))}
                        {runs
                          .filter((run) => run.status.key !== "available")
                          .map((run) => (
                            <Link
                              aria-label={`${displayName} ${run.status.label} ${run.startDay.label} through ${run.endDay.label}`}
                              className="z-10 m-1 flex h-8 items-center justify-center rounded-sm border px-2 text-center text-[0.68rem] font-semibold leading-none shadow-sm"
                              href={buildHref(state, { date: run.startDay.dayKey, view: "day" })}
                              key={`${crewMember.crewMemberId}-${run.startDay.dayKey}-${run.status.key}`}
                              style={{
                                ...statusToneStyle(run.status),
                                gridColumn: `${run.startIndex + 1} / span ${run.length}`,
                                gridRow: 1,
                              }}
                              title={`${run.status.label}: ${run.startDay.label} through ${run.endDay.label}`}
                            >
                              <span className="truncate">{runLabel(run)}</span>
                            </Link>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PositionScheduleBoard({
  data,
  state,
}: {
  data: CrewSchedulingWorkbenchData;
  state: WorkbenchState;
}) {
  if (state.filters.aircraftType === "all" || state.filters.role === "all") {
    return null;
  }

  const crewRows = sortFocusedCrew(data.focusedCrew, data.calendarDays, state);
  const positionLabel = `${formatAircraftType(state.filters.aircraftType)} ${formatRole(state.filters.role)}`;
  const compactTimeline = state.view === "four-week" || state.view === "month";
  const columnWidth = compactTimeline ? "minmax(42px, 1fr)" : "minmax(82px, 1fr)";
  const gridTemplateColumns = `minmax(170px, 220px) repeat(${data.calendarDays.length}, ${columnWidth})`;

  return (
    <section className="schedule-week-band mt-4 rounded-md border border-zinc-300 p-3">
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Position schedule</p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">{positionLabel}</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Names on the left, calendar days across the top, status blocks across each person.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Link
            className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            href={buildHref(state, { aircraftType: "all", role: "all" })}
          >
            All positions
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[AVAILABLE_STATUS, ...TIMELINE_STATUSES].map((status) => (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold"
            key={status.key}
            style={statusToneStyle(status)}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: status.key === "available" ? "#71717a" : "#ffffff" }}
            />
            {status.label}
          </span>
        ))}
      </div>

      {crewRows.length === 0 ? (
        <p className="mt-3 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500">
          No qualified crew found for this position and base filter.
        </p>
      ) : state.view === "day" ? (
        <div className="mt-3 grid gap-2">
          {crewRows.map((crewMember) => {
            const displayName = planningCrewDisplayName(crewMember.name);
            const status = statusForCrewOnDay(data.calendarDays[0], crewMember.crewMemberId, state);

            return (
              <Link
                className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 hover:border-sky-300 hover:bg-sky-50 sm:flex-row sm:items-center sm:justify-between"
                href={buildHref(state, {
                  crewMemberId: crewMember.crewMemberId,
                  drawer: "crew",
                })}
                key={crewMember.crewMemberId}
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-950">{displayName}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Base {crewMember.baseStationCode}</p>
                </div>
                <span
                  className="inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={statusToneStyle(status)}
                >
                  {status.label}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="min-w-full" style={{ width: compactTimeline ? "max-content" : "100%" }}>
            <div
              className="grid border-b border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-500"
              style={{ gridTemplateColumns }}
            >
              <div className="sticky left-0 z-10 border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-zinc-700">
                Crew
              </div>
              {data.calendarDays.map((day) => (
                <Link
                  aria-label={`Open day view for ${day.label}`}
                  className={
                    state.dateInput === day.dayKey
                      ? "border-r border-sky-200 bg-sky-50 px-2 py-2 text-center text-sky-900 ring-1 ring-inset ring-sky-200 hover:bg-sky-100"
                      : "schedule-action-row border-r border-zinc-200 px-2 py-2 text-center text-zinc-700 hover:bg-sky-50 hover:text-sky-800"
                  }
                  href={buildHref(state, { date: day.dayKey, view: "day" })}
                  key={day.dayKey}
                >
                  <span className="block text-[0.65rem] uppercase">{WEEKDAY_LABELS[day.date.getDay()]}</span>
                  <span className="block text-xs font-semibold">{day.date.getDate()}</span>
                  <span className="mt-0.5 block text-[0.6rem] font-semibold uppercase tracking-wide text-sky-700">
                    View
                  </span>
                </Link>
              ))}
            </div>
            {crewRows.map((crewMember) => {
              const displayName = planningCrewDisplayName(crewMember.name);
              const runs = statusRunsForCrew(data.calendarDays, crewMember.crewMemberId, state);

              return (
                <div
                  className="grid border-b border-zinc-100 last:border-b-0"
                  key={crewMember.crewMemberId}
                  style={{ gridTemplateColumns }}
                >
                  <Link
                    className="sticky left-0 z-20 border-r border-zinc-200 bg-white px-3 py-2 hover:bg-sky-50"
                    href={buildHref(state, {
                      crewMemberId: crewMember.crewMemberId,
                      drawer: "crew",
                    })}
                  >
                    <p className="truncate text-sm font-semibold text-zinc-950">{displayName}</p>
                    <p className="truncate text-[0.68rem] text-zinc-500">Base {crewMember.baseStationCode}</p>
                  </Link>
                  <div
                    className="grid min-h-11"
                    style={{
                      gridColumn: `2 / span ${data.calendarDays.length}`,
                      gridTemplateColumns: `repeat(${data.calendarDays.length}, ${columnWidth})`,
                    }}
                  >
                    {data.calendarDays.map((day, index) => (
                      <Link
                        aria-label={`${displayName} ${day.label}`}
                        className={
                          state.dateInput === day.dayKey
                            ? "border-r border-sky-100 bg-sky-50/70 hover:bg-sky-100"
                            : "border-r border-zinc-100 hover:bg-sky-50"
                        }
                        href={buildHref(state, { date: day.dayKey, view: "day" })}
                        key={day.dayKey}
                        style={{ gridColumn: index + 1, gridRow: 1 }}
                      />
                    ))}
                    {runs
                      .filter((run) => run.status.key !== "available")
                      .map((run) => (
                        <Link
                          aria-label={`${displayName} ${run.status.label} ${run.startDay.label} through ${run.endDay.label}`}
                          className="z-10 m-1 flex h-8 items-center justify-center rounded-sm border px-2 text-center text-[0.68rem] font-semibold leading-none shadow-sm"
                          href={buildHref(state, { date: run.startDay.dayKey, view: "day" })}
                          key={`${crewMember.crewMemberId}-${run.startDay.dayKey}-${run.status.key}`}
                          style={{
                            ...statusToneStyle(run.status),
                            gridColumn: `${run.startIndex + 1} / span ${run.length}`,
                            gridRow: 1,
                          }}
                          title={`${run.status.label}: ${run.startDay.label} through ${run.endDay.label}`}
                        >
                          <span className="truncate">{runLabel(run)}</span>
                        </Link>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function CoverageBoard({ data, state }: { data: CrewSchedulingWorkbenchData; state: WorkbenchState }) {
  const isFocusedPosition = state.filters.aircraftType !== "all" && state.filters.role !== "all";
  const isPlanning = state.tab === "planning";
  const usesWidePlanningCanvas = isPlanning && !isFocusedPosition && state.detail === "names";
  const usesCalendarGrid = state.view === "four-week" || state.view === "month";
  const gridClasses = state.view === "day" ? "grid gap-3" : "grid gap-3 lg:grid-cols-7";
  const boardMinWidth = usesWidePlanningCanvas ? planningBoardMinWidth(data) : undefined;

  return (
    <section
      className={`rounded-md border shadow-sm ${state.focus === "board" ? "p-2" : "p-4"} ${
        isPlanning ? "schedule-planning-panel border-zinc-200" : "schedule-board-panel border-zinc-200"
      } ${usesWidePlanningCanvas ? "min-w-0 w-full" : ""}`}
      style={boardMinWidth ? { minWidth: `max(100%, ${boardMinWidth})` } : undefined}
    >
      <BoardToolbar data={data} minWidth={boardMinWidth} state={state} />

      {isFocusedPosition ? <PositionScheduleBoard data={data} state={state} /> : null}

      {!isFocusedPosition && state.detail === "names" && isPlanning ? (
        <PlanningDraftCanvas
          {...planningDraftCanvasProps(data)}
          isBoardFocused={state.focus === "board"}
          navigation={{
            nextHref: buildHref(state, { date: shiftedWindowDate(state, 1) }),
            previousHref: canShiftWindowBack(state, data.viewStart)
              ? buildHref(state, { date: shiftedWindowDate(state, -1) })
              : null,
            todayHref: buildHref(state, { date: inputDate(planningMinDate()) }),
          }}
          todayKey={inputDate(planningMinDate())}
        />
      ) : null}

      {!isFocusedPosition && state.detail === "names" && !isPlanning ? (
        <AllPositionsNamesTimeline data={data} state={state} />
      ) : null}

      {!isFocusedPosition && state.detail === "summary" && usesCalendarGrid ? (
        <div className="mt-4 grid gap-4">
          {WeekGroups({ days: data.calendarDays }).map((week) => (
            <section className="schedule-week-band rounded-md border border-zinc-300 p-3 shadow-sm" key={week.weekStart}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-950">{week.label}</p>
                <Link
                  className="shrink-0 rounded-full border border-sky-700 bg-sky-700 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:border-sky-800 hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
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
              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[0.68rem] font-semibold uppercase tracking-wide text-zinc-500">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {week.slots.map((day, index) =>
                  day ? (() => {
                    const isSelectedDay = state.dateInput === day.dayKey;
                    const isPastDay = day.dayKey < state.dateInput;

                    return (
                      <article
                        className={dayCardClass({
                          compact: true,
                          past: isPastDay,
                          selected: isSelectedDay,
                        })}
                        key={day.dayKey}
                      >
                        <DayHeader day={day} selected={isSelectedDay} showTotals={false} state={state} />
                        {day.buckets.length === 0 ? (
                          <p className="mt-3 text-sm text-zinc-500">No coverage rows for active filters.</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {day.buckets.map((bucket) => (
                              <BucketCard
                                bucket={bucket}
                                day={day}
                                key={`${day.dayKey}-${bucket.aircraftType}-${bucket.seatRole}`}
                                selected={
                                  isSelectedDay &&
                                  state.filters.aircraftType === bucket.aircraftType &&
                                  state.filters.role === bucket.seatRole
                                }
                                state={state}
                              />
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })() : (
                    <div
                      aria-hidden="true"
                      className="min-h-48 rounded-md border border-dashed border-zinc-200 bg-zinc-100/70"
                      key={`${week.weekStart}-${index}`}
                    />
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {!isFocusedPosition && state.detail === "summary" && !usesCalendarGrid ? (
        <div className={gridClasses + " mt-4"}>
          {data.calendarDays.map((day) => {
            const isSelectedDay = state.dateInput === day.dayKey;
            const isPastDay = day.dayKey < state.dateInput;

            return (
            <article
              className={dayCardClass({
                compact: state.view !== "day",
                past: isPastDay,
                selected: isSelectedDay,
              })}
              key={day.dayKey}
            >
              <DayHeader day={day} selected={isSelectedDay} state={state} />
              {day.buckets.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">No coverage rows for active filters.</p>
              ) : (
                <div className={state.view === "day" ? "mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3" : "mt-3 space-y-2"}>
                  {day.buckets.map((bucket) => (
                    <BucketCard
                      bucket={bucket}
                      day={day}
                      key={`${day.dayKey}-${bucket.aircraftType}-${bucket.seatRole}`}
                      selected={
                        isSelectedDay &&
                        state.filters.aircraftType === bucket.aircraftType &&
                        state.filters.role === bucket.seatRole
                      }
                      state={state}
                    />
                  ))}
                </div>
              )}
            </article>
            );
          })}
        </div>
      ) : null}
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
      {crew.map((crewMember) => {
        const displayName = planningCrewDisplayName(crewMember.name);

        return (
          <Link
            className="rounded-md border border-zinc-200 bg-white p-3 hover:bg-sky-50"
            href={buildHref(state, {
              crewMemberId: crewMember.crewMemberId,
              drawer: "crew",
            })}
            key={crewMember.crewMemberId}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-zinc-950">{displayName}</p>
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
        );
      })}
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
            <SummaryCard
              description="Total scheduled crew for this bucket."
              emphasis="rollup"
              label="Scheduled total"
              value={bucket.counts.scheduled}
            />
            <SummaryCard label="Reserve" value={bucket.counts.reserve} />
            <SummaryCard label="Assigned" value={bucket.counts.assigned} />
            <SummaryCard label="Flight gaps" value={bucket.flightGaps.length} />
          </section>
          {[
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
  const displayName = crewMember ? planningCrewDisplayName(crewMember.name) : null;

  return (
    <ContextDrawer closeHref={resetDrawerHref(state)} eyebrow="Crew drill-down" size="standard" title={displayName ?? "Crew"}>
      {!crewMember ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Crew member was not found in the active workbench window.
        </p>
      ) : (
        <div className="space-y-3">
          <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-semibold text-zinc-950">{displayName}</p>
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
  const displayName = crewMember ? planningCrewDisplayName(crewMember.name) : null;

  return (
    <ContextDrawer closeHref={resetDrawerHref(state)} eyebrow="Location" size="standard" title={displayName ?? "Location"}>
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
    minimumDate: state.tab === "planning" ? planningMinDate() : undefined,
    view: state.view,
  });
  const widePlanningCanvas =
    state.tab === "planning" &&
    state.detail === "names" &&
    state.filters.aircraftType === "all" &&
    state.filters.role === "all";

  return (
    <main className={`min-h-screen bg-zinc-100 text-zinc-950 ${state.focus === "board" ? "px-1 py-1 sm:px-2" : "px-4 py-3 sm:px-6 lg:px-8"}`}>
      {state.focus === "board" ? <style>{`.app-shell-header{display:none}`}</style> : null}
      <div
        className={`mx-auto flex flex-col ${state.focus === "board" ? "gap-2" : "gap-3"} ${
          widePlanningCanvas ? "w-full max-w-none" : "w-full max-w-[1680px]"
        }`}
      >
        <CoverageBoard data={data} state={state} />
      </div>
      <ActiveDrawer data={data} state={state} />
    </main>
  );
}
