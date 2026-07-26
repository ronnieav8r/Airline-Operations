import {
  AircraftType,
  CrewLogisticsNeedStatus,
  CrewScheduleEntryStatus,
  DutyStatus,
  EmploymentStatus,
  FlightLegStatus,
  Prisma,
  SeatRole,
  TimeOffRequestStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  CrewComplianceEvaluationInput,
  evaluateCrewCompliance,
} from "@/lib/crew-compliance-evaluator";
import {
  CrewComplianceRuleDefinition,
  getActiveCrewComplianceRuleDefinitions,
} from "@/lib/crew-compliance-rule-defaults";

const aircraftCrewWorkflowSelect = {
  id: true,
  tailNumber: true,
  name: true,
  seats: true,
  type: true,
  status: true,
  homeStation: {
    select: {
      code: true,
      city: true,
    },
  },
  crewAssignments: {
    where: {
      isActive: true,
    },
    orderBy: [{ seatRole: "asc" }, { startsAt: "asc" }],
    select: {
      id: true,
      seatRole: true,
      startsAt: true,
      endsAt: true,
      notes: true,
      crewMember: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          dutyStatus: true,
          employmentStatus: true,
          dateOfBirth: true,
          qualifications: {
            select: {
              aircraftType: true,
              seatRole: true,
              expiresAt: true,
            },
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
        },
      },
    },
  },
  crewLogisticsNeeds: {
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
    take: 8,
    select: {
      id: true,
      needType: true,
      neededBy: true,
      notes: true,
      status: true,
      crewMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
  },
  aircraftAssignments: {
    where: {
      flightLeg: {
        scheduledArrival: {
          gte: new Date(),
        },
      },
    },
    select: {
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
          crewAssignments: {
            select: {
              id: true,
              crewMemberId: true,
              seatRole: true,
              status: true,
              sourceAircraftCrewAssignmentId: true,
            },
            orderBy: [{ seatRole: "asc" }],
          },
        },
      },
    },
    orderBy: [{ flightLeg: { scheduledDeparture: "asc" } }],
    take: 8,
  },
} satisfies Prisma.AircraftSelect;

const aircraftCrewWorkflowFlightLegSelect = {
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
  crewAssignments: {
    select: {
      id: true,
      crewMemberId: true,
      seatRole: true,
      status: true,
      sourceAircraftCrewAssignmentId: true,
    },
    orderBy: [{ seatRole: "asc" }],
  },
} satisfies Prisma.FlightLegSelect;

