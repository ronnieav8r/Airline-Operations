"use server";

import { ImportDomain, ImportSourceType, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

class ImportMetadataError extends Error {}

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
    throw new ImportMetadataError(`${label} is required.`);
  }

  return value;
}

function parseImportDomain(formData: FormData): ImportDomain {
  const value = getRequiredText(formData, "importDomain", "Import domain");

  if (
    value === ImportDomain.AIRCRAFT_MAINTENANCE_AIRWORTHINESS ||
    value === ImportDomain.FLIGHTLEG_HISTORY ||
    value === ImportDomain.CREW_COMPLIANCE ||
    value === ImportDomain.MANIFEST_HISTORY ||
    value === ImportDomain.DISPATCH_RELEASE_EVIDENCE
  ) {
    return value;
  }

  throw new ImportMetadataError("Import domain is not valid.");
}

function parseSourceType(formData: FormData): ImportSourceType {
  const value = getRequiredText(formData, "sourceType", "Source type");

  if (
    value === ImportSourceType.CSV ||
    value === ImportSourceType.XLSX ||
    value === ImportSourceType.JSON ||
    value === ImportSourceType.PDF_REFERENCE ||
    value === ImportSourceType.MANUAL_REFERENCE ||
    value === ImportSourceType.OTHER
  ) {
    return value;
  }

  throw new ImportMetadataError("Source type is not valid.");
}

function encodeError(error: unknown): string {
  if (error instanceof ImportMetadataError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Batch key already exists.");
  }

  throw error;
}

function revalidateImportMetadataPaths() {
  revalidatePath("/internal/import-batches");
  revalidatePath("/internal/import-staging-readiness");
  revalidatePath("/api/health");
}

export async function createImportBatchAction(formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    await prisma.importBatch.create({
      data: {
        importDomain: parseImportDomain(formData),
        sourceSystem: getRequiredText(formData, "sourceSystem", "Source system"),
        batchKey: getOptionalText(formData, "batchKey"),
        notes: getOptionalText(formData, "notes"),
        createdById: currentUser.id,
      },
    });
  } catch (error) {
    redirect(`/internal/import-batches?error=${encodeError(error)}`);
  }

  revalidateImportMetadataPaths();
  redirect("/internal/import-batches?message=Import%20batch%20created.");
}

export async function updateImportBatchAction(batchId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const existing = await prisma.importBatch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });

    if (!existing) {
      throw new ImportMetadataError("Import batch was not found.");
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        importDomain: parseImportDomain(formData),
        sourceSystem: getRequiredText(formData, "sourceSystem", "Source system"),
        batchKey: getOptionalText(formData, "batchKey"),
        notes: getOptionalText(formData, "notes"),
      },
    });
  } catch (error) {
    redirect(`/internal/import-batches?error=${encodeError(error)}`);
  }

  revalidateImportMetadataPaths();
  redirect("/internal/import-batches?message=Import%20batch%20updated.");
}

export async function createImportSourceAction(formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const batchId = getRequiredText(formData, "batchId", "Import batch");
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });

    if (!batch) {
      throw new ImportMetadataError("Import batch was not found.");
    }

    await prisma.importSource.create({
      data: {
        batchId,
        sourceName: getRequiredText(formData, "sourceName", "Source name"),
        sourceType: parseSourceType(formData),
        sourceHash: getOptionalText(formData, "sourceHash"),
        notes: getOptionalText(formData, "notes"),
      },
    });
  } catch (error) {
    redirect(`/internal/import-batches?error=${encodeError(error)}`);
  }

  revalidateImportMetadataPaths();
  redirect("/internal/import-batches?message=Import%20source%20metadata%20added.");
}
