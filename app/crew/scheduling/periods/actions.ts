"use server";

import {
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  DutyStatus,
  EmploymentStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

class SchedulePeriodWorkflowError extends Error {}
class ScheduleEntryWorkflowError extends Error {}

const editableStatuses = [
  CrewSchedulePeriodStatus.BID_OPEN,
  CrewSchedulePeriodStatus.DRAFTING,
  CrewSchedulePeriodStatus.ARCHIVED,
] as const;

type SchedulePeriodInput = {
  bidCloseAt: Date | null;
  bidOpenAt: Date | null;
  endsAt: Date;
  name: string;
  notes: string | null;
  periodKey: string;
  startsAt: Date;
  status: (typeof editableStatuses)[number];
};

type ScheduleEntryInput = {
  crewMemberId: string;
  date: Date;
  dutyStatus: DutyStatus;
  endsAt: Date | null;
  notes: string | null;
  rotationPatternId: string | null;
  sourceRequestId: string | null;
  startsAt: Date | null;
  stationId: string | null;
};

function getOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getRequiredText(formData: FormData, key: string, label: string): string {
  const value = getOptionalText(formData, key);

  if (!value) {
    throw new SchedulePeriodWorkflowError(`${label} is required.`);
  }

  return value;
}

function parseOptionalDate(formData: FormData, key: string, label: string): Date | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new SchedulePeriodWorkflowError(`${label} must be a valid date.`);
  }

  return parsed;
}

function parseRequiredDate(formData: FormData, key: string, label: string): Date {
  const parsed = parseOptionalDate(formData, key, label);

  if (!parsed) {
    throw new SchedulePeriodWorkflowError(`${label} is required.`);
  }

  return parsed;
}

function parseRequiredEntryDate(formData: FormData, key: string, label: string): Date {
  const value = getRequiredText(formData, key, label);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ScheduleEntryWorkflowError(`${label} must be a valid date.`);
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new ScheduleEntryWorkflowError(`${label} must be a valid date.`);
  }

  return parsed;
}

function parseOptionalDateTime(formData: FormData, key: string, label: string): Date | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ScheduleEntryWorkflowError(`${label} must be a valid date/time.`);
  }

  return parsed;
}

function parseStatus(formData: FormData): SchedulePeriodInput["status"] {
  const value = getRequiredText(formData, "status", "Status");

  if (editableStatuses.includes(value as SchedulePeriodInput["status"])) {
    return value as SchedulePeriodInput["status"];
  }

  throw new SchedulePeriodWorkflowError("Status is not valid for this workflow.");
}

function parseDutyStatus(formData: FormData): DutyStatus {
  const value = getRequiredText(formData, "dutyStatus", "Duty status");

  if (Object.values(DutyStatus).includes(value as DutyStatus)) {
    return value as DutyStatus;
  }

  throw new ScheduleEntryWorkflowError("Duty status is not valid.");
}

function parseSchedulePeriodInput(formData: FormData): SchedulePeriodInput {
  const startsAt = parseRequiredDate(formData, "startsAt", "Start date");
  const endsAt = parseRequiredDate(formData, "endsAt", "End date");
  const bidOpenAt = parseOptionalDate(formData, "bidOpenAt", "Bid open date");
  const bidCloseAt = parseOptionalDate(formData, "bidCloseAt", "Bid close date");

  if (endsAt <= startsAt) {
    throw new SchedulePeriodWorkflowError("End date must be after start date.");
  }

  if (bidOpenAt && bidCloseAt && bidCloseAt <= bidOpenAt) {
    throw new SchedulePeriodWorkflowError("Bid close date must be after bid open date.");
  }

  return {
    bidCloseAt,
    bidOpenAt,
    endsAt,
    name: getRequiredText(formData, "name", "Name"),
    notes: getOptionalText(formData, "notes"),
    periodKey: getRequiredText(formData, "periodKey", "Period key"),
    startsAt,
    status: parseStatus(formData),
  };
}

function encodeError(error: unknown): string {
  if (error instanceof SchedulePeriodWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Schedule period key already exists.");
  }

  return encodeURIComponent("Schedule period workflow failed.");
}

function encodeEntryError(error: unknown): string {
  if (error instanceof ScheduleEntryWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("A schedule entry already exists for that period, crew member, date, and duty status.");
  }

  return encodeURIComponent("Schedule entry workflow failed.");
}

