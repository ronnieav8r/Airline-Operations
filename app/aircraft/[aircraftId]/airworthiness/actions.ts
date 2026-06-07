"use server";

import { DiscrepancyStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

class AirworthinessWorkflowError extends Error {}

type DiscrepancyInput = {
  discrepancyNumber: string | null;
  title: string;
  description: string | null;
  severity: string | null;
  status: DiscrepancyStatus;
  correctiveSummary: string | null;
  clearedAt: Date | null;
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
    throw new AirworthinessWorkflowError(`${label} is required.`);
  }

  return value;
}

function parseStatus(formData: FormData): DiscrepancyStatus {
  const value = getOptionalText(formData, "status") ?? DiscrepancyStatus.OPEN;

  if (
    value === DiscrepancyStatus.OPEN ||
    value === DiscrepancyStatus.DEFERRED ||
    value === DiscrepancyStatus.CLEARED ||
    value === DiscrepancyStatus.CANCELLED
  ) {
    return value;
  }

  throw new AirworthinessWorkflowError("Discrepancy status is not valid.");
}

function parseOptionalDateTime(formData: FormData, key: string, label: string): Date | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AirworthinessWorkflowError(`${label} must be a valid date and time.`);
  }

  return parsed;
}

function parseDiscrepancyInput(formData: FormData): DiscrepancyInput {
  const status = parseStatus(formData);
  const enteredClearedAt = parseOptionalDateTime(formData, "clearedAt", "Cleared at");

  return {
    discrepancyNumber: getOptionalText(formData, "discrepancyNumber")?.toUpperCase() ?? null,
    title: getRequiredText(formData, "title", "Title"),
    description: getOptionalText(formData, "description"),
    severity: getOptionalText(formData, "severity")?.toUpperCase() ?? null,
    status,
    correctiveSummary: getOptionalText(formData, "correctiveSummary"),
    clearedAt:
      status === DiscrepancyStatus.CLEARED ? enteredClearedAt ?? new Date() : null,
  };
}

function encodeError(error: unknown): string {
  if (error instanceof AirworthinessWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Discrepancy number must be unique for this aircraft.");
  }

  throw error;
}

async function ensureAircraftExists(tx: Prisma.TransactionClient, aircraftId: string) {
  const aircraft = await tx.aircraft.findUnique({
    where: { id: aircraftId },
    select: {
      id: true,
      tailNumber: true,
    },
  });

  if (!aircraft) {
    throw new AirworthinessWorkflowError("Aircraft was not found.");
  }

  return aircraft;
}

async function ensureDiscrepancyBelongsToAircraft(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  discrepancyId: string,
) {
  const discrepancy = await tx.discrepancy.findFirst({
    where: {
      id: discrepancyId,
      aircraftId,
    },
    select: {
      id: true,
    },
  });

  if (!discrepancy) {
    throw new AirworthinessWorkflowError("Discrepancy was not found for this aircraft.");
  }
}

async function generateDiscrepancyNumber(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `DISC-${tailNumber.replace(/\s+/g, "").toUpperCase()}-${dateKey}`;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(2, "0")}`;
    const existing = await tx.discrepancy.findFirst({
      where: {
        aircraftId,
        discrepancyNumber: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new AirworthinessWorkflowError("Could not generate a discrepancy number.");
}

function revalidateAirworthinessPaths(aircraftId: string) {
  revalidatePath("/aircraft");
  revalidatePath(`/aircraft/${aircraftId}/airworthiness`);
  revalidatePath("/operations-control");
  revalidatePath("/api/health");
}

export async function createDiscrepancyAction(aircraftId: string, formData: FormData) {
  try {
    const input = parseDiscrepancyInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      const discrepancyNumber =
        input.discrepancyNumber ??
        (await generateDiscrepancyNumber(tx, aircraft.id, aircraft.tailNumber));

      await tx.discrepancy.create({
        data: {
          aircraftId,
          discrepancyNumber,
          title: input.title,
          description: input.description,
          severity: input.severity,
          status: input.status,
          correctiveSummary: input.correctiveSummary,
          clearedAt: input.clearedAt,
        },
      });
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function updateDiscrepancyAction(
  aircraftId: string,
  discrepancyId: string,
  formData: FormData,
) {
  try {
    const input = parseDiscrepancyInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      await ensureDiscrepancyBelongsToAircraft(tx, aircraftId, discrepancyId);

      await tx.discrepancy.update({
        where: { id: discrepancyId },
        data: {
          discrepancyNumber:
            input.discrepancyNumber ??
            (await generateDiscrepancyNumber(tx, aircraftId, aircraft.tailNumber)),
          title: input.title,
          description: input.description,
          severity: input.severity,
          status: input.status,
          correctiveSummary: input.correctiveSummary,
          clearedAt: input.clearedAt,
        },
      });
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}