const crewMemberOptionSelect = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  dutyStatus: true,
  employmentStatus: true,
  dateOfBirth: true,
  qualifications: {
    select: {
      aircraftType: true,
      seatRole: true,
      expiresAt: true,
    },
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
  assignments: {
    where: {
      isActive: true,
    },
    select: {
      id: true,
      aircraftId: true,
      seatRole: true,
      startsAt: true,
      endsAt: true,
      aircraft: {
        select: {
          id: true,
          tailNumber: true,
          type: true,
        },
      },
    },
    orderBy: [{ startsAt: "asc" }],
  },
  schedules: {
    select: {
      id: true,
      date: true,
      dutyStatus: true,
      startsAt: true,
      endsAt: true,
      station: {
        select: {
          code: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startsAt: "asc" }],
  },
  scheduleEntries: {
    where: {
      status: {
        in: [CrewScheduleEntryStatus.DRAFT, CrewScheduleEntryStatus.PUBLISHED],
      },
    },
    select: {
      id: true,
      date: true,
      dutyStatus: true,
      startsAt: true,
      endsAt: true,
      status: true,
      period: {
        select: {
          id: true,
          name: true,
        },
      },
      station: {
        select: {
          code: true,
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
          id: true,
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
} satisfies Prisma.CrewMemberSelect;

type AircraftCrewWorkflowPayload = Prisma.AircraftGetPayload<{
  select: typeof aircraftCrewWorkflowSelect;
}>;

type CrewMemberOptionPayload = Prisma.CrewMemberGetPayload<{
  select: typeof crewMemberOptionSelect;
}>;

type AircraftCrewWorkflowFlightLegPayload = Prisma.FlightLegGetPayload<{
  select: typeof aircraftCrewWorkflowFlightLegSelect;
}>;

export type AircraftCrewWorkflowAssignment =
  AircraftCrewWorkflowPayload["crewAssignments"][number] & {
    timing: "CURRENT" | "UPCOMING";
    warnings: string[];
  };

export type AircraftCrewWorkflowLeg = AircraftCrewWorkflowFlightLegPayload & {
  missingRoles: SeatRole[];
};

export type AircraftCrewMemberOption = CrewMemberOptionPayload & {
  availabilityStatus: "CLEAR" | "CAUTION" | "UNAVAILABLE";
  availabilityWarnings: string[];
  complianceWarnings: string[];
  label: string;
  warningsBySeatRole: Partial<Record<SeatRole, string[]>>;
};

export type AircraftCrewWorkflowData = Omit<
  AircraftCrewWorkflowPayload,
  "aircraftAssignments" | "crewAssignments"
> & {
  assignments: AircraftCrewWorkflowAssignment[];
  crewOptions: AircraftCrewMemberOption[];
  upcomingLegs: AircraftCrewWorkflowLeg[];
  summary: {
    currentAssignments: number;
    upcomingAssignments: number;
    missingCurrentRoles: SeatRole[];
    upcomingLegsWithSnapshotGaps: number;
  };
};

const REQUIRED_COCKPIT_ROLES: SeatRole[] = [SeatRole.CPT, SeatRole.FO];
const AVAILABILITY_WINDOW_DAYS = 7;

export const editableSeatRoles = Object.values(SeatRole);

function crewMemberLabel(crewMember: CrewMemberOptionPayload): string {
  return `${crewMember.firstName} ${crewMember.lastName} (#${crewMember.employeeNumber})`;
}

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

function qualificationWarningsForSeatRole(
  crewMember: {
    firstName: string;
    lastName: string;
    qualifications: Array<{
      aircraftType: AircraftType;
      expiresAt: Date | null;
      seatRole: SeatRole;
    }>;
  },
  aircraftType: AircraftType,
  seatRole: SeatRole,
  at: Date,
): string[] {
  const crewMemberName = `${crewMember.firstName} ${crewMember.lastName}`;
  const matchingQualification = crewMember.qualifications.find(
    (qualification) =>
      qualification.aircraftType === aircraftType && qualification.seatRole === seatRole,
  );

  if (!matchingQualification) {
    return [`${crewMemberName} has no ${seatRole} qualification for this aircraft type.`];
  }

  if (matchingQualification.expiresAt && matchingQualification.expiresAt < at) {
    return [`${crewMemberName}'s ${seatRole} qualification is expired.`];
  }

  return [];
}

function buildComplianceWarnings(
  crewMember: CrewComplianceEvaluationInput,
  rules: CrewComplianceRuleDefinition[],
  now: Date,
): string[] {
  return evaluateCrewCompliance(crewMember, rules, now).warnings;
}

function missingCockpitRoles(assignments: Array<{ seatRole: SeatRole }>): SeatRole[] {
  const assignedRoles = new Set(assignments.map((assignment) => assignment.seatRole));

  return REQUIRED_COCKPIT_ROLES.filter((role) => !assignedRoles.has(role));
}

function normalizeAssignment(
  assignment: AircraftCrewWorkflowPayload["crewAssignments"][number],
  aircraftType: AircraftType,
  complianceRules: CrewComplianceRuleDefinition[],
  now: Date,
): AircraftCrewWorkflowAssignment | null {
  if (assignment.endsAt && assignment.endsAt <= now) {
    return null;
  }

  const timing = assignment.startsAt <= now ? "CURRENT" : "UPCOMING";

  return {
    ...assignment,
    timing,
    warnings: [
      ...qualificationWarningsForSeatRole(
        assignment.crewMember,
        aircraftType,
        assignment.seatRole,
        assignment.startsAt,
      ),
      ...buildComplianceWarnings(assignment.crewMember, complianceRules, now),
    ],
  };
}

function normalizeCrewOption(
  crewMember: CrewMemberOptionPayload,
  aircraftType: AircraftType,
  complianceRules: CrewComplianceRuleDefinition[],
  now: Date,
  windowStart: Date,
  windowEnd: Date,
  currentAircraftId: string,
): AircraftCrewMemberOption {
  const currentAssignments = crewMember.assignments.filter((assignment) =>
    overlapsWindow(assignment.startsAt, assignment.endsAt, windowStart, windowEnd),
  );
  const otherAircraftAssignments = currentAssignments.filter(
    (assignment) => assignment.aircraftId !== currentAircraftId,
  );
  const schedulesInWindow = crewMember.schedules.filter((schedule) =>
    overlapsWindow(schedule.startsAt ?? schedule.date, schedule.endsAt, windowStart, windowEnd),
  );
  const scheduleEntriesInWindow = crewMember.scheduleEntries.filter((entry) =>
    overlapsWindow(entry.startsAt ?? entry.date, entry.endsAt, windowStart, windowEnd),
  );
  const timeOffInWindow = crewMember.timeOffRequests.filter((request) =>
    overlapsWindow(request.startDate, request.endDate, windowStart, windowEnd),
  );
  const availabilityWarnings: string[] = [];

  if (crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    availabilityWarnings.push(`Employment status is ${crewMember.employmentStatus}.`);
  }

  if (
    crewMember.dutyStatus === DutyStatus.SICK ||
    crewMember.dutyStatus === DutyStatus.VACATION
  ) {
    availabilityWarnings.push(`Current duty status is ${crewMember.dutyStatus}.`);
  } else if (
    crewMember.dutyStatus === DutyStatus.TRAINING ||
    crewMember.dutyStatus === DutyStatus.OFF_DUTY
  ) {
    availabilityWarnings.push(`Current duty status should be reviewed: ${crewMember.dutyStatus}.`);
  }

  if (schedulesInWindow.length === 0 && scheduleEntriesInWindow.length === 0) {
    availabilityWarnings.push("No CrewSchedule block or schedule-period entry in the selected gap window.");
  }

  if (timeOffInWindow.length > 0) {
    availabilityWarnings.push("Pending or approved time off overlaps the selected gap window.");
  }

  if (otherAircraftAssignments.length > 0) {
    availabilityWarnings.push(
      `Already assigned to ${otherAircraftAssignments
        .map((assignment) => assignment.aircraft.tailNumber)
        .join(", ")} in the selected gap window.`,
    );
  }

  const complianceWarnings = buildComplianceWarnings(crewMember, complianceRules, now);

  if (complianceWarnings.length > 0) {
    availabilityWarnings.push("Crew compliance evidence should be reviewed.");
  }

  const availabilityStatus =
    crewMember.employmentStatus !== EmploymentStatus.ACTIVE ||
    crewMember.dutyStatus === DutyStatus.SICK ||
    crewMember.dutyStatus === DutyStatus.VACATION
      ? "UNAVAILABLE"
      : availabilityWarnings.length > 0
        ? "CAUTION"
        : "CLEAR";

  return {
    ...crewMember,
    availabilityStatus,
    availabilityWarnings,
    complianceWarnings,
    label:
      availabilityStatus === "CLEAR"
        ? crewMemberLabel(crewMember)
        : `${crewMemberLabel(crewMember)} - ${availabilityStatus}`,
    warningsBySeatRole: Object.fromEntries(
      editableSeatRoles.map((seatRole) => [
        seatRole,
        qualificationWarningsForSeatRole(crewMember, aircraftType, seatRole, now),
      ]),
    ),
  };
}

function normalizeUpcomingLeg(
  leg: AircraftCrewWorkflowFlightLegPayload,
): AircraftCrewWorkflowLeg {
  const activeSnapshots = leg.crewAssignments.filter(
    (assignment) => assignment.status === "PLANNED" || assignment.status === "ACTIVE",
  );

  return {
    ...leg,
    missingRoles: missingCockpitRoles(activeSnapshots),
  };
}

export async function getAircraftCrewWorkflowData(
  aircraftId: string,
  options: { windowStart?: Date | null; windowEnd?: Date | null } = {},
): Promise<AircraftCrewWorkflowData | null> {
  const now = new Date();
  const windowStart = options.windowStart ?? new Date(now);
  const windowEnd = options.windowEnd ?? addDays(windowStart, AVAILABILITY_WINDOW_DAYS);
  const scheduleWindowStart = new Date(windowStart);
  scheduleWindowStart.setHours(0, 0, 0, 0);
  const [aircraft, crewMembers, complianceRules, flightLegs] = await Promise.all([
    prisma.aircraft.findUnique({
      where: { id: aircraftId },
      select: aircraftCrewWorkflowSelect,
    }),
    prisma.crewMember.findMany({
      where: {
        employmentStatus: EmploymentStatus.ACTIVE,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        ...crewMemberOptionSelect,
        schedules: {
          ...crewMemberOptionSelect.schedules,
          where: {
            date: {
              gte: scheduleWindowStart,
              lt: windowEnd,
            },
          },
        },
        timeOffRequests: {
          ...crewMemberOptionSelect.timeOffRequests,
          where: {
            status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
            startDate: { lt: windowEnd },
            endDate: { gte: windowStart },
          },
        },
        scheduleEntries: {
          ...crewMemberOptionSelect.scheduleEntries,
          where: {
            status: { in: [CrewScheduleEntryStatus.DRAFT, CrewScheduleEntryStatus.PUBLISHED] },
            date: {
              gte: scheduleWindowStart,
              lt: windowEnd,
            },
          },
        },
      },
    }),
    getActiveCrewComplianceRuleDefinitions(prisma),
    prisma.flightLeg.findMany({
      where: {
        aircraftAssignments: {
          some: {
            aircraftId,
          },
        },
        scheduledArrival: {
          gt: windowStart,
        },
        scheduledDeparture: {
          lt: windowEnd,
        },
        status: {
          not: FlightLegStatus.CANCELLED,
        },
      },
      orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
      select: aircraftCrewWorkflowFlightLegSelect,
    }),
  ]);

  if (!aircraft) {
    return null;
  }

  const assignments = aircraft.crewAssignments
    .map((assignment) => normalizeAssignment(assignment, aircraft.type, complianceRules, now))
    .filter((assignment): assignment is AircraftCrewWorkflowAssignment =>
      Boolean(assignment),
    );
  const currentAssignments = assignments.filter(
    (assignment) => assignment.timing === "CURRENT",
  );
  const upcomingLegs = flightLegs.map((flightLeg) => normalizeUpcomingLeg(flightLeg));

  return {
    ...aircraft,
    assignments,
    crewOptions: crewMembers.map((crewMember) =>
      normalizeCrewOption(
        crewMember,
        aircraft.type,
        complianceRules,
        now,
        windowStart,
        windowEnd,
        aircraft.id,
      ),
    ),
    upcomingLegs,
    summary: {
      currentAssignments: currentAssignments.length,
      upcomingAssignments: assignments.filter((assignment) => assignment.timing === "UPCOMING")
        .length,
      missingCurrentRoles: missingCockpitRoles(currentAssignments),
      upcomingLegsWithSnapshotGaps: upcomingLegs.filter(
        (leg) => leg.missingRoles.length > 0,
      ).length,
    },
  };
}

export { DutyStatus, EmploymentStatus, SeatRole };
