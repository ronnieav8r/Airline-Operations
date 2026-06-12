"use server";

import { UserRole } from "@prisma/client";
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
