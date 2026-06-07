import { AssignmentStatus, FlightLegStatus, FlightStatus, Prisma } from "@prisma/client";

import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";
import { prisma } from "@/lib/prisma";

const flightListSelect = {
  id: true,
  flightNumber: true,
  scheduledDeparture: true,
  scheduledArrival: true,
  actualDeparture: true,
  actualArrival: true,
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
  aircraft: {
    select: {
      id: true,
      tailNumber: true,
      type: true,
      status: true,
    },
  },
  operationalControlRecord: {
    select: {
      controllingEntity: true,
      operatingAuthority: {
        select: {
          displayName: true,
          operatingPart: true,
        },
      },
      authorityRevision: {
        select: {
          revisionLabel: true,
        },
      },
      release: {
        select: {
          status: true,
          releasedAt: true,
        },
      },
    },
  },
  flightLeg: {
    select: {
      id: true,
      flightNumber: true,
      scheduledDeparture: true,
      scheduledArrival: true,
      actualDeparture: true,
      actualArrival: true,
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
      aircraftAssignments: {
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
        select: {
          aircraft: {
            select: {
              id: true,
              tailNumber: true,
              type: true,
              status: true,
            },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
        take: 1,
      },
      operationalControlRecord: {
        select: {
          controllingEntity: true,
          operatingAuthority: {
            select: {
              displayName: true,
              operatingPart: true,
            },
          },
          authorityRevision: {
            select: {
              revisionLabel: true,
            },
          },
          release: {
            select: {
              status: true,
              releasedAt: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.FlightSelect;

type LegacyFlightListPayload = Prisma.FlightGetPayload<{
  select: typeof flightListSelect;
}>;

type FlightListStation = {
  code: string;
  city: string;
};

type FlightListAircraft = {
  id: string;
  tailNumber: string;
  type: string;
  status: string;
};

type FlightListControlRecord = NonNullable<LegacyFlightListPayload["operationalControlRecord"]>;

export type FlightListReadSource = "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT";

export type FlightListItem = {
  id: string;
  legacyFlightId: string;
  flightLegId: string | null;
  readSource: FlightListReadSource;
  flightNumber: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  actualDeparture: Date | null;
  actualArrival: Date | null;
  status: FlightStatus | FlightLegStatus;
  departureStation: FlightListStation;
  arrivalStation: FlightListStation;
  aircraft: FlightListAircraft;
  operationalControlRecord: FlightListControlRecord | null;
  coverage: FlightCoverage | null;
};

export type FlightListSummary = {
  total: number;
  flightLegReads: number;
  fallbackFlightReads: number;
};

export type FlightListData = {
  flights: FlightListItem[];
  readSummary: FlightListSummary;
};

function normalizeFlight(flight: LegacyFlightListPayload): FlightListItem {
  if (flight.flightLeg) {
    const assignedAircraft = flight.flightLeg.aircraftAssignments[0]?.aircraft ?? flight.aircraft;

    return {
      id: flight.id,
      legacyFlightId: flight.id,
      flightLegId: flight.flightLeg.id,
      readSource: "FLIGHT_LEG",
      flightNumber: flight.flightLeg.flightNumber ?? flight.flightNumber,
      scheduledDeparture: flight.flightLeg.scheduledDeparture,
      scheduledArrival: flight.flightLeg.scheduledArrival,
      actualDeparture: flight.flightLeg.actualDeparture,
      actualArrival: flight.flightLeg.actualArrival,
      status: flight.flightLeg.status,
      departureStation: flight.flightLeg.departureStation,
      arrivalStation: flight.flightLeg.arrivalStation,
      aircraft: assignedAircraft,
      operationalControlRecord:
        flight.flightLeg.operationalControlRecord ?? flight.operationalControlRecord,
      coverage: null,
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
    actualDeparture: flight.actualDeparture,
    actualArrival: flight.actualArrival,
    status: flight.status,
    departureStation: flight.departureStation,
    arrivalStation: flight.arrivalStation,
    aircraft: {
      id: flight.aircraft.id,
      tailNumber: flight.aircraft.tailNumber,
      type: flight.aircraft.type,
      status: flight.aircraft.status,
    },
    operationalControlRecord: flight.operationalControlRecord,
    coverage: null,
  };
}

export async function getFlightList(): Promise<FlightListItem[]> {
  const data = await getFlightListData();

  return data.flights;
}

export async function getFlightListData(): Promise<FlightListData> {
  const flights = await prisma.flight.findMany({
    select: flightListSelect,
    orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
    take: 80,
  });

  const normalizedFlights = await Promise.all(
    flights.map(async (flight) => {
      const normalized = normalizeFlight(flight);

      return {
        ...normalized,
        coverage: await resolveFlightCoverage(normalized.legacyFlightId),
      };
    }),
  );

  return {
    flights: normalizedFlights,
    readSummary: {
      total: normalizedFlights.length,
      flightLegReads: normalizedFlights.filter((flight) => flight.readSource === "FLIGHT_LEG")
        .length,
      fallbackFlightReads: normalizedFlights.filter(
        (flight) => flight.readSource === "LEG_MISSING_FALLBACK_FLIGHT",
      ).length,
    },
  };
}
