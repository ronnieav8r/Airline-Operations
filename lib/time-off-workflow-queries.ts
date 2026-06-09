import {
  EmploymentStatus,
  Prisma,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";

import { resolveFlightCoverage } from "@/lib/crew-resolution";
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

async function getTimeOffConflictWarnings(
  request: Prisma.TimeOffRequestGetPayload<{ select: typeof timeOffRequestSelect }>,
): Promise<string[]> {
  const warnings: string[] = [];
  const windowStart = request.startDate;
  const windowEnd = request.endDate;
  const scheduleStart = startOfDay(windowStart);
  const scheduleEnd = addDays(startOfDay(windowEnd), 1);

  const [overlappingRequests, schedules, assignments, flights] = await Promise.all([
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
    prisma.flight.findMany({
      where: {
        scheduledDeparture: { lt: windowEnd },
        scheduledArrival: { gt: windowStart },
      },
      select: {
        id: true,
        flightNumber: true,
        scheduledDeparture: true,
      },
      orderBy: { scheduledDeparture: "asc" },
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
  for (const flight of flights) {
    const coverage = await resolveFlightCoverage(flight.id);
    const isAssigned = coverage?.assignedCrew.some(
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
    requests.map(async (request) => ({
      ...request,
      conflictWarnings: await getTimeOffConflictWarnings(request),
    })),
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
