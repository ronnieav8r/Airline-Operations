"use server";

import { ManifestStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

class ManifestWorkflowError extends Error {}

type ManifestItemInput = {
  personName: string | null;
  seatNumber: string | null;
  weight: string | null;
  baggageWeight: string | null;
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

function parseDecimalString(value: string | null, label: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ManifestWorkflowError(`${label} must be a non-negative number.`);
  }

  return parsed.toFixed(2);
}

function parseManifestItemInput(formData: FormData): ManifestItemInput {
  return {
    personName: getOptionalText(formData, "personName"),
    seatNumber: getOptionalText(formData, "seatNumber"),
    weight: parseDecimalString(getOptionalText(formData, "weight"), "Weight"),
    baggageWeight: parseDecimalString(getOptionalText(formData, "baggageWeight"), "Baggage weight"),
    notes: getOptionalText(formData, "notes"),
  };
}

function encodeError(error: unknown): string {
  if (error instanceof ManifestWorkflowError) {
    return encodeURIComponent(error.message);
  }

  throw error;
}

async function ensureEditableManifest(flightLegId: string) {
  const flightLeg = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: {
      id: true,
      manifest: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!flightLeg) {
    throw new ManifestWorkflowError("FlightLeg was not found.");
  }

  if (flightLeg.manifest?.status === ManifestStatus.LOCKED) {
    throw new ManifestWorkflowError("Locked manifests cannot be edited in this workflow.");
  }

  if (flightLeg.manifest) {
    return flightLeg.manifest;
  }

  return prisma.manifest.create({
    data: {
      flightLegId,
      status: ManifestStatus.DRAFT,
    },
    select: {
      id: true,
      status: true,
    },
  });
}

async function ensureManifestItemBelongsToFlightLeg(flightLegId: string, itemId: string) {
  const item = await prisma.manifestItem.findFirst({
    where: {
      id: itemId,
      manifest: {
        flightLegId,
      },
    },
    select: {
      id: true,
      manifest: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!item) {
    throw new ManifestWorkflowError("Manifest item was not found.");
  }

  if (item.manifest.status === ManifestStatus.LOCKED) {
    throw new ManifestWorkflowError("Locked manifests cannot be edited in this workflow.");
  }
}

function revalidateManifestPaths(flightLegId: string) {
  revalidatePath("/operations-control");
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}/manifest`);
  revalidatePath("/api/health");
}

export async function addManifestItemAction(flightLegId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH]);

  try {
    const input = parseManifestItemInput(formData);
    const manifest = await ensureEditableManifest(flightLegId);

    await prisma.manifestItem.create({
      data: {
        manifestId: manifest.id,
        personName: input.personName,
        seatNumber: input.seatNumber,
        weight: input.weight,
        baggageWeight: input.baggageWeight,
        notes: input.notes,
      },
    });

    if (manifest.status !== ManifestStatus.DRAFT) {
      await prisma.manifest.update({
        where: { id: manifest.id },
        data: { status: ManifestStatus.DRAFT },
      });
    }
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/manifest?error=${encodeError(error)}`);
  }

  revalidateManifestPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/manifest`);
}

export async function updateManifestItemAction(
  flightLegId: string,
  itemId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH]);

  try {
    const input = parseManifestItemInput(formData);
    await ensureManifestItemBelongsToFlightLeg(flightLegId, itemId);

    await prisma.manifestItem.update({
      where: { id: itemId },
      data: {
        personName: input.personName,
        seatNumber: input.seatNumber,
        weight: input.weight,
        baggageWeight: input.baggageWeight,
        notes: input.notes,
      },
    });

    await prisma.manifest.updateMany({
      where: {
        flightLegId,
        status: { not: ManifestStatus.DRAFT },
      },
      data: { status: ManifestStatus.DRAFT },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/manifest?error=${encodeError(error)}`);
  }

  revalidateManifestPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/manifest`);
}

export async function deleteManifestItemAction(flightLegId: string, itemId: string) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH]);

  try {
    await ensureManifestItemBelongsToFlightLeg(flightLegId, itemId);
    await prisma.manifestItem.delete({ where: { id: itemId } });

    await prisma.manifest.updateMany({
      where: {
        flightLegId,
        status: { not: ManifestStatus.DRAFT },
      },
      data: { status: ManifestStatus.DRAFT },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/manifest?error=${encodeError(error)}`);
  }

  revalidateManifestPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/manifest`);
}

export async function markManifestReadyAction(flightLegId: string) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH]);

  try {
    const manifest = await ensureEditableManifest(flightLegId);

    await prisma.manifest.update({
      where: { id: manifest.id },
      data: { status: ManifestStatus.READY },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/manifest?error=${encodeError(error)}`);
  }

  revalidateManifestPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/manifest`);
}
