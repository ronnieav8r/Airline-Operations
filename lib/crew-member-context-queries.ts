import {
  CrewLogisticsNeedStatus,
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
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
import {
  CrewComplianceEvaluationStatus,
  CrewComplianceFinding,
  evaluateCrewCompliance,
} from "@/lib/crew-compliance-evaluator";
import { getActiveCrewComplianceRuleDefinitions } from "@/lib/crew-compliance-rule-defaults";
import { prisma } from "@/lib/prisma";

export const CREW_MEMBER_CONTEXT_WINDOW_DAYS = 7;

const crewMemberContextSelect = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  dutyStatus: true,
  employmentStatus: true,
  dateOfBirth: true,
  hireDate: true,
  phone: true,
  email: true,
  baseStation: {
    select: {
      id: true,
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
      notes: true,
    },
  },
  assignments: {
    where: {
      isActive: true,
    },
    orderBy: [{ aircraft: { tailNumber: "asc" } }, { seatRole: "asc" }],
    select: {
      id: true,
      seatRole: true,
      startsAt: true,
      endsAt: true,
      notes: true,
      aircraft: {
        select: {
          id: true,
          tailNumber: true,
          type: true,
          status: true,
          homeStation: {
            select: {
              code: true,
              city: true,
            },
          },
        },
      },
    },
  },
  schedules: {
    orderBy: [{ date: "asc" }, { startsAt: "asc" }],
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
  },
  scheduleEntries: {
    orderBy: [{ date: "asc" }, { startsAt: "asc" }],
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
  },
  timeOffRequests: {
    where: {
      status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
    },
    orderBy: [{ startDate: "asc" }],
    select: {
      id: true,
      requestType: true,
      status: true,
      startDate: true,
      endDate: true,
      reason: true,
    },
  },
  locationRecords: {
    orderBy: [{ effectiveAt: "desc" }],
    take: 3,
    select: {
      id: true,
      effectiveAt: true,
      locationText: true,
      notes: true,
      source: true,
      station: {
        select: {
          code: true,
          city: true,
        },
      },
    },
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
    orderBy: [{ neededBy: "asc" }, { createdAt: "desc" }],
    take: 5,
    select: {
      id: true,
      completedAt: true,
      confirmationNumber: true,
      createdAt: true,
      needType: true,
      neededBy: true,
      notes: true,
      providerName: true,
      status: true,
      aircraft: {
        select: {
          id: true,
          tailNumber: true,
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
  },
  certificates: {
    orderBy: [{ expiresAt: "asc" }, { issuedAt: "desc" }],
    select: {
      id: true,
      aircraftType: true,
      certificateType: true,
      coveredOperatingParts: true,
      expiresAt: true,
      issuedAt: true,
      ratingOrEndorsement: true,
      satisfiesRequirements: true,
      seatRole: true,
      status: true,
    },
  },
  medicals: {
    orderBy: [{ expiresAt: "asc" }, { issuedAt: "desc" }],
    select: {
      id: true,
      coveredOperatingParts: true,
      expiresAt: true,
      issuedAt: true,
      limitations: true,
      medicalClass: true,
      satisfiesRequirements: true,
      status: true,
    },
  },
  trainingEvents: {
    orderBy: [{ completedAt: "desc" }],
    take: 6,
    select: {
      id: true,
      aircraftType: true,
      completedAt: true,
      coveredOperatingParts: true,
      expiresAt: true,
      programName: true,
      result: true,
      satisfiesRequirements: true,
      status: true,
      trainingType: true,
    },
  },
  checkEvents: {
    orderBy: [{ completedAt: "desc" }],
    take: 6,
    select: {
      id: true,
      aircraftType: true,
      checkType: true,
      completedAt: true,
      coveredOperatingParts: true,
      expiresAt: true,
      result: true,
      satisfiesRequirements: true,
      seatRole: true,
      status: true,
    },
  },
  recencyEvents: {
    orderBy: [{ eventAt: "desc" }],
    take: 6,
    select: {
      id: true,
      aircraftType: true,
      eventAt: true,
      coveredOperatingParts: true,
      quantity: true,
      recencyType: true,
      result: true,
      satisfiesRequirements: true,
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
    orderBy: [{ startsAt: "desc" }],
    take: 6,
    select: {
      id: true,
      dutyStatus: true,
      endsAt: true,
      source: true,
      startsAt: true,
      status: true,
    },
  },
  restPeriods: {
    orderBy: [{ startsAt: "desc" }],
    take: 6,
    select: {
      id: true,
      endsAt: true,
      source: true,
      startsAt: true,
      status: true,
    },
  },
} satisfies Prisma.CrewMemberSelect;

type CrewMemberContextPayload = Prisma.CrewMemberGetPayload<{
  select: typeof crewMemberContextSelect;
}>;

export type CrewMemberContextFlight = Pick<
  UpcomingCoverageFlight,
  | "aircraftId"
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

export type CrewMemberContextData = CrewMemberContextPayload & {
  activeAssignments: CrewMemberContextPayload["assignments"];
  availabilityWarnings: string[];
  complianceFindings: CrewComplianceFinding[];
  complianceStatus: CrewComplianceEvaluationStatus;
  complianceWarnings: string[];
  schedulesInWindow: CrewMemberContextPayload["schedules"];
  scheduleEntriesInWindow: CrewMemberContextPayload["scheduleEntries"];
  timeOffInWindow: CrewMemberContextPayload["timeOffRequests"];
  upcomingFlights: CrewMemberContextFlight[];
  windowEnd: Date;
  windowStart: Date;
};

export type CrewPortalData = CrewMemberContextData & {
  requestOptions: {
    activeCrewMembers: Array<{
      employeeNumber: string;
      firstName: string;
      id: string;
      lastName: string;
    }>;
    activePatterns: Array<{
      id: string;
      name: string;
    }>;
    schedulePeriods: Array<{
      id: string;
      name: string;
      periodKey: string;
    }>;
  };
  scheduleRequests: Array<{
    endDate: Date | null;
    id: string;
    preferredDutyStatus: DutyStatus | null;
    requestNotes: string | null;
    requestType: string;
    requestedPattern: {
      name: string;
    } | null;
    requestedSwapCrewMember: {
      firstName: string;
      lastName: string;
    } | null;
    reviewNotes: string | null;
    reviewedAt: Date | null;
    startDate: Date | null;
    status: CrewScheduleRequestStatus;
    period: {
      name: string;
    };
  }>;
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

function hasActiveAssignment(
  assignment: CrewMemberContextPayload["assignments"][number],
  now: Date,
): boolean {
  return assignment.startsAt <= now && (!assignment.endsAt || assignment.endsAt > now);
}

function hasQualificationWarning(
  crewMember: CrewMemberContextPayload,
  flight: CrewMemberContextFlight,
): boolean {
  const matchingAssignment = crewMember.assignments.find(
    (assignment) => assignment.aircraft.tailNumber === flight.tailNumber,
  );

  if (!matchingAssignment) {
    return false;
  }

  return flight.seatRoles.some((seatRole) => {
    const qualification = crewMember.qualifications.find(
      (item) =>
        item.aircraftType === matchingAssignment.aircraft.type && item.seatRole === seatRole,
    );

    return !qualification || Boolean(qualification.expiresAt && qualification.expiresAt < flight.scheduledDeparture);
  });
}

function buildAvailabilityWarnings(
  crewMember: CrewMemberContextPayload,
  complianceWarnings: string[],
  schedulesInWindow: CrewMemberContextPayload["schedules"],
  scheduleEntriesInWindow: CrewMemberContextPayload["scheduleEntries"],
  timeOffInWindow: CrewMemberContextPayload["timeOffRequests"],
  upcomingFlights: CrewMemberContextFlight[],
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

export async function getCrewMemberContextData(
  crewMemberId: string,
): Promise<CrewMemberContextData | null> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = addDays(now, CREW_MEMBER_CONTEXT_WINDOW_DAYS);
  const [crewMember, complianceRules] = await Promise.all([
    prisma.crewMember.findUnique({
    where: { id: crewMemberId },
    select: {
      ...crewMemberContextSelect,
      schedules: {
        ...crewMemberContextSelect.schedules,
        where: {
          date: {
            gte: windowStart,
            lt: windowEnd,
          },
        },
      },
      scheduleEntries: {
        ...crewMemberContextSelect.scheduleEntries,
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
        ...crewMemberContextSelect.timeOffRequests,
        where: {
          status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
          startDate: { lt: windowEnd },
          endDate: { gte: now },
        },
      },
    },
  }),
    getActiveCrewComplianceRuleDefinitions(prisma),
  ]);

  if (!crewMember) {
    return null;
  }

  const activeAssignments = crewMember.assignments.filter((assignment) =>
    hasActiveAssignment(assignment, now),
  );
  const aircraftIds = Array.from(
    new Set(activeAssignments.map((assignment) => assignment.aircraft.id)),
  );
  const flightsWithCoverage = await getUpcomingCoverageFlightsForAircrafts(
    aircraftIds,
    now,
    windowEnd,
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
  const schedulesInWindow = crewMember.schedules;
  const scheduleEntriesInWindow = crewMember.scheduleEntries;
  const timeOffInWindow = crewMember.timeOffRequests.filter((request) =>
    overlapsWindow(request.startDate, request.endDate, now, windowEnd),
  );
  const complianceEvaluation = evaluateCrewCompliance(crewMember, complianceRules, now);
  const complianceWarnings = complianceEvaluation.warnings;

  return {
    ...crewMember,
    activeAssignments,
    availabilityWarnings: buildAvailabilityWarnings(
      crewMember,
      complianceWarnings,
      schedulesInWindow,
      scheduleEntriesInWindow,
      timeOffInWindow,
      upcomingFlights,
    ),
    complianceFindings: complianceEvaluation.findings,
    complianceStatus: complianceEvaluation.strongestStatus,
    complianceWarnings,
    scheduleEntriesInWindow,
    schedulesInWindow,
    timeOffInWindow,
    upcomingFlights,
    windowEnd,
    windowStart,
  };
}

export async function getCrewPortalData(userId: string): Promise<CrewPortalData | null> {
  const linkedCrewMember = await prisma.crewMember.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!linkedCrewMember) {
    return null;
  }

  const [context, scheduleRequests] = await Promise.all([
    getCrewMemberContextData(linkedCrewMember.id),
    prisma.crewScheduleRequest.findMany({
      where: { crewMemberId: linkedCrewMember.id },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
      select: {
        id: true,
        requestType: true,
        status: true,
        startDate: true,
        endDate: true,
        preferredDutyStatus: true,
        requestNotes: true,
        reviewNotes: true,
        reviewedAt: true,
        period: {
          select: {
            name: true,
          },
        },
        requestedPattern: {
          select: {
            name: true,
          },
        },
        requestedSwapCrewMember: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  const [schedulePeriods, activePatterns, activeCrewMembers] = await Promise.all([
    prisma.crewSchedulePeriod.findMany({
      where: {
        status: {
          in: [CrewSchedulePeriodStatus.BID_OPEN, CrewSchedulePeriodStatus.DRAFTING],
        },
      },
      orderBy: [{ startsAt: "asc" }],
      select: {
        id: true,
        periodKey: true,
        name: true,
      },
    }),
    prisma.crewRotationPattern.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.crewMember.findMany({
      where: {
        employmentStatus: EmploymentStatus.ACTIVE,
        id: { not: linkedCrewMember.id },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
      },
    }),
  ]);

  if (!context) {
    return null;
  }

  return {
    ...context,
    requestOptions: {
      activeCrewMembers,
      activePatterns,
      schedulePeriods,
    },
    scheduleRequests,
  };
}
