"use server";

import { DispatchPackageStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

class DispatchPackageWorkflowError extends Error {}

type ManualDispatchInput = {
  weatherProvider: string | null;
  briefingAt: Date;
  routeSummary: string | null;
  weatherNotes: string | null;
  affectedStationCodes: string | null;
  notamNotes: string | null;
  flightPlanProvider: string | null;
  externalReference: string;
  filedAt: Date | null;
  flightPlanStatus: string | null;
  routeText: string | null;
  performanceNotes: string | null;
};

type DispatchCompleteness = {
  affectedStationCodes: string | null;
  externalReference: string | null;
  routeSummary: string | null;
  routeText: string | null;
};

function getOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalDateTime(value: string | null, label: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new DispatchPackageWorkflowError(`${label} must be a valid date and time.`);
  }

  return parsed;
}

function parseManualDispatchInput(flightLegId: string, formData: FormData): ManualDispatchInput {
  return {
    weatherProvider: getOptionalText(formData, "weatherProvider"),
    briefingAt: parseOptionalDateTime(getOptionalText(formData, "briefingAt"), "Briefing time") ?? new Date(),
    routeSummary: getOptionalText(formData, "routeSummary"),
    weatherNotes: getOptionalText(formData, "weatherNotes"),
    affectedStationCodes: getOptionalText(formData, "affectedStationCodes"),
    notamNotes: getOptionalText(formData, "notamNotes"),
    flightPlanProvider: getOptionalText(formData, "flightPlanProvider"),
    externalReference: getOptionalText(formData, "externalReference") ?? `MANUAL-${flightLegId}`,
    filedAt: parseOptionalDateTime(getOptionalText(formData, "filedAt"), "Filed time"),
    flightPlanStatus: getOptionalText(formData, "flightPlanStatus"),
    routeText: getOptionalText(formData, "routeText"),
    performanceNotes: getOptionalText(formData, "performanceNotes"),
  };
}

function encodeError(error: unknown): string {
  if (error instanceof DispatchPackageWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Manual dispatch evidence conflicted with an existing unique record.");
  }

  throw error;
}

async function ensureFlightLegExists(tx: Prisma.TransactionClient, flightLegId: string) {
  const flightLeg = await tx.flightLeg.findUnique({
    where: { id: flightLegId },
    select: { id: true },
  });

  if (!flightLeg) {
    throw new DispatchPackageWorkflowError("FlightLeg was not found.");
  }
}

function weatherRawSnapshot(input: ManualDispatchInput): Prisma.InputJsonObject {
  return {
    method: "manual_v1",
    routeSummary: input.routeSummary ?? "",
    notes: input.weatherNotes ?? "",
    enteredAt: new Date().toISOString(),
  };
}

function notamRawSnapshot(input: ManualDispatchInput): Prisma.InputJsonObject {
  return {
    method: "manual_v1",
    affectedStationCodes: input.affectedStationCodes ?? "",
    notes: input.notamNotes ?? "",
    enteredAt: new Date().toISOString(),
  };
}

function performanceData(input: ManualDispatchInput): Prisma.InputJsonObject {
  return {
    method: "manual_v1",
    notes: input.performanceNotes ?? "",
    updatedAt: new Date().toISOString(),
  };
}

function dispatchCompletenessErrors(dispatch: DispatchCompleteness): string[] {
  const errors: string[] = [];

  if (!dispatch.routeSummary) {
    errors.push("Weather route summary is required before ready.");
  }

  if (!dispatch.affectedStationCodes) {
    errors.push("NOTAM affected station codes are required before ready.");
  }

  if (!dispatch.externalReference) {
    errors.push("Flight-plan external reference is required before ready.");
  }

  if (!dispatch.routeText) {
    errors.push("Flight-plan route text is required before ready.");
  }

  return errors;
}

function inputCompleteness(input: ManualDispatchInput): DispatchCompleteness {
  return {
    affectedStationCodes: input.affectedStationCodes,
    externalReference: input.externalReference,
    routeSummary: input.routeSummary,
    routeText: input.routeText,
  };
}

async function getDispatchPackageForAction(flightLegId: string) {
  const dispatch = await prisma.dispatchPackage.findUnique({
    where: { flightLegId },
    select: {
      id: true,
      status: true,
      weatherBriefing: {
        select: {
          routeSummary: true,
        },
      },
      notamSnapshot: {
        select: {
          affectedStationCodes: true,
        },
      },
      flightPlanReference: {
        select: {
          externalReference: true,
          routeText: true,
        },
      },
    },
  });

  if (!dispatch) {
    throw new DispatchPackageWorkflowError("Dispatch package was not found.");
  }

  return dispatch;
}

