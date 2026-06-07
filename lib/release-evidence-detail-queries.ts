import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const releaseEvidenceDetailSelect = {
  id: true,
  flightNumber: true,
  status: true,
  scheduledDeparture: true,
  scheduledArrival: true,
  actualDeparture: true,
  actualArrival: true,
  departureStation: {
    select: {
      code: true,
      name: true,
      city: true,
    },
  },
  arrivalStation: {
    select: {
      code: true,
      name: true,
      city: true,
    },
  },
  operator: {
    select: {
      name: true,
      code: true,
    },
  },
  operatingAuthority: {
    select: {
      displayName: true,
      operatingPart: true,
    },
  },
  authorityRevision: {
    select: {
      revisionLabel: true,
      effectiveStart: true,
    },
  },
  aircraftAssignments: {
    select: {
      status: true,
      assignedAt: true,
      aircraft: {
        select: {
          tailNumber: true,
          type: true,
          seats: true,
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
    take: 1,
  },
  operationalControlRecord: {
    select: {
      controllingEntity: true,
      controlNotes: true,
      release: {
        select: {
          status: true,
          releasedAt: true,
          releaseNotes: true,
        },
      },
    },
  },
  manifest: {
    select: {
      status: true,
      lockedAt: true,
      items: {
        select: {
          id: true,
          personName: true,
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
              idDocumentType: true,
            },
          },
        },
        orderBy: {
          seatNumber: "asc",
        },
      },
    },
  },
  weightBalanceRuns: {
    select: {
      id: true,
      runLabel: true,
      status: true,
      takeoffWeight: true,
      landingWeight: true,
      centerOfGravity: true,
      calculatedAt: true,
      approvedAt: true,
      calculationSnapshot: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  flightLocatingRecord: {
    select: {
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
  dispatchPackage: {
    select: {
      performanceData: true,
      weatherBriefing: {
        select: {
          provider: true,
          briefingAt: true,
          routeSummary: true,
          rawSnapshot: true,
        },
      },
      notamSnapshot: {
        select: {
          capturedAt: true,
          affectedStationCodes: true,
          rawSnapshot: true,
        },
      },
      flightPlanReference: {
        select: {
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

export type ReleaseEvidenceDetail = Prisma.FlightLegGetPayload<{
  select: typeof releaseEvidenceDetailSelect;
}>;

export async function getReleaseEvidenceDetail(
  flightLegId: string,
): Promise<ReleaseEvidenceDetail | null> {
  return prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: releaseEvidenceDetailSelect,
  });
}
