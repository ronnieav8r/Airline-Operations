import {
  AircraftCapabilityStatus,
  AircraftConfigurationStatus,
  AirworthinessReleaseStatus,
  DeferralMethod,
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
      voidedAt: true,
      voidReason: true,
      activeDeferralId: true,
      correctiveMaintenanceEventId: true,
      clearingReturnToServiceRecordId: true,
      correctiveSummary: true,
      deferrals: {
        orderBy: [{ deferredAt: "desc" }],
        select: {
          id: true,
          deferralNumber: true,
          status: true,
          category: true,
          deferralMethod: true,
          melItemNumber: true,
          dueAt: true,
        },
      },
      returnToServiceRecords: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          rtsNumber: true,
          status: true,
          returnToServiceAt: true,
          signedAt: true,
        },
        take: 3,
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
      deferralMethod: true,
      deferredAt: true,
      dueAt: true,
      clearedAt: true,
      melItemNumber: true,
      repairInterval: true,
      authorityType: true,
      placardRequired: true,
      operatingLimitations: true,
      requiredProcedures: true,
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
      workPerformed: true,
      manualReference: true,
      taskReference: true,
      performedByName: true,
      performedByCertificateNumber: true,
      approvedByCertificateNumber: true,
      approvedByCertificateType: true,
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
  returnToServiceRecords: {
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      discrepancyId: true,
      maintenanceEventId: true,
      logbookEntryId: true,
      rtsNumber: true,
      status: true,
      workSummary: true,
      approvalBasis: true,
      returnToServiceAt: true,
      signedAt: true,
      voidedAt: true,
      voidReason: true,
      signer: {
        select: {
          email: true,
        },
      },
      authorityProfile: {
        select: {
          legalName: true,
          certificateNumber: true,
          certificateType: true,
        },
      },
    },
    take: 20,
  },
  airworthinessReleases: {
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      releaseNumber: true,
      status: true,
      releasedAt: true,
      expiresAt: true,
      releaseNotes: true,
      flightLegId: true,
      createdAt: true,
      updatedAt: true,
    },
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
  DiscrepancyStatus.CORRECTED_PENDING_RTS,
  DiscrepancyStatus.CLEARED,
  DiscrepancyStatus.CANCELLED,
];

export const editableDeferralMethods = [
  DeferralMethod.MEL,
  DeferralMethod.CDL,
  DeferralMethod.NEF,
  DeferralMethod.COMPANY_APPROVED,
  DeferralMethod.OTHER_APPROVED,
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

export const editableAirworthinessReleaseStatuses = [
  AirworthinessReleaseStatus.DRAFT,
  AirworthinessReleaseStatus.RELEASED,
  AirworthinessReleaseStatus.VOIDED,
  AirworthinessReleaseStatus.SUPERSEDED,
];
