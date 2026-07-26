import {
  AircraftLogbookEntrySource,
  AircraftLogbookEntryStatus,
  AircraftLogbookEntryType,
  AircraftStatus,
  AogResolutionPhase,
  DeferralMethod,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceComplianceStatus,
  MaintenanceControlHoldStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
  MaintenanceProgramApplicabilityScope,
  MaintenanceProgramOverrideAction,
  MaintenanceProgramTaskCategory,
  type AircraftType,
  type Prisma,
} from "@prisma/client";

import {
  evaluateAircraftServiceability,
} from "@/lib/aircraft-serviceability";
import { prisma } from "@/lib/prisma";

export type MaintenanceQueueItemType =
  | "AOG"
  | "DEFERRAL"
  | "PLANNED_MAINTENANCE"
  | "MX_HOLD"
  | "SERVICEABLE";

export type MaintenanceBoardStatus =
  | "AOG"
  | "SERVICEABLE"
  | "SERVICEABLE_MEL"
  | "SERVICEABLE_CDL"
  | "SERVICEABLE_NEF"
  | "SERVICEABLE_OTHER_DEFERRAL"
  | "SERVICEABLE_SCHEDULED_MX";

export type MaintenanceQueueSortFocus =
  | "AOG"
  | "SERVICEABLE"
  | "MEL"
  | "CDL"
  | "NEF";

export type MaintenanceQueueItem = {
  id: string;
  aircraftId: string;
  tailNumber: string;
  aircraftStatus: AircraftStatus;
  aircraftType: AircraftType;
  type: MaintenanceQueueItemType;
  boardStatus: MaintenanceBoardStatus;
  title: string;
  reference: string;
  summary: string | null;
  limitation: string | null;
  eventAt: Date | null;
  dueAt: Date | null;
  aogPhase: AogResolutionPhase | null;
  aogEtaAt: Date | null;
  aogMaintenanceNote: string | null;
  discrepancyId: string | null;
  logbookHref: string;
  airworthinessHref: string;
  aircraftHref: string;
  exportHref: string;
};

export type MaintenanceScheduledItem = {
  id: string;
  rowKind: "COMPLIANCE" | "EVENT";
  aircraftId: string;
  taskId: string | null;
  complianceStateId: string | null;
  tailNumber: string;
  aircraftType: AircraftType;
  aircraftStatus: AircraftStatus;
  taskTitle: string;
  taskCategory: MaintenanceProgramTaskCategory | null;
  sourceReference: string | null;
  requiredForServiceability: boolean;
  requiresIndependentInspection: boolean;
  complianceStatus: MaintenanceComplianceStatus;
  applicabilityLabel: string;
  overrideLabel: string | null;
  lastCompletedAt: Date | null;
  lastCompletedAirframeHours: number | null;
  lastCompletedCycles: number | null;
  nextDueAt: Date | null;
  nextDueAirframeHours: number | null;
  nextDueCycles: number | null;
  latestAirframeHours: number | null;
  latestAirframeCycles: number | null;
  latestMeterAt: Date | null;
  maintenanceEvent: {
    id: string;
    maintenanceNumber: string;
    eventType: MaintenanceEventType;
    status: MaintenanceEventStatus;
    scheduledAt: Date | null;
    startedAt: Date | null;
    providerName: string | null;
  } | null;
  logbookEntry: {
    id: string;
    entryNumber: string;
    status: AircraftLogbookEntryStatus;
    title: string;
  } | null;
  providerName: string | null;
  description: string | null;
  serviceabilityLabel: string;
  serviceabilityMessage: string;
  logbookHref: string;
  airworthinessHref: string;
  aircraftHref: string;
  exportHref: string;
};

export type MaintenanceProgramAffectedAircraft = {
  aircraftId: string;
  aircraftStatus: AircraftStatus;
  aircraftType: AircraftType;
  applicabilityLabel: string;
  complianceStatus: MaintenanceComplianceStatus;
  latestAirframeCycles: number | null;
  latestAirframeHours: number | null;
  nextDueAirframeHours: number | null;
  nextDueAt: Date | null;
  nextDueCycles: number | null;
  overrideLabel: string | null;
  tailNumber: string;
};

export type MaintenanceProgramItem = {
  id: string;
  active: boolean;
  affectedAircraft: MaintenanceProgramAffectedAircraft[];
  applicabilitySummary: string;
  category: MaintenanceProgramTaskCategory;
  description: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  intervalAirframeHours: number | null;
  intervalCycles: number | null;
  intervalDays: number | null;
  intervalMonths: number | null;
  overrideCount: number;
  requiredForServiceability: boolean;
  requiresIndependentInspection: boolean;
  sourceReference: string | null;
  taskKey: string;
  title: string;
  warningAirframeHours: number | null;
  warningCycles: number | null;
  warningDays: number;
  applicabilities: {
    active: boolean;
    aircraftId: string | null;
    aircraftTailNumber: string | null;
    aircraftType: AircraftType | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    id: string;
    scope: MaintenanceProgramApplicabilityScope;
  }[];
  overrides: {
    action: MaintenanceProgramOverrideAction;
    aircraftId: string;
    aircraftTailNumber: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    id: string;
    reason: string;
  }[];
};

export type MaintenanceLogbookItem = {
  id: string;
  aircraftHref: string;
  aircraftId: string;
  aircraftStatus: AircraftStatus;
  aircraftType: AircraftType;
  airworthinessHref: string;
  attachmentCount: number;
  attachments: {
    byteSize: number;
    contentType: string;
    createdAt: Date;
    href: string;
    id: string;
    originalFilename: string | null;
  }[];
  auditEvents: {
    createdAt: Date;
    eventType: string;
    id: string;
    message: string;
  }[];
  category: string | null;
  deferral: {
    deferralMethod: DeferralMethod | null;
    deferralNumber: string;
    dueAt: Date | null;
    id: string;
    status: DeferralStatus;
  } | null;
  discrepancy: {
    discrepancyNumber: string;
    id: string;
    status: DiscrepancyStatus;
    title: string;
  } | null;
  dueAt: Date | null;
  entryHref: string;
  entryNumber: string;
  entryType: AircraftLogbookEntryType;
  exportHref: string;
  lockedAt: Date | null;
  logbookHref: string;
  maintenanceComplianceState: {
    id: string;
    nextDueAt: Date | null;
    status: MaintenanceComplianceStatus;
  } | null;
  maintenanceEvent: {
    eventType: MaintenanceEventType;
    id: string;
    maintenanceNumber: string;
    providerName: string | null;
    scheduledAt: Date | null;
    startedAt: Date | null;
    status: MaintenanceEventStatus;
  } | null;
  maintenanceProgramTask: {
    category: MaintenanceProgramTaskCategory;
    id: string;
    sourceReference: string | null;
    taskKey: string;
    title: string;
  } | null;
  manualReference: string | null;
  narrative: string | null;
  operatingLimitations: string | null;
  placardRequired: boolean;
  reportedAt: Date;
  requiredProcedures: string | null;
  returnToServiceAt: Date | null;
  returnToServiceRecords: {
    id: string;
    returnToServiceAt: Date | null;
    rtsNumber: string;
    signedAt: Date | null;
    status: string;
  }[];
  signatureCount: number;
  signatures: {
    certificateNumber: string | null;
    certificateType: string | null;
    id: string;
    purpose: string;
    signedAt: Date;
    signedContentHash: string;
    signerName: string;
  }[];
  signedContentHash: string | null;
  source: AircraftLogbookEntrySource;
  status: AircraftLogbookEntryStatus;
  tailNumber: string;
  taskReference: string | null;
  title: string;
};