function revalidateDispatchPaths(flightLegId: string) {
  revalidatePath("/operations-control");
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}/dispatch`);
  revalidatePath("/api/health");
}

export async function saveManualDispatchPackageAction(flightLegId: string, formData: FormData) {
  try {
    const input = parseManualDispatchInput(flightLegId, formData);
    const weatherSnapshotKey = `manual-weather-${flightLegId}`;
    const notamSnapshotKey = `manual-notam-${flightLegId}`;

    await prisma.$transaction(async (tx) => {
      await ensureFlightLegExists(tx, flightLegId);
      const existingDispatch = await tx.dispatchPackage.findUnique({
        where: { flightLegId },
        select: {
          readyAt: true,
          status: true,
        },
      });
      const savedEvidenceComplete = dispatchCompletenessErrors(inputCompleteness(input)).length === 0;
      const nextStatus =
        existingDispatch?.status === DispatchPackageStatus.READY && savedEvidenceComplete
          ? DispatchPackageStatus.READY
          : DispatchPackageStatus.DRAFT;

      const [weatherBriefing, notamSnapshot, flightPlanReference] = await Promise.all([
        tx.weatherBriefingSnapshot.upsert({
          where: { snapshotKey: weatherSnapshotKey },
          update: {
            provider: input.weatherProvider,
            briefingAt: input.briefingAt,
            routeSummary: input.routeSummary,
            rawSnapshot: weatherRawSnapshot(input),
          },
          create: {
            snapshotKey: weatherSnapshotKey,
            provider: input.weatherProvider,
            briefingAt: input.briefingAt,
            routeSummary: input.routeSummary,
            rawSnapshot: weatherRawSnapshot(input),
          },
          select: { id: true },
        }),
        tx.notamSnapshot.upsert({
          where: { snapshotKey: notamSnapshotKey },
          update: {
            capturedAt: input.briefingAt,
            affectedStationCodes: input.affectedStationCodes,
            rawSnapshot: notamRawSnapshot(input),
          },
          create: {
            snapshotKey: notamSnapshotKey,
            capturedAt: input.briefingAt,
            affectedStationCodes: input.affectedStationCodes,
            rawSnapshot: notamRawSnapshot(input),
          },
          select: { id: true },
        }),
        tx.flightPlanReference.upsert({
          where: {
            flightLegId_externalReference: {
              flightLegId,
              externalReference: input.externalReference,
            },
          },
          update: {
            provider: input.flightPlanProvider,
            filedAt: input.filedAt,
            status: input.flightPlanStatus,
            routeText: input.routeText,
          },
          create: {
            flightLegId,
            provider: input.flightPlanProvider,
            externalReference: input.externalReference,
            filedAt: input.filedAt,
            status: input.flightPlanStatus,
            routeText: input.routeText,
          },
          select: { id: true },
        }),
      ]);

      await tx.dispatchPackage.upsert({
        where: { flightLegId },
        update: {
          weatherBriefingId: weatherBriefing.id,
          notamSnapshotId: notamSnapshot.id,
          flightPlanReferenceId: flightPlanReference.id,
          performanceData: performanceData(input),
          status: nextStatus,
          readyAt:
            nextStatus === DispatchPackageStatus.READY ? existingDispatch?.readyAt ?? new Date() : null,
          reviewedAt: null,
          reviewedById: null,
          voidedAt: null,
        },
        create: {
          flightLegId,
          weatherBriefingId: weatherBriefing.id,
          notamSnapshotId: notamSnapshot.id,
          flightPlanReferenceId: flightPlanReference.id,
          performanceData: performanceData(input),
          status: DispatchPackageStatus.DRAFT,
        },
      });
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/dispatch?error=${encodeError(error)}`);
  }

  revalidateDispatchPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/dispatch`);
}

export async function markDispatchPackageReadyAction(flightLegId: string) {
  try {
    const dispatch = await getDispatchPackageForAction(flightLegId);
    const errors = dispatchCompletenessErrors({
      affectedStationCodes: dispatch.notamSnapshot?.affectedStationCodes ?? null,
      externalReference: dispatch.flightPlanReference?.externalReference ?? null,
      routeSummary: dispatch.weatherBriefing?.routeSummary ?? null,
      routeText: dispatch.flightPlanReference?.routeText ?? null,
    });

    if (errors.length > 0) {
      throw new DispatchPackageWorkflowError(errors.join(" "));
    }

    await prisma.dispatchPackage.update({
      where: { id: dispatch.id },
      data: {
        status: DispatchPackageStatus.READY,
        readyAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        voidedAt: null,
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/dispatch?error=${encodeError(error)}`);
  }

  revalidateDispatchPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/dispatch`);
}

export async function markDispatchPackageReviewedAction(flightLegId: string, formData: FormData) {
  try {
    const dispatch = await getDispatchPackageForAction(flightLegId);

    if (dispatch.status !== DispatchPackageStatus.READY) {
      throw new DispatchPackageWorkflowError("Only READY dispatch packages can be reviewed.");
    }

    await prisma.dispatchPackage.update({
      where: { id: dispatch.id },
      data: {
        status: DispatchPackageStatus.REVIEWED,
        reviewedAt: new Date(),
        reviewedById: null,
        reviewNotes: getOptionalText(formData, "reviewNotes"),
        voidedAt: null,
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/dispatch?error=${encodeError(error)}`);
  }

  revalidateDispatchPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/dispatch`);
}

export async function voidDispatchPackageAction(flightLegId: string) {
  try {
    const dispatch = await getDispatchPackageForAction(flightLegId);

    await prisma.dispatchPackage.update({
      where: { id: dispatch.id },
      data: {
        status: DispatchPackageStatus.VOIDED,
        voidedAt: new Date(),
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/dispatch?error=${encodeError(error)}`);
  }

  revalidateDispatchPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/dispatch`);
}
