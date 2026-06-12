import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const weightBalanceWorkflowSelect = {
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
  manifest: {
    select: {
      id: true,
      status: true,
      items: {
        select: {
          id: true,
        },
      },
    },
  },
  fuelEvents: {
    orderBy: {
      recordedAt: "desc",
    },
    select: {
      eventType: true,
      fuelOnboardGallons: true,
      fuelOnboardLbs: true,
      fueledReady: true,
      recordedAt: true,
    },
  },
  weightBalanceRuns: {
    select: {
      id: true,
      manifestId: true,
      runLabel: true,
      status: true,
      takeoffWeight: true,
      landingWeight: true,
      centerOfGravity: true,
      calculatedAt: true,
      approvedAt: true,
      calculationSnapshot: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
} satisfies Prisma.FlightLegSelect;

export type WeightBalanceWorkflowData = Prisma.FlightLegGetPayload<{
  select: typeof weightBalanceWorkflowSelect;
}>;

export async function getWeightBalanceWorkflowData(
  flightLegId: string,
): Promise<WeightBalanceWorkflowData | null> {
  return prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: weightBalanceWorkflowSelect,
  });
}
