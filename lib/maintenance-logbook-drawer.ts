import {
  AircraftConfigurationStatus,
  AircraftLogbookEntryStatus,
  AircraftLogbookEntryType,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceComplianceStatus,
  MaintenanceControlHoldStatus,
  MaintenanceEventStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const DEFAULT_LOGBOOK_DRAWER_LIMIT = 50;
export const MAX_LOGBOOK_DRAWER_LIMIT = 250;
export const LOGBOOK_DRAWER_LIMIT_STEP = 50;

export type MaintenanceLogbookDrawerFilters = {
  entryType: AircraftLogbookEntryType | null;
  from: Date | null;
  search: string;
  status: AircraftLogbookEntryStatus | null;
  to: Date | null;
};

export function normalizeLogbookDrawerLimit(value: string | null | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    return DEFAULT_LOGBOOK_DRAWER_LIMIT;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return DEFAULT_LOGBOOK_DRAWER_LIMIT;
  }

  return Math.min(parsed, MAX_LOGBOOK_DRAWER_LIMIT);
}

export function parseLogbookDrawerDate(
  value: string | null | undefined,
  endOfDay = false,
): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return parsed;
}

const timelineEntrySelect = {
  aircraftId: true,
  airworthinessRelease: {
    select: {
      releaseNumber: true,
      status: true,
    },
  },
  createdAt: true,
  deferral: {
    select: {
      deferralMethod: true,
      deferralNumber: true,
    },
  },
  discrepancy: {
    select: {
      discrepancyNumber: true,
      title: true,
    },
  },
  entryNumber: true,
  entryType: true,
  id: true,
  maintenanceEvent: {
    select: {
      eventType: true,
      maintenanceNumber: true,
    },
  },
  maintenanceProgramTask: {
    select: {
      taskKey: true,
      title: true,
    },
  },
  reportedAt: true,
  status: true,
  title: true,
} satisfies Prisma.AircraftLogbookEntrySelect;

