"use server";

import { OperatorManifestMode, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseFuelDensityInput } from "@/lib/fuel";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

class AdminSettingsError extends Error {}

function encodeError(error: unknown): string {
  if (error instanceof AdminSettingsError || error instanceof Error) {
    return encodeURIComponent(error.message);
  }

  throw error;
}

export async function updateOperatorFuelSettingAction(operatorId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN]);

  try {
    const density = parseFuelDensityInput(formData.get("defaultJetAFuelDensityLbsPerGallon"));

    await prisma.operatorFuelSetting.upsert({
      where: { operatorId },
      create: {
        operatorId,
        defaultJetAFuelDensityLbsPerGallon: density,
        updatedById: currentUser.id,
      },
      update: {
        defaultJetAFuelDensityLbsPerGallon: density,
        updatedById: currentUser.id,
      },
    });
  } catch (error) {
    redirect(`/admin/settings?error=${encodeError(error)}`);
  }

  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

function parseManifestMode(value: FormDataEntryValue | null): OperatorManifestMode {
  if (
    value === OperatorManifestMode.OPS_REQUIRED ||
    value === OperatorManifestMode.PREFLIGHT_VERIFY ||
    value === OperatorManifestMode.NOT_REQUIRED
  ) {
    return value;
  }

  throw new AdminSettingsError("Manifest mode is invalid.");
}

export async function updateOperatorReleaseSettingAction(operatorId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN]);

  try {
    await prisma.operatorReleaseSetting.upsert({
      where: { operatorId },
      create: {
        dispatcherEnabled: formData.get("dispatcherEnabled") === "on",
        manifestMode: parseManifestMode(formData.get("manifestMode")),
        operatorId,
        updatedById: currentUser.id,
      },
      update: {
        dispatcherEnabled: formData.get("dispatcherEnabled") === "on",
        manifestMode: parseManifestMode(formData.get("manifestMode")),
        updatedById: currentUser.id,
      },
    });
  } catch (error) {
    redirect(`/admin/settings?error=${encodeError(error)}`);
  }

  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}
