import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const dispatchPackageWorkflowSelect = {
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
  dispatchPackage: {
    select: {
      id: true,
      performanceData: true,
      updatedAt: true,
      weatherBriefing: {
        select: {
          id: true,
          provider: true,
          briefingAt: true,
          routeSummary: true,
          rawSnapshot: true,
        },
      },
      notamSnapshot: {
        select: {
          id: true,
          capturedAt: true,
          affectedStationCodes: true,
          rawSnapshot: true,
        },
      },
      flightPlanReference: {
        select: {
          id: true,
          provider: true,
          externalReference: true,
          filedAt: true,
          status: true,
          routeText: true,
        },
      },
    },
  },
} satisfies Prisma.FlightLegSelect;

export type DispatchPackageWorkflowData = Prisma.FlightLegGetPayload<{
  select: typeof dispatchPackageWorkflowSelect;
}>;

export async function getDispatchPackageWorkflowData(
  flightLegId: string,
): Promise<DispatchPackageWorkflowData | null> {
  return prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: dispatchPackageWorkflowSelect,
  });
}
