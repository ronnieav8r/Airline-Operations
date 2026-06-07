import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const manifestWorkflowSelect = {
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
      lockedAt: true,
      items: {
        select: {
          id: true,
          personName: true,
          passengerId: true,
          seatNumber: true,
          weight: true,
          baggageWeight: true,
          checkedInAt: true,
          boardedAt: true,
          notes: true,
          passenger: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [{ seatNumber: "asc" }, { createdAt: "asc" }],
      },
    },
  },
} satisfies Prisma.FlightLegSelect;

export type ManifestWorkflowData = Prisma.FlightLegGetPayload<{
  select: typeof manifestWorkflowSelect;
}>;

export async function getManifestWorkflowData(
  flightLegId: string,
): Promise<ManifestWorkflowData | null> {
  return prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: manifestWorkflowSelect,
  });
}