function archivedAtForStatus(status: SchedulePeriodInput["status"]): Date | null {
  return status === CrewSchedulePeriodStatus.ARCHIVED ? new Date() : null;
}

function revalidateSchedulePeriodPaths(periodId?: string) {
  revalidatePath("/crew/scheduling");
  revalidatePath("/crew/scheduling/periods");

  if (periodId) {
    revalidatePath(`/crew/scheduling/periods/${periodId}`);
  }
}

function parseScheduleEntryInput(formData: FormData): ScheduleEntryInput {
  const startsAt = parseOptionalDateTime(formData, "startsAt", "Start time");
  const endsAt = parseOptionalDateTime(formData, "endsAt", "End time");

  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new ScheduleEntryWorkflowError("End time must be after start time.");
  }

  return {
    crewMemberId: getRequiredText(formData, "crewMemberId", "Crew member"),
    date: parseRequiredEntryDate(formData, "date", "Schedule date"),
    dutyStatus: parseDutyStatus(formData),
    endsAt,
    notes: getOptionalText(formData, "notes"),
    rotationPatternId: getOptionalText(formData, "rotationPatternId"),
    sourceRequestId: getOptionalText(formData, "sourceRequestId"),
    startsAt,
    stationId: getOptionalText(formData, "stationId"),
  };
}

async function validateScheduleEntryInput(periodId: string, input: ScheduleEntryInput) {
  const [period, crewMember, station, sourceRequest, rotationPattern] = await Promise.all([
    prisma.crewSchedulePeriod.findUnique({
      where: { id: periodId },
      select: { id: true, startsAt: true, endsAt: true },
    }),
    prisma.crewMember.findUnique({
      where: { id: input.crewMemberId },
      select: { id: true, employmentStatus: true },
    }),
    input.stationId
      ? prisma.station.findUnique({
          where: { id: input.stationId },
          select: { id: true, isActive: true },
        })
      : Promise.resolve(null),
    input.sourceRequestId
      ? prisma.crewScheduleRequest.findUnique({
          where: { id: input.sourceRequestId },
          select: { id: true, periodId: true },
        })
      : Promise.resolve(null),
    input.rotationPatternId
      ? prisma.crewRotationPattern.findUnique({
          where: { id: input.rotationPatternId },
          select: { id: true, isActive: true },
        })
      : Promise.resolve(null),
  ]);

  if (!period) {
    throw new ScheduleEntryWorkflowError("Schedule period was not found.");
  }

  if (input.date < period.startsAt || input.date > period.endsAt) {
    throw new ScheduleEntryWorkflowError("Schedule date must be inside the selected period.");
  }

  if (!crewMember || crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new ScheduleEntryWorkflowError("Crew member must be active.");
  }

  if (input.stationId && (!station || !station.isActive)) {
    throw new ScheduleEntryWorkflowError("Station is not valid.");
  }

  if (input.sourceRequestId && (!sourceRequest || sourceRequest.periodId !== periodId)) {
    throw new ScheduleEntryWorkflowError("Source request must belong to this schedule period.");
  }

  if (input.rotationPatternId && (!rotationPattern || !rotationPattern.isActive)) {
    throw new ScheduleEntryWorkflowError("Rotation pattern must be active.");
  }
}

async function publishSchedulePeriod(tx: Prisma.TransactionClient, periodId: string, userId: string) {
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

export async function createSchedulePeriodAction(formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);
  let periodId: string | undefined;

  try {
    const input = parseSchedulePeriodInput(formData);
    const period = await prisma.crewSchedulePeriod.create({
      data: {
        ...input,
        archivedAt: archivedAtForStatus(input.status),
        createdById: currentUser.id,
      },
      select: { id: true },
    });
    periodId = period.id;
  } catch (error) {
    redirect(`/crew/scheduling/periods?error=${encodeError(error)}`);
  }

  revalidateSchedulePeriodPaths(periodId);
  redirect(periodId ? `/crew/scheduling/periods/${periodId}` : "/crew/scheduling/periods");
}

export async function updateSchedulePeriodAction(periodId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parseSchedulePeriodInput(formData);
    const currentPeriod = await prisma.crewSchedulePeriod.findUnique({
      where: { id: periodId },
      select: { id: true, status: true },
    });

    if (!currentPeriod) {
      throw new SchedulePeriodWorkflowError("Schedule period was not found.");
    }

    if (currentPeriod.status === CrewSchedulePeriodStatus.PUBLISHED) {
      throw new SchedulePeriodWorkflowError("Published schedule periods cannot be edited in this workflow.");
    }

    await prisma.crewSchedulePeriod.update({
      where: { id: periodId },
      data: {
        ...input,
        archivedAt: archivedAtForStatus(input.status),
      },
    });
  } catch (error) {
    redirect(`/crew/scheduling/periods/${periodId}?error=${encodeError(error)}`);
  }

  revalidateSchedulePeriodPaths(periodId);
  redirect(`/crew/scheduling/periods/${periodId}`);
}

