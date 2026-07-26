import {
  CrewLogisticsNeedStatus,
  CrewScheduleEntryStatus,
  DutyStatus,
  EmploymentStatus,
  Prisma,
  SeatRole,
  TimeOffRequestStatus,
} from "@prisma/client";

import {
  getUpcomingCoverageFlightsForAircrafts,
  UpcomingCoverageFlight,
} from "@/lib/flightleg-upcoming-coverage";
import { evaluateCrewCompliance } from "@/lib/crew-compliance-evaluator";
import {
  CrewComplianceRuleDefinition,
  getActiveCrewComplianceRuleDefinitions,
} from "@/lib/crew-compliance-rule-defaults";
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
  dateOfBirth: true,
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
      id: true,
      expiresAt: true,
      issuedAt: true,
      medicalClass: true,
      status: true,
    },
  },
  trainingEvents: {
    orderBy: [{ completedAt: "desc" }],
    take: 8,
    select: {
      id: true,
      completedAt: true,
      expiresAt: true,
      result: true,
      status: true,
      trainingType: true,
    },
  },
  checkEvents: {
    orderBy: [{ completedAt: "desc" }],
    take: 8,
    select: {
      id: true,
      checkType: true,
      completedAt: true,
      expiresAt: true,
      result: true,
      seatRole: true,
      status: true,
    },
  },
  recencyEvents: {
    orderBy: [{ eventAt: "desc" }],
    take: 8,
    select: {
      id: true,
      eventAt: true,
      quantity: true,
      recencyType: true,
      result: true,
      seatRole: true,
      status: true,
    },
  },
  plannedComplianceEvents: {
    where: {
      status: "SCHEDULED",
    },
    orderBy: [{ scheduledFor: "asc" }],
    take: 8,
    select: {
      id: true,
      eventType: true,
      scheduledFor: true,
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

type CrewPlannerPayload = Prisma.CrewMemberGetPayload<{
  select: typeof crewPlannerSelect;
}>;

export type CrewPlannerFlight = Pick<
  UpcomingCoverageFlight,
  | "coverage"
  | "flightLegId"
  | "flightNumber"
  | "id"
  | "route"
  | "scheduledArrival"
  | "scheduledDeparture"
  | "status"
  | "tailNumber"
> & {
  seatRoles: SeatRole[];
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

function buildComplianceWarnings(
  crewMember: CrewPlannerPayload,
  complianceRules: CrewComplianceRuleDefinition[],
  now: Date,
): string[] {
  return evaluateCrewCompliance(crewMember, complianceRules, now).warnings;
}

export async function getCrewSchedulingPlannerData(
  options: CrewSchedulingPlannerOptions = {},
): Promise<CrewSchedulingPlannerData> {
  const now = new Date();
  const windowStart = options.windowStart ? new Date(options.windowStart) : new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowDays = options.windowDays ?? CREW_SCHEDULING_WINDOW_DAYS;
  const windowEnd = addDays(windowStart, windowDays);
  const [crewMembers, complianceRules] = await Promise.all([
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
    getActiveCrewComplianceRuleDefinitions(prisma),
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
    windowStart,
    windowEnd,
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
    const upcomingFlights = flightsWithCoverage.flatMap((flight) => {
      const seatRoles =
        flight.coverage?.assignedCrew
          .filter((assignment) => assignment.crewMemberId === crewMember.id)
          .map((assignment) => assignment.seatRole) ?? [];

      if (seatRoles.length === 0) {
        return [];
      }

      return [{ ...flight, seatRoles }];
    });
    const complianceWarnings = buildComplianceWarnings(crewMember, complianceRules, now);
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
