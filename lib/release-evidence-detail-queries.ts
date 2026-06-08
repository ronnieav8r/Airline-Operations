import {
  AircraftCapabilityStatus,
  AircraftConfigurationStatus,
  AssignmentStatus,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceEventStatus,
  Prisma,
} from "@prisma/client";

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
      id: true,
      name: true,
      code: true,
    },
  },
  operatingAuthority: {
    select: {
      id: true,
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
    where: {
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    select: {
      status: true,
      assignedAt: true,
      aircraft: {
        select: {
          id: true,
          tailNumber: true,
          type: true,
          seats: true,
          configurations: {
            where: {
              status: AircraftConfigurationStatus.ACTIVE,
            },
            orderBy: [{ effectiveStart: "desc" }],
            select: {
              configurationLabel: true,
              passengerSeatCount: true,
              emptyWeight: true,
              emptyWeightCg: true,
              effectiveStart: true,
              effectiveEnd: true,
              status: true,
            },
            take: 1,
          },
          capabilities: {
            where: {
              status: AircraftCapabilityStatus.ACTIVE,
            },
            orderBy: [{ capabilityCode: "asc" }],
            select: {
              capabilityCode: true,
              description: true,
              effectiveEnd: true,
              status: true,
            },
          },
          discrepancies: {
            where: {
              status: { in: [DiscrepancyStatus.OPEN, DiscrepancyStatus.DEFERRED] },
            },
            orderBy: [{ reportedAt: "desc" }],
            select: {
              discrepancyNumber: true,
              title: true,
              severity: true,
              status: true,
              reportedAt: true,
            },
          },
          deferrals: {
            where: {
              status: DeferralStatus.ACTIVE,
            },
            orderBy: [{ dueAt: "asc" }],
            select: {
              deferralNumber: true,
              category: true,
              dueAt: true,
              status: true,
              discrepancy: {
                select: {
                  title: true,
                },
              },
            },
          },
          maintenanceEvents: {
            where: {
              status: MaintenanceEventStatus.COMPLETED,
            },
            orderBy: [{ completedAt: "desc" }],
            select: {
              maintenanceNumber: true,
              eventType: true,
              completedAt: true,
              providerName: true,
              returnToServiceAt: true,
              status: true,
            },
            take: 1,
          },
          airworthinessReleases: {
            orderBy: [{ createdAt: "desc" }],
            select: {
              releaseNumber: true,
              releasedAt: true,
              expiresAt: true,
              releaseNotes: true,
              status: true,
              flightLegId: true,
              updatedAt: true,
            },
            take: 5,
          },
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
          id: true,
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
      positionReports: {
        orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          id: true,
          reportedAt: true,
          positionSummary: true,
          source: true,
        },
      },
    },
  },
  dispatchPackage: {
    select: {
      performanceData: true,
      status: true,
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
  readinessSnapshots: {
    orderBy: {
      evaluatedAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      snapshotStatus: true,
      evaluatedAt: true,
      authorityClass: true,
      summary: true,
      findings: {
        select: {
          id: true,
          severity: true,
          status: true,
          ruleKey: true,
          readinessCategory: true,
          summary: true,
        },
        orderBy: [{ readinessCategory: "asc" }, { ruleKey: "asc" }],
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