export type MaintenanceAircraftOption = {
  id: string;
  status: AircraftStatus;
  tailNumber: string;
  type: AircraftType;
};

export type MaintenanceWorkbenchData = {
  aircraftOptions: MaintenanceAircraftOption[];
  aircraftTypeOptions: AircraftType[];
  logbookItems: MaintenanceLogbookItem[];
  programItems: MaintenanceProgramItem[];
  queueItems: MaintenanceQueueItem[];
  scheduledItems: MaintenanceScheduledItem[];
  stationOptions: { id: string; code: string; name: string }[];
  tailOptions: string[];
};

type AircraftMaintenancePayload = {
  id: string;
  status: AircraftStatus;
  tailNumber: string;
  type: AircraftType;
  meterSnapshots: {
    airframeCycles: number | null;
    airframeHours: Prisma.Decimal | null;
    recordedAt: Date;
  }[];
  discrepancies: {
    aogEtaAt: Date | null;
    aogMaintenanceNote: string | null;
    aogPhase: AogResolutionPhase | null;
    description: string | null;
    discrepancyNumber: string;
    id: string;
    reportedAt: Date;
    severity: string | null;
    status: DiscrepancyStatus;
    title: string;
  }[];
  deferrals: {
    category: string | null;
    deferralMethod: DeferralMethod | null;
    deferralNumber: string;
    dueAt: Date | null;
    id: string;
    melItemNumber: string | null;
    operatingLimitations: string | null;
    placardRequired: boolean;
    requiredProcedures: string | null;
    status: DeferralStatus;
    discrepancy: {
      aogEtaAt: Date | null;
      aogMaintenanceNote: string | null;
      aogPhase: AogResolutionPhase | null;
      id: string;
      title: string;
    };
  }[];
  maintenanceEvents: {
    description: string | null;
    eventType: MaintenanceEventType;
    id: string;
    maintenanceComplianceStateId: string | null;
    maintenanceNumber: string;
    maintenanceProgramTaskId: string | null;
    providerName: string | null;
    scheduledAt: Date | null;
    startedAt: Date | null;
    returnToServiceAt: Date | null;
    requiresIndependentInspection: boolean;
    maintenanceApprovedAt: Date | null;
    inspectionApprovedAt: Date | null;
    status: MaintenanceEventStatus;
    logbookEntries: {
      entryNumber: string;
      id: string;
      status: AircraftLogbookEntryStatus;
      title: string;
    }[];
    discrepancy: {
      aogEtaAt: Date | null;
      aogMaintenanceNote: string | null;
      aogPhase: AogResolutionPhase | null;
      id: string;
      title: string;
    } | null;
  }[];
  maintenanceControlHolds: {
    expectedReturnAt: Date | null;
    id: string;
    note: string | null;
    placedAt: Date;
    reason: string;
    status: MaintenanceControlHoldStatus;
  }[];
  logbookEntries: {
    entryNumber: string;
    id: string;
    narrative: string | null;
    operatingLimitations: string | null;
    reportedAt: Date | null;
    status: AircraftLogbookEntryStatus;
    title: string;
  }[];
  maintenanceComplianceStates: {
    id: string;
    nextDueAt: Date | null;
    status: MaintenanceComplianceStatus;
    task: {
      requiredForServiceability: boolean;
      title: string;
    };
  }[];
};
type DiscrepancySummary = AircraftMaintenancePayload["discrepancies"][number];
type DeferralSummary = AircraftMaintenancePayload["deferrals"][number];
type MaintenanceEventSummary = AircraftMaintenancePayload["maintenanceEvents"][number];
type MaintenanceProgramTaskPayload = Awaited<ReturnType<typeof getMaintenanceProgramTasks>>[number];

function aircraftRoutes(aircraftId: string) {
  return {
    aircraftHref: `/aircraft?panel=aircraft&selected=${aircraftId}`,
    airworthinessHref: `/aircraft/${aircraftId}/airworthiness`,
    exportHref: `/aircraft/${aircraftId}/logbook/export`,
    logbookHref: `/aircraft/${aircraftId}/logbook`,
  };
}

function itemTime(item: MaintenanceQueueItem) {
  return item.aogEtaAt?.getTime() ?? item.dueAt?.getTime() ?? item.eventAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function statusRank(status: MaintenanceBoardStatus) {
  return {
    AOG: 0,
    SERVICEABLE_MEL: 1,
    SERVICEABLE_CDL: 2,
    SERVICEABLE_NEF: 3,
    SERVICEABLE_OTHER_DEFERRAL: 4,
    SERVICEABLE_SCHEDULED_MX: 5,
    SERVICEABLE: 6,
  }[status];
}

function phaseRank(phase: AogResolutionPhase | null) {
  if (!phase) {
    return 9;
  }

  return {
    [AogResolutionPhase.NEEDS_ASSESSMENT]: 0,
    [AogResolutionPhase.TROUBLESHOOTING]: 1,
    [AogResolutionPhase.AWAITING_PARTS]: 2,
    [AogResolutionPhase.REPAIR_IN_PROGRESS]: 3,
    [AogResolutionPhase.RTS_PENDING]: 4,
  }[phase];
}

function sortQueueItems(a: MaintenanceQueueItem, b: MaintenanceQueueItem) {
  const statusDelta = statusRank(a.boardStatus) - statusRank(b.boardStatus);

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const phaseDelta = phaseRank(a.aogPhase) - phaseRank(b.aogPhase);

  if (phaseDelta !== 0) {
    return phaseDelta;
  }

  const timeDelta = itemTime(a) - itemTime(b);

  if (timeDelta !== 0) {
    return timeDelta;
  }

  return a.tailNumber.localeCompare(b.tailNumber);
}

function decimalToNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(value: Date, months: number) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
}

