"use server";

import { AuthorityStatus, OperatingPart, OperatorManifestMode, UserRole } from "@prisma/client";
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

function optionalInt(value: FormDataEntryValue | null, label: string): number | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AdminSettingsError(`${label} must be a whole number of 0 or greater.`);
  }

  return parsed;
}

function requiredInt(value: FormDataEntryValue | null, label: string): number {
  const parsed = optionalInt(value, label);

  if (parsed === null) {
    throw new AdminSettingsError(`${label} is required.`);
  }

  return parsed;
}

function operatingPartLabel(value: OperatingPart): string {
  if (value === OperatingPart.PART_91) {
    return "Part 91";
  }
  if (value === OperatingPart.PART_91K) {
    return "Part 91K";
  }
  return "Part 135";
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

export async function updateOperatorOperatingAuthoritiesAction(operatorId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN]);

  try {
    await prisma.$transaction(
      Object.values(OperatingPart).map((operatingPart) =>
        prisma.operatingAuthority.upsert({
          where: {
            operatorId_operatingPart: {
              operatorId,
              operatingPart,
            },
          },
          create: {
            displayName: `${operatingPartLabel(operatingPart)} Operations`,
            operatingPart,
            operatorId,
            status: formData.get(operatingPart) === "on" ? AuthorityStatus.ACTIVE : AuthorityStatus.DRAFT,
          },
          update: {
            status: formData.get(operatingPart) === "on" ? AuthorityStatus.ACTIVE : AuthorityStatus.DRAFT,
          },
        }),
      ),
    );
  } catch (error) {
    redirect(`/admin/settings?error=${encodeError(error)}#operating-authorities`);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/crew");
  revalidatePath("/crew/scheduling");
  revalidatePath("/operations-control");
  redirect("/admin/settings#operating-authorities");
}

export async function updateCrewComplianceRuleAction(ruleId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN]);

  try {
    const warningLeadDays = requiredInt(formData.get("warningLeadDays"), "Warning lead days");
    const intervalMonths = optionalInt(formData.get("intervalMonths"), "Interval months");
    const graceMonthsBefore = requiredInt(formData.get("graceMonthsBefore"), "Grace months before");
    const graceMonthsAfter = requiredInt(formData.get("graceMonthsAfter"), "Grace months after");

    await prisma.crewComplianceRule.update({
      where: { id: ruleId },
      data: {
        active: formData.get("active") === "on",
        graceMonthsAfter,
        graceMonthsBefore,
        intervalMonths,
        warningLeadDays,
      },
    });
  } catch (error) {
    redirect(`/admin/settings?error=${encodeError(error)}#crew-compliance-rules`);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/crew");
  revalidatePath("/crew/scheduling");
  revalidatePath("/operations-control");
  redirect("/admin/settings#crew-compliance-rules");
}
