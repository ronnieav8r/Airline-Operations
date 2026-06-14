import {
  AircraftType,
  AssignmentStatus,
  CrewScheduleEntryStatus,
  DutyStatus,
  EmploymentStatus,
  Prisma,
  SeatRole,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";

import { getUpcomingCoverageFlightsForAircrafts } from "@/lib/flightleg-upcoming-coverage";
import { prisma } from "@/lib/prisma";

const ACTIVE_REVIEW_STATUSES = [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED];

const timeOffRequestSelect = {
  id: true,
  crewMemberId: true,
  requestType: true,
  status: true,
  startDate: true,
  endDate: true,
  reason: true,
  reviewedAt: true,
  createdAt: true,
  crewMember: {
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      employmentStatus: true,
      baseStation: {
        select: {
          code: true,
        },
      },
    },
  },
} satisfies Prisma.TimeOffRequestSelect;

export type TimeOffWorkflowRequest = Prisma.TimeOffRequestGetPayload<{
  select: typeof timeOffRequestSelect;
}> & {
  conflictWarnings: string[];
  coverageImpact: TimeOffCoverageImpact[];
};

export type TimeOffCoverageCrew = {
  crewMemberId: string;
  employeeNumber: string;
  name: string;
  notes: string[];
};

export type TimeOffCoverageImpact = {
  aircraftType: AircraftType;
  seatRole: SeatRole;
  source: "ASSIGNMENT" | "QUALIFICATION";
  sourceLabel: string;
  scheduleMode: "SCHEDULED" | "QUALIFIED_POOL";
  totalQualified: number;
  available: TimeOffCoverageCrew[];
  pendingOff: TimeOffCoverageCrew[];
  approvedOff: TimeOffCoverageCrew[];
  occupied: TimeOffCoverageCrew[];
  scheduledUnavailable: TimeOffCoverageCrew[];
};

export type TimeOffWorkflowData = {
  crewOptions: Array<{
    id: string;
    label: string;
  }>;
  filterCrewOptions: Array<{
    id: string;
    label: string;
  }>;
  requestsByStatus: Record<TimeOffRequestStatus, TimeOffWorkflowRequest[]>;
  summary: Record<TimeOffRequestStatus, number>;
};

export type TimeOffWorkflowFilters = {
  crewMemberId: string;
  fromDate: Date | null;
  requestType: TimeOffRequestType | "all";
  status: TimeOffRequestStatus | "all";
  toDate: Date | null;
};

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function crewLabel(crewMember: {
  employeeNumber: string;
  firstName: string;
  lastName: string;
}): string {
  return `${crewMember.firstName} ${crewMember.lastName} #${crewMember.employeeNumber}`;
}

function coverageCrewLabel(crewMember: {
  firstName: string;
  lastName: string;
}): string {
  return `${crewMember.firstName} ${crewMember.lastName}`;
}

function positionKey(aircraftType: AircraftType, seatRole: SeatRole): string {
  return `${aircraftType}:${seatRole}`;
}

function isWorkableDutyStatus(dutyStatus: DutyStatus): boolean {
  return dutyStatus === DutyStatus.ON_DUTY || dutyStatus === DutyStatus.RESERVE;
}

function formatTimeOffCoverageDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatTimeOffCoverageRange(startDate: Date, endDate: Date): string {
  return `${formatTimeOffCoverageDate(startDate)}-${formatTimeOffCoverageDate(endDate)}`;
}

function addCoverageCrew(
  crewMember: {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
  },
  notes: string[],
): TimeOffCoverageCrew {
  return {
    crewMemberId: crewMember.id,
    employeeNumber: crewMember.employeeNumber,
    name: coverageCrewLabel(crewMember),
    notes,
  };
}

