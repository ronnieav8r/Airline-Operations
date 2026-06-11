import { AircraftType, AssignmentStatus, Prisma, SeatRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const REQUIRED_COCKPIT_ROLES: SeatRole[] = [SeatRole.CPT, SeatRole.FO];

type AssignmentWarningCode = "MISSING_QUALIFICATION" | "EXPIRED_QUALIFICATION";
type FlightCoverageIdentitySource = "FLIGHT_LEG_ID" | "LEGACY_FLIGHT_ID" | "LEGACY_FLIGHT_ONLY";

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
  flightLegId: string | null;
  identitySource: FlightCoverageIdentitySource;
  inputId: string;
  legacyFlightId: string | null;
  operationalFlightLegId: string | null;
  readSource: "FLIGHT_LEG" | "LEGACY_FLIGHT";
  aircraftId: string;
  requiredRoles: SeatRole[];
  missingRoles: SeatRole[];
  assignedCrew: ResolvedCrewAssignment[];
  warnings: CoverageWarning[];
  isCovered: boolean;
};

export type FlightCrew = {
  flightId: string;
  flightLegId: string | null;
  identitySource: FlightCoverageIdentitySource;
  inputId: string;
  legacyFlightId: string | null;
  operationalFlightLegId: string | null;
  readSource: "FLIGHT_LEG" | "LEGACY_FLIGHT";
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

const flightLegResolutionSelect = {
  id: true,
  legacyFlightId: true,
  scheduledDeparture: true,
  aircraftAssignments: {
    where: {
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    select: {
      aircraft: {
        select: {
          id: true,
          type: true,
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
    take: 1,
  },
  legacyFlight: {
    select: flightResolutionSelect,
  },
} satisfies Prisma.FlightLegSelect;

const aircraftTypeSelect = {
  id: true,
  type: true,
} satisfies Prisma.AircraftSelect;

async function resolveFlightContextForCoverage(inputId: string) {
  const flightLeg = await prisma.flightLeg.findUnique({
    where: { id: inputId },
    select: flightLegResolutionSelect,
  });

  if (flightLeg) {
    const assignedAircraft = flightLeg.aircraftAssignments[0]?.aircraft ?? flightLeg.legacyFlight?.aircraft;

    if (!assignedAircraft) {
      return null;
    }

    return {
      aircraftId: assignedAircraft.id,
      aircraftType: assignedAircraft.type,
      flightId: flightLeg.legacyFlightId ?? flightLeg.legacyFlight?.id ?? flightLeg.id,
      flightLegId: flightLeg.id,
      identitySource: "FLIGHT_LEG_ID" as const,
      inputId,
      legacyFlightId: flightLeg.legacyFlightId ?? flightLeg.legacyFlight?.id ?? null,
      operationalFlightLegId: flightLeg.id,
      readSource: "FLIGHT_LEG" as const,
      scheduledDeparture: flightLeg.scheduledDeparture,
    };
  }

  const directFlight = await prisma.flight.findUnique({
    where: { id: inputId },
    select: {
      ...flightResolutionSelect,
      flightLeg: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!directFlight) {
    return null;
  }

  return {
    aircraftId: directFlight.aircraftId,
    aircraftType: directFlight.aircraft.type,
    flightId: directFlight.id,
    flightLegId: directFlight.flightLeg?.id ?? null,
    identitySource: directFlight.flightLeg
      ? ("LEGACY_FLIGHT_ID" as const)
      : ("LEGACY_FLIGHT_ONLY" as const),
    inputId,
    legacyFlightId: directFlight.id,
    operationalFlightLegId: directFlight.flightLeg?.id ?? null,
    readSource: directFlight.flightLeg ? ("FLIGHT_LEG" as const) : ("LEGACY_FLIGHT" as const),
    scheduledDeparture: directFlight.flightLeg
      ? directFlight.scheduledDeparture
      : directFlight.scheduledDeparture,
  };
}

export async function resolveFlightCrew(flightId: string): Promise<FlightCrew | null> {
  const flight = await resolveFlightContextForCoverage(flightId);

  if (!flight) {
    return null;
  }

  const assignedCrew = await resolveAssignmentsForAircraftAt(
    flight.aircraftId,
    flight.aircraftType,
    flight.scheduledDeparture,
  );

  return {
    flightId: flight.flightId,
    flightLegId: flight.flightLegId,
    identitySource: flight.identitySource,
    inputId: flight.inputId,
    legacyFlightId: flight.legacyFlightId,
    operationalFlightLegId: flight.operationalFlightLegId,
    readSource: flight.readSource,
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
    flightLegId: crew.flightLegId,
    identitySource: crew.identitySource,
    inputId: crew.inputId,
    legacyFlightId: crew.legacyFlightId,
    operationalFlightLegId: crew.operationalFlightLegId,
    readSource: crew.readSource,
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
