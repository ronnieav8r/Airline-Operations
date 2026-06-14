import {
  AircraftType,
  DutyStatus,
  EmploymentStatus,
  SeatRole,
  TimeOffRequestStatus,
} from "@prisma/client";
import Link from "next/link";
import { ReactNode } from "react";

import { createCrewMemberAction } from "@/app/crew/actions";
import { reviewTimeOffRequestAction } from "@/app/crew/scheduling/time-off/actions";
import { ContextDrawer } from "@/components/context-drawer";
import { prisma } from "@/lib/prisma";
import {
  getUpcomingCoverageFlightsForAircrafts,
  UpcomingCoverageFlight,
} from "@/lib/flightleg-upcoming-coverage";
import {
  getTimeOffWorkflowData,
  TimeOffWorkflowData,
  TimeOffWorkflowRequest,
} from "@/lib/time-off-workflow-queries";

export const dynamic = "force-dynamic";

const UPCOMING_WINDOW_DAYS = 7;
const EXPIRING_SOON_DAYS = 30;
const TIME_OFF_STATUS_FILTERS = [
  TimeOffRequestStatus.PENDING,
  TimeOffRequestStatus.APPROVED,
  TimeOffRequestStatus.DENIED,
  TimeOffRequestStatus.CANCELLED,
] as const;

type PageProps = {
  searchParams: Promise<{
    assignment?: string | string[];
    base?: string | string[];
    duty?: string | string[];
    issue?: string | string[];
    panel?: string | string[];
    selected?: string | string[];
    status?: string | string[];
    timeOffStatus?: string | string[];
    error?: string | string[];
  }>;
};

type CrewMemberRow = Awaited<ReturnType<typeof getCrewRosterData>>["crewMembers"][number];
type CrewAssignmentRow = CrewMemberRow["assignments"][number];
type QualificationRow = CrewMemberRow["qualifications"][number];

type UpcomingFlightRow = Pick<
  UpcomingCoverageFlight,
  | "arrivalCode"
  | "coverage"
  | "departureCode"
  | "flightLegId"
  | "flightNumber"
  | "id"
  | "legacyFlightId"
  | "readSource"
  | "scheduledDeparture"
  | "status"
  | "tailNumber"
> & {
  seatRoles: SeatRole[];
};

type CrewFilters = {
  assignment: "all" | "assigned" | "unassigned";
  base: string;
  duty: "all" | DutyStatus;
  issue: "all" | "warnings";
  panel: "create" | "crew" | "time-off" | null;
  selected: string | null;
  status: "all" | EmploymentStatus;
  timeOffStatus: TimeOffRequestStatus | "all";
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return value && options.includes(value as T) ? (value as T) : fallback;
}

function parseCrewFilters(searchParams: Awaited<PageProps["searchParams"]>): CrewFilters {
  const panelParam = firstParam(searchParams.panel);

  return {
    assignment: oneOf(firstParam(searchParams.assignment), ["all", "assigned", "unassigned"], "all"),
    base: firstParam(searchParams.base) ?? "all",
    duty: oneOf(firstParam(searchParams.duty), ["all", ...Object.values(DutyStatus)], "all"),
    issue: oneOf(firstParam(searchParams.issue), ["all", "warnings"], "all"),
    panel:
      panelParam === "create" || panelParam === "crew" || panelParam === "time-off"
        ? panelParam
        : null,
    selected: firstParam(searchParams.selected),
    status: oneOf(firstParam(searchParams.status), ["all", ...Object.values(EmploymentStatus)], "all"),
    timeOffStatus: oneOf(
      firstParam(searchParams.timeOffStatus),
      ["all", ...Object.values(TimeOffRequestStatus)],
      TimeOffRequestStatus.PENDING,
    ),
  };
}

