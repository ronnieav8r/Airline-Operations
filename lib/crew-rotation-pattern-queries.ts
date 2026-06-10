import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const patternAdminSelect = {
  id: true,
  patternKey: true,
  name: true,
  description: true,
  cycleLengthDays: true,
  isActive: true,
  notes: true,
  days: {
    orderBy: { dayNumber: "asc" },
    select: {
      id: true,
      dayNumber: true,
      dutyStatus: true,
      stationId: true,
      startsAtMinutes: true,
      endsAtMinutes: true,
      notes: true,
      station: {
        select: {
          code: true,
          city: true,
        },
      },
    },
  },
  _count: {
    select: {
      requests: true,
      scheduleEntries: true,
    },
  },
} satisfies Prisma.CrewRotationPatternSelect;

export type CrewRotationPatternAdminItem = Prisma.CrewRotationPatternGetPayload<{
  select: typeof patternAdminSelect;
}>;

export type CrewRotationPatternAdminData = {
  activePatterns: number;
  inactivePatterns: number;
  patterns: CrewRotationPatternAdminItem[];
  stationOptions: Array<{
    city: string;
    code: string;
    id: string;
  }>;
};

export async function getCrewRotationPatternAdminData(): Promise<CrewRotationPatternAdminData> {
  const [patterns, stationOptions] = await Promise.all([
    prisma.crewRotationPattern.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: patternAdminSelect,
    }),
    prisma.station.findMany({
      orderBy: { code: "asc" },
      select: {
        city: true,
        code: true,
        id: true,
      },
    }),
  ]);

  return {
    activePatterns: patterns.filter((pattern) => pattern.isActive).length,
    inactivePatterns: patterns.filter((pattern) => !pattern.isActive).length,
    patterns,
    stationOptions,
  };
}
