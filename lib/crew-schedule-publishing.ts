import {
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  EmploymentStatus,
  Prisma,
} from "@prisma/client";

export class SchedulePeriodWorkflowError extends Error {}

export async function publishSchedulePeriod(
  tx: Prisma.TransactionClient,
  periodId: string,
  userId: string,
): Promise<string[]> {
  const now = new Date();
  const period = await tx.crewSchedulePeriod.findUnique({
    where: { id: periodId },
    select: {
      id: true,
      endsAt: true,
      publishedAt: true,
      scheduleEntries: {
        where: {
          status: { in: [CrewScheduleEntryStatus.DRAFT, CrewScheduleEntryStatus.PUBLISHED] },
        },
        orderBy: [{ date: "asc" }],
        select: {
          id: true,
          crewMemberId: true,
          date: true,
          dutyStatus: true,
          endsAt: true,
          generatedCrewScheduleId: true,
          notes: true,
          publishedAt: true,
          startsAt: true,
          stationId: true,
          status: true,
          crewMember: {
            select: {
              employmentStatus: true,
            },
          },
        },
      },
      startsAt: true,
      status: true,
    },
  });

  if (!period) {
    throw new SchedulePeriodWorkflowError("Schedule period was not found.");
  }

  if (period.status === CrewSchedulePeriodStatus.ARCHIVED) {
    throw new SchedulePeriodWorkflowError("Archived schedule periods cannot be published.");
  }

  if (period.scheduleEntries.length === 0) {
    throw new SchedulePeriodWorkflowError("At least one draft or published schedule entry is required.");
  }

  const affectedCrewMemberIds = new Set<string>();

  for (const entry of period.scheduleEntries) {
    if (entry.date < period.startsAt || entry.date > period.endsAt) {
      throw new SchedulePeriodWorkflowError("Schedule entry dates must be inside the period.");
    }

    if (entry.startsAt && entry.endsAt && entry.endsAt <= entry.startsAt) {
      throw new SchedulePeriodWorkflowError("Schedule entry end times must be after start times.");
    }

    if (entry.crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new SchedulePeriodWorkflowError("Only active crew members can be published.");
    }

    const bridgeData = {
      crewMemberId: entry.crewMemberId,
      date: entry.date,
      dutyStatus: entry.dutyStatus,
      endsAt: entry.endsAt,
      notes: entry.notes
        ? `Published from schedule period entry ${entry.id}: ${entry.notes}`
        : `Published from schedule period entry ${entry.id}.`,
      startsAt: entry.startsAt,
      stationId: entry.stationId,
    };
    const bridge = entry.generatedCrewScheduleId
      ? await tx.crewSchedule.update({
          where: { id: entry.generatedCrewScheduleId },
          data: bridgeData,
          select: { id: true },
        })
      : await tx.crewSchedule.create({
          data: bridgeData,
          select: { id: true },
        });

    await tx.crewScheduleEntry.update({
      where: { id: entry.id },
      data: {
        generatedCrewScheduleId: bridge.id,
        publishedAt: entry.publishedAt ?? now,
        publishedById: userId,
        status: CrewScheduleEntryStatus.PUBLISHED,
      },
    });

    affectedCrewMemberIds.add(entry.crewMemberId);
  }

  await tx.crewSchedulePeriod.update({
    where: { id: period.id },
    data: {
      publishedAt: period.publishedAt ?? now,
      publishedById: userId,
      status: CrewSchedulePeriodStatus.PUBLISHED,
    },
  });

  return Array.from(affectedCrewMemberIds);
}