function activeInWindow(item: { effectiveFrom: Date; effectiveTo: Date | null }, now: Date) {
  return item.effectiveFrom <= now && (!item.effectiveTo || item.effectiveTo >= now);
}

function scheduledItemTime(item: MaintenanceScheduledItem) {
  return item.nextDueAt?.getTime()
    ?? item.maintenanceEvent?.scheduledAt?.getTime()
    ?? item.maintenanceEvent?.startedAt?.getTime()
    ?? Number.MAX_SAFE_INTEGER;
}

function scheduledStatusRank(status: MaintenanceComplianceStatus) {
  return {
    [MaintenanceComplianceStatus.OVERDUE]: 0,
    [MaintenanceComplianceStatus.DUE]: 1,
    [MaintenanceComplianceStatus.NEEDS_BASELINE]: 2,
    [MaintenanceComplianceStatus.DUE_SOON]: 3,
    [MaintenanceComplianceStatus.CURRENT]: 4,
    [MaintenanceComplianceStatus.NOT_APPLICABLE]: 5,
  }[status];
}

function sortScheduledItems(a: MaintenanceScheduledItem, b: MaintenanceScheduledItem) {
  const statusDelta = scheduledStatusRank(a.complianceStatus) - scheduledStatusRank(b.complianceStatus);

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const timeDelta = scheduledItemTime(a) - scheduledItemTime(b);

  if (timeDelta !== 0) {
    return timeDelta;
  }

  if (a.maintenanceEvent?.status !== b.maintenanceEvent?.status) {
    return a.maintenanceEvent?.status === MaintenanceEventStatus.IN_PROGRESS ? -1 : 1;
  }

  return a.tailNumber.localeCompare(b.tailNumber);
}

async function getMaintenanceWorkbenchAircraft() {
  return prisma.aircraft.findMany({
    orderBy: [{ tailNumber: "asc" }],
    select: {
      id: true,
      status: true,
      tailNumber: true,
      type: true,
      meterSnapshots: {
        orderBy: [{ recordedAt: "desc" }],
        select: {
          airframeCycles: true,
          airframeHours: true,
          recordedAt: true,
        },
        take: 1,
      },
      discrepancies: {
        where: {
          status: {
            in: [
              DiscrepancyStatus.OPEN,
              DiscrepancyStatus.DEFERRED,
              DiscrepancyStatus.CORRECTED_PENDING_RTS,
            ],
          },
        },
        orderBy: [{ reportedAt: "desc" }],
        select: {
          aogEtaAt: true,
          aogMaintenanceNote: true,
          aogPhase: true,
          description: true,
          discrepancyNumber: true,
          id: true,
          reportedAt: true,
          severity: true,
          status: true,
          title: true,
        },
      },
      deferrals: {
        where: {
          status: DeferralStatus.ACTIVE,
        },
        orderBy: [{ dueAt: "asc" }],
        select: {
          category: true,
          deferralMethod: true,
          deferralNumber: true,
          dueAt: true,
          id: true,
          melItemNumber: true,
          operatingLimitations: true,
          placardRequired: true,
          requiredProcedures: true,
          status: true,
          discrepancy: {
            select: {
              aogEtaAt: true,
              aogMaintenanceNote: true,
              aogPhase: true,
              id: true,
              title: true,
            },
          },
        },
      },
      maintenanceEvents: {
        where: {
          status: {
            in: [
              MaintenanceEventStatus.PLANNED,
              MaintenanceEventStatus.IN_PROGRESS,
              MaintenanceEventStatus.COMPLETED,
            ],
          },
        },
        orderBy: [{ scheduledAt: "asc" }, { startedAt: "asc" }],
        select: {
          description: true,
          eventType: true,
          id: true,
          logbookEntries: {
            orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
            select: {
              entryNumber: true,
              id: true,
              status: true,
              title: true,
            },
            take: 1,
          },
          maintenanceComplianceStateId: true,
          maintenanceNumber: true,
          maintenanceProgramTaskId: true,
          providerName: true,
          scheduledAt: true,
          startedAt: true,
          returnToServiceAt: true,
          requiresIndependentInspection: true,
          maintenanceApprovedAt: true,
          inspectionApprovedAt: true,
          status: true,
          discrepancy: {
            select: {
              aogEtaAt: true,
              aogMaintenanceNote: true,
              aogPhase: true,
              id: true,
              title: true,
            },
          },
        },
        take: 5,
      },
      maintenanceControlHolds: {
        where: { status: MaintenanceControlHoldStatus.ACTIVE },
        orderBy: { placedAt: "desc" },
        select: {
          expectedReturnAt: true,
          id: true,
          note: true,
          placedAt: true,
          reason: true,
          status: true,
        },
      },
      logbookEntries: {
        where: {
          status: {
            in: [AircraftLogbookEntryStatus.READY_FOR_SIGNATURE],
          },
        },
        orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
        select: {
          entryNumber: true,
          id: true,
          narrative: true,
          operatingLimitations: true,
          reportedAt: true,
          status: true,
          title: true,
        },
        take: 8,
      },
      maintenanceComplianceStates: {
        where: {
          status: MaintenanceComplianceStatus.OVERDUE,
        },
        select: {
          id: true,
          nextDueAt: true,
          status: true,
          task: {
            select: {
              requiredForServiceability: true,
              title: true,
            },
          },
        },
      },
    },
  });
}

