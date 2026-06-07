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
  operators: prisma.operator.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
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
  authorityRevisions: prisma.authorityRevision.findMany({
    orderBy: [{ operatingAuthority: { operator: { code: "asc" } } }, { effectiveStart: "desc" }],
    select: {
      id: true,
      operatingAuthorityId: true,
      revisionLabel: true,
      effectiveStart: true,
      effectiveEnd: true,
      status: true,
      operatingAuthority: {
        select: {
          displayName: true,
          operatingPart: true,
          operator: {
            select: {
              code: true,
            },
          },
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
      controllingEntity: true,
      controlNotes: true,
    },
  },
} satisfies Prisma.FlightLegSelect;

export type FlightLegFormOptions = {
  stations: Awaited<typeof flightLegFormOptionsSelect.stations>;
  aircraft: Awaited<typeof flightLegFormOptionsSelect.aircraft>;
  operators: Awaited<typeof flightLegFormOptionsSelect.operators>;
  operatingAuthorities: Awaited<typeof flightLegFormOptionsSelect.operatingAuthorities>;
  authorityRevisions: Awaited<typeof flightLegFormOptionsSelect.authorityRevisions>;
};

export type FlightLegEditData = Prisma.FlightLegGetPayload<{
  select: typeof flightLegEditSelect;
}>;

export async function getFlightLegFormOptions(): Promise<FlightLegFormOptions> {
  const [stations, aircraft, operators, operatingAuthorities, authorityRevisions] =
    await prisma.$transaction([
      flightLegFormOptionsSelect.stations,
      flightLegFormOptionsSelect.aircraft,
      flightLegFormOptionsSelect.operators,
      flightLegFormOptionsSelect.operatingAuthorities,
      flightLegFormOptionsSelect.authorityRevisions,
    ]);

  return {
    stations,
    aircraft,
    operators,
    operatingAuthorities,
    authorityRevisions,
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
