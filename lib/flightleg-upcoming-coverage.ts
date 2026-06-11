import { AssignmentStatus, FlightLegStatus, FlightStatus } from "@prisma/client";

import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";
import { prisma } from "@/lib/prisma";

export type UpcomingCoverageFlight = {
  aircraftId: string;
  arrivalCode: string;
  coverage: FlightCoverage | null;
  departureCode: string;
  flightLegId: string | null;
  flightNumber: string;
  id: string;
  legacyFlightId: string;
  readSource: "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT";
  route: string;
  scheduledArrival: Date;
  scheduledDeparture: Date;
  status: FlightLegStatus | FlightStatus;
  tailNumber: string;
};

export async function getUpcomingCoverageFlightsForAircrafts(
  aircraftIds: string[],
  windowStart: Date,
  windowEnd: Date,
): Promise<UpcomingCoverageFlight[]> {
  if (aircraftIds.length === 0) {
    return [];
  }

  const [flightLegs, fallbackFlights] = await Promise.all([
    prisma.flightLeg.findMany({
      where: {
        scheduledDeparture: {
          gte: windowStart,
          lt: windowEnd,
        },
        aircraftAssignments: {
          some: {
            aircraftId: { in: aircraftIds },
            status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
          },
        },
      },
      select: {
        id: true,
        legacyFlightId: true,
        flightNumber: true,
        scheduledDeparture: true,
        scheduledArrival: true,
        status: true,
        departureStation: {
          select: { code: true },
        },
        arrivalStation: {
          select: { code: true },
        },
        aircraftAssignments: {
          where: {
            aircraftId: { in: aircraftIds },
            status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
          },
          orderBy: { assignedAt: "desc" },
          take: 1,
          select: {
            aircraft: {
              select: {
                id: true,
                tailNumber: true,
              },
            },
          },
        },
      },
      orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
    }),
    prisma.flight.findMany({
      where: {
        aircraftId: { in: aircraftIds },
        flightLeg: null,
        scheduledDeparture: {
          gte: windowStart,
          lt: windowEnd,
        },
      },
      orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
      select: {
        id: true,
        flightNumber: true,
        scheduledDeparture: true,
        scheduledArrival: true,
        status: true,
        departureStation: {
          select: { code: true },
        },
        arrivalStation: {
          select: { code: true },
        },
        aircraft: {
          select: {
            id: true,
            tailNumber: true,
          },
        },
      },
    }),
  ]);

  const normalizedFlightLegs = flightLegs.flatMap((flightLeg): UpcomingCoverageFlight[] => {
    const assignedAircraft = flightLeg.aircraftAssignments[0]?.aircraft;

    if (!assignedAircraft) {
      return [];
    }

    const legacyFlightId = flightLeg.legacyFlightId ?? flightLeg.id;

    return [
      {
        aircraftId: assignedAircraft.id,
        arrivalCode: flightLeg.arrivalStation.code,
        coverage: null,
        departureCode: flightLeg.departureStation.code,
        flightLegId: flightLeg.id,
        flightNumber: flightLeg.flightNumber ?? "UNNUMBERED",
        id: legacyFlightId,
        legacyFlightId,
        readSource: "FLIGHT_LEG",
        route: `${flightLeg.departureStation.code} -> ${flightLeg.arrivalStation.code}`,
        scheduledArrival: flightLeg.scheduledArrival,
        scheduledDeparture: flightLeg.scheduledDeparture,
        status: flightLeg.status,
        tailNumber: assignedAircraft.tailNumber,
      },
    ];
  });

  const normalizedFallbackFlights = fallbackFlights.map((flight): UpcomingCoverageFlight => ({
    aircraftId: flight.aircraft.id,
    arrivalCode: flight.arrivalStation.code,
    coverage: null,
    departureCode: flight.departureStation.code,
    flightLegId: null,
    flightNumber: flight.flightNumber,
    id: flight.id,
    legacyFlightId: flight.id,
    readSource: "LEG_MISSING_FALLBACK_FLIGHT",
    route: `${flight.departureStation.code} -> ${flight.arrivalStation.code}`,
    scheduledArrival: flight.scheduledArrival,
    scheduledDeparture: flight.scheduledDeparture,
    status: flight.status,
    tailNumber: flight.aircraft.tailNumber,
  }));

  const normalizedFlights = [...normalizedFlightLegs, ...normalizedFallbackFlights].sort(
    (first, second) => {
      const departureDelta = first.scheduledDeparture.getTime() - second.scheduledDeparture.getTime();

      if (departureDelta !== 0) {
        return departureDelta;
      }

      return first.flightNumber.localeCompare(second.flightNumber);
    },
  );

  return Promise.all(
    normalizedFlights.map(async (flight) => ({
      ...flight,
      coverage: await resolveFlightCoverage(flight.flightLegId ?? flight.legacyFlightId),
    })),
  );
}