async function getMaintenanceProgramTasks() {
  return prisma.maintenanceProgramTask.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      active: true,
      category: true,
      description: true,
      effectiveFrom: true,
      effectiveTo: true,
      id: true,
      intervalAirframeHours: true,
      intervalCycles: true,
      intervalDays: true,
      intervalMonths: true,
      requiredForServiceability: true,
      requiresIndependentInspection: true,
      sourceReference: true,
      taskKey: true,
      title: true,
      warningAirframeHours: true,
      warningCycles: true,
      warningDays: true,
      applicabilities: {
        select: {
          active: true,
          aircraftId: true,
          aircraftType: true,
          aircraft: {
            select: {
              tailNumber: true,
            },
          },
          effectiveFrom: true,
          effectiveTo: true,
          id: true,
          scope: true,
        },
      },
      complianceStates: {
        select: {
          aircraftId: true,
          baselineNotes: true,
          id: true,
          lastCompletedAirframeHours: true,
          lastCompletedAt: true,
          lastCompletedCycles: true,
          manualNextDueAirframeHours: true,
          manualNextDueAt: true,
          manualNextDueCycles: true,
          nextDueAirframeHours: true,
          nextDueAt: true,
          nextDueCycles: true,
          status: true,
          maintenanceEvents: {
            where: {
              OR: [
                { status: { in: [MaintenanceEventStatus.PLANNED, MaintenanceEventStatus.IN_PROGRESS] } },
                { status: MaintenanceEventStatus.COMPLETED, returnToServiceAt: null },
              ],
            },
            orderBy: [{ scheduledAt: "asc" }, { startedAt: "asc" }],
            select: {
              eventType: true,
              id: true,
              logbookEntries: {
                orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
                select: {
                  entryNumber: true,
                  id: true,
                  status: true,
                  title: true,
                },
                take: 1,
              },
              maintenanceNumber: true,
              providerName: true,
              scheduledAt: true,
              startedAt: true,
              status: true,
            },
            take: 1,
          },
        },
      },
      overrides: {
        select: {
          action: true,
          aircraftId: true,
          aircraft: {
            select: {
              tailNumber: true,
            },
          },
          effectiveFrom: true,
          effectiveTo: true,
          id: true,
          reason: true,
        },
        orderBy: [{ effectiveFrom: "desc" }],
      },
    },
  });
}

function isExpired(dueAt: Date | null) {
  return dueAt ? dueAt < new Date() : false;
}

function deferralStatus(deferral: DeferralSummary): MaintenanceBoardStatus {
  if (isExpired(deferral.dueAt)) {
    return "AOG";
  }

  if (deferral.deferralMethod === DeferralMethod.MEL) {
    return "SERVICEABLE_MEL";
  }

  if (deferral.deferralMethod === DeferralMethod.CDL) {
    return "SERVICEABLE_CDL";
  }

  if (deferral.deferralMethod === DeferralMethod.NEF) {
    return "SERVICEABLE_NEF";
  }

  return "SERVICEABLE_OTHER_DEFERRAL";
}

function inferAogPhaseFromDiscrepancy(discrepancy: Pick<DiscrepancySummary, "aogPhase" | "status">) {
  if (discrepancy.aogPhase) {
    return discrepancy.aogPhase;
  }

  if (discrepancy.status === DiscrepancyStatus.CORRECTED_PENDING_RTS) {
    return AogResolutionPhase.RTS_PENDING;
  }

  return AogResolutionPhase.NEEDS_ASSESSMENT;
}

function inferAogPhaseFromMaintenanceEvent(maintenanceEvent: MaintenanceEventSummary) {
  if (maintenanceEvent.discrepancy?.aogPhase) {
    return maintenanceEvent.discrepancy.aogPhase;
  }

  return maintenanceEvent.status === MaintenanceEventStatus.IN_PROGRESS
    ? AogResolutionPhase.REPAIR_IN_PROGRESS
    : null;
}

function deferralTitle(deferral: DeferralSummary) {
  const method = deferral.deferralMethod ?? DeferralMethod.OTHER_APPROVED;
  const methodLabel = {
    [DeferralMethod.MEL]: "MEL",
    [DeferralMethod.CDL]: "CDL",
    [DeferralMethod.NEF]: "NEF",
    [DeferralMethod.COMPANY_APPROVED]: "Company approved",
    [DeferralMethod.OTHER_APPROVED]: "Other approved",
  }[method];
  const itemNumber = deferral.melItemNumber ? ` ${deferral.melItemNumber}` : "";

  return `${methodLabel}${itemNumber}: ${deferral.discrepancy.title}`;
}

function deferralSummary(deferral: DeferralSummary) {
  return deferral.operatingLimitations ?? deferral.requiredProcedures ?? deferral.discrepancy.title;
}

