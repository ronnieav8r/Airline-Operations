import {
  AircraftType,
  AssignmentStatus,
  CrewPlannedComplianceEventStatus,
  EmploymentStatus,
  Prisma,
  SeatRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const REQUIRED_COCKPIT_ROLES: SeatRole[] = [SeatRole.CPT, SeatRole.FO];
const QUALIFICATION_WARNING_WINDOW_DAYS = 30;

type AssignmentWarningCode =
  | "EXPIRED_QUALIFICATION"
  | "MISSING_QUALIFICATION"
  | "PENDING_COMPLIANCE_EVENT"
  | "QUALIFICATION_EXPIRING_SOON";
type FlightCoverageIdentitySource = "FLIGHT_LEG_ID" | "LEGACY_FLIGHT_ID" | "LEGACY_FLIGHT_ONLY";
type AssignmentEligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "PENDING" | "WARNING";
type AssignmentIssueSeverity = "block" | "pending" | "warning";

export type QualificationWarning = {
  code: AssignmentWarningCode;
  message: string;
  severity: AssignmentIssueSeverity;
};

export type ResolvedCrewAssignment = {
  assignmentId: string;
  aircraftId: string;
  coverageEligible: boolean;
  crewMemberId: string;
  crewMemberName: string;
  eligibilityStatus: AssignmentEligibilityStatus;
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
  ineligibleAssignments: ResolvedCrewAssignment[];
  pendingAssignments: ResolvedCrewAssignment[];
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

export type FlightCrewCandidate = {
  conflictLabel: string | null;
  coverageEligible: boolean;
  crewMemberId: string;
  crewMemberName: string;
  dutyStatus: string;
  eligibilityStatus: AssignmentEligibilityStatus;
  employeeNumber: string;
  isCurrentForRole: boolean;
  qualificationWarnings: QualificationWarning[];
  seatRole: SeatRole;
};

export type FlightCrewCandidateGroup = {
  aircraftId: string;
  aircraftType: AircraftType;
  candidates: FlightCrewCandidate[];
  flightLegId: string;
  scheduledDeparture: Date;
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

  const flightLegAssignedCrew = flight.flightLegId
    ? await resolveCrewLegAssignmentsAt(
        flight.flightLegId,
        flight.aircraftId,
        flight.aircraftType,
        flight.scheduledDeparture,
      )
    : [];
  const assignedCrew =
    flightLegAssignedCrew.length > 0
      ? flightLegAssignedCrew
      : await resolveAssignmentsForAircraftAt(
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

  const assignedSeatRoles = new Set(
    crew.assignedCrew
      .filter((assignment) => assignment.coverageEligible)
      .map((assignment) => assignment.seatRole),
  );
  const missingRoles = REQUIRED_COCKPIT_ROLES.filter((role) => !assignedSeatRoles.has(role));
  const warnings = crew.assignedCrew.flatMap((assignment) =>
    assignment.qualificationWarnings
      .filter((warning) => warning.severity === "warning")
      .map((warning) => ({
        ...warning,
        assignmentId: assignment.assignmentId,
        crewMemberId: assignment.crewMemberId,
        crewMemberName: assignment.crewMemberName,
        seatRole: assignment.seatRole,
      })),
  );
  const pendingAssignments = crew.assignedCrew.filter(
    (assignment) => assignment.eligibilityStatus === "PENDING",
  );
  const ineligibleAssignments = crew.assignedCrew.filter(
    (assignment) => assignment.eligibilityStatus === "INELIGIBLE",
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
    ineligibleAssignments,
    pendingAssignments,
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

export async function resolveFlightCrewCandidates(
  flightLegId: string,
): Promise<FlightCrewCandidateGroup | null> {
  const flight = await resolveFlightContextForCoverage(flightLegId);

  if (!flight?.flightLegId) {
    return null;
  }

  const currentAssignments = await resolveCrewLegAssignmentsAt(
    flight.flightLegId,
    flight.aircraftId,
    flight.aircraftType,
    flight.scheduledDeparture,
  );
  const currentCrewByRole = new Map(
    currentAssignments.map((assignment) => [
      `${assignment.seatRole}:${assignment.crewMemberId}`,
      true,
    ]),
  );
  const sameDayStart = new Date(flight.scheduledDeparture);
  sameDayStart.setHours(0, 0, 0, 0);
  const sameDayEnd = new Date(sameDayStart);
  sameDayEnd.setDate(sameDayEnd.getDate() + 1);
  const crewMembers = await prisma.crewMember.findMany({
    where: {
      employmentStatus: EmploymentStatus.ACTIVE,
      qualifications: {
        some: {
          aircraftType: flight.aircraftType,
          seatRole: { in: REQUIRED_COCKPIT_ROLES },
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      dutyStatus: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      qualifications: {
        where: {
          aircraftType: flight.aircraftType,
          seatRole: { in: REQUIRED_COCKPIT_ROLES },
        },
        select: {
          aircraftType: true,
          expiresAt: true,
          seatRole: true,
        },
      },
      plannedComplianceEvents: {
        where: {
          scheduledFor: { lte: flight.scheduledDeparture },
          status: CrewPlannedComplianceEventStatus.SCHEDULED,
        },
        orderBy: { scheduledFor: "asc" },
        select: {
          aircraftType: true,
          eventType: true,
          scheduledFor: true,
          seatRole: true,
        },
      },
      legAssignments: {
        where: {
          flightLegId: { not: flight.flightLegId },
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
          flightLeg: {
            scheduledDeparture: {
              gte: sameDayStart,
              lt: sameDayEnd,
            },
          },
        },
        select: {
          seatRole: true,
          flightLeg: {
            select: {
              flightNumber: true,
              scheduledDeparture: true,
            },
          },
        },
      },
    },
  });

  const candidates = crewMembers.flatMap((crewMember) =>
    crewMember.qualifications.map((qualification) => {
      const eligibility = getAssignmentEligibility(
        {
          expiresAt: qualification.expiresAt,
          hasMatchingQualification: true,
          plannedEvents: crewMember.plannedComplianceEvents,
        },
        {
          aircraftType: flight.aircraftType,
          firstName: crewMember.firstName,
          lastName: crewMember.lastName,
          seatRole: qualification.seatRole,
        },
        flight.scheduledDeparture,
      );
      const conflict = crewMember.legAssignments[0] ?? null;

      return {
        conflictLabel: conflict
          ? `${conflict.flightLeg.flightNumber} ${formatCandidateTime(conflict.flightLeg.scheduledDeparture)}`
          : null,
        coverageEligible: eligibility.coverageEligible,
        crewMemberId: crewMember.id,
        crewMemberName: `${crewMember.firstName} ${crewMember.lastName}`,
        dutyStatus: crewMember.dutyStatus,
        eligibilityStatus: eligibility.status,
        employeeNumber: crewMember.employeeNumber,
        isCurrentForRole: currentCrewByRole.has(`${qualification.seatRole}:${crewMember.id}`),
        qualificationWarnings: eligibility.issues,
        seatRole: qualification.seatRole,
      };
    }),
  );

  return {
    aircraftId: flight.aircraftId,
    aircraftType: flight.aircraftType,
    candidates: candidates.sort(compareCrewCandidates),
    flightLegId: flight.flightLegId,
    scheduledDeparture: flight.scheduledDeparture,
  };
}

async function resolveCrewLegAssignmentsAt(
  flightLegId: string,
  aircraftId: string,
  aircraftType: AircraftType,
  at: Date,
): Promise<ResolvedCrewAssignment[]> {
  const assignments = await prisma.crewLegAssignment.findMany({
    where: {
      flightLegId,
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    orderBy: [{ seatRole: "asc" }, { reportTime: "asc" }],
    select: {
      id: true,
      seatRole: true,
      reportTime: true,
      releaseTime: true,
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
              aircraftType: true,
              seatRole: true,
              expiresAt: true,
            },
          },
          plannedComplianceEvents: {
            where: {
              scheduledFor: { lte: at },
              status: CrewPlannedComplianceEventStatus.SCHEDULED,
            },
            orderBy: { scheduledFor: "asc" },
            select: {
              aircraftType: true,
              eventType: true,
              scheduledFor: true,
              seatRole: true,
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
    const eligibility = getAssignmentEligibility(
      {
        expiresAt: matchingQualification?.expiresAt ?? null,
        hasMatchingQualification: Boolean(matchingQualification),
        plannedEvents: assignment.crewMember.plannedComplianceEvents,
      },
      {
        aircraftType,
        firstName: assignment.crewMember.firstName,
        lastName: assignment.crewMember.lastName,
        seatRole: assignment.seatRole,
      },
      at,
    );

    return {
      assignmentId: assignment.id,
      aircraftId,
      coverageEligible: eligibility.coverageEligible,
      crewMemberId: assignment.crewMember.id,
      crewMemberName: `${assignment.crewMember.firstName} ${assignment.crewMember.lastName}`,
      eligibilityStatus: eligibility.status,
      seatRole: assignment.seatRole,
      startsAt: assignment.reportTime ?? at,
      endsAt: assignment.releaseTime,
      hasQualificationWarning: eligibility.issues.length > 0,
      qualificationWarnings: eligibility.issues,
    };
  });
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
              aircraftType: true,
              seatRole: true,
              expiresAt: true,
            },
          },
          plannedComplianceEvents: {
            where: {
              scheduledFor: { lte: at },
              status: CrewPlannedComplianceEventStatus.SCHEDULED,
            },
            orderBy: { scheduledFor: "asc" },
            select: {
              aircraftType: true,
              eventType: true,
              scheduledFor: true,
              seatRole: true,
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
    const eligibility = getAssignmentEligibility(
      {
        expiresAt: matchingQualification?.expiresAt ?? null,
        hasMatchingQualification: Boolean(matchingQualification),
        plannedEvents: assignment.crewMember.plannedComplianceEvents,
      },
      {
        aircraftType,
        firstName: assignment.crewMember.firstName,
        lastName: assignment.crewMember.lastName,
        seatRole: assignment.seatRole,
      },
      at,
    );

    return {
      assignmentId: assignment.id,
      aircraftId: assignment.aircraftId,
      coverageEligible: eligibility.coverageEligible,
      crewMemberId: assignment.crewMember.id,
      crewMemberName: `${assignment.crewMember.firstName} ${assignment.crewMember.lastName}`,
      eligibilityStatus: eligibility.status,
      seatRole: assignment.seatRole,
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
      hasQualificationWarning: eligibility.issues.length > 0,
      qualificationWarnings: eligibility.issues,
    };
  });
}

function plannedEventApplies(
  event: {
    aircraftType: AircraftType | null;
    seatRole: SeatRole | null;
  },
  aircraftType: AircraftType,
  seatRole: SeatRole,
): boolean {
  return (
    (!event.aircraftType || event.aircraftType === aircraftType) &&
    (!event.seatRole || event.seatRole === seatRole)
  );
}

function formatPlannedEvent(event: { eventType: string; scheduledFor: Date }): string {
  const label = event.eventType.replaceAll("_", " ").toLowerCase();
  const scheduledFor = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(event.scheduledFor);

  return `${label} scheduled ${scheduledFor}`;
}

function formatCandidateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function compareCrewCandidates(first: FlightCrewCandidate, second: FlightCrewCandidate): number {
  if (first.isCurrentForRole !== second.isCurrentForRole) {
    return first.isCurrentForRole ? -1 : 1;
  }

  if (first.coverageEligible !== second.coverageEligible) {
    return first.coverageEligible ? -1 : 1;
  }

  if (Boolean(first.conflictLabel) !== Boolean(second.conflictLabel)) {
    return first.conflictLabel ? 1 : -1;
  }

  return first.crewMemberName.localeCompare(second.crewMemberName);
}

function getAssignmentEligibility(
  evidence: {
    expiresAt: Date | null;
    hasMatchingQualification: boolean;
    plannedEvents: Array<{
      aircraftType: AircraftType | null;
      eventType: string;
      scheduledFor: Date;
      seatRole: SeatRole | null;
    }>;
  },
  assignment: {
    aircraftType: AircraftType;
    firstName: string;
    lastName: string;
    seatRole: SeatRole;
  },
  at: Date,
): {
  coverageEligible: boolean;
  issues: QualificationWarning[];
  status: AssignmentEligibilityStatus;
} {
  const { aircraftType, firstName, lastName, seatRole } = assignment;
  const crewMemberName = `${firstName} ${lastName}`;
  const plannedEvent = evidence.plannedEvents.find((event) =>
    plannedEventApplies(event, aircraftType, seatRole),
  );

  if (!evidence.hasMatchingQualification) {
    const issue: QualificationWarning = plannedEvent
      ? {
          code: "PENDING_COMPLIANCE_EVENT",
          message: `${crewMemberName} has no matching ${seatRole} qualification for this aircraft type; ${formatPlannedEvent(plannedEvent)}.`,
          severity: "pending",
        }
      : {
          code: "MISSING_QUALIFICATION",
          message: `${crewMemberName} has no matching ${seatRole} qualification for this aircraft type.`,
          severity: "block",
        };

    return {
      coverageEligible: false,
      issues: [issue],
      status: plannedEvent ? "PENDING" : "INELIGIBLE",
    };
  }

  if (evidence.expiresAt && evidence.expiresAt.getTime() < at.getTime()) {
    const issue: QualificationWarning = plannedEvent
      ? {
          code: "PENDING_COMPLIANCE_EVENT",
          message: `${crewMemberName}'s ${seatRole} qualification is expired; ${formatPlannedEvent(plannedEvent)}.`,
          severity: "pending",
        }
      : {
          code: "EXPIRED_QUALIFICATION",
          message: `${crewMemberName} has an expired ${seatRole} qualification.`,
          severity: "block",
        };

    return {
      coverageEligible: false,
      issues: [issue],
      status: plannedEvent ? "PENDING" : "INELIGIBLE",
    };
  }

  const warningWindowEnd = new Date(at);
  warningWindowEnd.setUTCDate(warningWindowEnd.getUTCDate() + QUALIFICATION_WARNING_WINDOW_DAYS);

  if (
    evidence.expiresAt &&
    evidence.expiresAt.getTime() >= at.getTime() &&
    evidence.expiresAt.getTime() <= warningWindowEnd.getTime()
  ) {
    return {
      coverageEligible: true,
      issues: [
        {
          code: "QUALIFICATION_EXPIRING_SOON",
          message: `${crewMemberName}'s ${seatRole} qualification expires soon.`,
          severity: "warning",
        },
      ],
      status: "WARNING",
    };
  }

  return {
    coverageEligible: true,
    issues: [],
    status: "ELIGIBLE",
  };
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