const detailEntrySelect = {
  ...timelineEntrySelect,
  attachments: {
    where: { deletedAt: null },
    orderBy: [{ createdAt: "desc" as const }],
    select: {
      byteSize: true,
      contentType: true,
      createdAt: true,
      id: true,
      originalFilename: true,
    },
  },
  auditEvents: {
    orderBy: [{ createdAt: "desc" as const }],
    select: {
      createdAt: true,
      eventType: true,
      id: true,
      message: true,
    },
    take: 12,
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
  performedByName: true,
  placardRequired: true,
  requiredProcedures: true,
  requiresIndependentInspection: true,
  returnToServiceAt: true,
  returnToServiceRecords: {
    orderBy: [{ createdAt: "desc" as const }],
    select: {
      id: true,
      returnToServiceAt: true,
      rtsNumber: true,
      signedAt: true,
      status: true,
    },
  },
  signatures: {
    orderBy: [{ signedAt: "desc" as const }],
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
  taskReference: true,
} satisfies Prisma.AircraftLogbookEntrySelect;

export type MaintenanceLogbookTimelineEntry = Prisma.AircraftLogbookEntryGetPayload<{
  select: typeof timelineEntrySelect;
}>;

export type MaintenanceLogbookDrawerEntryDetail = Prisma.AircraftLogbookEntryGetPayload<{
  select: typeof detailEntrySelect;
}>;

function entryWhere(
  aircraftId: string,
  filters: MaintenanceLogbookDrawerFilters,
): Prisma.AircraftLogbookEntryWhereInput {
  const search = filters.search.trim();

  return {
    aircraftId,
    entryType: filters.entryType ?? undefined,
    reportedAt:
      filters.from || filters.to
        ? {
            gte: filters.from ?? undefined,
            lte: filters.to ?? undefined,
          }
        : undefined,
    status: filters.status ?? undefined,
    OR: search
      ? [
          { entryNumber: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
          { narrative: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
          { manualReference: { contains: search, mode: "insensitive" } },
          { taskReference: { contains: search, mode: "insensitive" } },
          { discrepancy: { is: { discrepancyNumber: { contains: search, mode: "insensitive" } } } },
          { discrepancy: { is: { title: { contains: search, mode: "insensitive" } } } },
          { deferral: { is: { deferralNumber: { contains: search, mode: "insensitive" } } } },
          {
            maintenanceEvent: {
              is: { maintenanceNumber: { contains: search, mode: "insensitive" } },
            },
          },
          {
            maintenanceProgramTask: {
              is: { title: { contains: search, mode: "insensitive" } },
            },
          },
        ]
      : undefined,
  };
}

export async function getMaintenanceLogbookDrawerData({
  aircraftId,
  cursorEntryId,
  filters,
  limit,
  selectedEntryId,
}: {
  aircraftId: string;
  cursorEntryId: string | null;
  filters: MaintenanceLogbookDrawerFilters;
  limit: number;
  selectedEntryId: string | null;
}) {
  const boundedLimit = Math.min(Math.max(limit, 1), MAX_LOGBOOK_DRAWER_LIMIT);
  const baseWhere = entryWhere(aircraftId, filters);
  const cursorEntry = cursorEntryId
    ? await prisma.aircraftLogbookEntry.findFirst({
        select: { createdAt: true, id: true, reportedAt: true },
        where: { AND: [baseWhere, { id: cursorEntryId }] },
      })
    : null;
  const olderThanCursor: Prisma.AircraftLogbookEntryWhereInput | null = cursorEntry
    ? {
        OR: [
          { reportedAt: { lt: cursorEntry.reportedAt } },
          {
            AND: [
              { reportedAt: cursorEntry.reportedAt },
              { createdAt: { lt: cursorEntry.createdAt } },
            ],
          },
          {
            AND: [
              { reportedAt: cursorEntry.reportedAt },
              { createdAt: cursorEntry.createdAt },
              { id: { lt: cursorEntry.id } },
            ],
          },
        ],
      }
    : null;
  const where: Prisma.AircraftLogbookEntryWhereInput = olderThanCursor
    ? { AND: [baseWhere, olderThanCursor] }
    : baseWhere;
  const aircraft = await prisma.aircraft.findUnique({
    where: { id: aircraftId },
    select: {
      configurations: {
        where: { status: AircraftConfigurationStatus.ACTIVE },
        select: { id: true },
        take: 1,
      },
      deferrals: {
        where: { status: DeferralStatus.ACTIVE },
        select: {
          dueAt: true,
          id: true,
          operatingLimitations: true,
          requiredProcedures: true,
          status: true,
          discrepancy: { select: { title: true } },
        },
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
          discrepancyNumber: true,
          id: true,
          status: true,
          title: true,
        },
      },
      homeStation: { select: { code: true } },
      id: true,
      maintenanceComplianceStates: {
        where: {
          status: MaintenanceComplianceStatus.OVERDUE,
          task: { requiredForServiceability: true },
        },
        select: {
          id: true,
          status: true,
          task: { select: { requiredForServiceability: true, title: true } },
        },
      },
      maintenanceControlHolds: {
        where: { status: MaintenanceControlHoldStatus.ACTIVE },
        select: { id: true, reason: true, status: true },
      },
      maintenanceEvents: {
        where: {
          OR: [
            { status: MaintenanceEventStatus.IN_PROGRESS },
            {
              returnToServiceAt: null,
              status: MaintenanceEventStatus.COMPLETED,
            },
          ],
        },
        select: {
          id: true,
          inspectionApprovedAt: true,
          maintenanceApprovedAt: true,
          requiresIndependentInspection: true,
          returnToServiceAt: true,
          status: true,
        },
      },
      name: true,
      status: true,
      tailNumber: true,
      type: true,
    },
  });

  if (!aircraft) {
    return null;
  }

  const newerThanCursor: Prisma.AircraftLogbookEntryWhereInput | null = cursorEntry
    ? {
        OR: [
          { reportedAt: { gt: cursorEntry.reportedAt } },
          {
            AND: [
              { reportedAt: cursorEntry.reportedAt },
              { createdAt: { gt: cursorEntry.createdAt } },
            ],
          },
          {
            AND: [
              { reportedAt: cursorEntry.reportedAt },
              { createdAt: cursorEntry.createdAt },
              { id: { gte: cursorEntry.id } },
            ],
          },
        ],
      }
    : null;
  const [totalCount, filteredCount, newerCount, batch, separatelySelectedEntry] = await Promise.all([
    prisma.aircraftLogbookEntry.count({ where: { aircraftId } }),
    prisma.aircraftLogbookEntry.count({ where: baseWhere }),
    newerThanCursor
      ? prisma.aircraftLogbookEntry.count({ where: { AND: [baseWhere, newerThanCursor] } })
      : Promise.resolve(0),
    prisma.aircraftLogbookEntry.findMany({
      orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: timelineEntrySelect,
      take: boundedLimit + 1,
      where,
    }),
    selectedEntryId
      ? prisma.aircraftLogbookEntry.findFirst({
          select: detailEntrySelect,
          where: { aircraftId, id: selectedEntryId },
        })
      : Promise.resolve(null),
  ]);
  const hasMore = batch.length > boundedLimit;
  const entries = hasMore ? batch.slice(0, boundedLimit) : batch;
  const selectedEntry = selectedEntryId ? separatelySelectedEntry : null;

  return {
    aircraft,
    entries,
    filteredCount,
    hasMore,
    hasNewer: Boolean(cursorEntry),
    limit: boundedLimit,
    nextCursorEntryId: hasMore ? entries.at(-1)?.id ?? null : null,
    selectedEntry,
    selectedEntryInBatch: selectedEntry
      ? entries.some((entry) => entry.id === selectedEntry.id)
      : false,
    selectedEntryWasInvalid: Boolean(selectedEntryId && !separatelySelectedEntry),
    cursorWasInvalid: Boolean(cursorEntryId && !cursorEntry),
    totalCount,
    visibleFrom: entries.length > 0 ? newerCount + 1 : 0,
    visibleTo: newerCount + entries.length,
    eligibleDiscrepancies: aircraft.discrepancies.filter(
      (item) =>
        item.status === DiscrepancyStatus.OPEN ||
        item.status === DiscrepancyStatus.DEFERRED,
    ),
  };
}
