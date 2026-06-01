import { AircraftType, Prisma, SeatRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const REQUIRED_COCKPIT_ROLES: SeatRole[] = [SeatRole.CPT, SeatRole.FO];

type AssignmentWarningCode = "MISSING_QUALIFICATION" | "EXPIRED_QUALIFICATION";

export type QualificationWarning = {
  code: AssignmentWarningCode;
  message: string;
};

export type ResolvedCrewAssignment = {
  assignmentId: string;
  aircraftId: string;
  crewMemberId: string;
  crewMemberName: string;
  seatRole: SeatRole;
  startsAt: Date;
  endsAt: Date | null;
  hasQualificationWarning: boolean;
  qualificationWarnings: QualificationWarning[];
};

export type CoverageWarning = QualificationWarning & {
  assignmentId: string;
  crewMemberId: string;
  crewMemberName: string;
  seatRole: SeatRole;
};

export type FlightCoverage = {
  flightId: string;
  aircraftId: string;
  requiredRoles: SeatRole[];
  missingRoles: SeatRole[];
  assignedCrew: ResolvedCrewAssignment[];
  warnings: CoverageWarning[];
  isCovered: boolean;
};

export type FlightCrew = {
  flightId: string;
  aircraftId: string;
  scheduledDeparture: Date;
  crewBySeatRole: Partial<Record<SeatRole, ResolvedCrewAssignment[]>>;
  assignedCrew: ResolvedCrewAssignment[];
};

export type AircraftCrewAssignmentsAt = {
  aircraftId: string;
  at: Date;
  assignedCrew: ResolvedCrewAssignment[];
  crewBySeatRole: Partial<Record<SeatRole, ResolvedCrewAssignment[]>>;
};

const flightResolutionSelect = {
  id: true,
  aircraftId: true,
  scheduledDeparture: true,
  aircraft: {
    select: {
      id: true,
      type: true,
    },
  },
} satisfies Prisma.FlightSelect;

const aircraftTypeSelect = {
  id: true,
  type: true,
} satisfies Prisma.AircraftSelect;

export async function resolveFlightCrew(flightId: string): Promise<FlightCrew | null> {
  const flight = await prisma.flight.findUnique({
    where: { id: flightId },
    select: flightResolutionSelect,
  });

  if (!flight) {
    return null;
  }

  const assignedCrew = await resolveAssignmentsForAircraftAt(
    flight.aircraftId,
    flight.aircraft.type,
    flight.scheduledDeparture,
  );

  return {
    flightId: flight.id,
    aircraftId: flight.aircraftId,
    scheduledDeparture: flight.scheduledDeparture,
    crewBySeatRole: groupBySeatRole(assignedCrew),
    assignedCrew,
  };
}

export async function resolveFlightCoverage(flightId: string): Promise<FlightCoverage | null> {
  const crew = await resolveFlightCrew(flightId);

  if (!crew) {
    return null;
  }

  const assignedSeatRoles = new Set(crew.assignedCrew.map((assignment) => assignment.seatRole));
  const missingRoles = REQUIRED_COCKPIT_ROLES.filter((role) => !assignedSeatRoles.has(role));
  const warnings = crew.assignedCrew.flatMap((assignment) =>
    assignment.qualificationWarnings.map((warning) => ({
      ...warning,
      assignmentId: assignment.assignmentId,
      crewMemberId: assignment.crewMemberId,
      crewMemberName: assignment.crewMemberName,
      seatRole: assignment.seatRole,
    })),
  );

  return {
    flightId: crew.flightId,
    aircraftId: crew.aircraftId,
    requiredRoles: REQUIRED_COCKPIT_ROLES,
    missingRoles,
    assignedCrew: crew.assignedCrew,
    warnings,
    isCovered: missingRoles.length === 0,
  };
}

export async function resolveAircraftCrewAssignmentsAt(
  aircraftId: string,
  at: Date,
): Promise<AircraftCrewAssignmentsAt | null> {
  const aircraft = await prisma.aircraft.findUnique({
    where: { id: aircraftId },
    select: aircraftTypeSelect,
  });

  if (!aircraft) {
    return null;
  }

  const assignedCrew = await resolveAssignmentsForAircraftAt(aircraft.id, aircraft.type, at);

  return {
    aircraftId: aircraft.id,
    at,
    assignedCrew,
    crewBySeatRole: groupBySeatRole(assignedCrew),
  };
}

async function resolveAssignmentsForAircraftAt(
  aircraftId: string,
  aircraftType: AircraftType,
  at: Date,
): Promise<ResolvedCrewAssignment[]> {
  const assignments = await prisma.aircraftCrewAssignment.findMany({
    where: {
      aircraftId,
      isActive: true,
      startsAt: { lte: at },
      OR: [{ endsAt: null }, { endsAt: { gt: at } }],
    },
    orderBy: [{ seatRole: "asc" }, { startsAt: "asc" }],
    select: {
      id: true,
      aircraftId: true,
      seatRole: true,
      startsAt: true,
      endsAt: true,
      crewMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          qualifications: {
            where: {
              aircraftType,
            },
            select: {
              seatRole: true,
              expiresAt: true,
            },
          },
        },
      },
    },
  });

  return assignments.map((assignment) => {
    const matchingQualification = assignment.crewMember.qualifications.find(
      (qualification) => qualification.seatRole === assignment.seatRole,
    );
    const qualificationWarnings = getQualificationWarnings(
      Boolean(matchingQualification),
      matchingQualification?.expiresAt ?? null,
      assignment.seatRole,
      assignment.crewMember.firstName,
      assignment.crewMember.lastName,
      at,
    );

    return {
      assignmentId: assignment.id,
      aircraftId: assignment.aircraftId,
      crewMemberId: assignment.crewMember.id,
      crewMemberName: `${assignment.crewMember.firstName} ${assignment.crewMember.lastName}`,
      seatRole: assignment.seatRole,
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
      hasQualificationWarning: qualificationWarnings.length > 0,
      qualificationWarnings,
    };
  });
}

function getQualificationWarnings(
  hasMatchingQualification: boolean,
  expiresAt: Date | null,
  seatRole: SeatRole,
  firstName: string,
  lastName: string,
  at: Date,
): QualificationWarning[] {
  const crewMemberName = `${firstName} ${lastName}`;

  if (!hasMatchingQualification) {
    return [
      {
        code: "MISSING_QUALIFICATION",
        message: `${crewMemberName} has no matching ${seatRole} qualification for this aircraft type.`,
      },
    ];
  }

  if (expiresAt && expiresAt.getTime() < at.getTime()) {
    return [
      {
        code: "EXPIRED_QUALIFICATION",
        message: `${crewMemberName} has an expired ${seatRole} qualification.`,
      },
    ];
  }

  return [];
}

function groupBySeatRole(
  assignments: ResolvedCrewAssignment[],
): Partial<Record<SeatRole, ResolvedCrewAssignment[]>> {
  const grouped: Partial<Record<SeatRole, ResolvedCrewAssignment[]>> = {};

  for (const assignment of assignments) {
    const group = grouped[assignment.seatRole] ?? [];
    group.push(assignment);
    grouped[assignment.seatRole] = group;
  }

  return grouped;
}