function buildAircraftQueueItems(aircraft: AircraftMaintenancePayload): MaintenanceQueueItem[] {
  const routes = aircraftRoutes(aircraft.id);
  const items: MaintenanceQueueItem[] = [];

  if (aircraft.status === AircraftStatus.OUT_OF_SERVICE) {
    items.push({
      ...routes,
      aircraftId: aircraft.id,
      aircraftStatus: aircraft.status,
      aircraftType: aircraft.type,
      aogEtaAt: null,
      aogMaintenanceNote: null,
      aogPhase: AogResolutionPhase.NEEDS_ASSESSMENT,
      boardStatus: "AOG",
      discrepancyId: null,
      dueAt: null,
      eventAt: null,
      id: `aog-${aircraft.id}`,
      limitation: null,
      reference: aircraft.tailNumber,
      summary: "Aircraft is marked out of service and needs maintenance review.",
      tailNumber: aircraft.tailNumber,
      title: `${aircraft.tailNumber} is AOG`,
      type: "AOG",
    });
  }

  for (const discrepancy of aircraft.discrepancies) {
    if (discrepancy.status === DiscrepancyStatus.DEFERRED) {
      continue;
    }

    items.push({
      ...routes,
      aircraftId: aircraft.id,
      aircraftStatus: aircraft.status,
      aircraftType: aircraft.type,
      aogEtaAt: discrepancy.aogEtaAt,
      aogMaintenanceNote: discrepancy.aogMaintenanceNote,
      aogPhase: inferAogPhaseFromDiscrepancy(discrepancy),
      boardStatus: "AOG",
      discrepancyId: discrepancy.id,
      dueAt: null,
      eventAt: discrepancy.reportedAt,
      id: `writeup-${discrepancy.id}`,
      limitation: null,
      reference: discrepancy.discrepancyNumber,
      summary: discrepancy.description,
      tailNumber: aircraft.tailNumber,
      title: discrepancy.title,
      type: "AOG",
    });
  }

  for (const deferral of aircraft.deferrals) {
    const boardStatus = deferralStatus(deferral);

    items.push({
      ...routes,
      aircraftId: aircraft.id,
      aircraftStatus: aircraft.status,
      aircraftType: aircraft.type,
      aogEtaAt: boardStatus === "AOG" ? deferral.discrepancy.aogEtaAt : null,
      aogMaintenanceNote: boardStatus === "AOG" ? deferral.discrepancy.aogMaintenanceNote : null,
      aogPhase: boardStatus === "AOG"
        ? deferral.discrepancy.aogPhase ?? AogResolutionPhase.NEEDS_ASSESSMENT
        : null,
      boardStatus,
      discrepancyId: boardStatus === "AOG" ? deferral.discrepancy.id : null,
      dueAt: deferral.dueAt,
      eventAt: null,
      id: `deferral-${deferral.id}`,
      limitation: deferral.operatingLimitations,
      reference: deferral.deferralNumber,
      summary: deferralSummary(deferral),
      tailNumber: aircraft.tailNumber,
      title: deferralTitle(deferral),
      type: boardStatus === "AOG" ? "AOG" : "DEFERRAL",
    });
  }

  for (const maintenanceEvent of aircraft.maintenanceEvents) {
    const isInProgress = maintenanceEvent.status === MaintenanceEventStatus.IN_PROGRESS;
    const isPendingRelease =
      maintenanceEvent.status === MaintenanceEventStatus.COMPLETED &&
      !maintenanceEvent.returnToServiceAt;

    items.push({
      ...routes,
      aircraftId: aircraft.id,
      aircraftStatus: aircraft.status,
      aircraftType: aircraft.type,
      aogEtaAt: maintenanceEvent.discrepancy?.aogEtaAt ?? null,
      aogMaintenanceNote: maintenanceEvent.discrepancy?.aogMaintenanceNote ?? null,
      aogPhase: inferAogPhaseFromMaintenanceEvent(maintenanceEvent),
      boardStatus: isInProgress || isPendingRelease ? "AOG" : "SERVICEABLE_SCHEDULED_MX",
      discrepancyId: maintenanceEvent.discrepancy?.id ?? null,
      dueAt: maintenanceEvent.scheduledAt,
      eventAt: maintenanceEvent.startedAt,
      id: `mx-${maintenanceEvent.id}`,
      limitation: null,
      reference: maintenanceEvent.maintenanceNumber,
      summary: maintenanceEvent.description ?? maintenanceEvent.providerName,
      tailNumber: aircraft.tailNumber,
      title: isPendingRelease
        ? "MX release required"
        : isInProgress
          ? "Maintenance in progress"
          : "Planned maintenance",
      type: isInProgress || isPendingRelease ? "AOG" : "PLANNED_MAINTENANCE",
    });
  }

  for (const hold of aircraft.maintenanceControlHolds) {
    items.push({
      ...routes,
      aircraftId: aircraft.id,
      aircraftStatus: aircraft.status,
      aircraftType: aircraft.type,
      aogEtaAt: hold.expectedReturnAt,
      aogMaintenanceNote: hold.note,
      aogPhase: AogResolutionPhase.NEEDS_ASSESSMENT,
      boardStatus: "AOG",
      discrepancyId: null,
      dueAt: hold.expectedReturnAt,
      eventAt: hold.placedAt,
      id: `mx-hold-${hold.id}`,
      limitation: null,
      reference: "MX CONTROL",
      summary: hold.note,
      tailNumber: aircraft.tailNumber,
      title: `MX hold: ${hold.reason}`,
      type: "MX_HOLD",
    });
  }

  for (const entry of aircraft.logbookEntries) {
    items.push({
      ...routes,
      aircraftId: aircraft.id,
      aircraftStatus: aircraft.status,
      aircraftType: aircraft.type,
      aogEtaAt: null,
      aogMaintenanceNote: null,
      aogPhase: AogResolutionPhase.RTS_PENDING,
      boardStatus: "AOG",
      discrepancyId: null,
      dueAt: null,
      eventAt: entry.reportedAt,
      id: `signature-${entry.id}`,
      limitation: entry.operatingLimitations,
      reference: entry.entryNumber,
      summary: entry.narrative,
      tailNumber: aircraft.tailNumber,
      title: entry.title,
      type: "AOG",
    });
  }

  for (const complianceState of aircraft.maintenanceComplianceStates) {
    if (!complianceState.task.requiredForServiceability) {
      continue;
    }

    items.push({
      ...routes,
      aircraftId: aircraft.id,
      aircraftStatus: aircraft.status,
      aircraftType: aircraft.type,
      aogEtaAt: null,
      aogMaintenanceNote: null,
      aogPhase: AogResolutionPhase.NEEDS_ASSESSMENT,
      boardStatus: "AOG",
      discrepancyId: null,
      dueAt: null,
      eventAt: null,
      id: `scheduled-overdue-${complianceState.id}`,
      limitation: null,
      reference: aircraft.tailNumber,
      summary: "Required scheduled maintenance is overdue and must be resolved before the aircraft is serviceable.",
      tailNumber: aircraft.tailNumber,
      title: complianceState.task.title,
      type: "AOG",
    });
  }

  if (items.length === 0) {
    items.push({
      ...routes,
      aircraftId: aircraft.id,
      aircraftStatus: aircraft.status,
      aircraftType: aircraft.type,
      aogEtaAt: null,
      aogMaintenanceNote: null,
      aogPhase: null,
      boardStatus: "SERVICEABLE",
      discrepancyId: null,
      dueAt: null,
      eventAt: null,
      id: `serviceable-${aircraft.id}`,
      limitation: null,
      reference: aircraft.tailNumber,
      summary: "No open maintenance restriction recorded.",
      tailNumber: aircraft.tailNumber,
      title: "Serviceable",
      type: "SERVICEABLE",
    });
  }

  return items;
}

function applicabilityLabel(scope: MaintenanceProgramApplicabilityScope, aircraftType: AircraftType | null) {
  if (scope === MaintenanceProgramApplicabilityScope.ALL_AIRCRAFT) {
    return "All aircraft";
  }

  if (scope === MaintenanceProgramApplicabilityScope.AIRCRAFT_TYPE && aircraftType) {
    return `Type ${aircraftType.replaceAll("_", " ")}`;
  }

  return "Tail-specific";
}

function taskApplicability(task: MaintenanceProgramTaskPayload, aircraft: AircraftMaintenancePayload, now: Date) {
  const override = task.overrides.find(
    (item) => item.aircraftId === aircraft.id && activeInWindow(item, now),
  );

  if (override?.action === MaintenanceProgramOverrideAction.EXCLUDE) {
    return { applies: true, label: "Excluded by tail override", overrideLabel: `Excluded: ${override.reason}` };
  }

  if (override?.action === MaintenanceProgramOverrideAction.DEACTIVATE) {
    return { applies: true, label: "Deactivated by tail override", overrideLabel: `Deactivated: ${override.reason}` };
  }

  if (override?.action === MaintenanceProgramOverrideAction.INCLUDE) {
    return { applies: true, label: "Included by tail override", overrideLabel: `Included: ${override.reason}` };
  }

  const applicability = task.applicabilities.find((item) => {
    if (!item.active) {
      return false;
    }

    if (!activeInWindow(item, now)) {
      return false;
    }

    if (item.scope === MaintenanceProgramApplicabilityScope.ALL_AIRCRAFT) {
      return true;
    }

    if (item.scope === MaintenanceProgramApplicabilityScope.AIRCRAFT_TYPE) {
      return item.aircraftType === aircraft.type;
    }

    return item.aircraftId === aircraft.id;
  });

  if (!applicability) {
    return { applies: false, label: "Not applicable", overrideLabel: null };
  }

  return {
    applies: true,
    label: applicabilityLabel(applicability.scope, applicability.aircraftType),
    overrideLabel: null,
  };
}