function crewHref(filters: CrewFilters, next: Partial<CrewFilters> = {}) {
  const merged = { ...filters, ...next };
  const params = new URLSearchParams();

  if (merged.status !== "all") {
    params.set("status", merged.status);
  }
  if (merged.duty !== "all") {
    params.set("duty", merged.duty);
  }
  if (merged.assignment !== "all") {
    params.set("assignment", merged.assignment);
  }
  if (merged.issue !== "all") {
    params.set("issue", merged.issue);
  }
  if (merged.base !== "all") {
    params.set("base", merged.base);
  }
  if (merged.panel) {
    params.set("panel", merged.panel);
  }
  if (merged.selected) {
    params.set("selected", merged.selected);
  }
  if (merged.panel === "time-off" && merged.timeOffStatus !== TimeOffRequestStatus.PENDING) {
    params.set("timeOffStatus", merged.timeOffStatus);
  }

  const query = params.toString();
  return query ? `/crew?${query}` : "/crew";
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function toDate(value: Date | null): string {
  if (!value) {
    return "No expiration";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function statusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function employmentBadgeClasses(status: EmploymentStatus): string {
  if (status === EmploymentStatus.ACTIVE) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === EmploymentStatus.ON_LEAVE) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === EmploymentStatus.TERMINATED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function dutyBadgeClasses(status: DutyStatus): string {
  if (status === DutyStatus.ON_DUTY || status === DutyStatus.RESERVE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === DutyStatus.TRAINING || status === DutyStatus.DEADHEADING) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === DutyStatus.SICK) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === DutyStatus.VACATION) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function timeOffBadgeClasses(status: TimeOffRequestStatus): string {
  if (status === TimeOffRequestStatus.APPROVED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === TimeOffRequestStatus.PENDING) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === TimeOffRequestStatus.DENIED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function qualificationBadgeClasses(qualification: QualificationRow, now: Date): string {
  if (!qualification.expiresAt) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (qualification.expiresAt.getTime() < now.getTime()) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (qualification.expiresAt.getTime() <= addDays(now, EXPIRING_SOON_DAYS).getTime()) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function qualificationStatus(qualification: QualificationRow, now: Date): string {
  if (!qualification.expiresAt) {
    return "Current";
  }

  if (qualification.expiresAt.getTime() < now.getTime()) {
    return "Expired";
  }

  if (qualification.expiresAt.getTime() <= addDays(now, EXPIRING_SOON_DAYS).getTime()) {
    return "Expiring soon";
  }

  return "Current";
}

function getMissingAssignmentQualifications(
  assignment: CrewAssignmentRow,
  qualifications: QualificationRow[],
  now: Date,
): string[] {
  const matchingQualification = qualifications.find(
    (qualification) =>
      qualification.aircraftType === assignment.aircraft.type &&
      qualification.seatRole === assignment.seatRole,
  );

  if (!matchingQualification) {
    return [
      `Missing ${formatRoleLabel(assignment.seatRole)} qualification for ${formatAircraftType(
        assignment.aircraft.type,
      )}.`,
    ];
  }

  if (
    matchingQualification.expiresAt &&
    matchingQualification.expiresAt.getTime() < now.getTime()
  ) {
    return [
      `${formatRoleLabel(assignment.seatRole)} qualification for ${formatAircraftType(
        assignment.aircraft.type,
      )} expired ${toDate(matchingQualification.expiresAt)}.`,
    ];
  }

  return [];
}

function getQualificationWarnings(qualifications: QualificationRow[], now: Date): string[] {
  return qualifications
    .filter((qualification) => qualification.expiresAt)
    .filter((qualification) => {
      const expiresAt = qualification.expiresAt;
      return expiresAt ? expiresAt.getTime() <= addDays(now, EXPIRING_SOON_DAYS).getTime() : false;
    })
    .map(
      (qualification) =>
        `${formatAircraftType(qualification.aircraftType)} ${formatRoleLabel(
          qualification.seatRole,
        )} ${qualificationStatus(qualification, now).toLowerCase()} (${toDate(
          qualification.expiresAt,
        )}).`,
    );
}

function assignmentLabel(assignment: CrewAssignmentRow): string {
  return `${formatRoleLabel(assignment.seatRole)} on ${assignment.aircraft.tailNumber}`;
}

async function getCrewRosterData() {
  const now = new Date();
  const upcomingEnd = addDays(now, UPCOMING_WINDOW_DAYS);

  const [crewMembers, stations] = await Promise.all([
  prisma.crewMember.findMany({
    orderBy: [{ employmentStatus: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      dutyStatus: true,
      employmentStatus: true,
      phone: true,
      email: true,
      baseStation: {
        select: {
          code: true,
          city: true,
        },
      },
      qualifications: {
        orderBy: [{ aircraftType: "asc" }, { seatRole: "asc" }],
        select: {
          id: true,
          aircraftType: true,
          seatRole: true,
          issuedAt: true,
          expiresAt: true,
        },
      },
      assignments: {
        where: {
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        orderBy: [{ aircraft: { tailNumber: "asc" } }, { seatRole: "asc" }],
        select: {
          id: true,
          seatRole: true,
          startsAt: true,
          endsAt: true,
          aircraft: {
            select: {
              id: true,
              tailNumber: true,
              type: true,
              status: true,
            },
          },
        },
      },
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

  const aircraftIds = Array.from(
    new Set(
      crewMembers.flatMap((crewMember) =>
        crewMember.assignments.map((assignment) => assignment.aircraft.id),
      ),
    ),
  );

  const flightsWithCoverage = await getUpcomingCoverageFlightsForAircrafts(
    aircraftIds,
    now,
    upcomingEnd,
  );

  const upcomingFlightsByCrewId = new Map<string, UpcomingFlightRow[]>();

  for (const crewMember of crewMembers) {
    const crewFlights = flightsWithCoverage.flatMap((flight) => {
      const seatRoles = flight.coverage?.assignedCrew
        .filter((assignment) => assignment.crewMemberId === crewMember.id)
        .map((assignment) => assignment.seatRole);

      if (!seatRoles || seatRoles.length === 0) {
        return [];
      }

      return [
        {
          id: flight.id,
          legacyFlightId: flight.legacyFlightId,
          flightLegId: flight.flightLegId,
          readSource: flight.readSource,
          flightNumber: flight.flightNumber,
          scheduledDeparture: flight.scheduledDeparture,
          status: flight.status,
          departureCode: flight.departureCode,
          arrivalCode: flight.arrivalCode,
          tailNumber: flight.tailNumber,
          seatRoles,
          coverage: flight.coverage,
        },
      ];
    });

    upcomingFlightsByCrewId.set(crewMember.id, crewFlights.slice(0, 3));
  }

  return {
    crewMembers,
    stations,
    upcomingFlightsByCrewId,
    now,
  };
}

function CrewMemberCreateForm({
  stations,
}: {
  stations: Awaited<ReturnType<typeof getCrewRosterData>>["stations"];
}) {
  const defaultStation = stations[0]?.id;

  return (
    <form action={createCrewMemberAction} className="grid gap-3">
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Employee #</span>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" name="employeeNumber" required />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">First name</span>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" name="firstName" required />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Last name</span>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" name="lastName" required />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Base</span>
        <select className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={defaultStation} name="baseStationId" required>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.code} - {station.city}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Employment</span>
        <select className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={EmploymentStatus.ACTIVE} name="employmentStatus" required>
          {Object.values(EmploymentStatus).map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Duty</span>
        <select className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={DutyStatus.OFF_DUTY} name="dutyStatus" required>
          {Object.values(DutyStatus).map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Hire date</span>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" name="hireDate" type="date" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Phone</span>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" name="phone" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Email</span>
        <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" name="email" type="email" />
      </label>
      <div className="flex items-end">
        <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800" type="submit">
          Create crew member
        </button>
      </div>
    </form>
  );
}

function crewWarnings(crewMember: CrewMemberRow, now: Date): string[] {
  const assignmentWarnings = crewMember.assignments.flatMap((assignment) =>
    getMissingAssignmentQualifications(assignment, crewMember.qualifications, now),
  );
  const qualificationWarnings = getQualificationWarnings(crewMember.qualifications, now);

  return [...assignmentWarnings, ...qualificationWarnings];
}

function filterCrewMembers(crewMembers: CrewMemberRow[], filters: CrewFilters, now: Date) {
  return crewMembers.filter((crewMember) => {
    if (filters.status !== "all" && crewMember.employmentStatus !== filters.status) {
      return false;
    }
    if (filters.duty !== "all" && crewMember.dutyStatus !== filters.duty) {
      return false;
    }
    if (filters.assignment === "assigned" && crewMember.assignments.length === 0) {
      return false;
    }
    if (filters.assignment === "unassigned" && crewMember.assignments.length > 0) {
      return false;
    }
    if (filters.base !== "all" && crewMember.baseStation.code !== filters.base) {
      return false;
    }
    if (filters.issue === "warnings" && crewWarnings(crewMember, now).length === 0) {
      return false;
    }

    return true;
  });
}

function CrewFilterLink({
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

function CrewFilterGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="min-w-fit">
      <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
        {children}
      </div>
    </div>
  );
}

function TimeOffReviewButton({
  label,
  requestId,
  returnTo,
  status,
  variant = "primary",
}: {
  label: string;
  requestId: string;
  returnTo: string;
  status: TimeOffRequestStatus;
  variant?: "primary" | "secondary";
}) {
  return (
    <form action={reviewTimeOffRequestAction.bind(null, requestId, status)}>
      <input name="returnTo" type="hidden" value={returnTo} />
      <button
        className={
          variant === "primary"
            ? "rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            : "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        }
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function TimeOffRequestRow({
  request,
  returnTo,
}: {
  request: TimeOffWorkflowRequest;
  returnTo: string;
}) {
  const crewName = `${request.crewMember.firstName} ${request.crewMember.lastName}`;

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="font-semibold text-sky-700 hover:text-sky-900"
              href={`/crew/${request.crewMember.id}`}
            >
              {crewName}
            </Link>
            <span className="text-xs text-zinc-500">#{request.crewMember.employeeNumber}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${timeOffBadgeClasses(
                request.status,
              )}`}
            >
              {statusLabel(request.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-700">
            {statusLabel(request.requestType)} | {toDateTime(request.startDate)} -{" "}
            {toDateTime(request.endDate)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Base {request.crewMember.baseStation.code}
            {request.reviewedAt ? ` | reviewed ${toDateTime(request.reviewedAt)}` : ""}
          </p>
          {request.reason ? (
            <p className="mt-2 text-sm text-zinc-600">{request.reason}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {request.status === TimeOffRequestStatus.PENDING ? (
            <>
              <TimeOffReviewButton
                label="Approve"
                requestId={request.id}
                returnTo={returnTo}
                status={TimeOffRequestStatus.APPROVED}
              />
              <TimeOffReviewButton
                label="Deny"
                requestId={request.id}
                returnTo={returnTo}
                status={TimeOffRequestStatus.DENIED}
                variant="secondary"
              />
              <TimeOffReviewButton
                label="Cancel"
                requestId={request.id}
                returnTo={returnTo}
                status={TimeOffRequestStatus.CANCELLED}
                variant="secondary"
              />
            </>
          ) : null}
          {request.status === TimeOffRequestStatus.APPROVED ? (
            <TimeOffReviewButton
              label="Cancel approved"
              requestId={request.id}
              returnTo={returnTo}
              status={TimeOffRequestStatus.CANCELLED}
              variant="secondary"
            />
          ) : null}
        </div>
      </div>
      {request.conflictWarnings.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-xs text-amber-900">
          {request.conflictWarnings.map((warning) => (
            <li className="rounded-md border border-amber-200 bg-amber-50 p-2" key={warning}>
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function TimeOffDrawer({
  filters,
  timeOffData,
}: {
  filters: CrewFilters;
  timeOffData: TimeOffWorkflowData;
}) {
  const closeHref = crewHref(filters, { panel: null, selected: null });
  const returnTo = crewHref(filters, { panel: "time-off", selected: null });
  const visibleRequests =
    filters.timeOffStatus === "all"
      ? TIME_OFF_STATUS_FILTERS.flatMap((status) => timeOffData.requestsByStatus[status])
      : timeOffData.requestsByStatus[filters.timeOffStatus];

  return (
    <ContextDrawer closeHref={closeHref} eyebrow="Ops review" size="wide" title="Time-Off Requests">
      <div className="space-y-4">
        <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-950">Action queue</p>
              <p className="mt-1 text-sm text-zinc-600">
                Pending requests are the operational work. Approved, denied, and
                cancelled are available here for review.
              </p>
            </div>
            <Link
              className="text-xs font-semibold text-sky-700 hover:text-sky-900"
              href="/crew/scheduling/time-off"
            >
              Full page
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className={
                filters.timeOffStatus === TimeOffRequestStatus.PENDING
                  ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              }
              href={crewHref(filters, {
                panel: "time-off",
                selected: null,
                timeOffStatus: TimeOffRequestStatus.PENDING,
              })}
            >
              Pending
            </Link>
            {TIME_OFF_STATUS_FILTERS.filter(
              (status) => status !== TimeOffRequestStatus.PENDING,
            ).map((status) => (
              <Link
                className={
                  filters.timeOffStatus === status
                    ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                }
                href={crewHref(filters, { panel: "time-off", selected: null, timeOffStatus: status })}
                key={status}
              >
                {statusLabel(status)}
              </Link>
            ))}
            <Link
              className={
                filters.timeOffStatus === "all"
                  ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              }
              href={crewHref(filters, { panel: "time-off", selected: null, timeOffStatus: "all" })}
            >
              All
            </Link>
          </div>
        </section>

        <section className="grid gap-2 sm:grid-cols-4">
          {TIME_OFF_STATUS_FILTERS.map((status) => (
            <article className="rounded-md border border-zinc-200 bg-white p-3" key={status}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {statusLabel(status)}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {timeOffData.summary[status]}
              </p>
            </article>
          ))}
        </section>

        <section className="space-y-2">
          {visibleRequests.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
              No {statusLabel(filters.timeOffStatus).toLowerCase()} time-off requests.
            </p>
          ) : (
            visibleRequests.map((request) => (
              <TimeOffRequestRow key={request.id} request={request} returnTo={returnTo} />
            ))
          )}
        </section>
      </div>
    </ContextDrawer>
  );
}

function CrewDrawer({
  crewMembers,
  filters,
  roster,
  timeOffData,
}: {
  crewMembers: CrewMemberRow[];
  filters: CrewFilters;
  roster: Awaited<ReturnType<typeof getCrewRosterData>>;
  timeOffData: TimeOffWorkflowData;
}) {
  if (!filters.panel) {
    return null;
  }

  const closeHref = crewHref(filters, { panel: null, selected: null });
  if (filters.panel === "time-off") {
    return <TimeOffDrawer filters={filters} timeOffData={timeOffData} />;
  }

  if (filters.panel === "create") {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Crew workflow" size="wide" title="Add Crew Member">
        <div className="space-y-4">
          <section className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            Create the core crew record first. Qualifications, compliance evidence,
            logistics, scheduling, and aircraft assignments stay in their focused
            workflows after the person exists.
          </section>
          <CrewMemberCreateForm stations={roster.stations} />
        </div>
      </ContextDrawer>
    );
  }

  if (!filters.selected) {
    return null;
  }

  const crewMember = crewMembers.find((item) => item.id === filters.selected);

  if (!crewMember) {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Crew quick review" title="Crew Member">
        <p className="text-sm text-zinc-600">No crew member found for this selection.</p>
      </ContextDrawer>
    );
  }

  const warnings = crewWarnings(crewMember, roster.now);
  const upcomingFlights = roster.upcomingFlightsByCrewId.get(crewMember.id) ?? [];

  return (
    <ContextDrawer
      closeHref={closeHref}
      eyebrow="Crew profile"
      size="wide"
      title={`${crewMember.firstName} ${crewMember.lastName}`}
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${employmentBadgeClasses(crewMember.employmentStatus)}`}>
              {statusLabel(crewMember.employmentStatus)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${dutyBadgeClasses(crewMember.dutyStatus)}`}>
              {statusLabel(crewMember.dutyStatus)}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Base {crewMember.baseStation.code} - {crewMember.baseStation.city}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {crewMember.email ?? "No email"} | {crewMember.phone ?? "No phone"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Employee #{crewMember.employeeNumber}
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Qualifications
          </h3>
          {crewMember.qualifications.length ? (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {crewMember.qualifications.map((qualification) => (
                <li
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-sm"
                  key={qualification.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-950">
                      {formatAircraftType(qualification.aircraftType)}{" "}
                      {formatRoleLabel(qualification.seatRole)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${qualificationBadgeClasses(
                        qualification,
                        roster.now,
                      )}`}
                    >
                      {qualificationStatus(qualification, roster.now)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    Issued {toDate(qualification.issuedAt)} | Expires{" "}
                    {toDate(qualification.expiresAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No qualifications recorded.</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Current assignment
          </h3>
          {crewMember.assignments.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {crewMember.assignments.map((assignment) => (
                <li className="rounded-lg border border-zinc-200 bg-zinc-50 p-2" key={assignment.id}>
                  <p className="font-semibold text-zinc-950">{assignmentLabel(assignment)}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Since {toDateTime(assignment.startsAt)}
                    {assignment.endsAt ? ` | Ends ${toDateTime(assignment.endsAt)}` : " | Open-ended"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No active aircraft assignment.</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Warnings
          </h3>
          {warnings.length ? (
            <ul className="mt-2 space-y-2">
              {warnings.map((warning) => (
                <li className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900" key={warning}>
                  {warning}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              No current qualification warnings in this roster view.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Upcoming covered legs
          </h3>
          {upcomingFlights.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {upcomingFlights.map((flight) => (
                <li className="rounded-lg border border-zinc-200 bg-zinc-50 p-2" key={flight.id}>
                  <p className="font-semibold text-zinc-950">
                    {flight.flightNumber} | {flight.departureCode} -&gt; {flight.arrivalCode}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {toDateTime(flight.scheduledDeparture)} | {flight.tailNumber}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No covered legs in the upcoming window.</p>
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white" href={`/crew/${crewMember.id}`}>
            Crew detail
          </Link>
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
            href={crewHref(filters, {
              panel: "time-off",
              selected: null,
              timeOffStatus: TimeOffRequestStatus.PENDING,
            })}
          >
            Time off
          </Link>
          <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/crew/${crewMember.id}/logistics`}>
            Logistics
          </Link>
        </div>
      </div>
    </ContextDrawer>
  );
}

export default async function CrewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseCrewFilters(params);
  const [roster, timeOffData] = await Promise.all([
    getCrewRosterData(),
    getTimeOffWorkflowData({
      crewMemberId: "all",
      fromDate: null,
      requestType: "all",
      status: "all",
      toDate: null,
    }),
  ]);
  const error = firstParam(params.error);
  const filteredCrewMembers = filterCrewMembers(roster.crewMembers, filters, roster.now);
  const baseOptions = Array.from(new Set(roster.crewMembers.map((crewMember) => crewMember.baseStation.code))).sort();
  const activeCrew = roster.crewMembers.filter(
    (crewMember) => crewMember.employmentStatus === EmploymentStatus.ACTIVE,
  ).length;
  const onDutyCrew = roster.crewMembers.filter(
    (crewMember) => crewMember.dutyStatus === DutyStatus.ON_DUTY,
  ).length;
  const assignedCrew = roster.crewMembers.filter((crewMember) => crewMember.assignments.length > 0)
    .length;
  const allUpcomingFlights = Array.from(roster.upcomingFlightsByCrewId.values()).flat();
  const flightLegReads = allUpcomingFlights.filter((flight) => flight.readSource === "FLIGHT_LEG")
    .length;
  const fallbackFlightReads = allUpcomingFlights.filter(
    (flight) => flight.readSource === "LEG_MISSING_FALLBACK_FLIGHT",
  ).length;
  const warningCount = roster.crewMembers.reduce((count, crewMember) => {
    return count + crewWarnings(crewMember, roster.now).length;
  }, 0);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Crew Operations
          </p>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Crew</h1>
              <p className="mt-1 text-xs text-zinc-600">
                Roster, qualification, assignment, and upcoming coverage context.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href={crewHref(filters, { panel: "create", selected: null })}
              >
                Add crew member
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling"
              >
                Crew planner
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href={crewHref(filters, {
                  panel: "time-off",
                  selected: null,
                  timeOffStatus: TimeOffRequestStatus.PENDING,
                })}
              >
                Time off
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/logistics"
              >
                Logistics workbench
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling?assignment=assigned"
              >
                Assigned crew
              </Link>
              <span className="text-sm text-zinc-500">
                Upcoming coverage window: {UPCOMING_WINDOW_DAYS} days
              </span>
            </div>
          </div>
        </header>

        {error ? (
          <section className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </section>
        ) : null}

        <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Crew</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {roster.crewMembers.length}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Active</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{activeCrew}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">On duty</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{onDutyCrew}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Assigned / warn</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {assignedCrew} / {warningCount}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">FlightLeg</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{flightLegReads}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Fallback</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{fallbackFlightReads}</p>
          </article>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <CrewFilterGroup label="Employment">
              <CrewFilterLink active={filters.status === "all"} href={crewHref(filters, { status: "all" })} label="All" />
              {Object.values(EmploymentStatus).map((status) => (
                <CrewFilterLink
                  active={filters.status === status}
                  href={crewHref(filters, { status })}
                  key={status}
                  label={statusLabel(status)}
                />
              ))}
            </CrewFilterGroup>
            <CrewFilterGroup label="Duty">
              <CrewFilterLink active={filters.duty === "all"} href={crewHref(filters, { duty: "all" })} label="All" />
              {[DutyStatus.ON_DUTY, DutyStatus.OFF_DUTY, DutyStatus.RESERVE, DutyStatus.TRAINING, DutyStatus.VACATION, DutyStatus.SICK].map((duty) => (
                <CrewFilterLink
                  active={filters.duty === duty}
                  href={crewHref(filters, { duty })}
                  key={duty}
                  label={statusLabel(duty)}
                />
              ))}
            </CrewFilterGroup>
            <CrewFilterGroup label="Assignment">
              <CrewFilterLink active={filters.assignment === "all"} href={crewHref(filters, { assignment: "all" })} label="All" />
              <CrewFilterLink active={filters.assignment === "assigned"} href={crewHref(filters, { assignment: "assigned" })} label="Assigned" />
              <CrewFilterLink active={filters.assignment === "unassigned"} href={crewHref(filters, { assignment: "unassigned" })} label="Unassigned" />
            </CrewFilterGroup>
            <CrewFilterGroup label="Issues">
              <CrewFilterLink active={filters.issue === "all"} href={crewHref(filters, { issue: "all" })} label="All" />
              <CrewFilterLink active={filters.issue === "warnings"} href={crewHref(filters, { issue: "warnings" })} label="Warnings" />
            </CrewFilterGroup>
            <CrewFilterGroup label="Base">
              <CrewFilterLink active={filters.base === "all"} href={crewHref(filters, { base: "all" })} label="All" />
              {baseOptions.map((base) => (
                <CrewFilterLink
                  active={filters.base === base}
                  href={crewHref(filters, { base })}
                  key={base}
                  label={base}
                />
              ))}
            </CrewFilterGroup>
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          {roster.crewMembers.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">No crew members found.</p>
              <p className="mt-1">
                The read-only crew page is ready, but the database has no roster rows to display.
              </p>
            </div>
          ) : filteredCrewMembers.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">No crew match the selected filters.</p>
              <p className="mt-1">Clear filters to return to the full crew roster.</p>
              <Link className="mt-3 inline-flex rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white" href="/crew">
                Reset crew filters
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredCrewMembers.map((crewMember) => {
                const upcomingFlights = roster.upcomingFlightsByCrewId.get(crewMember.id) ?? [];
                const warnings = crewWarnings(crewMember, roster.now);

                return (
                  <Link
                    className="group block rounded-md border border-zinc-200 bg-white px-3 py-2.5 transition hover:border-sky-200 hover:bg-sky-50"
                    href={crewHref(filters, { panel: "crew", selected: crewMember.id })}
                    key={crewMember.id}
                  >
                    <article className="grid gap-3 lg:grid-cols-[minmax(15rem,1.2fr)_minmax(14rem,1fr)_minmax(13rem,0.9fr)_minmax(12rem,0.8fr)] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-zinc-950 group-hover:text-sky-900">
                            {crewMember.firstName} {crewMember.lastName}
                          </span>
                          <span className="text-xs text-zinc-500">
                            #{crewMember.employeeNumber}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-600">
                          {crewMember.baseStation.code} - {crewMember.baseStation.city}
                          {crewMember.email ? ` | ${crewMember.email}` : " | no email"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${employmentBadgeClasses(
                            crewMember.employmentStatus,
                          )}`}
                        >
                          {statusLabel(crewMember.employmentStatus)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${dutyBadgeClasses(
                            crewMember.dutyStatus,
                          )}`}
                        >
                          {statusLabel(crewMember.dutyStatus)}
                        </span>
                        {warnings.length > 0 ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0 text-xs text-zinc-600">
                        {crewMember.assignments.length === 0 ? (
                          <p>No active aircraft assignment</p>
                        ) : (
                          <p className="truncate">
                            {crewMember.assignments.map(assignmentLabel).join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="min-w-0">
                        {crewMember.qualifications.length === 0 ? (
                          <p className="text-xs text-zinc-500">No qualifications</p>
                        ) : (
                          <p className="truncate text-xs text-zinc-600">
                            {crewMember.qualifications
                              .slice(0, 3)
                              .map(
                                (qualification) =>
                                  `${formatAircraftType(qualification.aircraftType)} ${formatRoleLabel(
                                    qualification.seatRole,
                                  )}`,
                              )
                              .join(", ")}
                            {crewMember.qualifications.length > 3
                              ? ` +${crewMember.qualifications.length - 3}`
                              : ""}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 lg:col-start-4">
                        {upcomingFlights.length === 0 ? (
                          <span>No upcoming covered legs</span>
                        ) : (
                          <span>{upcomingFlights.length} upcoming covered leg{upcomingFlights.length === 1 ? "" : "s"}</span>
                        )}
                        <span className="font-semibold text-sky-700 group-hover:text-sky-900">
                          Open
                        </span>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <CrewDrawer
          crewMembers={roster.crewMembers}
          filters={filters}
          roster={roster}
          timeOffData={timeOffData}
        />
      </div>
    </main>
  );
}
