import {
  AircraftType,
  DutyStatus,
  EmploymentStatus,
  Prisma,
  SeatRole,
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

export const editableSeatRoles = Object.values(SeatRole);

function crewMemberLabel(crewMember: CrewMemberOptionPayload): string {
  return `${crewMember.firstName} ${crewMember.lastName} (#${crewMember.employeeNumber})`;
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
    warnings: qualificationWarningsForSeatRole(
      assignment.crewMember,
      aircraftType,
      assignment.seatRole,
      assignment.startsAt,
    ),
  };
}

function normalizeCrewOption(
  crewMember: CrewMemberOptionPayload,
  aircraftType: AircraftType,
  now: Date,
): AircraftCrewMemberOption {
  return {
    ...crewMember,
    label: crewMemberLabel(crewMember),
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
      select: crewMemberOptionSelect,
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
      normalizeCrewOption(crewMember, aircraft.type, now),
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
