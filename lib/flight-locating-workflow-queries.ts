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