function nextDueDate(task: MaintenanceProgramTaskPayload, state: MaintenanceProgramTaskPayload["complianceStates"][number] | null) {
  if (state?.manualNextDueAt) {
    return state.manualNextDueAt;
  }

  if (state?.nextDueAt) {
    return state.nextDueAt;
  }

  if (!state?.lastCompletedAt) {
    return null;
  }

  let dueAt = state.lastCompletedAt;

  if (task.intervalMonths) {
    dueAt = addMonths(dueAt, task.intervalMonths);
  }

  if (task.intervalDays) {
    dueAt = addDays(dueAt, task.intervalDays);
  }

  return dueAt === state.lastCompletedAt ? null : dueAt;
}

function nextDueHours(task: MaintenanceProgramTaskPayload, state: MaintenanceProgramTaskPayload["complianceStates"][number] | null) {
  return decimalToNumber(state?.manualNextDueAirframeHours)
    ?? decimalToNumber(state?.nextDueAirframeHours)
    ?? (
      decimalToNumber(state?.lastCompletedAirframeHours) !== null && decimalToNumber(task.intervalAirframeHours) !== null
        ? decimalToNumber(state?.lastCompletedAirframeHours)! + decimalToNumber(task.intervalAirframeHours)!
        : null
    );
}

function nextDueCycles(task: MaintenanceProgramTaskPayload, state: MaintenanceProgramTaskPayload["complianceStates"][number] | null) {
  return state?.manualNextDueCycles
    ?? state?.nextDueCycles
    ?? (
      state?.lastCompletedCycles !== null && state?.lastCompletedCycles !== undefined && task.intervalCycles
        ? state.lastCompletedCycles + task.intervalCycles
        : null
    );
}

function maxComplianceStatus(statuses: MaintenanceComplianceStatus[]) {
  if (statuses.includes(MaintenanceComplianceStatus.OVERDUE)) {
    return MaintenanceComplianceStatus.OVERDUE;
  }
  if (statuses.includes(MaintenanceComplianceStatus.DUE)) {
    return MaintenanceComplianceStatus.DUE;
  }
  if (statuses.includes(MaintenanceComplianceStatus.NEEDS_BASELINE)) {
    return MaintenanceComplianceStatus.NEEDS_BASELINE;
  }
  if (statuses.includes(MaintenanceComplianceStatus.DUE_SOON)) {
    return MaintenanceComplianceStatus.DUE_SOON;
  }
  return MaintenanceComplianceStatus.CURRENT;
}

function evaluateDueStatus({
  latestCycles,
  latestHours,
  nextCycles,
  nextDueAt,
  nextHours,
  now,
  task,
}: {
  latestCycles: number | null;
  latestHours: number | null;
  nextCycles: number | null;
  nextDueAt: Date | null;
  nextHours: number | null;
  now: Date;
  task: MaintenanceProgramTaskPayload;
}) {
  const statuses: MaintenanceComplianceStatus[] = [];

  if (task.intervalMonths || task.intervalDays || nextDueAt) {
    if (!nextDueAt) {
      statuses.push(MaintenanceComplianceStatus.NEEDS_BASELINE);
    } else if (nextDueAt < now) {
      statuses.push(MaintenanceComplianceStatus.OVERDUE);
    } else if (nextDueAt <= addDays(now, 1)) {
      statuses.push(MaintenanceComplianceStatus.DUE);
    } else if (nextDueAt <= addDays(now, task.warningDays)) {
      statuses.push(MaintenanceComplianceStatus.DUE_SOON);
    } else {
      statuses.push(MaintenanceComplianceStatus.CURRENT);
    }
  }

  if (decimalToNumber(task.intervalAirframeHours) !== null || nextHours !== null) {
    const warningHours = decimalToNumber(task.warningAirframeHours) ?? 25;
    if (nextHours === null || latestHours === null) {
      statuses.push(MaintenanceComplianceStatus.NEEDS_BASELINE);
    } else if (latestHours > nextHours) {
      statuses.push(MaintenanceComplianceStatus.OVERDUE);
    } else if (latestHours >= nextHours) {
      statuses.push(MaintenanceComplianceStatus.DUE);
    } else if (latestHours >= nextHours - warningHours) {
      statuses.push(MaintenanceComplianceStatus.DUE_SOON);
    } else {
      statuses.push(MaintenanceComplianceStatus.CURRENT);
    }
  }

  if (task.intervalCycles || nextCycles !== null) {
    const warningCycles = task.warningCycles ?? 10;
    if (nextCycles === null || latestCycles === null) {
      statuses.push(MaintenanceComplianceStatus.NEEDS_BASELINE);
    } else if (latestCycles > nextCycles) {
      statuses.push(MaintenanceComplianceStatus.OVERDUE);
    } else if (latestCycles >= nextCycles) {
      statuses.push(MaintenanceComplianceStatus.DUE);
    } else if (latestCycles >= nextCycles - warningCycles) {
      statuses.push(MaintenanceComplianceStatus.DUE_SOON);
    } else {
      statuses.push(MaintenanceComplianceStatus.CURRENT);
    }
  }

  return statuses.length > 0 ? maxComplianceStatus(statuses) : MaintenanceComplianceStatus.NEEDS_BASELINE;
}

