"use server";

import { IdDocumentType, ManifestStatus, UserRole } from "@prisma/client";
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

type PassengerInput = {
  dateOfBirth: Date | null;
  email: string | null;
  firstName: string;
  idDocumentExpiresAt: Date | null;
  idDocumentNumber: string | null;
  idDocumentType: IdDocumentType | null;
  idIssuingCountry: string | null;
  idIssuingState: string | null;
  lastName: string;
  middleName: string | null;
  notes: string | null;
  phone: string | null;
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

function getRequiredText(formData: FormData, key: string, label: string): string {
  const value = getOptionalText(formData, key);

  if (!value) {
    throw new ManifestWorkflowError(`${label} is required.`);
  }

  return value;
}

function parseDate(value: string | null, label: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new ManifestWorkflowError(`${label} must be a valid date.`);
  }

  return parsed;
}

function parseIdDocumentType(value: string | null): IdDocumentType | null {
  if (!value) {
    return null;
  }

  if (
    value === IdDocumentType.PASSPORT ||
    value === IdDocumentType.DRIVERS_LICENSE ||
    value === IdDocumentType.STATE_ID ||
    value === IdDocumentType.MILITARY_ID ||
    value === IdDocumentType.OTHER
  ) {
    return value;
  }

  throw new ManifestWorkflowError("ID document type is invalid.");
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

function parsePassengerInput(formData: FormData): PassengerInput {
  return {
    dateOfBirth: parseDate(getOptionalText(formData, "dateOfBirth"), "Date of birth"),
    email: getOptionalText(formData, "email"),
    firstName: getRequiredText(formData, "firstName", "First name"),
    idDocumentExpiresAt: parseDate(getOptionalText(formData, "idDocumentExpiresAt"), "ID expiration"),
    idDocumentNumber: getOptionalText(formData, "idDocumentNumber"),
    idDocumentType: parseIdDocumentType(getOptionalText(formData, "idDocumentType")),
    idIssuingCountry: getOptionalText(formData, "idIssuingCountry"),
    idIssuingState: getOptionalText(formData, "idIssuingState"),
    lastName: getRequiredText(formData, "lastName", "Last name"),
    middleName: getOptionalText(formData, "middleName"),
    notes: getOptionalText(formData, "passengerNotes"),
    phone: getOptionalText(formData, "phone"),
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

async function getFlightLegCustomerId(flightLegId: string) {
  const flightLeg = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: {
      operationalControlRecord: {
        select: {
          customerId: true,
        },
      },
    },
  });

  if (!flightLeg) {
    throw new ManifestWorkflowError("FlightLeg was not found.");
  }

  return flightLeg.operationalControlRecord?.customerId ?? null;
}

async function assertPassengerNotOnManifest(manifestId: string, passengerId: string) {
  const existingItem = await prisma.manifestItem.findFirst({
    where: {
      manifestId,
      passengerId,
    },
    select: { id: true },
  });

  if (existingItem) {
    throw new ManifestWorkflowError("That passenger is already on this manifest.");
  }
}

async function markManifestDraftIfNeeded(manifestId: string) {
  await prisma.manifest.updateMany({
    where: {
      id: manifestId,
      status: { not: ManifestStatus.DRAFT },
    },
    data: { status: ManifestStatus.DRAFT },
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
  revalidatePath("/");
  revalidatePath("/operations-control");
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}/manifest`);
  revalidatePath("/api/health");
}

function getReturnTo(formData: FormData): string | null {
  const returnTo = getOptionalText(formData, "returnTo");

  return returnTo?.startsWith("/") ? returnTo : null;
}

function redirectTarget(flightLegId: string, formData: FormData, error?: unknown): string {
  const returnTo = getReturnTo(formData);

  if (!returnTo) {
    return error
      ? `/operations-control/${flightLegId}/manifest?error=${encodeError(error)}`
      : `/operations-control/${flightLegId}/manifest`;
  }

  if (!error) {
    return returnTo;
  }

  const separator = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${separator}releaseError=${encodeError(error)}`;
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
    redirect(redirectTarget(flightLegId, formData, error));
  }

  revalidateManifestPaths(flightLegId);
  redirect(redirectTarget(flightLegId, formData));
}

export async function addExistingPassengerToManifestAction(flightLegId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH]);

  try {
    const input = parseManifestItemInput(formData);
    const passengerId = getRequiredText(formData, "passengerId", "Passenger");
    const manifest = await ensureEditableManifest(flightLegId);
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: { firstName: true, lastName: true },
    });

    if (!passenger) {
      throw new ManifestWorkflowError("Selected passenger was not found.");
    }

    await assertPassengerNotOnManifest(manifest.id, passengerId);

    await prisma.manifestItem.create({
      data: {
        baggageWeight: input.baggageWeight,
        manifestId: manifest.id,
        notes: input.notes,
        passengerId,
        personName: `${passenger.firstName} ${passenger.lastName}`,
        seatNumber: input.seatNumber,
        weight: input.weight,
      },
    });

    await markManifestDraftIfNeeded(manifest.id);
  } catch (error) {
    redirect(redirectTarget(flightLegId, formData, error));
  }

  revalidateManifestPaths(flightLegId);
  redirect(redirectTarget(flightLegId, formData));
}

export async function createPassengerAndAddToManifestAction(flightLegId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH]);

  try {
    const manifestInput = parseManifestItemInput(formData);
    const passengerInput = parsePassengerInput(formData);
    const manifest = await ensureEditableManifest(flightLegId);
    const customerId = await getFlightLegCustomerId(flightLegId);
    const passenger = await prisma.passenger.create({
      data: passengerInput,
      select: { firstName: true, id: true, lastName: true },
    });

    if (customerId) {
      await prisma.customerPassenger.upsert({
        where: {
          customerId_passengerId: {
            customerId,
            passengerId: passenger.id,
          },
        },
        create: {
          customerId,
          passengerId: passenger.id,
          relationship: "Passenger",
        },
        update: {},
      });
    }

    await prisma.manifestItem.create({
      data: {
        baggageWeight: manifestInput.baggageWeight,
        manifestId: manifest.id,
        notes: manifestInput.notes,
        passengerId: passenger.id,
        personName: `${passenger.firstName} ${passenger.lastName}`,
        seatNumber: manifestInput.seatNumber,
        weight: manifestInput.weight,
      },
    });

    await markManifestDraftIfNeeded(manifest.id);
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

    const manifest = await prisma.manifest.findUnique({
      where: { flightLegId },
      select: { id: true },
    });

    if (manifest) {
      await markManifestDraftIfNeeded(manifest.id);
    }
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

    const manifest = await prisma.manifest.findUnique({
      where: { flightLegId },
      select: { id: true },
    });

    if (manifest) {
      await markManifestDraftIfNeeded(manifest.id);
    }
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
    const readiness = await prisma.manifest.findUnique({
      where: { id: manifest.id },
      select: {
        items: {
          select: {
            id: true,
            passengerId: true,
            personName: true,
            weight: true,
          },
        },
      },
    });

    if (!readiness || readiness.items.length === 0) {
      throw new ManifestWorkflowError("Manifest requires at least one passenger/item.");
    }

    const incompleteItem = readiness.items.find(
      (item) => (!item.passengerId && !item.personName) || !item.weight,
    );

    if (incompleteItem) {
      throw new ManifestWorkflowError("Every manifest item requires a passenger/name and weight.");
    }

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
