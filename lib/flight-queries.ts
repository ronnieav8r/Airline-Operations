import { Prisma } from "@prisma/client";

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

type FlightListPayload = Prisma.FlightGetPayload<{
  select: typeof flightListSelect;
}>;

export type FlightListItem = FlightListPayload & {
  coverage: FlightCoverage | null;
};

export async function getFlightList(): Promise<FlightListItem[]> {
  const flights = await prisma.flight.findMany({
    select: flightListSelect,
    orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
    take: 80,
  });

  return Promise.all(
    flights.map(async (flight) => ({
      ...flight,
      coverage: await resolveFlightCoverage(flight.id),
    })),
  );
}