function buildProgramScheduledItem(
  aircraft: AircraftMaintenancePayload,
  task: MaintenanceProgramTaskPayload,
  now: Date,
): MaintenanceScheduledItem | null {
  if (!task.active || !activeInWindow(task, now)) {
    return null;
  }

  const applicability = taskApplicability(task, aircraft, now);

  if (!applicability.applies) {
    return null;
  }

  const state = task.complianceStates.find((item) => item.aircraftId === aircraft.id) ?? null;
  const latestMeter = aircraft.meterSnapshots[0] ?? null;
  const routes = aircraftRoutes(aircraft.id);
  const serviceability = evaluateAircraftServiceability(aircraft);
  const nextDueAt = nextDueDate(task, state);
  const nextDueAirframeHours = nextDueHours(task, state);
  const computedNextDueCycles = nextDueCycles(task, state);
  const isNotApplicable = applicability.overrideLabel?.startsWith("Excluded") || applicability.overrideLabel?.startsWith("Deactivated");
  const maintenanceEvent = state?.maintenanceEvents[0] ?? null;
  const logbookEntry = maintenanceEvent?.logbookEntries[0] ?? null;

  return {
    ...routes,
    aircraftId: aircraft.id,
    aircraftStatus: aircraft.status,
    aircraftType: aircraft.type,
    applicabilityLabel: applicability.label,
    complianceStateId: state?.id ?? null,
    complianceStatus: isNotApplicable
      ? MaintenanceComplianceStatus.NOT_APPLICABLE
      : evaluateDueStatus({
          latestCycles: latestMeter?.airframeCycles ?? null,
          latestHours: decimalToNumber(latestMeter?.airframeHours),
          nextCycles: computedNextDueCycles,
          nextDueAt,
          nextHours: nextDueAirframeHours,
          now,
          task,
        }),
    description: task.description,
    id: `program-${aircraft.id}-${task.id}`,
    lastCompletedAirframeHours: decimalToNumber(state?.lastCompletedAirframeHours),
    lastCompletedAt: state?.lastCompletedAt ?? null,
    lastCompletedCycles: state?.lastCompletedCycles ?? null,
    latestAirframeCycles: latestMeter?.airframeCycles ?? null,
    latestAirframeHours: decimalToNumber(latestMeter?.airframeHours),
    latestMeterAt: latestMeter?.recordedAt ?? null,
    maintenanceEvent: maintenanceEvent
      ? {
          eventType: maintenanceEvent.eventType,
          id: maintenanceEvent.id,
          maintenanceNumber: maintenanceEvent.maintenanceNumber,
          providerName: maintenanceEvent.providerName,
          scheduledAt: maintenanceEvent.scheduledAt,
          startedAt: maintenanceEvent.startedAt,
          status: maintenanceEvent.status,
        }
      : null,
    logbookEntry: logbookEntry
      ? {
          entryNumber: logbookEntry.entryNumber,
          id: logbookEntry.id,
          status: logbookEntry.status,
          title: logbookEntry.title,
        }
      : null,
    nextDueAirframeHours,
    nextDueAt,
    nextDueCycles: computedNextDueCycles,
    overrideLabel: applicability.overrideLabel,
    providerName: maintenanceEvent?.providerName ?? null,
    requiredForServiceability: task.requiredForServiceability,
    requiresIndependentInspection: task.requiresIndependentInspection,
    rowKind: "COMPLIANCE",
    serviceabilityLabel: serviceability.label,
    serviceabilityMessage: serviceability.message,
    sourceReference: task.sourceReference,
    tailNumber: aircraft.tailNumber,
    taskCategory: task.category,
    taskId: task.id,
    taskTitle: task.title,
  };
}

function buildEventOnlyScheduledItems(aircraft: AircraftMaintenancePayload): MaintenanceScheduledItem[] {
  void aircraft;
  return [];
}

function programApplicabilitySummary(task: MaintenanceProgramTaskPayload) {
  const labels = task.applicabilities
    .filter((item) => item.active)
    .map((item) => {
      if (item.scope === MaintenanceProgramApplicabilityScope.ALL_AIRCRAFT) {
        return "All aircraft";
      }

      if (item.scope === MaintenanceProgramApplicabilityScope.AIRCRAFT_TYPE && item.aircraftType) {
        return `Type ${item.aircraftType.replaceAll("_", " ")}`;
      }

      return item.aircraft?.tailNumber ? `Tail ${item.aircraft.tailNumber}` : "Tail-specific";
    });

  if (labels.length === 0) {
    return "No active applicability";
  }

  return Array.from(new Set(labels)).join(", ");
}

function buildProgramAffectedAircraft(
  aircraft: AircraftMaintenancePayload,
  task: MaintenanceProgramTaskPayload,
  now: Date,
): MaintenanceProgramAffectedAircraft | null {
  if (!task.active || !activeInWindow(task, now)) {
    return null;
  }

  const applicability = taskApplicability(task, aircraft, now);

  if (!applicability.applies) {
    return null;
  }

  const state = task.complianceStates.find((item) => item.aircraftId === aircraft.id) ?? null;
  const latestMeter = aircraft.meterSnapshots[0] ?? null;
  const nextDueAt = nextDueDate(task, state);
  const nextDueAirframeHours = nextDueHours(task, state);
  const computedNextDueCycles = nextDueCycles(task, state);
  const isNotApplicable = applicability.overrideLabel?.startsWith("Excluded") || applicability.overrideLabel?.startsWith("Deactivated");

  return {
    aircraftId: aircraft.id,
    aircraftStatus: aircraft.status,
    aircraftType: aircraft.type,
    applicabilityLabel: applicability.label,
    complianceStatus: isNotApplicable
      ? MaintenanceComplianceStatus.NOT_APPLICABLE
      : evaluateDueStatus({
          latestCycles: latestMeter?.airframeCycles ?? null,
          latestHours: decimalToNumber(latestMeter?.airframeHours),
          nextCycles: computedNextDueCycles,
          nextDueAt,
          nextHours: nextDueAirframeHours,
          now,
          task,
        }),
    latestAirframeCycles: latestMeter?.airframeCycles ?? null,
    latestAirframeHours: decimalToNumber(latestMeter?.airframeHours),
    nextDueAirframeHours,
    nextDueAt,
    nextDueCycles: computedNextDueCycles,
    overrideLabel: applicability.overrideLabel,
    tailNumber: aircraft.tailNumber,
  };
}

function buildProgramItem(
  task: MaintenanceProgramTaskPayload,
  aircraft: AircraftMaintenancePayload[],
  now: Date,
): MaintenanceProgramItem {
  const affectedAircraft = aircraft
    .map((item) => buildProgramAffectedAircraft(item, task, now))
    .filter((item): item is MaintenanceProgramAffectedAircraft => Boolean(item))
    .sort((first, second) => {
      const statusDelta = scheduledStatusRank(first.complianceStatus) - scheduledStatusRank(second.complianceStatus);

      if (statusDelta !== 0) {
        return statusDelta;
      }

      return first.tailNumber.localeCompare(second.tailNumber);
    });

  return {
    active: task.active,
    affectedAircraft,
    applicabilities: task.applicabilities.map((item) => ({
      active: item.active,
      aircraftId: item.aircraftId,
      aircraftTailNumber: item.aircraft?.tailNumber ?? null,
      aircraftType: item.aircraftType,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      id: item.id,
      scope: item.scope,
    })),
    applicabilitySummary: programApplicabilitySummary(task),
    category: task.category,
    description: task.description,
    effectiveFrom: task.effectiveFrom,
    effectiveTo: task.effectiveTo,
    id: task.id,
    intervalAirframeHours: decimalToNumber(task.intervalAirframeHours),
    intervalCycles: task.intervalCycles,
    intervalDays: task.intervalDays,
    intervalMonths: task.intervalMonths,
    overrideCount: task.overrides.filter((item) => activeInWindow(item, now)).length,
    overrides: task.overrides.map((item) => ({
      action: item.action,
      aircraftId: item.aircraftId,
      aircraftTailNumber: item.aircraft.tailNumber,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      id: item.id,
      reason: item.reason,
    })),
    requiredForServiceability: task.requiredForServiceability,
    requiresIndependentInspection: task.requiresIndependentInspection,
    sourceReference: task.sourceReference,
    taskKey: task.taskKey,
    title: task.title,
    warningAirframeHours: decimalToNumber(task.warningAirframeHours),
    warningCycles: task.warningCycles,
    warningDays: task.warningDays,
  };
}