async function getTimeOffCoverageImpact(
  request: Prisma.TimeOffRequestGetPayload<{ select: typeof timeOffRequestSelect }>,
): Promise<TimeOffCoverageImpact[]> {
  const windowStart = request.startDate;
  const windowEnd = request.endDate;
  const scheduleStart = startOfDay(windowStart);
  const scheduleEnd = addDays(startOfDay(windowEnd), 1);

  const assignments = await prisma.aircraftCrewAssignment.findMany({
    where: {
      crewMemberId: request.crewMemberId,
      isActive: true,
      startsAt: { lt: windowEnd },
      OR: [{ endsAt: null }, { endsAt: { gt: windowStart } }],
    },
    orderBy: [{ startsAt: "asc" }],
    select: {
      aircraft: {
        select: {
          tailNumber: true,
          type: true,
        },
      },
      seatRole: true,
    },
  });

  const positionMap = new Map<
    string,
    {
      aircraftType: AircraftType;
      seatRole: SeatRole;
      source: "ASSIGNMENT" | "QUALIFICATION";
      sourceLabel: string;
      sourceTailNumbers: Set<string>;
    }
  >();

  for (const assignment of assignments) {
    const key = positionKey(assignment.aircraft.type, assignment.seatRole);
    const existing = positionMap.get(key);

    if (existing) {
      existing.sourceTailNumbers.add(assignment.aircraft.tailNumber);
      existing.sourceLabel = `Current assignment ${Array.from(existing.sourceTailNumbers)
        .slice(0, 3)
        .join(", ")}`;
      continue;
    }

    positionMap.set(key, {
      aircraftType: assignment.aircraft.type,
      seatRole: assignment.seatRole,
      source: "ASSIGNMENT",
      sourceLabel: `Current assignment ${assignment.aircraft.tailNumber}`,
      sourceTailNumbers: new Set([assignment.aircraft.tailNumber]),
    });
  }

  if (positionMap.size === 0) {
    const qualifications = await prisma.crewQualification.findMany({
      where: {
        crewMemberId: request.crewMemberId,
        OR: [{ expiresAt: null }, { expiresAt: { gte: windowEnd } }],
      },
      orderBy: [{ aircraftType: "asc" }, { seatRole: "asc" }],
      select: {
        aircraftType: true,
        seatRole: true,
      },
    });

    for (const qualification of qualifications) {
      positionMap.set(positionKey(qualification.aircraftType, qualification.seatRole), {
        aircraftType: qualification.aircraftType,
        seatRole: qualification.seatRole,
        source: "QUALIFICATION",
        sourceLabel: "Active qualification",
        sourceTailNumbers: new Set(),
      });
    }
  }

  const impacts = await Promise.all(
    Array.from(positionMap.values()).map(async (position) => {
      const candidates = await prisma.crewMember.findMany({
        where: {
          id: { not: request.crewMemberId },
          employmentStatus: EmploymentStatus.ACTIVE,
          qualifications: {
            some: {
              aircraftType: position.aircraftType,
              seatRole: position.seatRole,
              OR: [{ expiresAt: null }, { expiresAt: { gte: windowEnd } }],
            },
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          timeOffRequests: {
            where: {
              status: { in: ACTIVE_REVIEW_STATUSES },
              startDate: { lt: windowEnd },
              endDate: { gt: windowStart },
            },
            orderBy: [{ startDate: "asc" }],
            select: {
              endDate: true,
              requestType: true,
              startDate: true,
              status: true,
            },
          },
          schedules: {
            where: {
              date: {
                gte: scheduleStart,
                lt: scheduleEnd,
              },
            },
            orderBy: [{ date: "asc" }],
            select: {
              date: true,
              dutyStatus: true,
            },
          },
          scheduleEntries: {
            where: {
              status: {
                in: [CrewScheduleEntryStatus.DRAFT, CrewScheduleEntryStatus.PUBLISHED],
              },
              date: {
                gte: scheduleStart,
                lt: scheduleEnd,
              },
            },
            orderBy: [{ date: "asc" }],
            select: {
              date: true,
              dutyStatus: true,
              status: true,
            },
          },
          assignments: {
            where: {
              isActive: true,
              startsAt: { lt: windowEnd },
              OR: [{ endsAt: null }, { endsAt: { gt: windowStart } }],
            },
            orderBy: [{ startsAt: "asc" }],
            select: {
              aircraft: {
                select: {
                  tailNumber: true,
                  type: true,
                },
              },
              endsAt: true,
              seatRole: true,
              startsAt: true,
            },
          },
          legAssignments: {
            where: {
              status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
              flightLeg: {
                scheduledDeparture: { lt: windowEnd },
                scheduledArrival: { gt: windowStart },
              },
            },
            orderBy: [{ flightLeg: { scheduledDeparture: "asc" } }],
            select: {
              flightLeg: {
                select: {
                  flightNumber: true,
                  scheduledArrival: true,
                  scheduledDeparture: true,
                },
              },
              seatRole: true,
            },
          },
        },
      });

      const scheduleMode: TimeOffCoverageImpact["scheduleMode"] = candidates.some(
        (candidate) => candidate.schedules.length > 0 || candidate.scheduleEntries.length > 0,
      )
        ? "SCHEDULED"
        : "QUALIFIED_POOL";
      const available: TimeOffCoverageCrew[] = [];
      const pendingOff: TimeOffCoverageCrew[] = [];
      const approvedOff: TimeOffCoverageCrew[] = [];
      const occupied: TimeOffCoverageCrew[] = [];
      const scheduledUnavailable: TimeOffCoverageCrew[] = [];

      for (const candidate of candidates) {
        const approvedRequests = candidate.timeOffRequests.filter(
          (timeOffRequest) => timeOffRequest.status === TimeOffRequestStatus.APPROVED,
        );
        const pendingRequests = candidate.timeOffRequests.filter(
          (timeOffRequest) => timeOffRequest.status === TimeOffRequestStatus.PENDING,
        );

        if (approvedRequests.length > 0) {
          approvedOff.push(
            addCoverageCrew(
              candidate,
              approvedRequests.map(
                (timeOffRequest) =>
                  `${timeOffRequest.requestType} approved ${formatTimeOffCoverageRange(
                    timeOffRequest.startDate,
                    timeOffRequest.endDate,
                  )}`,
              ),
            ),
          );
          continue;
        }

        if (pendingRequests.length > 0) {
          pendingOff.push(
            addCoverageCrew(
              candidate,
              pendingRequests.map(
                (timeOffRequest) =>
                  `${timeOffRequest.requestType} pending ${formatTimeOffCoverageRange(
                    timeOffRequest.startDate,
                    timeOffRequest.endDate,
                  )}`,
              ),
            ),
          );
          continue;
        }

        const occupationNotes = [
          ...candidate.assignments.map(
            (assignment) =>
              `${assignment.aircraft.tailNumber} ${assignment.seatRole} ${formatTimeOffCoverageRange(
                assignment.startsAt,
                assignment.endsAt ?? windowEnd,
              )}`,
          ),
          ...candidate.legAssignments.map(
            (assignment) =>
              `${assignment.flightLeg.flightNumber ?? "Flight leg"} ${assignment.seatRole} ${formatTimeOffCoverageRange(
                assignment.flightLeg.scheduledDeparture,
                assignment.flightLeg.scheduledArrival,
              )}`,
          ),
        ];

        if (occupationNotes.length > 0) {
          occupied.push(addCoverageCrew(candidate, occupationNotes));
          continue;
        }

        if (scheduleMode === "SCHEDULED") {
          const scheduleRows = [...candidate.schedules, ...candidate.scheduleEntries];
          const workableRows = scheduleRows.filter((schedule) =>
            isWorkableDutyStatus(schedule.dutyStatus),
          );

          if (workableRows.length > 0) {
            available.push(
              addCoverageCrew(
                candidate,
                workableRows.map(
                  (schedule) =>
                    `${schedule.dutyStatus} ${formatTimeOffCoverageDate(schedule.date)}`,
                ),
              ),
            );
          } else {
            scheduledUnavailable.push(
              addCoverageCrew(
                candidate,
                scheduleRows.length > 0
                  ? scheduleRows.map(
                      (schedule) =>
                        `${schedule.dutyStatus} ${formatTimeOffCoverageDate(schedule.date)}`,
                    )
                  : ["No workable schedule row in this window"],
              ),
            );
          }
          continue;
        }

        available.push(addCoverageCrew(candidate, ["Qualified pool estimate"]));
      }

      return {
        aircraftType: position.aircraftType,
        seatRole: position.seatRole,
        source: position.source,
        sourceLabel: position.sourceLabel,
        scheduleMode,
        totalQualified: candidates.length,
        available,
        pendingOff,
        approvedOff,
        occupied,
        scheduledUnavailable,
      };
    }),
  );

  return impacts.sort((left, right) => {
    const sourceOrder = left.source.localeCompare(right.source);
    if (sourceOrder !== 0) {
      return sourceOrder;
    }

    const aircraftOrder = left.aircraftType.localeCompare(right.aircraftType);
    if (aircraftOrder !== 0) {
      return aircraftOrder;
    }

    return left.seatRole.localeCompare(right.seatRole);
  });
}

async function getTimeOffConflictWarnings(
  request: Prisma.TimeOffRequestGetPayload<{ select: typeof timeOffRequestSelect }>,
): Promise<string[]> {
  const warnings: string[] = [];
  const windowStart = request.startDate;
  const windowEnd = request.endDate;
  const scheduleStart = startOfDay(windowStart);
  const scheduleEnd = addDays(startOfDay(windowEnd), 1);

  const [overlappingRequests, schedules, assignments] = await Promise.all([
    prisma.timeOffRequest.findMany({
      where: {
        id: { not: request.id },
        crewMemberId: request.crewMemberId,
        status: { in: ACTIVE_REVIEW_STATUSES },
        startDate: { lt: windowEnd },
        endDate: { gt: windowStart },
      },
      select: {
        id: true,
        requestType: true,
        status: true,
      },
    }),
    prisma.crewSchedule.findMany({
      where: {
        crewMemberId: request.crewMemberId,
        date: {
          gte: scheduleStart,
          lt: scheduleEnd,
        },
      },
      select: {
        id: true,
        dutyStatus: true,
        date: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.aircraftCrewAssignment.findMany({
      where: {
        crewMemberId: request.crewMemberId,
        isActive: true,
        startsAt: { lt: windowEnd },
        OR: [{ endsAt: null }, { endsAt: { gt: windowStart } }],
      },
      select: {
        id: true,
        aircraft: {
          select: {
            id: true,
            tailNumber: true,
          },
        },
        seatRole: true,
        startsAt: true,
        endsAt: true,
      },
    }),
  ]);

  if (overlappingRequests.length > 0) {
    warnings.push(
      `${overlappingRequests.length} pending/approved time-off request${
        overlappingRequests.length === 1 ? "" : "s"
      } already overlap this range.`,
    );
  }

  if (schedules.length > 0) {
    warnings.push(
      `${schedules.length} CrewSchedule block${schedules.length === 1 ? "" : "s"} overlap this range.`,
    );
  }

  if (assignments.length > 0) {
    warnings.push(
      `${assignments.length} active aircraft-block assignment${
        assignments.length === 1 ? "" : "s"
      } overlap this range.`,
    );
  }

  const assignedFlights = [];
  const aircraftIds = Array.from(new Set(assignments.map((assignment) => assignment.aircraft.id)));
  const flights = await getUpcomingCoverageFlightsForAircrafts(aircraftIds, windowStart, windowEnd);

  for (const flight of flights) {
    const isAssigned = flight.coverage?.assignedCrew.some(
      (assignment) => assignment.crewMemberId === request.crewMemberId,
    );

    if (isAssigned) {
      assignedFlights.push(flight.flightNumber);
    }
  }

  if (assignedFlights.length > 0) {
    warnings.push(
      `Assigned upcoming coverage overlaps this request: ${assignedFlights.slice(0, 5).join(", ")}${
        assignedFlights.length > 5 ? "..." : ""
      }.`,
    );
  }

  if (request.crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    warnings.push(`Crew member employment status is ${request.crewMember.employmentStatus}.`);
  }

  return warnings;
}

export async function getTimeOffWorkflowData(
  filters: TimeOffWorkflowFilters = {
    crewMemberId: "all",
    fromDate: null,
    requestType: "all",
    status: "all",
    toDate: null,
  },
): Promise<TimeOffWorkflowData> {
  const requestWhere: Prisma.TimeOffRequestWhereInput = {
    crewMemberId: filters.crewMemberId === "all" ? undefined : filters.crewMemberId,
    requestType: filters.requestType === "all" ? undefined : filters.requestType,
    status: filters.status === "all" ? undefined : filters.status,
  };

  if (filters.fromDate || filters.toDate) {
    requestWhere.AND = [
      filters.toDate ? { startDate: { lt: filters.toDate } } : {},
      filters.fromDate ? { endDate: { gt: filters.fromDate } } : {},
    ];
  }

  const [activeCrewMembers, allCrewMembers, requests] = await Promise.all([
    prisma.crewMember.findMany({
      where: { employmentStatus: EmploymentStatus.ACTIVE },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
      },
    }),
    prisma.crewMember.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
      },
    }),
    prisma.timeOffRequest.findMany({
      where: requestWhere,
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      select: timeOffRequestSelect,
    }),
  ]);
  const requestsWithWarnings = await Promise.all(
    requests.map(async (request) => {
      const [conflictWarnings, coverageImpact] = await Promise.all([
        getTimeOffConflictWarnings(request),
        getTimeOffCoverageImpact(request),
      ]);

      return {
        ...request,
        conflictWarnings,
        coverageImpact,
      };
    }),
  );
  const requestsByStatus = {
    [TimeOffRequestStatus.PENDING]: [] as TimeOffWorkflowRequest[],
    [TimeOffRequestStatus.APPROVED]: [] as TimeOffWorkflowRequest[],
    [TimeOffRequestStatus.DENIED]: [] as TimeOffWorkflowRequest[],
    [TimeOffRequestStatus.CANCELLED]: [] as TimeOffWorkflowRequest[],
  };

  for (const request of requestsWithWarnings) {
    requestsByStatus[request.status].push(request);
  }

  return {
    crewOptions: activeCrewMembers.map((crewMember) => ({
      id: crewMember.id,
      label: crewLabel(crewMember),
    })),
    filterCrewOptions: allCrewMembers.map((crewMember) => ({
      id: crewMember.id,
      label: crewLabel(crewMember),
    })),
    requestsByStatus,
    summary: {
      [TimeOffRequestStatus.PENDING]: requestsByStatus.PENDING.length,
      [TimeOffRequestStatus.APPROVED]: requestsByStatus.APPROVED.length,
      [TimeOffRequestStatus.DENIED]: requestsByStatus.DENIED.length,
      [TimeOffRequestStatus.CANCELLED]: requestsByStatus.CANCELLED.length,
    },
  };
}
