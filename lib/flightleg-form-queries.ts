import { AssignmentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const flightLegFormOptionsSelect = {
  stations: prisma.station.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      city: true,
      state: true,
      isActive: true,
    },
  }),
  aircraft: prisma.aircraft.findMany({
    orderBy: { tailNumber: "asc" },
    select: {
      id: true,
      tailNumber: true,
      type: true,
      status: true,
      seats: true,
    },
  }),
  customers: prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      operatorId: true,
      name: true,
      customerCode: true,
      isActive: true,
    },
  }),
  operatingAuthorities: prisma.operatingAuthority.findMany({
    orderBy: [{ operator: { code: "asc" } }, { operatingPart: "asc" }],
    select: {
      id: true,
      operatorId: true,
      displayName: true,
      operatingPart: true,
      status: true,
      operator: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  }),
};

const flightLegEditSelect = {
  id: true,
  flightNumber: true,
  departureStationId: true,
  arrivalStationId: true,
  scheduledDeparture: true,
  scheduledArrival: true,
  notes: true,
  operatorId: true,
  operatingAuthorityId: true,
  authorityRevisionId: true,
  aircraftAssignments: {
    where: {
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    orderBy: { assignedAt: "desc" },
    take: 1,
    select: {
      aircraftId: true,
      status: true,
    },
  },
  operationalControlRecord: {
    select: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      controllingEntity: true,
      controlNotes: true,
    },
  },
} satisfies Prisma.FlightLegSelect;

export type FlightLegFormOptions = {
  stations: Awaited<typeof flightLegFormOptionsSelect.stations>;
  aircraft: Awaited<typeof flightLegFormOptionsSelect.aircraft>;
  customers: Awaited<typeof flightLegFormOptionsSelect.customers>;
  operatingAuthorities: Awaited<typeof flightLegFormOptionsSelect.operatingAuthorities>;
};

export type FlightLegEditData = Prisma.FlightLegGetPayload<{
  select: typeof flightLegEditSelect;
}>;

export async function getFlightLegFormOptions(): Promise<FlightLegFormOptions> {
  const [stations, aircraft, customers, operatingAuthorities] =
    await prisma.$transaction([
      flightLegFormOptionsSelect.stations,
      flightLegFormOptionsSelect.aircraft,
      flightLegFormOptionsSelect.customers,
      flightLegFormOptionsSelect.operatingAuthorities,
    ]);

  return {
    stations,
    aircraft,
    customers,
    operatingAuthorities,
  };
}

export async function getFlightLegEditData(
  flightLegId: string,
): Promise<FlightLegEditData | null> {
  return prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: flightLegEditSelect,
  });
}
