"use server";

import {
  AirworthinessReleaseStatus,
  DeferralMethod,
  DeferralStatus,
  DiscrepancyStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

class AirworthinessWorkflowError extends Error {}

type DiscrepancyInput = {
  discrepancyNumber: string | null;
  title: string;
  description: string | null;
  severity: string | null;
  correctiveSummary: string | null;
};

type DeferralInput = {
  discrepancyId: string | null;
  deferralNumber: string | null;
  deferralMethod: DeferralMethod;
  category: string | null;
  status: DeferralStatus;
  dueAt: Date | null;
  clearedAt: Date | null;
  melItemNumber: string | null;
  repairInterval: string | null;
  authorityType: string | null;
  placardRequired: boolean;
  operatingLimitations: string | null;
  requiredProcedures: string | null;
  notes: string | null;
};

type AirworthinessReleaseInput = {
  releaseNumber: string | null;
  status: AirworthinessReleaseStatus;
  releasedAt: Date | null;
  expiresAt: Date | null;
  releaseNotes: string | null;
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

function parseDeferralStatus(formData: FormData): DeferralStatus {
  const value = getOptionalText(formData, "status") ?? DeferralStatus.ACTIVE;

  if (
    value === DeferralStatus.ACTIVE ||
    value === DeferralStatus.CLEARED ||
    value === DeferralStatus.EXPIRED ||
    value === DeferralStatus.CANCELLED
  ) {
    return value;
  }

  throw new AirworthinessWorkflowError("Deferral status is not valid.");
}

function parseDeferralMethod(formData: FormData): DeferralMethod {
  const value = getOptionalText(formData, "deferralMethod") ?? DeferralMethod.MEL;

  if (
    value === DeferralMethod.MEL ||
    value === DeferralMethod.CDL ||
    value === DeferralMethod.NEF ||
    value === DeferralMethod.COMPANY_APPROVED ||
    value === DeferralMethod.OTHER_APPROVED
  ) {
    return value;
  }

  throw new AirworthinessWorkflowError("Deferral method is not valid.");
}

function parseAirworthinessReleaseStatus(formData: FormData): AirworthinessReleaseStatus {
  const value = getOptionalText(formData, "status") ?? AirworthinessReleaseStatus.DRAFT;

  if (
    value === AirworthinessReleaseStatus.DRAFT ||
    value === AirworthinessReleaseStatus.RELEASED ||
    value === AirworthinessReleaseStatus.VOIDED ||
    value === AirworthinessReleaseStatus.SUPERSEDED
  ) {
    return value;
  }

  throw new AirworthinessWorkflowError("Airworthiness release status is not valid.");
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
  return {
    discrepancyNumber: getOptionalText(formData, "discrepancyNumber")?.toUpperCase() ?? null,
    title: getRequiredText(formData, "title", "Title"),
    description: getOptionalText(formData, "description"),
    severity: getOptionalText(formData, "severity")?.toUpperCase() ?? null,
    correctiveSummary: getOptionalText(formData, "correctiveSummary"),
  };
}

function parseDeferralInput(formData: FormData, requireDiscrepancy: boolean): DeferralInput {
  const status = parseDeferralStatus(formData);
  const discrepancyId = getOptionalText(formData, "discrepancyId");

  if (requireDiscrepancy && !discrepancyId) {
    throw new AirworthinessWorkflowError("Discrepancy is required.");
  }

  return {
    discrepancyId,
    deferralNumber: getOptionalText(formData, "deferralNumber")?.toUpperCase() ?? null,
    deferralMethod: parseDeferralMethod(formData),
    category: getOptionalText(formData, "category")?.toUpperCase() ?? null,
    status,
    dueAt: parseOptionalDateTime(formData, "dueAt", "Due at"),
    clearedAt:
      status === DeferralStatus.CLEARED
        ? parseOptionalDateTime(formData, "clearedAt", "Cleared at") ?? new Date()
        : null,
    melItemNumber: getOptionalText(formData, "melItemNumber")?.toUpperCase() ?? null,
    repairInterval: getOptionalText(formData, "repairInterval"),
    authorityType: getOptionalText(formData, "authorityType"),
    placardRequired: formData.get("placardRequired") === "on",
    operatingLimitations: getOptionalText(formData, "operatingLimitations"),
    requiredProcedures: getOptionalText(formData, "requiredProcedures"),
    notes: getOptionalText(formData, "notes"),
  };
}

function parseAirworthinessReleaseInput(formData: FormData): AirworthinessReleaseInput {
  const status = parseAirworthinessReleaseStatus(formData);
  const enteredReleasedAt = parseOptionalDateTime(formData, "releasedAt", "Released at");

  return {
    releaseNumber: getOptionalText(formData, "releaseNumber")?.toUpperCase() ?? null,
    status,
    releasedAt:
      status === AirworthinessReleaseStatus.RELEASED
        ? enteredReleasedAt ?? new Date()
        : enteredReleasedAt,
    expiresAt: parseOptionalDateTime(formData, "expiresAt", "Expires at"),
    releaseNotes: getOptionalText(formData, "releaseNotes"),
  };
}

function encodeError(error: unknown): string {
  if (error instanceof AirworthinessWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Number must be unique for this aircraft.");
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
      status: true,
    },
  });

  if (!discrepancy) {
    throw new AirworthinessWorkflowError("Discrepancy was not found for this aircraft.");
  }
  return discrepancy;
}

