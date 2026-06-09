import { CrewScheduleEntryStatus, CrewSchedulePeriodStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const periodListSelect = {
  id: true,
  periodKey: true,
  name: true,
  status: true,
  startsAt: true,
  endsAt: true,
  bidOpenAt: true,
  bidCloseAt: true,
  publishedAt: true,
  archivedAt: true,
  notes: true,
  _count: {
    select: {
      requests: true,
      scheduleEntries: true,
    },
  },
} satisfies Prisma.CrewSchedulePeriodSelect;

const periodDetailSelect = {
  id: true,
  periodKey: true,
  name: true,
  status: true,
  startsAt: true,
  endsAt: true,
  bidOpenAt: true,
  bidCloseAt: true,
  publishedAt: true,
  archivedAt: true,
  notes: true,
  createdBy: {
    select: {
      email: true,
    },
  },
  publishedBy: {
    select: {
      email: true,
    },
  },
  requests: {
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      requestType: true,
      status: true,
      startDate: true,
      endDate: true,
      preferredDutyStatus: true,
      requestNotes: true,
      reviewNotes: true,
      createdAt: true,
      reviewedAt: true,
      crewMember: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
        },
      },
      requestedPattern: {
        select: {
          id: true,
          name: true,
        },
      },
      requestedSwapCrewMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  scheduleEntries: {
    orderBy: [{ date: "asc" }, { crewMember: { lastName: "asc" } }],
    select: {
      id: true,
      status: true,
      date: true,
      dutyStatus: true,
      startsAt: true,
      endsAt: true,
      publishedAt: true,
      notes: true,
      crewMember: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
        },
      },
      station: {
        select: {
          code: true,
          city: true,
        },
      },
      sourceRequest: {
        select: {
          id: true,
          requestType: true,
          status: true,
        },
      },
      rotationPattern: {
        select: {
          id: true,
          name: true,
        },
      },
      generatedCrewSchedule: {
        select: {
          id: true,
        },
      },
    },
  },
} satisfies Prisma.CrewSchedulePeriodSelect;

export type CrewSchedulePeriodListItem = Prisma.CrewSchedulePeriodGetPayload<{
  select: typeof periodListSelect;
}>;

export type CrewSchedulePeriodDetail = Prisma.CrewSchedulePeriodGetPayload<{
  select: typeof periodDetailSelect;
}>;

export type CrewSchedulePeriodAdminData = {
  activePatternCount: number;
  periods: CrewSchedulePeriodListItem[];
  summary: {
    archivedPeriods: number;
    bidOpenPeriods: number;
    draftingPeriods: number;
    publishedPeriods: number;
    totalPeriods: number;
  };
};

export async function getCrewSchedulePeriodAdminData(): Promise<CrewSchedulePeriodAdminData> {
  const [periods, activePatternCount] = await Promise.all([
    prisma.crewSchedulePeriod.findMany({
      orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      select: periodListSelect,
    }),
    prisma.crewRotationPattern.count({ where: { isActive: true } }),
  ]);

  return {
    activePatternCount,
    periods,
    summary: {
      archivedPeriods: periods.filter((period) => period.status === CrewSchedulePeriodStatus.ARCHIVED).length,
      bidOpenPeriods: periods.filter((period) => period.status === CrewSchedulePeriodStatus.BID_OPEN).length,
      draftingPeriods: periods.filter((period) => period.status === CrewSchedulePeriodStatus.DRAFTING).length,
      publishedPeriods: periods.filter((period) => period.status === CrewSchedulePeriodStatus.PUBLISHED).length,
      totalPeriods: periods.length,
    },
  };
}

export async function getCrewSchedulePeriodDetail(
  periodId: string,
): Promise<CrewSchedulePeriodDetail | null> {
  return prisma.crewSchedulePeriod.findUnique({
    where: { id: periodId },
    select: periodDetailSelect,
  });
}

export function countEntriesByStatus(period: CrewSchedulePeriodDetail) {
  return {
    cancelled: period.scheduleEntries.filter((entry) => entry.status === CrewScheduleEntryStatus.CANCELLED).length,
    draft: period.scheduleEntries.filter((entry) => entry.status === CrewScheduleEntryStatus.DRAFT).length,
    published: period.scheduleEntries.filter((entry) => entry.status === CrewScheduleEntryStatus.PUBLISHED).length,
    superseded: period.scheduleEntries.filter((entry) => entry.status === CrewScheduleEntryStatus.SUPERSEDED).length,
  };
}
