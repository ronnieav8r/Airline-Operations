import Link from "next/link";
import { DutyStatus, EmploymentStatus, SeatRole, TimeOffRequestStatus } from "@prisma/client";

import {
  CREW_SCHEDULING_WINDOW_DAYS,
  CREW_SCHEDULING_WINDOW_DAY_OPTIONS,
  CrewSchedulingWindowDays,
  CrewPlannerMember,
  getCrewSchedulingPlannerData,
} from "@/lib/crew-scheduling-planner-queries";

export const dynamic = "force-dynamic";

type CrewSchedulingSearchParams = {
  aircraft?: string | string[];
  assignment?: string | string[];
  availability?: string | string[];
  base?: string | string[];
  date?: string | string[];
  days?: string | string[];
  duty?: string | string[];
  groupBy?: string | string[];
  timeOff?: string | string[];
};

type PageProps = {
  searchParams: Promise<CrewSchedulingSearchParams>;
};

type FilterOption = {
  label: string;
  value: string;
};

type PlannerFilters = {
  aircraft: string;
  assignment: "all" | "assigned" | "unassigned";
  availability: "all" | "clear" | "caution" | "unavailable";
  base: string;
  duty:
    | "all"
    | "deadheading"
    | "off_duty"
    | "on_duty"
    | "reserve"
    | "sick"
    | "training"
    | "vacation";
  groupBy: "assignment" | "availability" | "base" | "duty";
  timeOff: "all" | "none" | "overlap";
};

type PlannerWindow = {
  date: string;
  days: CrewSchedulingWindowDays;
  windowStart: Date;
};

const AVAILABILITY_OPTIONS: FilterOption[] = [
  { label: "All availability", value: "all" },
  { label: "Clear", value: "clear" },
  { label: "Caution", value: "caution" },
  { label: "Unavailable warning", value: "unavailable" },
];

const DUTY_OPTIONS: FilterOption[] = [
  { label: "All duty states", value: "all" },
  { label: "On duty", value: "on_duty" },
  { label: "Reserve", value: "reserve" },
  { label: "Off duty", value: "off_duty" },
  { label: "Vacation", value: "vacation" },
  { label: "Sick", value: "sick" },
  { label: "Training", value: "training" },
  { label: "Deadheading", value: "deadheading" },
];

const ASSIGNMENT_OPTIONS: FilterOption[] = [
  { label: "All assignment states", value: "all" },
  { label: "Assigned now", value: "assigned" },
  { label: "Unassigned now", value: "unassigned" },
];

const TIME_OFF_OPTIONS: FilterOption[] = [
  { label: "All time-off states", value: "all" },
  { label: "Overlapping time off", value: "overlap" },
  { label: "No overlapping time off", value: "none" },
];

const GROUP_OPTIONS: FilterOption[] = [
  { label: "Group by availability", value: "availability" },
  { label: "Group by base", value: "base" },
  { label: "Group by assignment", value: "assignment" },
  { label: "Group by duty", value: "duty" },
];

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

function parseWindow(searchParams: CrewSchedulingSearchParams): PlannerWindow {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requestedDate = parseInputDate(firstParam(searchParams.date));
  const days = Number(firstParam(searchParams.days));
  const windowDays = CREW_SCHEDULING_WINDOW_DAY_OPTIONS.includes(
    days as CrewSchedulingWindowDays,
  )
    ? (days as CrewSchedulingWindowDays)
    : CREW_SCHEDULING_WINDOW_DAYS;
  const windowStart = requestedDate ?? today;

  return {
    date: formatInputDate(windowStart),
    days: windowDays,
    windowStart,
  };
}

