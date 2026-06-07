import {
  AircraftCapabilityStatus,
  AircraftConfigurationStatus,
  AirworthinessReleaseStatus,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceEventType,
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
    orderBy: [{ deferredAt: "desc" }],
    select: {
      id: true,
      discrepancyId: true,
      deferralNumber: true,
      status: true,
      category: true,
      deferredAt: true,
      dueAt: true,
      clearedAt: true,
      notes: true,
      discrepancy: {
        select: {
          id: true,
          discrepancyNumber: true,
          title: true,
          status: true,
        },
      },
    },
  },
  maintenanceEvents: {
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      discrepancyId: true,
      maintenanceNumber: true,
      eventType: true,
      status: true,
      scheduledAt: true,
      startedAt: true,
      completedAt: true,
      providerName: true,
      description: true,
      returnToServiceAt: true,
      notes: true,
      discrepancy: {
        select: {
          id: true,
          discrepancyNumber: true,
          title: true,
          status: true,
        },
      },
    },
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

export const editableDeferralStatuses = [
  DeferralStatus.ACTIVE,
  DeferralStatus.CLEARED,
  DeferralStatus.EXPIRED,
  DeferralStatus.CANCELLED,
];

export const editableMaintenanceEventTypes = [
  MaintenanceEventType.INSPECTION,
  MaintenanceEventType.SCHEDULED_MAINTENANCE,
  MaintenanceEventType.UNSCHEDULED_MAINTENANCE,
  MaintenanceEventType.REPAIR,
  MaintenanceEventType.RETURN_TO_SERVICE,
  MaintenanceEventType.OTHER,
];

export const editableMaintenanceEventStatuses = [
  MaintenanceEventStatus.PLANNED,
  MaintenanceEventStatus.IN_PROGRESS,
  MaintenanceEventStatus.COMPLETED,
  MaintenanceEventStatus.CANCELLED,
];
