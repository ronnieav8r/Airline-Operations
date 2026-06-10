"use server";

import { CrewSchedulePeriodStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

class SchedulePeriodWorkflowError extends Error {}

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

function parseStatus(formData: FormData): SchedulePeriodInput["status"] {
  const value = getRequiredText(formData, "status", "Status");

  if (editableStatuses.includes(value as SchedulePeriodInput["status"])) {
    return value as SchedulePeriodInput["status"];
  }

  throw new SchedulePeriodWorkflowError("Status is not valid for this workflow.");
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

export async function createSchedulePeriodAction(formData: FormData) {
  let periodId: string | undefined;

  try {
    const input = parseSchedulePeriodInput(formData);
    const period = await prisma.crewSchedulePeriod.create({
      data: {
        ...input,
        archivedAt: archivedAtForStatus(input.status),
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
  try {
    const input = parseSchedulePeriodInput(formData);
    const currentPeriod = await prisma.crewSchedulePeriod.findUnique({
      where: { id: periodId },
      select: { id: true },
    });

    if (!currentPeriod) {
      throw new SchedulePeriodWorkflowError("Schedule period was not found.");
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

export async function archiveSchedulePeriodAction(periodId: string) {
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
