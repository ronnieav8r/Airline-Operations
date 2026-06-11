"use server";

import {
  AircraftType,
  CrewCheckEventType,
  CrewCertificateType,
  CrewComplianceRecordStatus,
  CrewComplianceResult,
  CrewDutyPeriodStatus,
  CrewRecencyEventType,
  CrewRestPeriodStatus,
  CrewTrainingEventType,
  DutyStatus,
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

function optionalDateTime(formData: FormData, key: string, label: string): Date | null {
  const value = optionalText(formData, key);

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ComplianceFormError(`${label} is invalid.`);
  }

  return date;
}

function requiredDateTime(formData: FormData, key: string, label: string): Date {
  const value = optionalDateTime(formData, key, label);

  if (!value) {
    throw new ComplianceFormError(`${label} is required.`);
  }

  return value;
}

function requiredDate(formData: FormData, key: string, label: string): Date {
  const value = optionalDate(formData, key, label);

  if (!value) {
    throw new ComplianceFormError(`${label} is required.`);
  }

  return value;
}

function optionalInteger(formData: FormData, key: string, label: string): number | null {
  const value = optionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ComplianceFormError(`${label} must be a non-negative whole number.`);
  }

  return parsed;
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

function parseTrainingInput(formData: FormData) {
  const completedAt = requiredDate(formData, "completedAt", "Completed date");
  const expiresAt = optionalDate(formData, "expiresAt", "Expiration date");
  validateDateOrder(completedAt, expiresAt, "completed date", "expiration date");

  return {
    aircraftType: optionalEnumValue(AircraftType, formData, "aircraftType", "Aircraft type"),
    completedAt,
    expiresAt,
    instructorName: optionalText(formData, "instructorName"),
    moduleName: optionalText(formData, "moduleName"),
    notes: optionalText(formData, "notes"),
    programName: requiredText(formData, "programName", "Program name"),
    providerName: optionalText(formData, "providerName"),
    result: enumValue(CrewComplianceResult, formData, "result", "Result"),
    status: enumValue(CrewComplianceRecordStatus, formData, "status", "Status"),
    trainingType: enumValue(CrewTrainingEventType, formData, "trainingType", "Training type"),
  };
}

function parseCheckInput(formData: FormData) {
  const completedAt = requiredDate(formData, "completedAt", "Completed date");
  const expiresAt = optionalDate(formData, "expiresAt", "Expiration date");
  validateDateOrder(completedAt, expiresAt, "completed date", "expiration date");

  return {
    aircraftType: optionalEnumValue(AircraftType, formData, "aircraftType", "Aircraft type"),
    checkType: enumValue(CrewCheckEventType, formData, "checkType", "Check type"),
    completedAt,
    evaluatorName: optionalText(formData, "evaluatorName"),
    expiresAt,
    notes: optionalText(formData, "notes"),
    providerName: optionalText(formData, "providerName"),
    result: enumValue(CrewComplianceResult, formData, "result", "Result"),
    seatRole: optionalEnumValue(SeatRole, formData, "seatRole", "Seat role"),
    status: enumValue(CrewComplianceRecordStatus, formData, "status", "Status"),
  };
}

function parseRecencyInput(formData: FormData) {
  const windowStart = optionalDate(formData, "windowStart", "Window start");
  const windowEnd = optionalDate(formData, "windowEnd", "Window end");
  validateDateOrder(windowStart, windowEnd, "window start", "window end");

  return {
    aircraftType: optionalEnumValue(AircraftType, formData, "aircraftType", "Aircraft type"),
    eventAt: requiredDate(formData, "eventAt", "Event date"),
    notes: optionalText(formData, "notes"),
    quantity: optionalInteger(formData, "quantity", "Quantity"),
    recencyType: enumValue(CrewRecencyEventType, formData, "recencyType", "Recency type"),
    result: enumValue(CrewComplianceResult, formData, "result", "Result"),
    seatRole: optionalEnumValue(SeatRole, formData, "seatRole", "Seat role"),
    status: enumValue(CrewComplianceRecordStatus, formData, "status", "Status"),
    windowEnd,
    windowStart,
  };
}

function parseDutyPeriodInput(formData: FormData) {
  const startsAt = requiredDateTime(formData, "startsAt", "Start time");
  const endsAt = optionalDateTime(formData, "endsAt", "End time");
  validateDateOrder(startsAt, endsAt, "start time", "end time");

  return {
    dutyStatus: optionalEnumValue(DutyStatus, formData, "dutyStatus", "Duty status"),
    endsAt,
    notes: optionalText(formData, "notes"),
    source: optionalText(formData, "source"),
    startsAt,
    status: enumValue(CrewDutyPeriodStatus, formData, "status", "Status"),
  };
}

