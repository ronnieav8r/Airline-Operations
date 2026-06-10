import {
  AircraftType,
  CrewComplianceRecordStatus,
  DutyStatus,
  EmploymentStatus,
  Prisma,
  SeatRole,
  TimeOffRequestStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const aircraftCrewWorkflowSelect = {
  id: true,
  tailNumber: true,
  name: true,
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

const crewMemberOptionSelect = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  dutyStatus: true,
  employmentStatus: true,
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
} satisfies Prisma.CrewMemberSelect;

type AircraftCrewWorkflowPayload = Prisma.AircraftGetPayload<{
  select: typeof aircraftCrewWorkflowSelect;
}>;

type CrewMemberOptionPayload = Prisma.CrewMemberGetPayload<{
  select: typeof crewMemberOptionSelect;
}>;

export type AircraftCrewWorkflowAssignment =
  AircraftCrewWorkflowPayload["crewAssignments"][number] & {
    timing: "CURRENT" | "UPCOMING";
    warnings: string[];
  };

export type AircraftCrewWorkflowLeg =
  AircraftCrewWorkflowPayload["aircraftAssignments"][number]["flightLeg"] & {
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

function isExpired(expiresAt: Date | null, now: Date): boolean {
  return Boolean(expiresAt && expiresAt < now);
}

function hasExpiredStatus(status: CrewComplianceRecordStatus): boolean {
  return status === CrewComplianceRecordStatus.EXPIRED || status === CrewComplianceRecordStatus.VOIDED;
}

function buildComplianceWarnings(
  crewMember: Pick<
    CrewMemberOptionPayload,
    | "certificates"
    | "checkEvents"
    | "dutyPeriods"
    | "medicals"
    | "recencyEvents"
    | "restPeriods"
    | "trainingEvents"
  >,
  now: Date,
): string[] {
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

function missingCockpitRoles(assignments: Array<{ seatRole: SeatRole }>): SeatRole[] {
  const assignedRoles = new Set(assignments.map((assignment) => assignment.seatRole));

  return REQUIRED_COCKPIT_ROLES.filter((role) => !assignedRoles.has(role));
}

function normalizeAssignment(
  assignment: AircraftCrewWorkflowPayload["crewAssignments"][number],
  aircraftType: AircraftType,
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
      ...buildComplianceWarnings(assignment.crewMember, now),
    ],
  };
}

function normalizeCrewOption(
  crewMember: CrewMemberOptionPayload,
  aircraftType: AircraftType,
  now: Date,
  windowEnd: Date,
  currentAircraftId: string,
): AircraftCrewMemberOption {
  const currentAssignments = crewMember.assignments.filter((assignment) =>
    overlapsWindow(assignment.startsAt, assignment.endsAt, now, windowEnd),
  );
  const otherAircraftAssignments = currentAssignments.filter(
    (assignment) => assignment.aircraftId !== currentAircraftId,
  );
  const schedulesInWindow = crewMember.schedules.filter((schedule) =>
    overlapsWindow(schedule.startsAt ?? schedule.date, schedule.endsAt, now, windowEnd),
  );
  const timeOffInWindow = crewMember.timeOffRequests.filter((request) =>
    overlapsWindow(request.startDate, request.endDate, now, windowEnd),
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

  if (schedulesInWindow.length === 0) {
    availabilityWarnings.push("No CrewSchedule block in the next 7 days.");
  }

  if (timeOffInWindow.length > 0) {
    availabilityWarnings.push("Pending or approved time off overlaps the next 7 days.");
  }

  if (otherAircraftAssignments.length > 0) {
    availabilityWarnings.push(
      `Already assigned to ${otherAircraftAssignments
        .map((assignment) => assignment.aircraft.tailNumber)
        .join(", ")} in the next 7 days.`,
    );
  }

  const complianceWarnings = buildComplianceWarnings(crewMember, now);

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
  leg: AircraftCrewWorkflowPayload["aircraftAssignments"][number]["flightLeg"],
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
): Promise<AircraftCrewWorkflowData | null> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = addDays(now, AVAILABILITY_WINDOW_DAYS);
  const [aircraft, crewMembers] = await Promise.all([
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
              gte: windowStart,
              lt: windowEnd,
            },
          },
        },
        timeOffRequests: {
          ...crewMemberOptionSelect.timeOffRequests,
          where: {
            status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
            startDate: { lt: windowEnd },
            endDate: { gte: now },
          },
        },
      },
    }),
  ]);

  if (!aircraft) {
    return null;
  }

  const assignments = aircraft.crewAssignments
    .map((assignment) => normalizeAssignment(assignment, aircraft.type, now))
    .filter((assignment): assignment is AircraftCrewWorkflowAssignment =>
      Boolean(assignment),
    );
  const currentAssignments = assignments.filter(
    (assignment) => assignment.timing === "CURRENT",
  );
  const upcomingLegs = aircraft.aircraftAssignments.map((assignment) =>
    normalizeUpcomingLeg(assignment.flightLeg),
  );

  return {
    ...aircraft,
    assignments,
    crewOptions: crewMembers.map((crewMember) =>
      normalizeCrewOption(crewMember, aircraft.type, now, windowEnd, aircraft.id),
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
