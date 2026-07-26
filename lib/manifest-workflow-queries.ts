import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const passengerServiceProfileSelect = {
  aviationInterest: true,
  beveragePreferences: true,
  cabinComfortNotes: true,
  cateringAvoidances: true,
  cateringPreferences: true,
  conversationPreference: true,
  flightDeckInteractionNotes: true,
  serviceNotes: true,
  temperaturePreference: true,
} satisfies Prisma.PassengerServiceProfileSelect;

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
  operationalControlRecord: {
    select: {
      customer: {
        select: {
          id: true,
          name: true,
          passengers: {
            select: {
              passenger: {
                select: {
                  email: true,
                  firstName: true,
                  id: true,
                  idDocumentType: true,
                  lastName: true,
                  middleName: true,
                  serviceProfile: {
                    select: passengerServiceProfileSelect,
                  },
                },
              },
            },
          },
        },
      },
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
              middleName: true,
              lastName: true,
              serviceProfile: {
                select: passengerServiceProfileSelect,
              },
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

export async function getManifestPassengerOptions() {
  return prisma.passenger.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      email: true,
      firstName: true,
      id: true,
      idDocumentType: true,
      lastName: true,
      middleName: true,
      serviceProfile: {
        select: passengerServiceProfileSelect,
      },
    },
    take: 250,
  });
}