export async function publishSchedulePeriodAction(periodId: string) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);
  let affectedCrewMemberIds: string[] = [];

  try {
    affectedCrewMemberIds = await prisma.$transaction((tx) =>
      publishSchedulePeriod(tx, periodId, currentUser.id),
    );
  } catch (error) {
    redirect(`/crew/scheduling/periods/${periodId}?error=${encodeError(error)}#schedule-entries`);
  }

  revalidateSchedulePeriodPaths(periodId);
  for (const crewMemberId of affectedCrewMemberIds) {
    revalidatePath(`/crew/${crewMemberId}`);
  }
  redirect(`/crew/scheduling/periods/${periodId}#schedule-entries`);
}

export async function archiveSchedulePeriodAction(periodId: string) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    await prisma.crewSchedulePeriod.update({
      where: { id: periodId },
      data: {
        archivedAt: new Date(),
        status: CrewSchedulePeriodStatus.ARCHIVED,
      },
    });
  } catch (error) {
    redirect(`/crew/scheduling/periods/${periodId}?error=${encodeError(error)}`);
  }

  revalidateSchedulePeriodPaths(periodId);
  redirect(`/crew/scheduling/periods/${periodId}`);
}

export async function createScheduleEntryAction(periodId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parseScheduleEntryInput(formData);
    await validateScheduleEntryInput(periodId, input);
    await prisma.crewScheduleEntry.create({
      data: {
        ...input,
        periodId,
        status: CrewScheduleEntryStatus.DRAFT,
        createdById: currentUser.id,
      },
    });
  } catch (error) {
    redirect(`/crew/scheduling/periods/${periodId}?error=${encodeEntryError(error)}#schedule-entries`);
  }

  revalidateSchedulePeriodPaths(periodId);
  redirect(`/crew/scheduling/periods/${periodId}#schedule-entries`);
}

export async function updateScheduleEntryAction(
  periodId: string,
  entryId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const [input, currentEntry] = await Promise.all([
      Promise.resolve(parseScheduleEntryInput(formData)),
      prisma.crewScheduleEntry.findUnique({
        where: { id: entryId },
        select: { id: true, periodId: true, status: true },
      }),
    ]);

    if (!currentEntry || currentEntry.periodId !== periodId) {
      throw new ScheduleEntryWorkflowError("Schedule entry was not found.");
    }

    if (currentEntry.status !== CrewScheduleEntryStatus.DRAFT) {
      throw new ScheduleEntryWorkflowError("Only draft schedule entries can be edited.");
    }

    await validateScheduleEntryInput(periodId, input);
    await prisma.crewScheduleEntry.update({
      where: { id: entryId },
      data: input,
    });
  } catch (error) {
    redirect(`/crew/scheduling/periods/${periodId}?error=${encodeEntryError(error)}#schedule-entries`);
  }

  revalidateSchedulePeriodPaths(periodId);
  redirect(`/crew/scheduling/periods/${periodId}#schedule-entries`);
}

export async function cancelScheduleEntryAction(periodId: string, entryId: string) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const currentEntry = await prisma.crewScheduleEntry.findUnique({
      where: { id: entryId },
      select: { id: true, periodId: true, status: true },
    });

    if (!currentEntry || currentEntry.periodId !== periodId) {
      throw new ScheduleEntryWorkflowError("Schedule entry was not found.");
    }

    if (currentEntry.status !== CrewScheduleEntryStatus.DRAFT) {
      throw new ScheduleEntryWorkflowError("Only draft schedule entries can be cancelled.");
    }

    await prisma.crewScheduleEntry.update({
      where: { id: entryId },
      data: { status: CrewScheduleEntryStatus.CANCELLED },
    });
  } catch (error) {
    redirect(`/crew/scheduling/periods/${periodId}?error=${encodeEntryError(error)}#schedule-entries`);
  }

  revalidateSchedulePeriodPaths(periodId);
  redirect(`/crew/scheduling/periods/${periodId}#schedule-entries`);
}
