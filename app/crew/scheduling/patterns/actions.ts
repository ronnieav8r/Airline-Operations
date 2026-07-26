"use server";

import { DutyStatus, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

class RotationPatternWorkflowError extends Error {}

type RotationPatternInput = {
  cycleLengthDays: number;
  description: string | null;
  isActive: boolean;
  name: string;
  notes: string | null;
  patternKey: string;
};

type RotationPatternDayInput = {
  dayNumber: number;
  dutyStatus: DutyStatus;
  endsAtMinutes: number | null;
  notes: string | null;
  startsAtMinutes: number | null;
  stationId: string | null;
};

const editableDutyStatuses = [
  DutyStatus.ON_DUTY,
  DutyStatus.RESERVE,
  DutyStatus.OFF_DUTY,
  DutyStatus.VACATION,
  DutyStatus.SICK,
  DutyStatus.PERSONAL,
  DutyStatus.TRAINING,
  DutyStatus.DEADHEADING,
] as const;

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
    throw new RotationPatternWorkflowError(`${label} is required.`);
  }

  return value;
}

function parsePositiveInt(formData: FormData, key: string, label: string): number {
  const value = Number(getRequiredText(formData, key, label));

  if (!Number.isInteger(value) || value <= 0) {
    throw new RotationPatternWorkflowError(`${label} must be a positive whole number.`);
  }

  return value;
}

function parseBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function parseDutyStatus(formData: FormData): DutyStatus {
  const value = getRequiredText(formData, "dutyStatus", "Duty status");

  if (editableDutyStatuses.includes(value as DutyStatus)) {
    return value as DutyStatus;
  }

  throw new RotationPatternWorkflowError("Duty status is not valid.");
}

function parseOptionalMinutes(formData: FormData, key: string, label: string): number | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    throw new RotationPatternWorkflowError(`${label} must use HH:MM format.`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    throw new RotationPatternWorkflowError(`${label} must be a valid time.`);
  }

  return hours * 60 + minutes;
}

function parsePatternInput(formData: FormData): RotationPatternInput {
  const cycleLengthDays = parsePositiveInt(formData, "cycleLengthDays", "Cycle length");

  return {
    cycleLengthDays,
    description: getOptionalText(formData, "description"),
    isActive: parseBoolean(formData, "isActive"),
    name: getRequiredText(formData, "name", "Name"),
    notes: getOptionalText(formData, "notes"),
    patternKey: getRequiredText(formData, "patternKey", "Pattern key"),
  };
}

function parsePatternDayInput(formData: FormData): RotationPatternDayInput {
  const startsAtMinutes = parseOptionalMinutes(formData, "startsAt", "Start time");
  const endsAtMinutes = parseOptionalMinutes(formData, "endsAt", "End time");

  if (startsAtMinutes !== null && endsAtMinutes !== null && endsAtMinutes <= startsAtMinutes) {
    throw new RotationPatternWorkflowError("End time must be after start time.");
  }

  return {
    dayNumber: parsePositiveInt(formData, "dayNumber", "Day number"),
    dutyStatus: parseDutyStatus(formData),
    endsAtMinutes,
    notes: getOptionalText(formData, "notes"),
    startsAtMinutes,
    stationId: getOptionalText(formData, "stationId"),
  };
}

function encodeError(error: unknown): string {
  if (error instanceof RotationPatternWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Pattern key or day number already exists.");
  }

  return encodeURIComponent("Rotation pattern workflow failed.");
}

async function ensurePatternExists(tx: Prisma.TransactionClient, patternId: string) {
  const pattern = await tx.crewRotationPattern.findUnique({
    where: { id: patternId },
    select: {
      cycleLengthDays: true,
      id: true,
    },
  });

  if (!pattern) {
    throw new RotationPatternWorkflowError("Rotation pattern was not found.");
  }

  return pattern;
}

async function validateDayInput(
  tx: Prisma.TransactionClient,
  patternId: string,
  input: RotationPatternDayInput,
) {
  const pattern = await ensurePatternExists(tx, patternId);

  if (input.dayNumber > pattern.cycleLengthDays) {
    throw new RotationPatternWorkflowError("Day number cannot exceed cycle length.");
  }

  if (input.stationId) {
    const station = await tx.station.findUnique({
      where: { id: input.stationId },
      select: { id: true },
    });

    if (!station) {
      throw new RotationPatternWorkflowError("Station was not found.");
    }
  }
}

function revalidatePatternPaths() {
  revalidatePath("/crew/scheduling");
  revalidatePath("/crew/scheduling/periods");
  revalidatePath("/crew/scheduling/patterns");
}

export async function createRotationPatternAction(formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parsePatternInput(formData);
    await prisma.crewRotationPattern.create({
      data: {
        ...input,
        createdById: currentUser.id,
      },
    });
  } catch (error) {
    redirect(`/crew/scheduling/patterns?error=${encodeError(error)}`);
  }

  revalidatePatternPaths();
  redirect("/crew/scheduling/patterns");
}

export async function updateRotationPatternAction(patternId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parsePatternInput(formData);
    await prisma.crewRotationPattern.update({
      where: { id: patternId },
      data: input,
    });
  } catch (error) {
    redirect(`/crew/scheduling/patterns?error=${encodeError(error)}`);
  }

  revalidatePatternPaths();
  redirect("/crew/scheduling/patterns");
}

export async function toggleRotationPatternActiveAction(patternId: string, isActive: boolean) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    await prisma.crewRotationPattern.update({
      where: { id: patternId },
      data: { isActive },
    });
  } catch (error) {
    redirect(`/crew/scheduling/patterns?error=${encodeError(error)}`);
  }

  revalidatePatternPaths();
  redirect("/crew/scheduling/patterns");
}

export async function createRotationPatternDayAction(patternId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parsePatternDayInput(formData);
    await prisma.$transaction(async (tx) => {
      await validateDayInput(tx, patternId, input);
      await tx.crewRotationPatternDay.create({
        data: {
          ...input,
          patternId,
        },
      });
    });
  } catch (error) {
    redirect(`/crew/scheduling/patterns?error=${encodeError(error)}`);
  }

  revalidatePatternPaths();
  redirect("/crew/scheduling/patterns");
}

export async function updateRotationPatternDayAction(
  patternId: string,
  dayId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parsePatternDayInput(formData);
    await prisma.$transaction(async (tx) => {
      await validateDayInput(tx, patternId, input);
      const day = await tx.crewRotationPatternDay.findUnique({
        where: { id: dayId },
        select: { patternId: true },
      });

      if (!day || day.patternId !== patternId) {
        throw new RotationPatternWorkflowError("Pattern day was not found.");
      }

      await tx.crewRotationPatternDay.update({
        where: { id: dayId },
        data: input,
      });
    });
  } catch (error) {
    redirect(`/crew/scheduling/patterns?error=${encodeError(error)}`);
  }

  revalidatePatternPaths();
  redirect("/crew/scheduling/patterns");
}

export async function deleteRotationPatternDayAction(patternId: string, dayId: string) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const day = await prisma.crewRotationPatternDay.findUnique({
      where: { id: dayId },
      select: { patternId: true },
    });

    if (!day || day.patternId !== patternId) {
      throw new RotationPatternWorkflowError("Pattern day was not found.");
    }

    await prisma.crewRotationPatternDay.delete({ where: { id: dayId } });
  } catch (error) {
    redirect(`/crew/scheduling/patterns?error=${encodeError(error)}`);
  }

  revalidatePatternPaths();
  redirect("/crew/scheduling/patterns");
}
