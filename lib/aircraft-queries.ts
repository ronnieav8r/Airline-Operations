import {
  AircraftCapabilityStatus,
  AircraftConfigurationStatus,
  AircraftStatus,
  AirworthinessReleaseStatus,
  AlertSeverity,
  AlertStatus,
  AlertType,
  DeferralStatus,
  DiscrepancyStatus,
  FlightLegStatus,
  FlightStatus,
  MaintenanceEventStatus,
  Prisma,
  SeatRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const aircraftBoardSelect = {
  id: true,
  tailNumber: true,
  name: true,
  type: true,
  status: true,
  seats: true,
  homeStation: {
    select: {
      code: true,
      city: true,
    },
  },
  flights: {
    select: {
      id: true,
      flightNumber: true,
      scheduledDeparture: true,
      scheduledArrival: true,
      status: true,
      departureStation: {
        select: {
          code: true,
          city: true,
        },
      },
      arrivalStation: {
        select: {
          code: true,
          city: true,
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
              city: true,
            },
          },
          arrivalStation: {
            select: {
              code: true,
              city: true,
            },
          },
        },
      },
    },
    orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
    take: 6,
  },
  crewAssignments: {
    select: {
      id: true,
      seatRole: true,
      startsAt: true,
      endsAt: true,
      notes: true,
      crewMember: {
        select: {
          firstName: true,
          lastName: true,
          employeeNumber: true,
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
    orderBy: [{ seatRole: "asc" }, { startsAt: "asc" }],
  },
  alerts: {
    where: {
      status: AlertStatus.ACTIVE,
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      message: true,
      flight: {
        select: {
          flightNumber: true,
        },
      },
    },
  },
  configurations: {
    where: {
      status: AircraftConfigurationStatus.ACTIVE,
    },
    orderBy: [{ effectiveStart: "desc" }],
    select: {
      id: true,
      configurationLabel: true,
      passengerSeatCount: true,
      emptyWeight: true,
      emptyWeightCg: true,
      effectiveStart: true,
      effectiveEnd: true,
      status: true,
    },
    take: 1,
  },
  capabilities: {
    where: {
      status: AircraftCapabilityStatus.ACTIVE,
    },
    orderBy: [{ capabilityCode: "asc" }],
    select: {
      id: true,
      capabilityCode: true,
      description: true,
      effectiveEnd: true,
      status: true,
    },
  },
  discrepancies: {
    where: {
      status: { in: [DiscrepancyStatus.OPEN, DiscrepancyStatus.DEFERRED] },
    },
    orderBy: [{ reportedAt: "desc" }],
    select: {
      id: true,
      discrepancyNumber: true,
      title: true,
      severity: true,
      status: true,
      reportedAt: true,
    },
  },
  deferrals: {
    where: {
      status: DeferralStatus.ACTIVE,
    },
    orderBy: [{ dueAt: "asc" }],
    select: {
      id: true,
      deferralNumber: true,
      category: true,
      dueAt: true,
      status: true,
      discrepancy: {
        select: {
          title: true,
        },
      },
    },
  },
  maintenanceEvents: {
    where: {
      status: MaintenanceEventStatus.COMPLETED,
    },
    orderBy: [{ completedAt: "desc" }],
    select: {
      id: true,
      maintenanceNumber: true,
      eventType: true,
      completedAt: true,
      providerName: true,
      returnToServiceAt: true,
      status: true,
    },
    take: 1,
  },
  airworthinessReleases: {
    where: {
      status: AirworthinessReleaseStatus.RELEASED,
    },
    orderBy: [{ releasedAt: "desc" }],
    select: {
      id: true,
      releaseNumber: true,
      releasedAt: true,
      expiresAt: true,
      status: true,
      flightLegId: true,
    },
    take: 1,
  },
} satisfies Prisma.AircraftSelect;

type AircraftBoardPayload = Prisma.AircraftGetPayload<{
  select: typeof aircraftBoardSelect;
}>;

type AircraftBoardCrewAssignment = AircraftBoardPayload["crewAssignments"][number];
type AircraftBoardAlert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  flight: {
    flightNumber: string;
  } | null;
};

export type AircraftBoardFlight = {
  id: string;
  legacyFlightId: string;
  flightLegId: string | null;
  readSource: "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT";
  flightNumber: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  status: FlightStatus | FlightLegStatus;
  departureStation: {
    code: string;
    city: string;
  };
  arrivalStation: {
    code: string;
    city: string;
  };
};

export type AircraftBoardItem = Omit<AircraftBoardPayload, "flights" | "crewAssignments" | "alerts"> & {
  flights: AircraftBoardFlight[];
  crewAssignments: AircraftBoardCrewAssignment[];
  alerts: AircraftBoardAlert[];
};

export type AircraftBoardSummary = {
  total: number;
  available: number;
  inFlight: number;
  maintenance: number;
  activeAlerts: number;
  crewGaps: number;
  flightLegReads: number;
  fallbackFlightReads: number;
  configuredAircraft: number;
  aircraftWithActiveDeferrals: number;
  aircraftWithOpenDiscrepancies: number;
  aircraftWithAirworthinessRelease: number;
};

export type AircraftBoardData = {
  aircraft: AircraftBoardItem[];
  summary: AircraftBoardSummary;
};

function missingCockpitRoles(assignments: Array<{ seatRole: SeatRole }>): SeatRole[] {
  const assignedRoles = new Set(assignments.map((assignment) => assignment.seatRole));

  return [SeatRole.CPT, SeatRole.FO].filter((role) => !assignedRoles.has(role));
}

function normalizeFlight(flight: AircraftBoardPayload["flights"][number]): AircraftBoardFlight {
  if (flight.flightLeg) {
    return {
      id: flight.id,
      legacyFlightId: flight.id,
      flightLegId: flight.flightLeg.id,
      readSource: "FLIGHT_LEG",
      flightNumber: flight.flightLeg.flightNumber ?? flight.flightNumber,
      scheduledDeparture: flight.flightLeg.scheduledDeparture,
      scheduledArrival: flight.flightLeg.scheduledArrival,
      status: flight.flightLeg.status,
      departureStation: flight.flightLeg.departureStation,
      arrivalStation: flight.flightLeg.arrivalStation,
    };
  }

  return {
    id: flight.id,
    legacyFlightId: flight.id,
    flightLegId: null,
    readSource: "LEG_MISSING_FALLBACK_FLIGHT",
    flightNumber: flight.flightNumber,
    scheduledDeparture: flight.scheduledDeparture,
    scheduledArrival: flight.scheduledArrival,
    status: flight.status,
    departureStation: flight.departureStation,
    arrivalStation: flight.arrivalStation,
  };
}

export async function getAircraftBoard(): Promise<AircraftBoardData> {
  const now = new Date();

  const aircraftRows = await prisma.aircraft.findMany({
    select: aircraftBoardSelect,
    orderBy: [{ tailNumber: "asc" }],
  });

  const aircraft = aircraftRows.map((item) => ({
    ...item,
    flights: item.flights
      .filter((flight) => flight.scheduledArrival >= now && flight.status !== FlightStatus.CANCELLED)
      .map(normalizeFlight)
      .slice(0, 3),
    crewAssignments: item.crewAssignments.filter(
      (assignment) =>
        assignment.startsAt <= now && (assignment.endsAt === null || assignment.endsAt > now),
    ),
    alerts: item.alerts,
  }));

  return {
    aircraft,
    summary: {
      total: aircraft.length,
      available: aircraft.filter((item) => item.status === AircraftStatus.AVAILABLE).length,
      inFlight: aircraft.filter((item) => item.status === AircraftStatus.IN_FLIGHT).length,
      maintenance: aircraft.filter(
        (item) =>
          item.status === AircraftStatus.IN_MAINTENANCE ||
          item.status === AircraftStatus.OUT_OF_SERVICE ||
          item.alerts.some((alert) => alert.type === AlertType.MAINTENANCE),
      ).length,
      activeAlerts: aircraft.reduce((count, item) => count + item.alerts.length, 0),
      crewGaps: aircraft.filter((item) => missingCockpitRoles(item.crewAssignments).length > 0)
        .length,
      flightLegReads: aircraft.reduce(
        (count, item) =>
          count + item.flights.filter((flight) => flight.readSource === "FLIGHT_LEG").length,
        0,
      ),
      fallbackFlightReads: aircraft.reduce(
        (count, item) =>
          count +
          item.flights.filter((flight) => flight.readSource === "LEG_MISSING_FALLBACK_FLIGHT")
            .length,
        0,
      ),
      configuredAircraft: aircraft.filter((item) => item.configurations.length > 0).length,
      aircraftWithActiveDeferrals: aircraft.filter((item) => item.deferrals.length > 0).length,
      aircraftWithOpenDiscrepancies: aircraft.filter(
        (item) => item.discrepancies.length > 0,
      ).length,
      aircraftWithAirworthinessRelease: aircraft.filter(
        (item) => item.airworthinessReleases.length > 0,
      ).length,
    },
  };
}
