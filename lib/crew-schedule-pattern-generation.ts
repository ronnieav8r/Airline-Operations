import {
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  EmploymentStatus,
  Prisma,
} from "@prisma/client";

export class ScheduleEntryWorkflowError extends Error {}

export type PatternGenerationInput = {
  crewMemberId: string;
  days: number;
  endDate: Date | null;
  patternId: string;
  sourceRequestId: string | null;
  startDate: Date;
};

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function dateWithMinutes(date: Date, minutes: number | null): Date | null {
  if (minutes === null) {
    return null;
  }

  const next = new Date(date);
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return next;
}

function entryDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function generatePatternDraftEntries(
  tx: Prisma.TransactionClient,
  periodId: string,
  input: PatternGenerationInput,
  userId: string,
): Promise<{ generated: number; skipped: number }> {
  const [period, crewMember, pattern] = await Promise.all([
    tx.crewSchedulePeriod.findUnique({
      where: { id: periodId },
      select: {
        id: true,
        endsAt: true,
        startsAt: true,
        status: true,
      },
    }),
    tx.crewMember.findUnique({
      where: { id: input.crewMemberId },
      select: {
        id: true,
        employmentStatus: true,
      },
    }),
    tx.crewRotationPattern.findUnique({
      where: { id: input.patternId },
      select: {
        id: true,
        cycleLengthDays: true,
        isActive: true,
        days: {
          orderBy: [{ dayNumber: "asc" }],
          select: {
            dayNumber: true,
            dutyStatus: true,
            endsAtMinutes: true,
            startsAtMinutes: true,
            stationId: true,
          },
        },
      },
    }),
  ]);

  if (!period) {
    throw new ScheduleEntryWorkflowError("Schedule period was not found.");
  }

  if (period.status === CrewSchedulePeriodStatus.ARCHIVED) {
    throw new ScheduleEntryWorkflowError("Archived schedule periods cannot generate draft entries.");
  }

  if (period.status === CrewSchedulePeriodStatus.PUBLISHED) {
    throw new ScheduleEntryWorkflowError("Published schedule periods cannot generate new draft entries.");
  }

  if (!crewMember || crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new ScheduleEntryWorkflowError("Crew member must be active.");
  }

  if (!pattern || !pattern.isActive) {
    throw new ScheduleEntryWorkflowError("Rotation pattern must be active.");
  }

  if (pattern.days.length === 0) {
    throw new ScheduleEntryWorkflowError("Rotation pattern has no day rows.");
  }

  const endDate = input.endDate ?? addDays(input.startDate, input.days - 1);

  if (input.startDate < period.startsAt || endDate > period.endsAt) {
    throw new ScheduleEntryWorkflowError("Generated date window must stay inside the schedule period.");
  }

  if (input.sourceRequestId) {
    const sourceRequest = await tx.crewScheduleRequest.findUnique({
      where: { id: input.sourceRequestId },
      select: {
        crewMemberId: true,
        periodId: true,
        requestedPatternId: true,
        status: true,
      },
    });

    if (
      !sourceRequest ||
      sourceRequest.periodId !== periodId ||
      sourceRequest.crewMemberId !== input.crewMemberId
    ) {
      throw new ScheduleEntryWorkflowError("Source request must belong to this period and crew member.");
    }

    if (sourceRequest.status !== CrewScheduleRequestStatus.APPROVED) {
      throw new ScheduleEntryWorkflowError("Source request must be approved before generating draft entries.");
    }

    if (sourceRequest.requestedPatternId && sourceRequest.requestedPatternId !== input.patternId) {
      throw new ScheduleEntryWorkflowError("Selected pattern must match the approved source request.");
    }
  }

  const existingEntries = await tx.crewScheduleEntry.findMany({
    where: {
      periodId,
      crewMemberId: input.crewMemberId,
      date: {
        gte: input.startDate,
        lte: endDate,
      },
    },
    select: {
      date: true,
      dutyStatus: true,
    },
  });
  const existingKeys = new Set(
    existingEntries.map((entry) => `${entryDateKey(entry.date)}:${entry.dutyStatus}`),
  );
  const rows: Prisma.CrewScheduleEntryCreateManyInput[] = [];
  let skipped = 0;

  for (let date = new Date(input.startDate); date <= endDate; date = addDays(date, 1)) {
    const offsetDays = Math.round((date.getTime() - input.startDate.getTime()) / (24 * 60 * 60 * 1000));
    const cycleDay = (offsetDays % pattern.cycleLengthDays) + 1;
    const patternDay = pattern.days.find((day) => day.dayNumber === cycleDay);

    if (!patternDay) {
      continue;
    }

    const duplicateKey = `${entryDateKey(date)}:${patternDay.dutyStatus}`;
    if (existingKeys.has(duplicateKey)) {
      skipped += 1;
      continue;
    }

    rows.push({
      createdById: userId,
      crewMemberId: input.crewMemberId,
      date: new Date(date),
      dutyStatus: patternDay.dutyStatus,
      endsAt: dateWithMinutes(date, patternDay.endsAtMinutes),
      notes: `Generated from rotation pattern ${pattern.id}.`,
      periodId,
      rotationPatternId: pattern.id,
      sourceRequestId: input.sourceRequestId,
      startsAt: dateWithMinutes(date, patternDay.startsAtMinutes),
      stationId: patternDay.stationId,
      status: CrewScheduleEntryStatus.DRAFT,
    });
    existingKeys.add(duplicateKey);
  }

  if (rows.length > 0) {
    await tx.crewScheduleEntry.createMany({ data: rows });
  }

  return {
    generated: rows.length,
    skipped,
  };
}