async function getMaintenanceLogbookItems(): Promise<MaintenanceLogbookItem[]> {
  const entries = await prisma.aircraftLogbookEntry.findMany({
    orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
    select: {
      aircraft: {
        select: {
          id: true,
          status: true,
          tailNumber: true,
          type: true,
        },
      },
      aircraftId: true,
      attachments: {
        where: {
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        select: {
          byteSize: true,
          contentType: true,
          createdAt: true,
          id: true,
          originalFilename: true,
        },
      },
      auditEvents: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          createdAt: true,
          eventType: true,
          id: true,
          message: true,
        },
        take: 6,
      },
      category: true,
      deferral: {
        select: {
          deferralMethod: true,
          deferralNumber: true,
          dueAt: true,
          id: true,
          status: true,
        },
      },
      discrepancy: {
        select: {
          discrepancyNumber: true,
          id: true,
          status: true,
          title: true,
        },
      },
      dueAt: true,
      entryNumber: true,
      entryType: true,
      id: true,
      lockedAt: true,
      maintenanceComplianceState: {
        select: {
          id: true,
          nextDueAt: true,
          status: true,
        },
      },
      maintenanceEvent: {
        select: {
          eventType: true,
          id: true,
          maintenanceNumber: true,
          providerName: true,
          scheduledAt: true,
          startedAt: true,
          status: true,
        },
      },
      maintenanceProgramTask: {
        select: {
          category: true,
          id: true,
          sourceReference: true,
          taskKey: true,
          title: true,
        },
      },
      manualReference: true,
      narrative: true,
      operatingLimitations: true,
      placardRequired: true,
      reportedAt: true,
      requiredProcedures: true,
      returnToServiceAt: true,
      returnToServiceRecords: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          returnToServiceAt: true,
          rtsNumber: true,
          signedAt: true,
          status: true,
        },
      },
      signatures: {
        orderBy: [{ signedAt: "desc" }],
        select: {
          certificateNumber: true,
          certificateType: true,
          id: true,
          purpose: true,
          signedAt: true,
          signedContentHash: true,
          signerName: true,
        },
      },
      signedContentHash: true,
      source: true,
      status: true,
      taskReference: true,
      title: true,
    },
    take: 500,
  });

  return entries.map((entry) => {
    const routes = aircraftRoutes(entry.aircraftId);

    return {
      ...routes,
      aircraftId: entry.aircraftId,
      aircraftStatus: entry.aircraft.status,
      aircraftType: entry.aircraft.type,
      attachmentCount: entry.attachments.length,
      attachments: entry.attachments.map((attachment) => ({
        ...attachment,
        href: `/aircraft/${entry.aircraftId}/logbook/attachments/${attachment.id}`,
      })),
      auditEvents: entry.auditEvents.map((event) => ({
        ...event,
        eventType: event.eventType,
      })),
      category: entry.category,
      deferral: entry.deferral,
      discrepancy: entry.discrepancy,
      dueAt: entry.dueAt,
      entryHref: `${routes.logbookHref}#${entry.id}`,
      entryNumber: entry.entryNumber,
      entryType: entry.entryType,
      id: entry.id,
      lockedAt: entry.lockedAt,
      maintenanceComplianceState: entry.maintenanceComplianceState,
      maintenanceEvent: entry.maintenanceEvent,
      maintenanceProgramTask: entry.maintenanceProgramTask,
      manualReference: entry.manualReference,
      narrative: entry.narrative,
      operatingLimitations: entry.operatingLimitations,
      placardRequired: entry.placardRequired,
      reportedAt: entry.reportedAt,
      requiredProcedures: entry.requiredProcedures,
      returnToServiceAt: entry.returnToServiceAt,
      returnToServiceRecords: entry.returnToServiceRecords.map((record) => ({
        ...record,
        status: record.status,
      })),
      signatureCount: entry.signatures.length,
      signatures: entry.signatures.map((signature) => ({
        ...signature,
        purpose: signature.purpose,
      })),
      signedContentHash: entry.signedContentHash,
      source: entry.source,
      status: entry.status,
      tailNumber: entry.aircraft.tailNumber,
      taskReference: entry.taskReference,
      title: entry.title,
    };
  });
}

export async function getMaintenanceWorkbenchData(): Promise<MaintenanceWorkbenchData> {
  const aircraft = await getMaintenanceWorkbenchAircraft();
  const tasks = await getMaintenanceProgramTasks();
  const logbookItems = await getMaintenanceLogbookItems();
  const stationOptions = await prisma.station.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: { code: true, id: true, name: true },
  });
  const now = new Date();
  const queueItems = aircraft.flatMap(buildAircraftQueueItems).sort(sortQueueItems);
  const scheduledItems = [
    ...aircraft.flatMap((item) =>
      tasks
        .map((task) => buildProgramScheduledItem(item, task, now))
        .filter((task): task is MaintenanceScheduledItem => Boolean(task)),
    ),
    ...aircraft.flatMap(buildEventOnlyScheduledItems),
  ].sort(sortScheduledItems);
  const programItems = tasks
    .map((task) => buildProgramItem(task, aircraft, now))
    .sort((first, second) => {
      if (first.active !== second.active) {
        return first.active ? -1 : 1;
      }

      return first.title.localeCompare(second.title);
    });

  return {
    aircraftOptions: aircraft.map((item) => ({
      id: item.id,
      status: item.status,
      tailNumber: item.tailNumber,
      type: item.type,
    })),
    aircraftTypeOptions: Array.from(new Set(aircraft.map((item) => item.type))),
    logbookItems,
    programItems,
    queueItems,
    scheduledItems,
    stationOptions,
    tailOptions: aircraft.map((item) => item.tailNumber),
  };
}
