import {
  AircraftConfigurationStatus,
  AircraftFuelEventType,
  AircraftStatus,
  AssignmentStatus,
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  DeferralStatus,
  DiscrepancyStatus,
  EmploymentStatus,
  FlightLegStatus,
  FlightPhaseStatus,
  ManifestStatus,
  Prisma,
  SeatRole,
  TimeOffRequestStatus,
  ReleaseStatus,
} from "@prisma/client";

import { evaluateCrewCompliance } from "@/lib/crew-compliance-evaluator";
import { getActiveCrewComplianceRuleDefinitions } from "@/lib/crew-compliance-rule-defaults";
import { evaluateAircraftServiceability } from "@/lib/aircraft-serviceability";
import {
  isManifestReady,
  isPostflightComplete,
  isPostflightFuelReady,
  isPreflightComplete,
  isReleaseFuelReady,
  isWeightBalanceReady,
  resolveOperatorReleaseSetting,
} from "@/lib/flight-workflow";
import { prisma } from "@/lib/prisma";

export const CREW_ME_WINDOW_DAYS = 42;

const crewMeFlightLegSelect = {
  id: true,
  flightNumber: true,
  scheduledDeparture: true,
  scheduledArrival: true,
  actualDeparture: true,
  actualArrival: true,
  status: true,
  notes: true,
  departureStation: { select: { code: true, city: true } },
  arrivalStation: { select: { code: true, city: true } },
  operator: {
    select: {
      releaseSetting: {
        select: {
          dispatcherEnabled: true,
          manifestMode: true,
        },
      },
    },
  },
  aircraftAssignments: {
    where: {
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    orderBy: { assignedAt: "desc" },
    select: {
      aircraftId: true,
      aircraft: {
        select: {
          id: true,
          status: true,
          tailNumber: true,
          type: true,
          configurations: {
            where: { status: AircraftConfigurationStatus.ACTIVE },
            orderBy: [{ effectiveStart: "desc" }],
            select: { id: true },
            take: 1,
          },
          discrepancies: {
            where: {
              status: {
                in: [
                  DiscrepancyStatus.OPEN,
                  DiscrepancyStatus.DEFERRED,
                  DiscrepancyStatus.CORRECTED_PENDING_RTS,
                ],
              },
            },
            select: { id: true, status: true },
          },
          deferrals: {
            where: { status: DeferralStatus.ACTIVE },
            select: {
              dueAt: true,
              id: true,
              operatingLimitations: true,
              requiredProcedures: true,
              status: true,
            },
          },
          maintenanceEvents: {
            where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
            select: {
              id: true,
              inspectionApprovedAt: true,
              maintenanceApprovedAt: true,
              requiresIndependentInspection: true,
              returnToServiceAt: true,
              status: true,
            },
          },
          maintenanceControlHolds: {
            where: { status: "ACTIVE" },
            select: { id: true, reason: true, status: true },
          },
        },
      },
    },
  },
  crewAssignments: {
    where: {
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    select: {
      crewMember: {
        select: {
          employeeNumber: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      crewMemberId: true,
      seatRole: true,
      status: true,
      reportTime: true,
      releaseTime: true,
    },
  },
  manifest: {
    select: {
      status: true,
      items: { select: { id: true } },
    },
  },
  weightBalanceRuns: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { status: true },
  },
  fuelEvents: {
    where: {
      eventType: {
        in: [AircraftFuelEventType.RELEASE_ONBOARD, AircraftFuelEventType.POSTFLIGHT_ONBOARD],
      },
    },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    select: {
      eventType: true,
      fueledReady: true,
      fuelOnboardLbs: true,
      recordedAt: true,
    },
  },
  operationalControlRecord: {
    select: {
      release: {
        select: {
          releasedAt: true,
          status: true,
        },
      },
    },
  },
  preflightRecord: {
    select: {
      status: true,
      manifestVerified: true,
      manifestNotes: true,
      notes: true,
      completedAt: true,
    },
  },
  postflightRecord: {
    select: {
      status: true,
      outTime: true,
      offTime: true,
      onTime: true,
      inTime: true,
      delayNotes: true,
      notes: true,
      completedAt: true,
    },
  },
} satisfies Prisma.FlightLegSelect;

type CrewMeFlightLegPayload = Prisma.FlightLegGetPayload<{
  select: typeof crewMeFlightLegSelect;
}>;

type CrewMeAircraftAssignment = {
  aircraft: {
    id: string;
    tailNumber: string;
    type: string;
  };
  endsAt: Date | null;
  id: string;
  seatRole: SeatRole;
  startsAt: Date;
};

export type CrewMeFlightCard = {
  actualArrival: Date | null;
  actualDeparture: Date | null;
  assignedCrew: Array<{
    crewMemberId: string;
    employeeNumber: string;
    email: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
    seatRole: SeatRole;
    status: AssignmentStatus;
  }>;
  aircraft: {
    id: string;
    status: AircraftStatus;
    tailNumber: string;
    type: string;
  } | null;
  arrival: {
    city: string;
    code: string;
  };
  departure: {
    city: string;
    code: string;
  };
  flightNumber: string;
  id: string;
  crewComplianceReady: boolean;
  dutyRestReady: boolean;
  manifestReady: boolean;
  maintenanceReady: boolean;
  opsReleaseReady: boolean;
  postflightComplete: boolean;
  postflightFuelReady: boolean;
  postflightStatus: FlightPhaseStatus | null;
  passengerCount: number;
  preflightComplete: boolean;
  preflightStatus: FlightPhaseStatus | null;
  releaseFuelOnboardLbs: string | null;
  releaseFuelReady: boolean;
  releaseStatus: ReleaseStatus | null;
  route: string;
  scheduledArrival: Date;
  scheduledDeparture: Date;
  seatRoles: SeatRole[];
  status: FlightLegStatus;
  weightBalanceReady: boolean;
};

export type CrewMeFlightDetail = CrewMeFlightCard & {
  currentCrewMemberId: string;
  manifestMode: string;
  notes: string | null;
  postflightRecord: CrewMeFlightLegPayload["postflightRecord"];
  preflightRecord: CrewMeFlightLegPayload["preflightRecord"];
};

export type CrewMeFlightPassengerList = {
  aircraft: {
    tailNumber: string;
    type: string;
  } | null;
  flightNumber: string;
  id: string;
  manifestStatus: ManifestStatus | null;
  passengers: Array<{
    baggageWeight: string | null;
    checkedInAt: Date | null;
    id: string;
    idDocumentExpiresAt: Date | null;
    idDocumentNumber: string | null;
    idDocumentType: string | null;
    idIssuingCountry: string | null;
    idIssuingState: string | null;
    identityDocument: {
      createdAt: Date;
      id: string;
    } | null;
    name: string;
    notes: string | null;
    boardedAt: Date | null;
    passengerId: string | null;
    seatNumber: string | null;
    weight: string | null;
  }>;
  route: string;
  scheduledArrival: Date;
  scheduledDeparture: Date;
  status: FlightLegStatus;
};

export type CrewMeData = {
  activeAssignments: CrewMeAircraftAssignment[];
  availabilityWarnings: string[];
  baseStation: {
    city: string;
    code: string;
  };
  complianceStatus: string;
  complianceWarnings: string[];
  dutyStatus: string;
  email: string | null;
  employeeNumber: string;
  employmentStatus: string;
  firstName: string;
  flights: CrewMeFlightCard[];
  hireDate: Date | null;
  id: string;
  lastName: string;
  phone: string | null;
  qualifications: Array<{
    aircraftType: string;
    expiresAt: Date | null;
    id: string;
    seatRole: SeatRole;
  }>;
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
  scheduleEntries: Array<{
    date: Date;
    dutyStatus: string;
    endsAt: Date | null;
    id: string;
    notes: string | null;
    periodName: string;
    startsAt: Date | null;
    status: CrewScheduleEntryStatus;
  }>;
  scheduleRequests: Array<{
    endDate: Date | null;
    id: string;
    periodName: string;
    requestNotes: string | null;
    requestType: string;
    reviewNotes: string | null;
    startDate: Date | null;
    status: CrewScheduleRequestStatus;
  }>;
  schedules: Array<{
    date: Date;
    dutyStatus: string;
    endsAt: Date | null;
    id: string;
    notes: string | null;
    startsAt: Date | null;
    stationCode: string | null;
  }>;
  timeOffRequests: Array<{
    endDate: Date;
    id: string;
    reason: string | null;
    requestType: string;
    startDate: Date;
    status: TimeOffRequestStatus;
  }>;
  windowEnd: Date;
  windowStart: Date;
};

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function assignmentCoversFlight(
  assignment: CrewMeAircraftAssignment,
  flight: CrewMeFlightLegPayload,
): boolean {
  const aircraft = flight.aircraftAssignments[0]?.aircraft;

  return Boolean(
    aircraft &&
      aircraft.id === assignment.aircraft.id &&
      assignment.startsAt < flight.scheduledArrival &&
      (!assignment.endsAt || assignment.endsAt > flight.scheduledDeparture),
  );
}

function uniqueSeatRoles(roles: SeatRole[]): SeatRole[] {
  return Array.from(new Set(roles)).sort();
}

function normalizeFlightCard(
  flight: CrewMeFlightLegPayload,
  seatRoles: SeatRole[],
): CrewMeFlightCard {
  const releaseSetting = resolveOperatorReleaseSetting(flight.operator.releaseSetting);
  const manifestReady = isManifestReady(flight.manifest?.status, flight.manifest?.items.length ?? 0);
  const weightBalanceReady = isWeightBalanceReady(flight.weightBalanceRuns[0]?.status ?? null);
  const releaseFuelReady = isReleaseFuelReady(flight.fuelEvents);
  const postflightFuelReady = isPostflightFuelReady(flight.fuelEvents);
  const releaseFuel = flight.fuelEvents.find((event) => event.eventType === AircraftFuelEventType.RELEASE_ONBOARD);
  const preflightComplete = isPreflightComplete({
    fuelEvents: flight.fuelEvents,
    manifestMode: releaseSetting.manifestMode,
    preflightRecord: flight.preflightRecord,
    weightBalanceStatus: flight.weightBalanceRuns[0]?.status ?? null,
  });
  const postflightComplete = isPostflightComplete({
    flightStatus: flight.status,
    fuelEvents: flight.fuelEvents,
    postflightRecord: flight.postflightRecord,
  });
  const aircraft = flight.aircraftAssignments[0]?.aircraft ?? null;
  const maintenanceReady = evaluateAircraftServiceability(aircraft).ready;
  const assignedRoles = new Set(flight.crewAssignments.map((assignment) => assignment.seatRole));
  const crewComplianceReady = assignedRoles.has(SeatRole.CPT) && assignedRoles.has(SeatRole.FO);

  return {
    actualArrival: flight.actualArrival,
    actualDeparture: flight.actualDeparture,
    aircraft,
    arrival: flight.arrivalStation,
    assignedCrew: flight.crewAssignments
      .map((assignment) => ({
        crewMemberId: assignment.crewMemberId,
        employeeNumber: assignment.crewMember.employeeNumber,
        email: assignment.crewMember.email,
        firstName: assignment.crewMember.firstName,
        lastName: assignment.crewMember.lastName,
        phone: assignment.crewMember.phone,
        seatRole: assignment.seatRole,
        status: assignment.status,
      }))
      .sort((first, second) => first.seatRole.localeCompare(second.seatRole)),
    departure: flight.departureStation,
    flightNumber: flight.flightNumber ?? "UNNUMBERED",
    id: flight.id,
    crewComplianceReady,
    dutyRestReady: crewComplianceReady,
    manifestReady,
    maintenanceReady,
    opsReleaseReady: flight.operationalControlRecord?.release?.status === ReleaseStatus.RELEASED,
    postflightComplete,
    postflightFuelReady,
    postflightStatus: flight.postflightRecord?.status ?? null,
    passengerCount: flight.manifest?.items.length ?? 0,
    preflightComplete,
    preflightStatus: flight.preflightRecord?.status ?? null,
    releaseFuelOnboardLbs: releaseFuel?.fuelOnboardLbs?.toString() ?? null,
    releaseFuelReady,
    releaseStatus: flight.operationalControlRecord?.release?.status ?? null,
    route: `${flight.departureStation.code} -> ${flight.arrivalStation.code}`,
    scheduledArrival: flight.scheduledArrival,
    scheduledDeparture: flight.scheduledDeparture,
    seatRoles: uniqueSeatRoles(seatRoles),
    status: flight.status,
    weightBalanceReady,
  };
}

async function findCrewForUser(userId: string) {
  return prisma.crewMember.findUnique({
    where: { userId },
    select: { id: true },
  });
}

export async function assertCrewAssignedToFlightLeg(userId: string, flightLegId: string) {
  const crew = await findCrewForUser(userId);

  if (!crew) {
    throw new Error("Your user account is not linked to a crew profile.");
  }

  const flight = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: {
      id: true,
      scheduledArrival: true,
      scheduledDeparture: true,
      aircraftAssignments: {
        where: { status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] } },
        select: { aircraftId: true },
        take: 1,
      },
      crewAssignments: {
        where: {
          crewMemberId: crew.id,
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!flight) {
    throw new Error("Flight was not found.");
  }

  if (flight.crewAssignments.length > 0) {
    return crew;
  }

  const aircraftId = flight.aircraftAssignments[0]?.aircraftId;

  if (!aircraftId) {
    throw new Error("This flight is not assigned to your crew profile.");
  }

  const aircraftBlock = await prisma.aircraftCrewAssignment.findFirst({
    where: {
      aircraftId,
      crewMemberId: crew.id,
      isActive: true,
      startsAt: { lt: flight.scheduledArrival },
      OR: [{ endsAt: null }, { endsAt: { gt: flight.scheduledDeparture } }],
    },
    select: { id: true },
  });

  if (!aircraftBlock) {
    throw new Error("This flight is not assigned to your crew profile.");
  }

  return crew;
}

export async function getCrewMeData(userId: string): Promise<CrewMeData | null> {
  const windowStart = startOfToday();
  const windowEnd = addDays(windowStart, CREW_ME_WINDOW_DAYS);

  const crew = await prisma.crewMember.findUnique({
    where: { userId },
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      dutyStatus: true,
      employmentStatus: true,
      hireDate: true,
      phone: true,
      email: true,
      baseStation: { select: { code: true, city: true } },
      qualifications: {
        orderBy: [{ aircraftType: "asc" }, { seatRole: "asc" }],
        select: {
          id: true,
          aircraftType: true,
          seatRole: true,
          expiresAt: true,
        },
      },
      assignments: {
        where: {
          isActive: true,
          startsAt: { lt: windowEnd },
          OR: [{ endsAt: null }, { endsAt: { gt: windowStart } }],
        },
        orderBy: [{ startsAt: "asc" }],
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
            },
          },
        },
      },
      schedules: {
        where: {
          date: { gte: windowStart, lt: windowEnd },
        },
        orderBy: [{ date: "asc" }, { startsAt: "asc" }],
        select: {
          id: true,
          date: true,
          dutyStatus: true,
          startsAt: true,
          endsAt: true,
          notes: true,
          station: { select: { code: true } },
        },
      },
      scheduleEntries: {
        where: {
          status: { in: [CrewScheduleEntryStatus.DRAFT, CrewScheduleEntryStatus.PUBLISHED] },
          date: { gte: windowStart, lt: windowEnd },
        },
        orderBy: [{ date: "asc" }, { startsAt: "asc" }],
        select: {
          id: true,
          date: true,
          dutyStatus: true,
          startsAt: true,
          endsAt: true,
          status: true,
          notes: true,
          period: { select: { name: true } },
        },
      },
      timeOffRequests: {
        where: {
          status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
          startDate: { lt: windowEnd },
          endDate: { gte: windowStart },
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
      scheduleRequests: {
        orderBy: [{ createdAt: "desc" }],
        take: 10,
        select: {
          id: true,
          requestType: true,
          status: true,
          startDate: true,
          endDate: true,
          requestNotes: true,
          reviewNotes: true,
          period: { select: { name: true } },
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
        where: { status: "SCHEDULED" },
        orderBy: [{ scheduledFor: "asc" }],
        take: 8,
        select: {
          id: true,
          eventType: true,
          scheduledFor: true,
          status: true,
        },
      },
    },
  });

  if (!crew) {
    return null;
  }

  const aircraftIds = Array.from(new Set(crew.assignments.map((assignment) => assignment.aircraft.id)));
  const flightLegWhere: Prisma.FlightLegWhereInput = {
    scheduledDeparture: { gte: windowStart, lt: windowEnd },
    OR: [
      {
        crewAssignments: {
          some: {
            crewMemberId: crew.id,
            status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
          },
        },
      },
    ],
  };

  if (aircraftIds.length > 0) {
    flightLegWhere.OR?.push({
      aircraftAssignments: {
        some: {
          aircraftId: { in: aircraftIds },
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
      },
    });
  }

  const [flightLegs, schedulePeriods, activePatterns, activeCrewMembers, complianceRules] = await Promise.all([
    prisma.flightLeg.findMany({
      where: flightLegWhere,
      orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
      select: crewMeFlightLegSelect,
    }),
    prisma.crewSchedulePeriod.findMany({
      where: { status: { in: [CrewSchedulePeriodStatus.BID_OPEN, CrewSchedulePeriodStatus.DRAFTING] } },
      orderBy: [{ startsAt: "asc" }],
      select: { id: true, periodKey: true, name: true },
    }),
    prisma.crewRotationPattern.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.crewMember.findMany({
      where: {
        employmentStatus: EmploymentStatus.ACTIVE,
        id: { not: crew.id },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, employeeNumber: true, firstName: true, lastName: true },
    }),
    getActiveCrewComplianceRuleDefinitions(prisma),
  ]);

  const flights = flightLegs.flatMap((flight) => {
    const directRoles = flight.crewAssignments
      .filter((assignment) => assignment.crewMemberId === crew.id)
      .map((assignment) => assignment.seatRole);
    const blockRoles = crew.assignments
      .filter((assignment) => assignmentCoversFlight(assignment, flight))
      .map((assignment) => assignment.seatRole);
    const seatRoles = uniqueSeatRoles([...directRoles, ...blockRoles]);

    return seatRoles.length > 0 ? [normalizeFlightCard(flight, seatRoles)] : [];
  });

  const complianceEvaluation = evaluateCrewCompliance(crew, complianceRules, new Date());
  const availabilityWarnings = [
    ...(crew.employmentStatus !== EmploymentStatus.ACTIVE ? [`Employment status is ${crew.employmentStatus}.`] : []),
    ...(crew.timeOffRequests.length > 0 ? ["Time-off request overlaps the planning window."] : []),
    ...(flights.length === 0 ? ["No assigned FlightLeg coverage in the crew app window."] : []),
  ];

  return {
    activeAssignments: crew.assignments,
    availabilityWarnings,
    baseStation: crew.baseStation,
    complianceStatus: complianceEvaluation.strongestStatus,
    complianceWarnings: complianceEvaluation.warnings,
    dutyStatus: crew.dutyStatus,
    email: crew.email,
    employeeNumber: crew.employeeNumber,
    employmentStatus: crew.employmentStatus,
    firstName: crew.firstName,
    flights,
    hireDate: crew.hireDate,
    id: crew.id,
    lastName: crew.lastName,
    phone: crew.phone,
    qualifications: crew.qualifications,
    requestOptions: {
      activeCrewMembers,
      activePatterns,
      schedulePeriods,
    },
    scheduleEntries: crew.scheduleEntries.map((entry) => ({
      date: entry.date,
      dutyStatus: entry.dutyStatus,
      endsAt: entry.endsAt,
      id: entry.id,
      notes: entry.notes,
      periodName: entry.period.name,
      startsAt: entry.startsAt,
      status: entry.status,
    })),
    scheduleRequests: crew.scheduleRequests.map((request) => ({
      endDate: request.endDate,
      id: request.id,
      periodName: request.period.name,
      requestNotes: request.requestNotes,
      requestType: request.requestType,
      reviewNotes: request.reviewNotes,
      startDate: request.startDate,
      status: request.status,
    })),
    schedules: crew.schedules.map((schedule) => ({
      date: schedule.date,
      dutyStatus: schedule.dutyStatus,
      endsAt: schedule.endsAt,
      id: schedule.id,
      notes: schedule.notes,
      startsAt: schedule.startsAt,
      stationCode: schedule.station?.code ?? null,
    })),
    timeOffRequests: crew.timeOffRequests,
    windowEnd,
    windowStart,
  };
}

export async function getCrewMeFlightDetail(
  userId: string,
  flightLegId: string,
): Promise<CrewMeFlightDetail | null> {
  const crew = await assertCrewAssignedToFlightLeg(userId, flightLegId);
  const [flight, aircraftBlocks] = await Promise.all([
    prisma.flightLeg.findUnique({
      where: { id: flightLegId },
      select: crewMeFlightLegSelect,
    }),
    prisma.aircraftCrewAssignment.findMany({
      where: {
        crewMemberId: crew.id,
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
          },
        },
      },
    }),
  ]);

  if (!flight) {
    return null;
  }

  const directRoles = flight.crewAssignments
    .filter((assignment) => assignment.crewMemberId === crew.id)
    .map((assignment) => assignment.seatRole);
  const blockRoles = aircraftBlocks
    .filter((assignment) => assignmentCoversFlight(assignment, flight))
    .map((assignment) => assignment.seatRole);
  const releaseSetting = resolveOperatorReleaseSetting(flight.operator.releaseSetting);

  return {
    ...normalizeFlightCard(flight, [...directRoles, ...blockRoles]),
    currentCrewMemberId: crew.id,
    manifestMode: releaseSetting.manifestMode,
    notes: flight.notes,
    postflightRecord: flight.postflightRecord,
    preflightRecord: flight.preflightRecord,
  };
}

export async function getCrewMeFlightPassengers(
  userId: string,
  flightLegId: string,
): Promise<CrewMeFlightPassengerList | null> {
  await assertCrewAssignedToFlightLeg(userId, flightLegId);

  const flight = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: {
      id: true,
      flightNumber: true,
      scheduledArrival: true,
      scheduledDeparture: true,
      status: true,
      departureStation: { select: { code: true } },
      arrivalStation: { select: { code: true } },
      aircraftAssignments: {
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
        orderBy: { assignedAt: "desc" },
        select: {
          aircraft: {
            select: {
              tailNumber: true,
              type: true,
            },
          },
        },
        take: 1,
      },
      manifest: {
        select: {
          status: true,
          items: {
            orderBy: [{ seatNumber: "asc" }, { createdAt: "asc" }],
            select: {
              baggageWeight: true,
              boardedAt: true,
              checkedInAt: true,
              id: true,
              notes: true,
              passenger: {
                select: {
                  firstName: true,
                  id: true,
                  idDocumentExpiresAt: true,
                  idDocumentNumber: true,
                  idDocumentType: true,
                  idIssuingCountry: true,
                  idIssuingState: true,
                  identityDocuments: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: "desc" },
                    select: {
                      createdAt: true,
                      id: true,
                    },
                    take: 1,
                  },
                  lastName: true,
                },
              },
              personName: true,
              seatNumber: true,
              weight: true,
            },
          },
        },
      },
    },
  });

  if (!flight) {
    return null;
  }

  return {
    aircraft: flight.aircraftAssignments[0]?.aircraft ?? null,
    flightNumber: flight.flightNumber ?? "UNNUMBERED",
    id: flight.id,
    manifestStatus: flight.manifest?.status ?? null,
    passengers:
      flight.manifest?.items.map((item, index) => {
        const passengerName = item.passenger
          ? `${item.passenger.firstName} ${item.passenger.lastName}`
          : item.personName;

        return {
          baggageWeight: item.baggageWeight?.toString() ?? null,
          boardedAt: item.boardedAt,
          checkedInAt: item.checkedInAt,
          id: item.id,
          idDocumentExpiresAt: item.passenger?.idDocumentExpiresAt ?? null,
          idDocumentNumber: item.passenger?.idDocumentNumber ?? null,
          idDocumentType: item.passenger?.idDocumentType ?? null,
          idIssuingCountry: item.passenger?.idIssuingCountry ?? null,
          idIssuingState: item.passenger?.idIssuingState ?? null,
          identityDocument: item.passenger?.identityDocuments[0] ?? null,
          name: passengerName ?? `Passenger ${index + 1}`,
          notes: item.notes,
          passengerId: item.passenger?.id ?? null,
          seatNumber: item.seatNumber,
          weight: item.weight?.toString() ?? null,
        };
      }) ?? [],
    route: `${flight.departureStation.code} -> ${flight.arrivalStation.code}`,
    scheduledArrival: flight.scheduledArrival,
    scheduledDeparture: flight.scheduledDeparture,
    status: flight.status,
  };
}
