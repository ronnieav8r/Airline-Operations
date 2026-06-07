"use server";

import { Prisma, WeightBalanceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

class WeightBalanceWorkflowError extends Error {}

type WeightBalanceRunInput = {
  runLabel: string;
  takeoffWeight: string | null;
  landingWeight: string | null;
  centerOfGravity: string | null;
  notes: string | null;
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
    throw new WeightBalanceWorkflowError(`${label} is required.`);
  }

  return value;
}

function parseDecimalString(value: string | null, label: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new WeightBalanceWorkflowError(`${label} must be a non-negative number.`);
  }

  return parsed.toFixed(2);
}

function parseWeightBalanceInput(formData: FormData): WeightBalanceRunInput {
  return {
    runLabel: getRequiredText(formData, "runLabel", "Run label"),
    takeoffWeight: parseDecimalString(getOptionalText(formData, "takeoffWeight"), "Takeoff weight"),
    landingWeight: parseDecimalString(getOptionalText(formData, "landingWeight"), "Landing weight"),
    centerOfGravity: getOptionalText(formData, "centerOfGravity"),
    notes: getOptionalText(formData, "notes"),
  };
}

function encodeError(error: unknown): string {
  if (error instanceof WeightBalanceWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Run label must be unique for this FlightLeg.");
  }

  throw error;
}

async function getFlightLegManifestContext(flightLegId: string) {
  const flightLeg = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: {
      id: true,
      manifest: {
        select: {
          id: true,
          items: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!flightLeg) {
    throw new WeightBalanceWorkflowError("FlightLeg was not found.");
  }

  return {
    manifestId: flightLeg.manifest?.id ?? null,
    manifestItemCount: flightLeg.manifest?.items.length ?? 0,
  };
}

async function ensureRunBelongsToFlightLeg(flightLegId: string, runId: string) {
  const run = await prisma.weightBalanceRun.findFirst({
    where: {
      id: runId,
      flightLegId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!run) {
    throw new WeightBalanceWorkflowError("Weight-and-balance run was not found.");
  }

  if (run.status === WeightBalanceStatus.APPROVED) {
    throw new WeightBalanceWorkflowError("Approved W&B runs cannot be edited in this workflow.");
  }

  return run;
}

function buildCalculationSnapshot(
  input: WeightBalanceRunInput,
  manifestItemCount: number,
): Prisma.InputJsonObject {
  return {
    method: "manual_v1",
    notes: input.notes,
    manifestItemCount,
    enteredAt: new Date().toISOString(),
  };
}

function revalidateWeightBalancePaths(flightLegId: string) {
  revalidatePath("/operations-control");
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}/weight-balance`);
  revalidatePath("/api/health");
}

export async function addWeightBalanceRunAction(flightLegId: string, formData: FormData) {
  try {
    const input = parseWeightBalanceInput(formData);
    const context = await getFlightLegManifestContext(flightLegId);

    await prisma.weightBalanceRun.create({
      data: {
        flightLegId,
        manifestId: context.manifestId,
        runLabel: input.runLabel,
        status: WeightBalanceStatus.DRAFT,
        takeoffWeight: input.takeoffWeight,
        landingWeight: input.landingWeight,
        centerOfGravity: input.centerOfGravity,
        calculationSnapshot: buildCalculationSnapshot(input, context.manifestItemCount),
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/weight-balance?error=${encodeError(error)}`);
  }

  revalidateWeightBalancePaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/weight-balance`);
}

export async function updateWeightBalanceRunAction(
  flightLegId: string,
  runId: string,
  formData: FormData,
) {
  try {
    const input = parseWeightBalanceInput(formData);
    const [context] = await Promise.all([
      getFlightLegManifestContext(flightLegId),
      ensureRunBelongsToFlightLeg(flightLegId, runId),
    ]);

    await prisma.weightBalanceRun.update({
      where: { id: runId },
      data: {
        manifestId: context.manifestId,
        runLabel: input.runLabel,
        status: WeightBalanceStatus.DRAFT,
        takeoffWeight: input.takeoffWeight,
        landingWeight: input.landingWeight,
        centerOfGravity: input.centerOfGravity,
        calculatedAt: null,
        calculationSnapshot: buildCalculationSnapshot(input, context.manifestItemCount),
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/weight-balance?error=${encodeError(error)}`);
  }

  revalidateWeightBalancePaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/weight-balance`);
}

export async function markWeightBalanceCalculatedAction(flightLegId: string, runId: string) {
  try {
    await ensureRunBelongsToFlightLeg(flightLegId, runId);

    await prisma.weightBalanceRun.update({
      where: { id: runId },
      data: {
        status: WeightBalanceStatus.CALCULATED,
        calculatedAt: new Date(),
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/weight-balance?error=${encodeError(error)}`);
  }

  revalidateWeightBalancePaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/weight-balance`);
}

export async function voidWeightBalanceRunAction(flightLegId: string, runId: string) {
  try {
    await ensureRunBelongsToFlightLeg(flightLegId, runId);

    await prisma.weightBalanceRun.update({
      where: { id: runId },
      data: {
        status: WeightBalanceStatus.VOIDED,
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/weight-balance?error=${encodeError(error)}`);
  }

  revalidateWeightBalancePaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/weight-balance`);
}
