import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const flightLocatingWorkflowSelect = {
  id: true,
  flightNumber: true,
  scheduledDeparture: true,
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
  flightLocatingRecord: {
    select: {
      id: true,
      status: true,
      responsibleParty: true,
      plannedRoute: true,
      lastKnownPosition: true,
      activatedAt: true,
      closedAt: true,
      overdueAt: true,
      notes: true,
      positionReports: {
        orderBy: {
          reportedAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          reportedAt: true,
          positionSummary: true,
          latitude: true,
          longitude: true,
          altitude: true,
          groundspeed: true,
          heading: true,
          source: true,
          notes: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.FlightLegSelect;

export type FlightLocatingWorkflowData = Prisma.FlightLegGetPayload<{
  select: typeof flightLocatingWorkflowSelect;
}>;

export async function getFlightLocatingWorkflowData(
  flightLegId: string,
): Promise<FlightLocatingWorkflowData | null> {
  return prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: flightLocatingWorkflowSelect,
  });
}