function parseFilters(searchParams: CrewSchedulingSearchParams): PlannerFilters {
  return {
    aircraft: firstParam(searchParams.aircraft) ?? "all",
    assignment: oneOf(
      firstParam(searchParams.assignment),
      ["all", "assigned", "unassigned"] as const,
      "all",
    ),
    availability: oneOf(
      firstParam(searchParams.availability),
      ["all", "clear", "caution", "unavailable"] as const,
      "all",
    ),
    base: firstParam(searchParams.base) ?? "all",
    duty: oneOf(
      firstParam(searchParams.duty),
      [
        "all",
        "deadheading",
        "off_duty",
        "on_duty",
        "reserve",
        "sick",
        "training",
        "vacation",
      ] as const,
      "all",
    ),
    groupBy: oneOf(
      firstParam(searchParams.groupBy),
      ["assignment", "availability", "base", "duty"] as const,
      "availability",
    ),
    timeOff: oneOf(firstParam(searchParams.timeOff), ["all", "none", "overlap"] as const, "all"),
  };
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

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function employmentBadgeClasses(status: EmploymentStatus): string {
  if (status === EmploymentStatus.ACTIVE) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === EmploymentStatus.ON_LEAVE) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function dutyBadgeClasses(status: DutyStatus): string {
  if (status === DutyStatus.ON_DUTY || status === DutyStatus.RESERVE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === DutyStatus.SICK || status === DutyStatus.VACATION) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === DutyStatus.TRAINING || status === DutyStatus.DEADHEADING) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function timeOffBadgeClasses(status: TimeOffRequestStatus): string {
  if (status === TimeOffRequestStatus.APPROVED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function availabilityBadgeClasses(crewMember: CrewPlannerMember): string {
  if (crewMember.availabilityWarnings.length === 0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (
    crewMember.employmentStatus !== EmploymentStatus.ACTIVE ||
    crewMember.dutyStatus === DutyStatus.SICK ||
    crewMember.dutyStatus === DutyStatus.VACATION
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function availabilityLabel(crewMember: CrewPlannerMember): string {
  if (crewMember.availabilityWarnings.length === 0) {
    return "Available context clear";
  }
  if (
    crewMember.employmentStatus !== EmploymentStatus.ACTIVE ||
    crewMember.dutyStatus === DutyStatus.SICK ||
    crewMember.dutyStatus === DutyStatus.VACATION
  ) {
    return "Unavailable warning";
  }
  return "Review warnings";
}

function availabilityFilterValue(crewMember: CrewPlannerMember): PlannerFilters["availability"] {
  if (crewMember.availabilityWarnings.length === 0) {
    return "clear";
  }
  if (
    crewMember.employmentStatus !== EmploymentStatus.ACTIVE ||
    crewMember.dutyStatus === DutyStatus.SICK ||
    crewMember.dutyStatus === DutyStatus.VACATION
  ) {
    return "unavailable";
  }
  return "caution";
}

function dutyFilterValue(status: DutyStatus): PlannerFilters["duty"] {
  return status.toLowerCase() as PlannerFilters["duty"];
}

function filterCrewMembers(
  crewMembers: CrewPlannerMember[],
  filters: PlannerFilters,
): CrewPlannerMember[] {
  return crewMembers.filter((crewMember) => {
    const matchesAvailability =
      filters.availability === "all" || availabilityFilterValue(crewMember) === filters.availability;
    const matchesDuty = filters.duty === "all" || dutyFilterValue(crewMember.dutyStatus) === filters.duty;
    const matchesAssignment =
      filters.assignment === "all" ||
      (filters.assignment === "assigned" && crewMember.currentAssignments.length > 0) ||
      (filters.assignment === "unassigned" && crewMember.currentAssignments.length === 0);
    const matchesTimeOff =
      filters.timeOff === "all" ||
      (filters.timeOff === "overlap" && crewMember.timeOffInWindow.length > 0) ||
      (filters.timeOff === "none" && crewMember.timeOffInWindow.length === 0);
    const matchesBase = filters.base === "all" || crewMember.baseStation.code === filters.base;
    const matchesAircraft =
      filters.aircraft === "all" ||
      crewMember.currentAssignments.some((assignment) => assignment.aircraft.id === filters.aircraft);

    return (
      matchesAvailability &&
      matchesDuty &&
      matchesAssignment &&
      matchesTimeOff &&
      matchesBase &&
      matchesAircraft
    );
  });
}

function filterOptionLabel(options: FilterOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function activeFilterLabels(
  filters: PlannerFilters,
  window: PlannerWindow,
  baseOptions: FilterOption[],
  aircraftOptions: FilterOption[],
): string[] {
  const labels: string[] = [`Window ${window.date} for ${window.days} day${window.days === 1 ? "" : "s"}`];

  if (filters.availability !== "all") {
    labels.push(filterOptionLabel(AVAILABILITY_OPTIONS, filters.availability));
  }
  if (filters.duty !== "all") {
    labels.push(filterOptionLabel(DUTY_OPTIONS, filters.duty));
  }
  if (filters.assignment !== "all") {
    labels.push(filterOptionLabel(ASSIGNMENT_OPTIONS, filters.assignment));
  }
  if (filters.timeOff !== "all") {
    labels.push(filterOptionLabel(TIME_OFF_OPTIONS, filters.timeOff));
  }
  if (filters.base !== "all") {
    labels.push(`Base ${filterOptionLabel(baseOptions, filters.base)}`);
  }
  if (filters.aircraft !== "all") {
    labels.push(`Aircraft ${filterOptionLabel(aircraftOptions, filters.aircraft)}`);
  }
  labels.push(filterOptionLabel(GROUP_OPTIONS, filters.groupBy));

  return labels;
}

function FilterSelect({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: keyof PlannerFilters;
  options: FilterOption[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
        defaultValue={value}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function HiddenFilterInputs({ filters }: { filters: PlannerFilters }) {
  return (
    <>
      <input name="groupBy" type="hidden" value={filters.groupBy} />
      <input name="availability" type="hidden" value={filters.availability} />
      <input name="duty" type="hidden" value={filters.duty} />
      <input name="assignment" type="hidden" value={filters.assignment} />
      <input name="timeOff" type="hidden" value={filters.timeOff} />
      <input name="base" type="hidden" value={filters.base} />
      <input name="aircraft" type="hidden" value={filters.aircraft} />
    </>
  );
}

function HiddenWindowInputs({ window }: { window: PlannerWindow }) {
  return (
    <>
      <input name="date" type="hidden" value={window.date} />
      <input name="days" type="hidden" value={window.days} />
    </>
  );
}

function buildBaseOptions(crewMembers: CrewPlannerMember[]): FilterOption[] {
  const stationCodes = Array.from(
    new Set(crewMembers.map((crewMember) => crewMember.baseStation.code)),
  ).sort();

  return [
    { label: "All bases", value: "all" },
    ...stationCodes.map((code) => ({ label: code, value: code })),
  ];
}

function buildAircraftOptions(crewMembers: CrewPlannerMember[]): FilterOption[] {
  const aircraftById = new Map<string, string>();

  for (const crewMember of crewMembers) {
    for (const assignment of crewMember.currentAssignments) {
      aircraftById.set(assignment.aircraft.id, assignment.aircraft.tailNumber);
    }
  }

  return [
    { label: "All aircraft", value: "all" },
    ...Array.from(aircraftById.entries())
      .sort(([, firstTail], [, secondTail]) => firstTail.localeCompare(secondTail))
      .map(([id, tailNumber]) => ({ label: tailNumber, value: id })),
  ];
}

function buildPlannerHref({
  filters,
  overrides,
  window,
}: {
  filters: PlannerFilters;
  overrides: Partial<PlannerFilters & Pick<PlannerWindow, "date" | "days">>;
  window: PlannerWindow;
}): string {
  const params = new URLSearchParams();
  const next = {
    ...filters,
    date: window.date,
    days: window.days,
    ...overrides,
  };

  params.set("date", next.date);
  params.set("days", String(next.days));
  params.set("groupBy", next.groupBy);
  params.set("availability", next.availability);
  params.set("duty", next.duty);
  params.set("assignment", next.assignment);
  params.set("timeOff", next.timeOff);
  params.set("base", next.base);
  params.set("aircraft", next.aircraft);

  return `/crew/scheduling?${params.toString()}`;
}

function buildCrewGroups(
  crewMembers: CrewPlannerMember[],
  allCrewMembers: CrewPlannerMember[],
  groupBy: PlannerFilters["groupBy"],
): Array<{
  key: string;
  label: string;
  members: CrewPlannerMember[];
}> {
  if (groupBy === "assignment") {
    const groups = [
      { key: "assigned", label: "Assigned now", members: [] as CrewPlannerMember[] },
      { key: "unassigned", label: "Unassigned now", members: [] as CrewPlannerMember[] },
    ];

    for (const crewMember of crewMembers) {
      groups[crewMember.currentAssignments.length > 0 ? 0 : 1].members.push(crewMember);
    }

    return groups;
  }

  if (groupBy === "base") {
    const baseCodes = Array.from(new Set(allCrewMembers.map((crewMember) => crewMember.baseStation.code))).sort();

    return baseCodes.map((baseCode) => ({
      key: baseCode,
      label: `Base ${baseCode}`,
      members: crewMembers.filter((crewMember) => crewMember.baseStation.code === baseCode),
    }));
  }

  if (groupBy === "duty") {
    return DUTY_OPTIONS.filter((option) => option.value !== "all").map((option) => ({
      key: option.value,
      label: option.label,
      members: crewMembers.filter(
        (crewMember) => dutyFilterValue(crewMember.dutyStatus) === option.value,
      ),
    }));
  }

  return AVAILABILITY_OPTIONS.filter((option) => option.value !== "all").map((option) => ({
    key: option.value,
    label: option.label,
    members: crewMembers.filter(
      (crewMember) => availabilityFilterValue(crewMember) === option.value,
    ),
  }));
}

export default async function CrewSchedulingPage({ searchParams }: PageProps) {
  const queryParams = await searchParams;
  const window = parseWindow(queryParams);
  const data = await getCrewSchedulingPlannerData({
    windowDays: window.days,
    windowStart: window.windowStart,
  });
  const filters = parseFilters(queryParams);
  const filteredCrewMembers = filterCrewMembers(data.crewMembers, filters);
  const baseOptions = buildBaseOptions(data.crewMembers);
  const aircraftOptions = buildAircraftOptions(data.crewMembers);
  const activeFilters = activeFilterLabels(filters, window, baseOptions, aircraftOptions);
  const crewGroups = buildCrewGroups(filteredCrewMembers, data.crewMembers, filters.groupBy);
  const windowLabel = `${toDate(data.windowStart)} - ${toDate(data.windowEnd)}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Crew Scheduling
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Crew Availability Planner
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Read-only availability, schedule, time-off, assignment, and upcoming
                FlightLeg coverage context. Actual staffing changes still happen through
                aircraft-block crew assignments.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling/time-off"
              >
                Time off
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling/periods"
              >
                Schedule periods
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling/patterns"
              >
                Rotation patterns
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/logistics"
              >
                Logistics workbench
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew"
              >
                Crew roster
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/scheduling"
              >
                Flight schedule
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-semibold">Planning boundary</p>
          <p className="mt-1">
            This page helps decide who appears available. It does not assign crew,
            replace aircraft-block staffing, enforce duty/rest, or block release actions.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          {[
            ["Bid open", "Crew requests and preferences enter the period review queue."],
            ["Drafting", "Ops builds schedule entries and reviews warning-only conflicts."],
            ["Published", "Published entries create CrewSchedule availability rows."],
            ["Archived", "Historical periods stay visible without active scheduling work."],
          ].map(([title, body]) => (
            <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={title}>
              <p className="text-sm font-semibold text-zinc-950">{title}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-600">{body}</p>
            </article>
          ))}
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Planning window</h2>
              <p className="text-sm text-zinc-600">
                Choose the date and window length for read-only schedule,
                time-off, and coverage context.
              </p>
            </div>
            <Link
              className="text-sm font-semibold text-sky-700 hover:text-sky-900"
              href="/crew/scheduling"
            >
              Reset planner
            </Link>
          </div>
          <form className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5" method="GET">
            <HiddenFilterInputs filters={filters} />
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Start date
              </span>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
                defaultValue={window.date}
                name="date"
                type="date"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Window
              </span>
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
                defaultValue={String(window.days)}
                name="days"
              >
                {CREW_SCHEDULING_WINDOW_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} day{days === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                type="submit"
              >
                Apply window
              </button>
            </div>
          </form>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <Link
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-700 hover:bg-zinc-100"
              href={buildPlannerHref({
                filters,
                overrides: { date: formatInputDate(today) },
                window,
              })}
            >
              Today
            </Link>
            <Link
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-700 hover:bg-zinc-100"
              href={buildPlannerHref({
                filters,
                overrides: { date: formatInputDate(tomorrow) },
                window,
              })}
            >
              Tomorrow
            </Link>
            {[1, 3, 7, 14].map((days) => (
              <Link
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-700 hover:bg-zinc-100"
                href={buildPlannerHref({
                  filters,
                  overrides: { days: days as CrewSchedulingWindowDays },
                  window,
                })}
                key={days}
              >
                {days} day{days === 1 ? "" : "s"}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Planner filters</h2>
              <p className="text-sm text-zinc-600">
                URL-driven filters for the read-only availability planner.
              </p>
            </div>
            <Link
              className="text-sm font-semibold text-sky-700 hover:text-sky-900"
              href="/crew/scheduling"
            >
              Reset filters
            </Link>
          </div>
          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7" method="GET">
            <HiddenWindowInputs window={window} />
            <FilterSelect
              label="Grouping"
              name="groupBy"
              options={GROUP_OPTIONS}
              value={filters.groupBy}
            />
            <FilterSelect
              label="Availability"
              name="availability"
              options={AVAILABILITY_OPTIONS}
              value={filters.availability}
            />
            <FilterSelect label="Duty" name="duty" options={DUTY_OPTIONS} value={filters.duty} />
            <FilterSelect
              label="Assignment"
              name="assignment"
              options={ASSIGNMENT_OPTIONS}
              value={filters.assignment}
            />
            <FilterSelect
              label="Time off"
              name="timeOff"
              options={TIME_OFF_OPTIONS}
              value={filters.timeOff}
            />
            <FilterSelect label="Base" name="base" options={baseOptions} value={filters.base} />
            <FilterSelect
              label="Aircraft"
              name="aircraft"
              options={aircraftOptions}
              value={filters.aircraft}
            />
            <div className="sm:col-span-2 lg:col-span-7">
              <button
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                type="submit"
              >
                Apply filters
              </button>
            </div>
          </form>
          <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            Showing {filteredCrewMembers.length} of {data.crewMembers.length} crew member
            {data.crewMembers.length === 1 ? "" : "s"}.
            {activeFilters.length === 0 ? (
              <span className="ml-1 text-zinc-500">No active filters.</span>
            ) : (
              <span className="ml-1">Active filters: {activeFilters.join(" | ")}.</span>
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Planning window</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{windowLabel}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {window.days} day{window.days === 1 ? "" : "s"}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active crew</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.activeCrew}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Schedule blocks</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.crewWithScheduleBlocks}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Period entries</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.crewWithScheduleEntries}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Time-off overlap</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.crewWithTimeOff}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Assigned now</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.assignedCrew}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Warnings / gaps</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.crewWithAvailabilityWarnings} /{" "}
              {data.summary.upcomingCoverageGaps}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Compliance review</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.crewWithComplianceWarnings}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Logistics needs</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.crewWithOpenLogisticsNeeds}
            </p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Crew availability</h2>
              <p className="text-sm text-zinc-600">
                Warning-only planning context for crew scheduling and aircraft-block
                staffing decisions.
              </p>
            </div>
          </div>

          {data.crewMembers.length === 0 ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No crew members found.
            </p>
          ) : filteredCrewMembers.length === 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">No crew match the active filters.</p>
              <p className="mt-1">
                Adjust the planner filters or return to the full crew scheduling view.
              </p>
              <Link
                className="mt-3 inline-flex font-semibold text-amber-950 underline underline-offset-2"
                href="/crew/scheduling"
              >
                Reset planner filters
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-5">
              {crewGroups.map((group) => (
                <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={group.key}>
                  <div className="flex flex-col gap-1 border-b border-zinc-200 pb-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-950">{group.label}</h3>
                      <p className="text-sm text-zinc-600">
                        {group.members.length} crew member{group.members.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  {group.members.length === 0 ? (
                    <p className="mt-3 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500">
                      No crew in this group after active filters.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-4">
                      {group.members.map((crewMember) => (
                        <article
                          className="rounded-md border border-zinc-200 bg-white p-4"
                          key={crewMember.id}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-zinc-950">
                                  {crewMember.firstName} {crewMember.lastName}
                                </h3>
                                <span className="text-xs text-zinc-500">
                                  #{crewMember.employeeNumber}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-zinc-600">
                                Base {crewMember.baseStation.code} - {crewMember.baseStation.city}
                              </p>
                              <Link
                                className="mt-2 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                                href={`/crew/${crewMember.id}`}
                              >
                                Crew detail
                              </Link>
                              <Link
                                className="ml-3 mt-2 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                                href={`/crew/${crewMember.id}/logistics`}
                              >
                                Manage logistics
                              </Link>
                              <Link
                                className="ml-3 mt-2 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                                href={`/crew/${crewMember.id}/compliance`}
                              >
                                Compliance
                              </Link>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${employmentBadgeClasses(
                                  crewMember.employmentStatus,
                                )}`}
                              >
                                {formatStatus(crewMember.employmentStatus)}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${dutyBadgeClasses(
                                  crewMember.dutyStatus,
                                )}`}
                              >
                                {formatStatus(crewMember.dutyStatus)}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${availabilityBadgeClasses(
                                  crewMember,
                                )}`}
                              >
                                {availabilityLabel(crewMember)}
                              </span>
                            </div>
                          </div>

                          {crewMember.availabilityWarnings.length > 0 ? (
                            <ul className="mt-3 grid gap-2 text-sm text-amber-900 lg:grid-cols-2">
                              {crewMember.availabilityWarnings.map((warning) => (
                                <li
                                  className="rounded-md border border-amber-200 bg-amber-50 p-2"
                                  key={warning}
                                >
                                  {warning}
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          <div className="mt-4 grid gap-3 xl:grid-cols-7">
                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Schedule Blocks
                              </h4>
                              {crewMember.schedulesInWindow.length === 0 ? (
                                <p className="mt-2 text-sm text-zinc-600">
                                  No schedule block in this window.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2 text-sm">
                                  {crewMember.schedulesInWindow.map((schedule) => (
                                    <li key={schedule.id}>
                                      <div className="font-medium text-zinc-900">
                                        {toDate(schedule.date)} | {formatStatus(schedule.dutyStatus)}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        {schedule.startsAt ? toDateTime(schedule.startsAt) : "No start"} -{" "}
                                        {schedule.endsAt ? toDateTime(schedule.endsAt) : "No end"} |{" "}
                                        {schedule.station?.code ?? "No station"}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Period Entries
                              </h4>
                              {crewMember.scheduleEntriesInWindow.length === 0 ? (
                                <p className="mt-2 text-sm text-zinc-600">
                                  No schedule-period entries in this window.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2 text-sm">
                                  {crewMember.scheduleEntriesInWindow.map((entry) => (
                                    <li key={entry.id}>
                                      <div className="font-medium text-zinc-900">
                                        {toDate(entry.date)} | {formatStatus(entry.dutyStatus)}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        {entry.period.name} | {formatStatus(entry.status)} |{" "}
                                        {entry.station?.code ?? "No station"}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        {entry.startsAt ? toDateTime(entry.startsAt) : "No start"} -{" "}
                                        {entry.endsAt ? toDateTime(entry.endsAt) : "No end"}
                                      </div>
                                      {entry.rotationPattern ? (
                                        <div className="text-xs text-zinc-500">
                                          Pattern: {entry.rotationPattern.name}
                                        </div>
                                      ) : null}
                                      <Link
                                        className="mt-1 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                                        href={`/crew/scheduling/periods/${entry.period.id}#schedule-entries`}
                                      >
                                        Period detail
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Time Off
                              </h4>
                              {crewMember.timeOffInWindow.length === 0 ? (
                                <p className="mt-2 text-sm text-zinc-600">No overlapping time off.</p>
                              ) : (
                                <ul className="mt-2 space-y-2 text-sm">
                                  {crewMember.timeOffInWindow.map((request) => (
                                    <li key={request.id}>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${timeOffBadgeClasses(
                                          request.status,
                                        )}`}
                                      >
                                        {formatStatus(request.status)}
                                      </span>
                                      <div className="mt-1 text-zinc-900">
                                        {formatStatus(request.requestType)}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        {toDate(request.startDate)} - {toDate(request.endDate)}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Aircraft Assignment
                              </h4>
                              {crewMember.currentAssignments.length === 0 ? (
                                <p className="mt-2 text-sm text-zinc-600">
                                  No current aircraft-block assignment.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2 text-sm">
                                  {crewMember.currentAssignments.map((assignment) => (
                                    <li key={assignment.id}>
                                      <div className="font-medium text-zinc-900">
                                        {formatRoleLabel(assignment.seatRole)} on{" "}
                                        {assignment.aircraft.tailNumber}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        {assignment.aircraft.type.replaceAll("_", "-")} | since{" "}
                                        {toDateTime(assignment.startsAt)}
                                      </div>
                                      <Link
                                        className="mt-1 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                                        href={`/aircraft/${assignment.aircraft.id}/crew?crewMemberId=${crewMember.id}&seatRole=${assignment.seatRole}`}
                                      >
                                        Assignment fit
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Logistics
                              </h4>
                              {crewMember.locationRecords.length === 0 ? (
                                <p className="mt-2 text-sm text-zinc-600">No location record.</p>
                              ) : (
                                <p className="mt-2 text-sm text-zinc-700">
                                  {crewMember.locationRecords[0].station
                                    ? `${crewMember.locationRecords[0].station.code} - ${crewMember.locationRecords[0].station.city}`
                                    : crewMember.locationRecords[0].locationText ?? "Location not specified"}
                                  <span className="block text-xs text-zinc-500">
                                    {formatStatus(crewMember.locationRecords[0].source)} |{" "}
                                    {toDateTime(crewMember.locationRecords[0].effectiveAt)}
                                  </span>
                                </p>
                              )}
                              {crewMember.logisticsNeeds.length === 0 ? (
                                <p className="mt-2 text-sm text-zinc-600">No open logistics needs.</p>
                              ) : (
                                <ul className="mt-2 space-y-2 text-sm">
                                  {crewMember.logisticsNeeds.map((need) => (
                                    <li key={need.id}>
                                      <div className="font-medium text-zinc-900">
                                        {formatStatus(need.needType)} | {formatStatus(need.status)}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        {need.fromStation?.code ?? "Origin TBD"} -{" "}
                                        {need.toStation?.code ?? "Destination TBD"}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        {need.neededBy ? `Needed ${toDateTime(need.neededBy)}` : "No needed-by time"}
                                        {need.aircraft ? ` | ${need.aircraft.tailNumber}` : ""}
                                        {need.flightLeg ? ` | ${need.flightLeg.flightNumber ?? "FlightLeg"}` : ""}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Compliance
                              </h4>
                              {crewMember.complianceWarnings.length === 0 ? (
                                <p className="mt-2 text-sm text-emerald-700">
                                  No compliance evidence warnings.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2 text-sm text-amber-900">
                                  {crewMember.complianceWarnings.map((warning) => (
                                    <li
                                      className="rounded-md border border-amber-200 bg-amber-50 p-2"
                                      key={warning}
                                    >
                                      {warning}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Upcoming Coverage
                              </h4>
                              {crewMember.upcomingFlights.length === 0 ? (
                                <p className="mt-2 text-sm text-zinc-600">
                                  No upcoming covered FlightLegs in this window.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2 text-sm">
                                  {crewMember.upcomingFlights.slice(0, 4).map((flight) => (
                                    <li key={`${flight.id}-${crewMember.id}`}>
                                      <div className="font-medium text-zinc-900">
                                        {flight.flightNumber} | {flight.route}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        {toDateTime(flight.scheduledDeparture)} | {flight.tailNumber} |{" "}
                                        {flight.seatRoles.map(formatRoleLabel).join(", ")}
                                      </div>
                                      {flight.flightLegId ? (
                                        <Link
                                          className="mt-1 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                                          href={`/operations-control/${flight.flightLegId}`}
                                        >
                                          Operations detail
                                        </Link>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
