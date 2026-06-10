import {
  AssignmentStatus,
  CrewComplianceRecordStatus,
  CrewLogisticsNeedStatus,
  CrewScheduleEntryStatus,
  DutyStatus,
  EmploymentStatus,
  FlightLegStatus,
  FlightStatus,
  Prisma,
  SeatRole,
  TimeOffRequestStatus,
} from "@prisma/client";

import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";
import { prisma } from "@/lib/prisma";

export const CREW_SCHEDULING_WINDOW_DAYS = 7;
export const CREW_SCHEDULING_WINDOW_DAY_OPTIONS = [1, 3, 7, 14] as const;

export type CrewSchedulingWindowDays = (typeof CREW_SCHEDULING_WINDOW_DAY_OPTIONS)[number];

export type CrewSchedulingPlannerOptions = {
  windowDays?: CrewSchedulingWindowDays;
  windowStart?: Date;
};

const crewPlannerSelect = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  dutyStatus: true,
  employmentStatus: true,
  baseStation: {
    select: {
      code: true,
      city: true,
    },
  },
  qualifications: {
    select: {
      aircraftType: true,
      seatRole: true,
      expiresAt: true,
    },
  },
  assignments: {
    where: {
      isActive: true,
    },
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
    orderBy: [{ aircraft: { tailNumber: "asc" } }, { seatRole: "asc" }],
  },
  schedules: {
    select: {
      id: true,
      date: true,
      dutyStatus: true,
      startsAt: true,
      endsAt: true,
      notes: true,
      station: {
        select: {
          code: true,
          city: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startsAt: "asc" }],
  },
  scheduleEntries: {
    select: {
      id: true,
      date: true,
      dutyStatus: true,
      startsAt: true,
      endsAt: true,
      status: true,
      notes: true,
      period: {
        select: {
          id: true,
          name: true,
        },
      },
      station: {
        select: {
          code: true,
          city: true,
        },
      },
      rotationPattern: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startsAt: "asc" }],
  },
  timeOffRequests: {
    where: {
      status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
    },
    select: {
      id: true,
      requestType: true,
      status: true,
      startDate: true,
      endDate: true,
      reason: true,
    },
    orderBy: [{ startDate: "asc" }],
  },
  locationRecords: {
    select: {
      id: true,
      effectiveAt: true,
      locationText: true,
      source: true,
      station: {
        select: {
          code: true,
          city: true,
        },
      },
    },
    orderBy: [{ effectiveAt: "desc" }],
    take: 1,
  },
  logisticsNeeds: {
    where: {
      status: {
        in: [
          CrewLogisticsNeedStatus.PLANNED,
          CrewLogisticsNeedStatus.REQUESTED,
          CrewLogisticsNeedStatus.BOOKED,
        ],
      },
    },
    select: {
      id: true,
      needType: true,
      neededBy: true,
      status: true,
      aircraft: {
        select: {
          tailNumber: true,
        },
      },
      flightLeg: {
        select: {
          id: true,
          flightNumber: true,
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
    orderBy: [{ neededBy: "asc" }, { createdAt: "desc" }],
    take: 3,
  },
  certificates: {
    select: {
      expiresAt: true,
      status: true,
    },
  },
  medicals: {
    select: {
      expiresAt: true,
      status: true,
    },
  },
  trainingEvents: {
    select: {
      expiresAt: true,
      status: true,
    },
  },
  checkEvents: {
    select: {
      expiresAt: true,
      status: true,
    },
  },
  recencyEvents: {
    select: {
      status: true,
    },
  },
  dutyPeriods: {
    select: {
      startsAt: true,
      endsAt: true,
      status: true,
    },
  },
  restPeriods: {
    select: {
      startsAt: true,
      endsAt: true,
      status: true,
    },
  },
} satisfies Prisma.CrewMemberSelect;

const flightPlannerSelect = {
  id: true,
  aircraftId: true,
  flightNumber: true,
  scheduledDeparture: true,
  scheduledArrival: true,
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
      scheduledArrival: true,
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
              id: true,
              tailNumber: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  },
} satisfies Prisma.FlightSelect;

type CrewPlannerPayload = Prisma.CrewMemberGetPayload<{
  select: typeof crewPlannerSelect;
}>;

type FlightPlannerPayload = Prisma.FlightGetPayload<{
  select: typeof flightPlannerSelect;
}>;

export type CrewPlannerFlight = {
  id: string;
  flightLegId: string | null;
  flightNumber: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  status: FlightStatus | FlightLegStatus;
  route: string;
  tailNumber: string;
  seatRoles: SeatRole[];
  coverage: FlightCoverage | null;
};

export type CrewPlannerMember = CrewPlannerPayload & {
  availabilityWarnings: string[];
  complianceWarnings: string[];
  currentAssignments: CrewPlannerPayload["assignments"];
  schedulesInWindow: CrewPlannerPayload["schedules"];
  scheduleEntriesInWindow: CrewPlannerPayload["scheduleEntries"];
  timeOffInWindow: CrewPlannerPayload["timeOffRequests"];
  upcomingFlights: CrewPlannerFlight[];
};

export type CrewSchedulingPlannerData = {
  crewMembers: CrewPlannerMember[];
  windowEnd: Date;
  windowStart: Date;
  summary: {
    activeCrew: number;
    assignedCrew: number;
    crewWithAvailabilityWarnings: number;
    crewWithComplianceWarnings: number;
    crewWithScheduleEntries: number;
    crewWithScheduleBlocks: number;
    crewWithTimeOff: number;
    crewWithOpenLogisticsNeeds: number;
    upcomingCoverageGaps: number;
  };
};

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function overlapsWindow(
  start: Date,
  end: Date | null,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  return start < windowEnd && (!end || end >= windowStart);
}

function hasCurrentAssignment(
  assignment: CrewPlannerPayload["assignments"][number],
  now: Date,
): boolean {
  return assignment.startsAt <= now && (!assignment.endsAt || assignment.endsAt > now);
}

function hasQualificationWarning(
  crewMember: CrewPlannerPayload,
  flight: CrewPlannerFlight,
): boolean {
  return flight.seatRoles.some((seatRole) => {
    const assignment = crewMember.assignments.find(
      (item) => item.aircraft.tailNumber === flight.tailNumber,
    );
    const aircraftType = assignment?.aircraft.type;

    if (!aircraftType) {
      return false;
    }

    const qualification = crewMember.qualifications.find(
      (item) => item.aircraftType === aircraftType && item.seatRole === seatRole,
    );

    return !qualification || Boolean(qualification.expiresAt && qualification.expiresAt < flight.scheduledDeparture);
  });
}

function normalizeFlight(
  flight: FlightPlannerPayload,
  coverage: FlightCoverage | null,
): Omit<CrewPlannerFlight, "seatRoles"> {
  if (flight.flightLeg) {
    const assignedAircraft = flight.flightLeg.aircraftAssignments[0]?.aircraft;

    return {
      id: flight.id,
      flightLegId: flight.flightLeg.id,
      flightNumber: flight.flightLeg.flightNumber ?? flight.flightNumber,
      scheduledDeparture: flight.flightLeg.scheduledDeparture,
      scheduledArrival: flight.flightLeg.scheduledArrival,
      status: flight.flightLeg.status,
      route: `${flight.flightLeg.departureStation.code} -> ${flight.flightLeg.arrivalStation.code}`,
      tailNumber: assignedAircraft?.tailNumber ?? flight.aircraft.tailNumber,
      coverage,
    };
  }

  return {
    id: flight.id,
    flightLegId: null,
    flightNumber: flight.flightNumber,
    scheduledDeparture: flight.scheduledDeparture,
    scheduledArrival: flight.scheduledArrival,
    status: flight.status,
    route: `${flight.departureStation.code} -> ${flight.arrivalStation.code}`,
    tailNumber: flight.aircraft.tailNumber,
    coverage,
  };
}

function buildAvailabilityWarnings(
  crewMember: CrewPlannerPayload,
  complianceWarnings: string[],
  schedulesInWindow: CrewPlannerPayload["schedules"],
  scheduleEntriesInWindow: CrewPlannerPayload["scheduleEntries"],
  timeOffInWindow: CrewPlannerPayload["timeOffRequests"],
  upcomingFlights: CrewPlannerFlight[],
): string[] {
  const warnings: string[] = [];

  if (crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    warnings.push(`Employment status is ${crewMember.employmentStatus}.`);
  }

  if (
    crewMember.dutyStatus === DutyStatus.SICK ||
    crewMember.dutyStatus === DutyStatus.VACATION ||
    crewMember.dutyStatus === DutyStatus.TRAINING
  ) {
    warnings.push(`Current duty status is ${crewMember.dutyStatus}.`);
  }

  if (schedulesInWindow.length === 0 && scheduleEntriesInWindow.length === 0) {
    warnings.push("No CrewSchedule block or schedule-period entry in the planning window.");
  }

  if (timeOffInWindow.length > 0) {
    warnings.push("Time-off request overlaps the planning window.");
  }

  if (upcomingFlights.some((flight) => hasQualificationWarning(crewMember, flight))) {
    warnings.push("Qualification warning exists for assigned upcoming coverage.");
  }

  if (complianceWarnings.length > 0) {
    warnings.push("Crew compliance evidence should be reviewed.");
  }

  return warnings;
}

function isExpired(expiresAt: Date | null, now: Date): boolean {
  return Boolean(expiresAt && expiresAt < now);
}

function hasExpiredStatus(status: CrewComplianceRecordStatus): boolean {
  return status === CrewComplianceRecordStatus.EXPIRED || status === CrewComplianceRecordStatus.VOIDED;
}

function buildComplianceWarnings(crewMember: CrewPlannerPayload, now: Date): string[] {
  const warnings: string[] = [];
  const missingCategories = [
    crewMember.certificates.length === 0 ? "certificate" : null,
    crewMember.medicals.length === 0 ? "medical" : null,
    crewMember.trainingEvents.length === 0 ? "training" : null,
    crewMember.checkEvents.length === 0 ? "check" : null,
    crewMember.recencyEvents.length === 0 ? "recency" : null,
    crewMember.dutyPeriods.length === 0 ? "duty" : null,
    crewMember.restPeriods.length === 0 ? "rest" : null,
  ].filter(Boolean);

  if (missingCategories.length > 0) {
    warnings.push(`Missing ${missingCategories.join(", ")} evidence.`);
  }

  const expiredCount =
    crewMember.certificates.filter((item) => hasExpiredStatus(item.status) || isExpired(item.expiresAt, now)).length +
    crewMember.medicals.filter((item) => hasExpiredStatus(item.status) || isExpired(item.expiresAt, now)).length +
    crewMember.trainingEvents.filter((item) => hasExpiredStatus(item.status) || isExpired(item.expiresAt, now)).length +
    crewMember.checkEvents.filter((item) => hasExpiredStatus(item.status) || isExpired(item.expiresAt, now)).length +
    crewMember.recencyEvents.filter((item) => hasExpiredStatus(item.status)).length;

  if (expiredCount > 0) {
    warnings.push(`${expiredCount} expired or voided compliance record${expiredCount === 1 ? "" : "s"}.`);
  }

  return warnings;
}

export async function getCrewSchedulingPlannerData(
  options: CrewSchedulingPlannerOptions = {},
): Promise<CrewSchedulingPlannerData> {
  const now = new Date();
  const windowStart = options.windowStart ? new Date(options.windowStart) : new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowDays = options.windowDays ?? CREW_SCHEDULING_WINDOW_DAYS;
  const windowEnd = addDays(windowStart, windowDays);
  const [crewMembers, flights] = await Promise.all([
    prisma.crewMember.findMany({
      orderBy: [{ employmentStatus: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        ...crewPlannerSelect,
        schedules: {
          ...crewPlannerSelect.schedules,
          where: {
            date: {
              gte: windowStart,
              lt: windowEnd,
            },
          },
        },
        scheduleEntries: {
          ...crewPlannerSelect.scheduleEntries,
          where: {
            status: {
              in: [CrewScheduleEntryStatus.DRAFT, CrewScheduleEntryStatus.PUBLISHED],
            },
            date: {
              gte: windowStart,
              lt: windowEnd,
            },
          },
        },
        timeOffRequests: {
          ...crewPlannerSelect.timeOffRequests,
          where: {
            status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
            startDate: { lt: windowEnd },
            endDate: { gte: windowStart },
          },
        },
      },
    }),
    prisma.flight.findMany({
      where: {
        scheduledDeparture: {
          gte: windowStart,
          lt: windowEnd,
        },
      },
      orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
      select: flightPlannerSelect,
    }),
  ]);

  const flightsWithCoverage = await Promise.all(
    flights.map(async (flight) => ({
      flight,
      coverage: await resolveFlightCoverage(flight.id),
    })),
  );

  const crewMembersWithPlanning = crewMembers.map((crewMember) => {
    const currentAssignments = crewMember.assignments.filter((assignment) =>
      hasCurrentAssignment(assignment, now),
    );
    const schedulesInWindow = crewMember.schedules;
    const scheduleEntriesInWindow = crewMember.scheduleEntries;
    const timeOffInWindow = crewMember.timeOffRequests.filter((request) =>
      overlapsWindow(request.startDate, request.endDate, windowStart, windowEnd),
    );
    const upcomingFlights = flightsWithCoverage.flatMap(({ flight, coverage }) => {
      const baseFlight = normalizeFlight(flight, coverage);
      const seatRoles =
        coverage?.assignedCrew
          .filter((assignment) => assignment.crewMemberId === crewMember.id)
          .map((assignment) => assignment.seatRole) ?? [];

      if (seatRoles.length === 0) {
        return [];
      }

      return [{ ...baseFlight, seatRoles }];
    });
    const complianceWarnings = buildComplianceWarnings(crewMember, now);
    const availabilityWarnings = buildAvailabilityWarnings(
      crewMember,
      complianceWarnings,
      schedulesInWindow,
      scheduleEntriesInWindow,
      timeOffInWindow,
      upcomingFlights,
    );

    return {
      ...crewMember,
      availabilityWarnings,
      complianceWarnings,
      currentAssignments,
      scheduleEntriesInWindow,
      schedulesInWindow,
      timeOffInWindow,
      upcomingFlights,
    };
  });

  return {
    crewMembers: crewMembersWithPlanning,
    windowStart,
    windowEnd,
    summary: {
      activeCrew: crewMembersWithPlanning.filter(
        (crewMember) => crewMember.employmentStatus === EmploymentStatus.ACTIVE,
      ).length,
      assignedCrew: crewMembersWithPlanning.filter(
        (crewMember) => crewMember.currentAssignments.length > 0,
      ).length,
      crewWithAvailabilityWarnings: crewMembersWithPlanning.filter(
        (crewMember) => crewMember.availabilityWarnings.length > 0,
      ).length,
      crewWithComplianceWarnings: crewMembersWithPlanning.filter(
        (crewMember) => crewMember.complianceWarnings.length > 0,
      ).length,
      crewWithScheduleEntries: crewMembersWithPlanning.filter(
        (crewMember) => crewMember.scheduleEntriesInWindow.length > 0,
      ).length,
      crewWithScheduleBlocks: crewMembersWithPlanning.filter(
        (crewMember) => crewMember.schedulesInWindow.length > 0,
      ).length,
      crewWithTimeOff: crewMembersWithPlanning.filter(
        (crewMember) => crewMember.timeOffInWindow.length > 0,
      ).length,
      crewWithOpenLogisticsNeeds: crewMembersWithPlanning.filter(
        (crewMember) => crewMember.logisticsNeeds.length > 0,
      ).length,
      upcomingCoverageGaps: flightsWithCoverage.filter(
        ({ coverage }) => coverage && !coverage.isCovered,
      ).length,
    },
  };
}
