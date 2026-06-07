import {
  AircraftCapabilityStatus,
  AircraftConfigurationStatus,
  AirworthinessReleaseStatus,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceEventStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const aircraftAirworthinessWorkflowSelect = {
  id: true,
  tailNumber: true,
  name: true,
  type: true,
  status: true,
  seats: true,
  homeStation: {
    select: {
      code: true,
      city: true,
    },
  },
  configurations: {
    where: {
      status: AircraftConfigurationStatus.ACTIVE,
    },
    orderBy: [{ effectiveStart: "desc" }],
    select: {
      id: true,
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
      id: true,
      capabilityCode: true,
      description: true,
      effectiveStart: true,
      effectiveEnd: true,
      status: true,
    },
  },
  discrepancies: {
    orderBy: [{ reportedAt: "desc" }],
    select: {
      id: true,
      discrepancyNumber: true,
      title: true,
      description: true,
      status: true,
      severity: true,
      reportedAt: true,
      clearedAt: true,
      correctiveSummary: true,
      deferrals: {
        orderBy: [{ deferredAt: "desc" }],
        select: {
          id: true,
          deferralNumber: true,
          status: true,
          category: true,
          dueAt: true,
        },
      },
    },
  },
  deferrals: {
    where: {
      status: DeferralStatus.ACTIVE,
    },
    orderBy: [{ dueAt: "asc" }],
    select: {
      id: true,
      deferralNumber: true,
      status: true,
      category: true,
      dueAt: true,
      notes: true,
      discrepancy: {
        select: {
          discrepancyNumber: true,
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
      id: true,
      maintenanceNumber: true,
      eventType: true,
      status: true,
      completedAt: true,
      providerName: true,
      returnToServiceAt: true,
    },
    take: 5,
  },
  airworthinessReleases: {
    where: {
      status: AirworthinessReleaseStatus.RELEASED,
    },
    orderBy: [{ releasedAt: "desc" }],
    select: {
      id: true,
      releaseNumber: true,
      status: true,
      releasedAt: true,
      expiresAt: true,
      releaseNotes: true,
      flightLegId: true,
    },
    take: 3,
  },
} satisfies Prisma.AircraftSelect;

export type AircraftAirworthinessWorkflowData = Prisma.AircraftGetPayload<{
  select: typeof aircraftAirworthinessWorkflowSelect;
}>;

export async function getAircraftAirworthinessWorkflowData(
  aircraftId: string,
): Promise<AircraftAirworthinessWorkflowData | null> {
  return prisma.aircraft.findUnique({
    where: { id: aircraftId },
    select: aircraftAirworthinessWorkflowSelect,
  });
}

export const editableDiscrepancyStatuses = [
  DiscrepancyStatus.OPEN,
  DiscrepancyStatus.DEFERRED,
  DiscrepancyStatus.CLEARED,
  DiscrepancyStatus.CANCELLED,
];