function parseRestPeriodInput(formData: FormData) {
  const startsAt = requiredDateTime(formData, "startsAt", "Start time");
  const endsAt = optionalDateTime(formData, "endsAt", "End time");
  validateDateOrder(startsAt, endsAt, "start time", "end time");

  return {
    endsAt,
    notes: optionalText(formData, "notes"),
    source: optionalText(formData, "source"),
    startsAt,
    status: enumValue(CrewRestPeriodStatus, formData, "status", "Status"),
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

export async function createCrewTrainingEventAction(crewMemberId: string, formData: FormData) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await assertCrewMemberExists(crewMemberId);
    await prisma.crewTrainingEvent.create({
      data: {
        ...parseTrainingInput(formData),
        createdById: currentUser.id,
        crewMemberId,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Training%20record%20created.`);
}

export async function updateCrewTrainingEventAction(
  crewMemberId: string,
  trainingEventId: string,
  formData: FormData,
) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewTrainingEvent.update({
      where: {
        id: trainingEventId,
        crewMemberId,
      },
      data: parseTrainingInput(formData),
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Training%20record%20updated.`);
}

export async function reviewCrewTrainingEventAction(crewMemberId: string, trainingEventId: string) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewTrainingEvent.update({
      where: {
        id: trainingEventId,
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

  redirect(`/crew/${crewMemberId}/compliance?message=Training%20record%20reviewed.`);
}

export async function voidCrewTrainingEventAction(crewMemberId: string, trainingEventId: string) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewTrainingEvent.update({
      where: {
        id: trainingEventId,
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

  redirect(`/crew/${crewMemberId}/compliance?message=Training%20record%20voided.`);
}

export async function createCrewCheckEventAction(crewMemberId: string, formData: FormData) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await assertCrewMemberExists(crewMemberId);
    await prisma.crewCheckEvent.create({
      data: {
        ...parseCheckInput(formData),
        createdById: currentUser.id,
        crewMemberId,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Check%20record%20created.`);
}

export async function updateCrewCheckEventAction(
  crewMemberId: string,
  checkEventId: string,
  formData: FormData,
) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewCheckEvent.update({
      where: {
        id: checkEventId,
        crewMemberId,
      },
      data: parseCheckInput(formData),
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Check%20record%20updated.`);
}

export async function reviewCrewCheckEventAction(crewMemberId: string, checkEventId: string) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewCheckEvent.update({
      where: {
        id: checkEventId,
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

  redirect(`/crew/${crewMemberId}/compliance?message=Check%20record%20reviewed.`);
}

export async function voidCrewCheckEventAction(crewMemberId: string, checkEventId: string) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewCheckEvent.update({
      where: {
        id: checkEventId,
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

  redirect(`/crew/${crewMemberId}/compliance?message=Check%20record%20voided.`);
}

export async function createCrewRecencyEventAction(crewMemberId: string, formData: FormData) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await assertCrewMemberExists(crewMemberId);
    await prisma.crewRecencyEvent.create({
      data: {
        ...parseRecencyInput(formData),
        createdById: currentUser.id,
        crewMemberId,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Recency%20record%20created.`);
}

export async function updateCrewRecencyEventAction(
  crewMemberId: string,
  recencyEventId: string,
  formData: FormData,
) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewRecencyEvent.update({
      where: {
        id: recencyEventId,
        crewMemberId,
      },
      data: parseRecencyInput(formData),
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Recency%20record%20updated.`);
}

export async function reviewCrewRecencyEventAction(crewMemberId: string, recencyEventId: string) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewRecencyEvent.update({
      where: {
        id: recencyEventId,
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

  redirect(`/crew/${crewMemberId}/compliance?message=Recency%20record%20reviewed.`);
}

export async function voidCrewRecencyEventAction(crewMemberId: string, recencyEventId: string) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewRecencyEvent.update({
      where: {
        id: recencyEventId,
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

  redirect(`/crew/${crewMemberId}/compliance?message=Recency%20record%20voided.`);
}

export async function createCrewDutyPeriodAction(crewMemberId: string, formData: FormData) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await assertCrewMemberExists(crewMemberId);
    await prisma.crewDutyPeriod.create({
      data: {
        ...parseDutyPeriodInput(formData),
        createdById: currentUser.id,
        crewMemberId,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Duty%20period%20created.`);
}

export async function updateCrewDutyPeriodAction(
  crewMemberId: string,
  dutyPeriodId: string,
  formData: FormData,
) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewDutyPeriod.update({
      where: {
        id: dutyPeriodId,
        crewMemberId,
      },
      data: parseDutyPeriodInput(formData),
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Duty%20period%20updated.`);
}

export async function reviewCrewDutyPeriodAction(crewMemberId: string, dutyPeriodId: string) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewDutyPeriod.update({
      where: {
        id: dutyPeriodId,
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

  redirect(`/crew/${crewMemberId}/compliance?message=Duty%20period%20reviewed.`);
}

export async function cancelCrewDutyPeriodAction(crewMemberId: string, dutyPeriodId: string) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewDutyPeriod.update({
      where: {
        id: dutyPeriodId,
        crewMemberId,
      },
      data: {
        status: CrewDutyPeriodStatus.CANCELLED,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Duty%20period%20cancelled.`);
}

export async function createCrewRestPeriodAction(crewMemberId: string, formData: FormData) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await assertCrewMemberExists(crewMemberId);
    await prisma.crewRestPeriod.create({
      data: {
        ...parseRestPeriodInput(formData),
        createdById: currentUser.id,
        crewMemberId,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Rest%20period%20created.`);
}

export async function updateCrewRestPeriodAction(
  crewMemberId: string,
  restPeriodId: string,
  formData: FormData,
) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewRestPeriod.update({
      where: {
        id: restPeriodId,
        crewMemberId,
      },
      data: parseRestPeriodInput(formData),
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Rest%20period%20updated.`);
}

export async function reviewCrewRestPeriodAction(crewMemberId: string, restPeriodId: string) {
  const currentUser = await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewRestPeriod.update({
      where: {
        id: restPeriodId,
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

  redirect(`/crew/${crewMemberId}/compliance?message=Rest%20period%20reviewed.`);
}

export async function cancelCrewRestPeriodAction(crewMemberId: string, restPeriodId: string) {
  await requireRole(COMPLIANCE_ADMIN_ROLES);

  try {
    await prisma.crewRestPeriod.update({
      where: {
        id: restPeriodId,
        crewMemberId,
      },
      data: {
        status: CrewRestPeriodStatus.CANCELLED,
      },
    });
    revalidateCrewCompliance(crewMemberId);
  } catch (error) {
    redirectWithError(crewMemberId, error);
  }

  redirect(`/crew/${crewMemberId}/compliance?message=Rest%20period%20cancelled.`);
}
