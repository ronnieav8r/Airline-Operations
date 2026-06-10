import { AssignmentStatus, FlightLegStatus, FlightStatus, Prisma } from "@prisma/client";

import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";
import { prisma } from "@/lib/prisma";

const flightLegListSelect = {
  id: true,
  legacyFlightId: true,
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
  legacyFlight: {
    select: {
      id: true,
      flightNumber: true,
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
} satisfies Prisma.FlightLegSelect;

const fallbackFlightListSelect = {
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
} satisfies Prisma.FlightSelect;

type FlightLegListPayload = Prisma.FlightLegGetPayload<{
  select: typeof flightLegListSelect;
}>;

type FallbackFlightListPayload = Prisma.FlightGetPayload<{
  select: typeof fallbackFlightListSelect;
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

type FlightListControlRecord = NonNullable<
  FlightLegListPayload["operationalControlRecord"] | FallbackFlightListPayload["operationalControlRecord"]
>;

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

function normalizeFlightLeg(flightLeg: FlightLegListPayload): FlightListItem {
  const legacyFlightId = flightLeg.legacyFlightId ?? flightLeg.legacyFlight?.id ?? flightLeg.id;
  const assignedAircraft =
    flightLeg.aircraftAssignments[0]?.aircraft ?? flightLeg.legacyFlight?.aircraft;

  if (!assignedAircraft) {
    throw new Error(`FlightLeg ${flightLeg.id} has no aircraft assignment or legacy aircraft.`);
  }

  return {
    id: legacyFlightId,
    legacyFlightId,
    flightLegId: flightLeg.id,
    readSource: "FLIGHT_LEG",
    flightNumber: flightLeg.flightNumber ?? flightLeg.legacyFlight?.flightNumber ?? "UNNUMBERED",
    scheduledDeparture: flightLeg.scheduledDeparture,
    scheduledArrival: flightLeg.scheduledArrival,
    actualDeparture: flightLeg.actualDeparture,
    actualArrival: flightLeg.actualArrival,
    status: flightLeg.status,
    departureStation: flightLeg.departureStation,
    arrivalStation: flightLeg.arrivalStation,
    aircraft: assignedAircraft,
    operationalControlRecord:
      flightLeg.operationalControlRecord ?? flightLeg.legacyFlight?.operationalControlRecord ?? null,
    coverage: null,
  };
}

function normalizeFallbackFlight(flight: FallbackFlightListPayload): FlightListItem {
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
  const [flightLegs, fallbackFlights] = await Promise.all([
    prisma.flightLeg.findMany({
      select: flightLegListSelect,
      orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
      take: 80,
    }),
    prisma.flight.findMany({
      where: {
        flightLeg: null,
      },
      select: fallbackFlightListSelect,
      orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
      take: 80,
    }),
  ]);

  const normalizedFlights = [...flightLegs.map(normalizeFlightLeg), ...fallbackFlights.map(normalizeFallbackFlight)]
    .sort((first, second) => {
      const departureDelta = first.scheduledDeparture.getTime() - second.scheduledDeparture.getTime();

      if (departureDelta !== 0) {
        return departureDelta;
      }

      return first.flightNumber.localeCompare(second.flightNumber);
    })
    .slice(0, 80);

  const flightsWithCoverage = await Promise.all(
    normalizedFlights.map(async (flight) => ({
      ...flight,
      coverage: await resolveFlightCoverage(flight.flightLegId ?? flight.legacyFlightId),
    })),
  );

  return {
    flights: flightsWithCoverage,
    readSummary: {
      total: flightsWithCoverage.length,
      flightLegReads: flightsWithCoverage.filter((flight) => flight.readSource === "FLIGHT_LEG")
        .length,
      fallbackFlightReads: flightsWithCoverage.filter(
        (flight) => flight.readSource === "LEG_MISSING_FALLBACK_FLIGHT",
      ).length,
    },
  };
}
