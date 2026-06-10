import {
  AssignmentStatus,
  AircraftType,
  DutyStatus,
  EmploymentStatus,
  FlightLegStatus,
  FlightStatus,
  SeatRole,
} from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";

export const dynamic = "force-dynamic";

const UPCOMING_WINDOW_DAYS = 7;
const EXPIRING_SOON_DAYS = 30;

type CrewMemberRow = Awaited<ReturnType<typeof getCrewRosterData>>["crewMembers"][number];
type CrewAssignmentRow = CrewMemberRow["assignments"][number];
type QualificationRow = CrewMemberRow["qualifications"][number];

type UpcomingFlightRow = {
  id: string;
  legacyFlightId: string;
  flightLegId: string | null;
  readSource: "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT";
  flightNumber: string;
  scheduledDeparture: Date;
  status: FlightStatus | FlightLegStatus;
  departureCode: string;
  arrivalCode: string;
  tailNumber: string;
  seatRoles: SeatRole[];
  coverage: FlightCoverage | null;
};

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

function flightBadgeClasses(status: FlightStatus | FlightLegStatus): string {
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

function sourceBadgeClasses(readSource: UpcomingFlightRow["readSource"]): string {
  if (readSource === "FLIGHT_LEG") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function sourceLabel(readSource: UpcomingFlightRow["readSource"]): string {
  if (readSource === "FLIGHT_LEG") {
    return "FlightLeg read";
  }

  return "Fallback Flight read";
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

function coverageLabel(flight: UpcomingFlightRow): string {
  if (!flight.coverage) {
    return "No coverage data";
  }

  if (!flight.coverage.isCovered) {
    return `Missing ${flight.coverage.missingRoles.map(formatRoleLabel).join(", ")}`;
  }

  if (flight.coverage.warnings.length > 0) {
    return `${flight.coverage.warnings.length} warning${
      flight.coverage.warnings.length === 1 ? "" : "s"
    }`;
  }

  return "Covered";
}

function coverageBadgeClasses(flight: UpcomingFlightRow): string {
  if (!flight.coverage) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }

  const crewWarnings = flight.coverage.warnings.filter((warning) =>
    flight.seatRoles.includes(warning.seatRole),
  );

  if (flight.coverage.isCovered && crewWarnings.length === 0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (flight.coverage.isCovered) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

async function getCrewRosterData() {
  const now = new Date();
  const upcomingEnd = addDays(now, UPCOMING_WINDOW_DAYS);

  const crewMembers = await prisma.crewMember.findMany({
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
  });

  const aircraftIds = Array.from(
    new Set(
      crewMembers.flatMap((crewMember) =>
        crewMember.assignments.map((assignment) => assignment.aircraft.id),
      ),
    ),
  );

  const upcomingFlights =
    aircraftIds.length === 0
      ? []
      : await prisma.flight.findMany({
          where: {
            aircraftId: { in: aircraftIds },
            scheduledDeparture: {
              gte: now,
              lt: upcomingEnd,
            },
          },
          orderBy: { scheduledDeparture: "asc" },
          select: {
            id: true,
            aircraftId: true,
            flightNumber: true,
            scheduledDeparture: true,
            status: true,
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
            aircraft: {
              select: {
                tailNumber: true,
              },
            },
            flightLeg: {
              select: {
                id: true,
                flightNumber: true,
                scheduledDeparture: true,
                status: true,
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
                aircraftAssignments: {
                  where: {
                    status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
                  },
                  select: {
                    aircraft: {
                      select: {
                        tailNumber: true,
                      },
                    },
                  },
                  orderBy: {
                    assignedAt: "desc",
                  },
                  take: 1,
                },
              },
            },
          },
        });

  const flightsWithCoverage = await Promise.all(
    upcomingFlights.map(async (flight) => ({
      ...flight,
      coverage: await resolveFlightCoverage(flight.id),
    })),
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
          legacyFlightId: flight.id,
          flightLegId: flight.flightLeg?.id ?? null,
          readSource: flight.flightLeg
            ? ("FLIGHT_LEG" as const)
            : ("LEG_MISSING_FALLBACK_FLIGHT" as const),
          flightNumber: flight.flightLeg?.flightNumber ?? flight.flightNumber,
          scheduledDeparture: flight.flightLeg?.scheduledDeparture ?? flight.scheduledDeparture,
          status: flight.flightLeg?.status ?? flight.status,
          departureCode: flight.flightLeg?.departureStation.code ?? flight.departureStation.code,
          arrivalCode: flight.flightLeg?.arrivalStation.code ?? flight.arrivalStation.code,
          tailNumber:
            flight.flightLeg?.aircraftAssignments[0]?.aircraft.tailNumber ??
            flight.aircraft.tailNumber,
          seatRoles,
          coverage: flight.coverage,
        },
      ];
    });

    upcomingFlightsByCrewId.set(crewMember.id, crewFlights.slice(0, 3));
  }

  return {
    crewMembers,
    upcomingFlightsByCrewId,
    now,
  };
}

