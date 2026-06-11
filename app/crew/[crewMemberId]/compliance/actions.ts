"use server";

import {
  AircraftType,
  CrewCertificateType,
  CrewComplianceRecordStatus,
  MedicalCertificateClass,
  SeatRole,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const COMPLIANCE_ADMIN_ROLES = [UserRole.ADMIN, UserRole.OPS] as const;

class ComplianceFormError extends Error {}

function requiredText(formData: FormData, key: string, label: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ComplianceFormError(`${label} is required.`);
  }

  return value.trim();
}

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalDate(formData: FormData, key: string, label: string): Date | null {
  const value = optionalText(formData, key);

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new ComplianceFormError(`${label} is invalid.`);
  }

  return date;
}

function enumValue<T extends Record<string, string>>(
  enumObject: T,
  formData: FormData,
  key: string,
  label: string,
): T[keyof T] {
  const value = requiredText(formData, key, label);
  const values = Object.values(enumObject);

  if (!values.includes(value)) {
    throw new ComplianceFormError(`${label} is invalid.`);
  }

  return value as T[keyof T];
}

function optionalEnumValue<T extends Record<string, string>>(
  enumObject: T,
  formData: FormData,
  key: string,
  label: string,
): T[keyof T] | null {
  const value = optionalText(formData, key);

  if (!value) {
    return null;
  }

  const values = Object.values(enumObject);

  if (!values.includes(value)) {
    throw new ComplianceFormError(`${label} is invalid.`);
  }

  return value as T[keyof T];
}

function validateDateOrder(start: Date | null, end: Date | null, startLabel: string, endLabel: string) {
  if (start && end && end <= start) {
    throw new ComplianceFormError(`${endLabel} must be after ${startLabel}.`);
  }
}

function redirectWithError(crewMemberId: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Compliance workflow failed.";
  redirect(`/crew/${crewMemberId}/compliance?error=${encodeURIComponent(message)}`);
}

function revalidateCrewCompliance(crewMemberId: string) {
  revalidatePath(`/crew/${crewMemberId}/compliance`);
  revalidatePath(`/crew/${crewMemberId}`);
  revalidatePath("/crew");
  revalidatePath("/crew/scheduling");
}

async function assertCrewMemberExists(crewMemberId: string) {
  const crewMember = await prisma.crewMember.findUnique({
    where: { id: crewMemberId },
    select: { id: true },
  });

  if (!crewMember) {
    throw new ComplianceFormError("Crew member was not found.");
  }
}

function parseCertificateInput(formData: FormData) {
  const issuedAt = optionalDate(formData, "issuedAt", "Issued date");
  const expiresAt = optionalDate(formData, "expiresAt", "Expiration date");
  validateDateOrder(issuedAt, expiresAt, "issued date", "expiration date");

  return {
    aircraftType: optionalEnumValue(AircraftType, formData, "aircraftType", "Aircraft type"),
    certificateNumber: optionalText(formData, "certificateNumber"),
    certificateType: enumValue(CrewCertificateType, formData, "certificateType", "Certificate type"),
    expiresAt,
    issuedAt,
    issuingAuthority: optionalText(formData, "issuingAuthority"),
    notes: optionalText(formData, "notes"),
    ratingOrEndorsement: optionalText(formData, "ratingOrEndorsement"),
    seatRole: optionalEnumValue(SeatRole, formData, "seatRole", "Seat role"),
    status: enumValue(CrewComplianceRecordStatus, formData, "status", "Status"),
  };
}

function parseMedicalInput(formData: FormData) {
  const issuedAt = optionalDate(formData, "issuedAt", "Issued date");
  const expiresAt = optionalDate(formData, "expiresAt", "Expiration date");
  validateDateOrder(issuedAt, expiresAt, "issued date", "expiration date");

  return {
    expiresAt,
    issuedAt,
    limitations: optionalText(formData, "limitations"),
    medicalClass: enumValue(MedicalCertificateClass, formData, "medicalClass", "Medical class"),
    notes: optionalText(formData, "notes"),
    status: enumValue(CrewComplianceRecordStatus, formData, "status", "Status"),
  };
}

export async function createCrewCertificateAction(crewMemberId: string, formData: FormData) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await assertCrewMemberExists(crewMemberId);
    await prisma.crewCertificate.create({
      data: {
        ...parseCertificateInput(formData),
        createdById: currentUser.id,
        crewMemberId,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Certificate%20record%20created.`);
}

export async function updateCrewCertificateAction(
  crewMemberId: string,
  certificateId: string,
  formData: FormData,
) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewCertificate.update({
      where: {
        id: certificateId,
        crewMemberId,
      },
      data: parseCertificateInput(formData),
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Certificate%20record%20updated.`);
}

export async function reviewCrewCertificateAction(crewMemberId: string, certificateId: string) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewCertificate.update({
      where: {
        id: certificateId,
        crewMemberId,
      },
      data: {
        verifiedAt: new Date(),
        verifiedById: currentUser.id,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Certificate%20record%20reviewed.`);
}

export async function voidCrewCertificateAction(crewMemberId: string, certificateId: string) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewCertificate.update({
      where: {
        id: certificateId,
        crewMemberId,
      },
      data: {
        status: CrewComplianceRecordStatus.VOIDED,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Certificate%20record%20voided.`);
}

export async function createCrewMedicalAction(crewMemberId: string, formData: FormData) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await assertCrewMemberExists(crewMemberId);
    await prisma.crewMedical.create({
      data: {
        ...parseMedicalInput(formData),
        createdById: currentUser.id,
        crewMemberId,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Medical%20record%20created.`);
}

export async function updateCrewMedicalAction(
  crewMemberId: string,
  medicalId: string,
  formData: FormData,
) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewMedical.update({
      where: {
        id: medicalId,
        crewMemberId,
      },
      data: parseMedicalInput(formData),
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Medical%20record%20updated.`);
}

export async function reviewCrewMedicalAction(crewMemberId: string, medicalId: string) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewMedical.update({
      where: {
        id: medicalId,
        crewMemberId,
      },
      data: {
        verifiedAt: new Date(),
        verifiedById: currentUser.id,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Medical%20record%20reviewed.`);
}

export async function voidCrewMedicalAction(crewMemberId: string, medicalId: string) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewMedical.update({
      where: {
        id: medicalId,
        crewMemberId,
      },
      data: {
        status: CrewComplianceRecordStatus.VOIDED,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Medical%20record%20voided.`);
}