async function ensureDeferralBelongsToAircraft(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  deferralId: string,
) {
  const deferral = await tx.deferral.findFirst({
    where: {
      id: deferralId,
      aircraftId,
    },
    select: {
      id: true,
      discrepancyId: true,
    },
  });

  if (!deferral) {
    throw new AirworthinessWorkflowError("Deferral was not found for this aircraft.");
  }

  return deferral;
}

async function ensureAirworthinessReleaseBelongsToAircraft(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  airworthinessReleaseId: string,
) {
  const release = await tx.airworthinessRelease.findFirst({
    where: {
      id: airworthinessReleaseId,
      aircraftId,
    },
    select: {
      id: true,
    },
  });

  if (!release) {
    throw new AirworthinessWorkflowError(
      "Airworthiness release was not found for this aircraft.",
    );
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

async function generateDeferralNumber(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `DEF-${tailNumber.replace(/\s+/g, "").toUpperCase()}-${dateKey}`;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(2, "0")}`;
    const existing = await tx.deferral.findFirst({
      where: {
        aircraftId,
        deferralNumber: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new AirworthinessWorkflowError("Could not generate a deferral number.");
}

async function generateAirworthinessReleaseNumber(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `AWR-${tailNumber.replace(/\s+/g, "").toUpperCase()}-${dateKey}`;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(2, "0")}`;
    const existing = await tx.airworthinessRelease.findFirst({
      where: {
        aircraftId,
        releaseNumber: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new AirworthinessWorkflowError("Could not generate an airworthiness release number.");
}

async function supersedePriorReleasedAirworthinessReleases(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  currentReleaseId: string,
) {
  await tx.airworthinessRelease.updateMany({
    where: {
      aircraftId,
      status: AirworthinessReleaseStatus.RELEASED,
      id: {
        not: currentReleaseId,
      },
    },
    data: {
      status: AirworthinessReleaseStatus.SUPERSEDED,
    },
  });
}

function revalidateAirworthinessPaths(aircraftId: string) {
  revalidatePath("/aircraft");
  revalidatePath(`/aircraft/${aircraftId}/airworthiness`);
  revalidatePath("/operations-control");
  revalidatePath("/api/health");
}

export async function createDiscrepancyAction(aircraftId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

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
          status: DiscrepancyStatus.OPEN,
          correctiveSummary: input.correctiveSummary,
          clearedAt: null,
          reportedById: currentUser.id,
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
  await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

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
          correctiveSummary: input.correctiveSummary,
        },
      });
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function createDeferralAction(aircraftId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  try {
    const input = parseDeferralInput(formData, true);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      const discrepancy = await ensureDiscrepancyBelongsToAircraft(
        tx,
        aircraftId,
        input.discrepancyId!,
      );

      if (
        discrepancy.status !== DiscrepancyStatus.OPEN &&
        discrepancy.status !== DiscrepancyStatus.DEFERRED
      ) {
        throw new AirworthinessWorkflowError(
          "Deferrals can only be created from OPEN or DEFERRED discrepancies.",
        );
      }

      const deferralNumber =
        input.deferralNumber ??
        (await generateDeferralNumber(tx, aircraft.id, aircraft.tailNumber));

      const deferral = await tx.deferral.create({
        data: {
          aircraftId,
          discrepancyId: discrepancy.id,
          deferralNumber,
          category: input.category,
          deferralMethod: input.deferralMethod,
          deferralType: input.deferralMethod,
          authorityType: input.authorityType,
          melItemNumber: input.melItemNumber,
          repairInterval: input.repairInterval,
          placardRequired: input.placardRequired,
          operatingLimitations: input.operatingLimitations,
          requiredProcedures: input.requiredProcedures,
          status: input.status,
          dueAt: input.dueAt,
          clearedAt: input.clearedAt,
          notes: input.notes,
          authorizedById: currentUser.id,
        },
        select: {
          id: true,
        },
      });

      if (input.status === DeferralStatus.ACTIVE) {
        await tx.discrepancy.update({
          where: { id: discrepancy.id },
          data: {
            activeDeferralId: deferral.id,
            status: DiscrepancyStatus.DEFERRED,
            clearedAt: null,
          },
        });
      }
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function updateDeferralAction(
  aircraftId: string,
  deferralId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  try {
    const input = parseDeferralInput(formData, false);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      const deferral = await ensureDeferralBelongsToAircraft(tx, aircraftId, deferralId);
      const deferralNumber =
        input.deferralNumber ??
        (await generateDeferralNumber(tx, aircraft.id, aircraft.tailNumber));

      await tx.deferral.update({
        where: { id: deferral.id },
        data: {
          deferralNumber,
          category: input.category,
          deferralMethod: input.deferralMethod,
          deferralType: input.deferralMethod,
          authorityType: input.authorityType,
          melItemNumber: input.melItemNumber,
          repairInterval: input.repairInterval,
          placardRequired: input.placardRequired,
          operatingLimitations: input.operatingLimitations,
          requiredProcedures: input.requiredProcedures,
          status: input.status,
          dueAt: input.dueAt,
          clearedAt: input.clearedAt,
          notes: input.notes,
        },
      });

      if (input.status === DeferralStatus.ACTIVE) {
        await tx.discrepancy.update({
          where: { id: deferral.discrepancyId },
          data: {
            activeDeferralId: deferral.id,
            status: DiscrepancyStatus.DEFERRED,
            clearedAt: null,
          },
        });
      }

      if (input.status !== DeferralStatus.ACTIVE) {
        await tx.discrepancy.updateMany({
          where: {
            id: deferral.discrepancyId,
            status: DiscrepancyStatus.DEFERRED,
          },
          data: {
            activeDeferralId: null,
            status: DiscrepancyStatus.OPEN,
          },
        });
      }
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function voidDiscrepancyAction(
  aircraftId: string,
  discrepancyId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);

  try {
    const voidReason = getRequiredText(formData, "voidReason", "Void reason");

    await prisma.$transaction(async (tx) => {
      await ensureAircraftExists(tx, aircraftId);
      await ensureDiscrepancyBelongsToAircraft(tx, aircraftId, discrepancyId);

      await tx.discrepancy.update({
        where: { id: discrepancyId },
        data: {
          activeDeferralId: null,
          status: DiscrepancyStatus.CANCELLED,
          voidReason,
          voidedAt: new Date(),
          voidedById: currentUser.id,
        },
      });
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function createAirworthinessReleaseAction(
  aircraftId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.MAINTENANCE]);

  try {
    const input = parseAirworthinessReleaseInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      const releaseNumber =
        input.releaseNumber ??
        (await generateAirworthinessReleaseNumber(tx, aircraft.id, aircraft.tailNumber));

      const release = await tx.airworthinessRelease.create({
        data: {
          aircraftId,
          releaseNumber,
          status: input.status,
          releasedAt: input.releasedAt,
          expiresAt: input.expiresAt,
          releaseNotes: input.releaseNotes,
          releasedById:
            input.status === AirworthinessReleaseStatus.RELEASED ? currentUser.id : null,
        },
        select: {
          id: true,
        },
      });

      if (input.status === AirworthinessReleaseStatus.RELEASED) {
        await supersedePriorReleasedAirworthinessReleases(tx, aircraftId, release.id);
      }
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function updateAirworthinessReleaseAction(
  aircraftId: string,
  airworthinessReleaseId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.MAINTENANCE]);

  try {
    const input = parseAirworthinessReleaseInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      await ensureAirworthinessReleaseBelongsToAircraft(
        tx,
        aircraftId,
        airworthinessReleaseId,
      );
      const releaseNumber =
        input.releaseNumber ??
        (await generateAirworthinessReleaseNumber(tx, aircraft.id, aircraft.tailNumber));

      await tx.airworthinessRelease.update({
        where: { id: airworthinessReleaseId },
        data: {
          releaseNumber,
          status: input.status,
          releasedAt: input.releasedAt,
          expiresAt: input.expiresAt,
          releaseNotes: input.releaseNotes,
          releasedById:
            input.status === AirworthinessReleaseStatus.RELEASED ? currentUser.id : null,
        },
      });

      if (input.status === AirworthinessReleaseStatus.RELEASED) {
        await supersedePriorReleasedAirworthinessReleases(
          tx,
          aircraftId,
          airworthinessReleaseId,
        );
      }
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}