export default async function CrewPage() {
  const roster = await getCrewRosterData();
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
    const assignmentWarnings = crewMember.assignments.flatMap((assignment) =>
      getMissingAssignmentQualifications(assignment, crewMember.qualifications, roster.now),
    );
    const qualificationWarnings = getQualificationWarnings(crewMember.qualifications, roster.now);

    return count + assignmentWarnings.length + qualificationWarnings.length;
  }, 0);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Crew Operations
          </p>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Crew</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Read-only roster, qualification, assignment, and upcoming coverage context.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling"
              >
                Crew planner
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling/time-off"
              >
                Time off
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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Crew members</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {roster.crewMembers.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active employment</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{activeCrew}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">On duty</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{onDutyCrew}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Assigned now / warnings</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {assignedCrew} / {warningCount}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">FlightLeg reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{flightLegReads}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Fallback reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{fallbackFlightReads}</p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          {roster.crewMembers.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">No crew members found.</p>
              <p className="mt-1">
                The read-only crew page is ready, but the database has no roster rows to display.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {roster.crewMembers.map((crewMember) => {
                const upcomingFlights = roster.upcomingFlightsByCrewId.get(crewMember.id) ?? [];
                const assignmentWarnings = crewMember.assignments.flatMap((assignment) =>
                  getMissingAssignmentQualifications(
                    assignment,
                    crewMember.qualifications,
                    roster.now,
                  ),
                );
                const qualificationWarnings = getQualificationWarnings(
                  crewMember.qualifications,
                  roster.now,
                );
                const warnings = [...assignmentWarnings, ...qualificationWarnings];

                return (
                  <article
                    className="rounded-md border border-zinc-200 bg-white p-4"
                    key={crewMember.id}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-zinc-950">
                            {crewMember.firstName} {crewMember.lastName}
                          </h2>
                          <span className="text-xs text-zinc-500">
                            #{crewMember.employeeNumber}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-600">
                          Base {crewMember.baseStation.code} - {crewMember.baseStation.city}
                          {crewMember.email ? ` | ${crewMember.email}` : ""}
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
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${employmentBadgeClasses(
                            crewMember.employmentStatus,
                          )}`}
                        >
                          {statusLabel(crewMember.employmentStatus)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${dutyBadgeClasses(
                            crewMember.dutyStatus,
                          )}`}
                        >
                          {statusLabel(crewMember.dutyStatus)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Current Aircraft Assignment
                        </h3>
                        {crewMember.assignments.length === 0 ? (
                          <p className="mt-2 text-sm text-zinc-600">
                            No active aircraft assignment at this time.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2 text-sm">
                            {crewMember.assignments.map((assignment) => (
                              <li key={assignment.id}>
                                <div className="font-medium text-zinc-900">
                                  {assignmentLabel(assignment)}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {formatAircraftType(assignment.aircraft.type)} |{" "}
                                  {assignment.aircraft.status} | since{" "}
                                  {toDateTime(assignment.startsAt)}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Qualifications
                        </h3>
                        {crewMember.qualifications.length === 0 ? (
                          <p className="mt-2 text-sm text-zinc-600">No qualifications recorded.</p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {crewMember.qualifications.map((qualification) => (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${qualificationBadgeClasses(
                                  qualification,
                                  roster.now,
                                )}`}
                                key={qualification.id}
                              >
                                {formatAircraftType(qualification.aircraftType)}{" "}
                                {formatRoleLabel(qualification.seatRole)} -{" "}
                                {qualificationStatus(qualification, roster.now)}
                              </span>
                            ))}
                          </div>
                        )}
                        {warnings.length > 0 && (
                          <ul className="mt-3 space-y-1.5 text-xs text-amber-800">
                            {warnings.map((warning) => (
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
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Upcoming Flight Coverage
                        </h3>
                        {upcomingFlights.length === 0 ? (
                          <p className="mt-2 text-sm text-zinc-600">
                            No covered flights found in the upcoming window.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2 text-sm">
                            {upcomingFlights.map((flight) => (
                              <li
                                className="rounded-md border border-zinc-200 bg-white p-2"
                                key={flight.id}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-zinc-950">
                                    {flight.flightNumber}
                                  </span>
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${flightBadgeClasses(
                                      flight.status,
                                    )}`}
                                  >
                                    {flight.status}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-zinc-600">
                                  {toDateTime(flight.scheduledDeparture)} |{" "}
                                  {flight.departureCode} -&gt; {flight.arrivalCode} |{" "}
                                  {flight.tailNumber} |{" "}
                                  {flight.seatRoles.map(formatRoleLabel).join(", ")}
                                </div>
                                <span
                                  className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${sourceBadgeClasses(
                                    flight.readSource,
                                  )}`}
                                >
                                  {sourceLabel(flight.readSource)}
                                </span>
                                <span
                                  className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${coverageBadgeClasses(
                                    flight,
                                  )}`}
                                >
                                  {coverageLabel(flight)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
