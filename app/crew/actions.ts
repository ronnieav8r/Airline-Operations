"use server";

import {
  AircraftType,
  CrewCertificateType,
  CrewCheckEventType,
  CrewComplianceRecordStatus,
  CrewComplianceRequirementType,
  CrewComplianceResult,
  CrewRecencyEventType,
  CrewTrainingEventType,
  DutyStatus,
  EmploymentStatus,
  MedicalCertificateClass,
  OperatingPart,
  Prisma,
  SeatRole,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

class CrewCoreWorkflowError extends Error {}

type CrewMemberInput = {
  baseStationId: string;
  dutyStatus: DutyStatus;
  email: string | null;
  employeeNumber: string;
  employmentStatus: EmploymentStatus;
  dateOfBirth: Date | null;
  firstName: string;
  hireDate: Date | null;
  lastName: string;
  phone: string | null;
};

type CrewQualificationInput = {
  aircraftType: AircraftType;
  expiresAt: Date | null;
  issuedAt: Date;
  notes: string | null;
  seatRole: SeatRole;
};

type InitialCrewEvidenceInput = {
  instrumentCheckCompletedAt: Date | null;
  lineCheckCompletedAt: Date | null;
  medicalClass: MedicalCertificateClass;
  medicalExpiresAt: Date | null;
  medicalIssuedAt: Date | null;
  proficiencyCheckCompletedAt: Date | null;
  recurrentTrainingCompletedAt: Date | null;
  takeoffLandingRecencyAt: Date | null;
  typeRatingAircraftType: AircraftType | null;
  typeRatingExpiresAt: Date | null;
  typeRatingIssuedAt: Date | null;
  typeRatingSeatRole: SeatRole | null;
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
    throw new CrewCoreWorkflowError(`${label} is required.`);
  }

  return value;
}

function parseOptionalDate(formData: FormData, key: string, label: string): Date | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CrewCoreWorkflowError(`${label} must be a valid date.`);
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new CrewCoreWorkflowError(`${label} must be a valid date.`);
  }

  return parsed;
}

function parseRequiredDate(formData: FormData, key: string, label: string): Date {
  const parsed = parseOptionalDate(formData, key, label);

  if (!parsed) {
    throw new CrewCoreWorkflowError(`${label} is required.`);
  }

  return parsed;
}

function parseEmploymentStatus(formData: FormData): EmploymentStatus {
  const value = getRequiredText(formData, "employmentStatus", "Employment status");

  if (Object.values(EmploymentStatus).includes(value as EmploymentStatus)) {
    return value as EmploymentStatus;
  }

  throw new CrewCoreWorkflowError("Employment status is not valid.");
}

function parseDutyStatus(formData: FormData): DutyStatus {
  const value = getRequiredText(formData, "dutyStatus", "Duty status");

  if (Object.values(DutyStatus).includes(value as DutyStatus)) {
    return value as DutyStatus;
  }

  throw new CrewCoreWorkflowError("Duty status is not valid.");
}

function parseAircraftType(formData: FormData): AircraftType {
  const value = getRequiredText(formData, "aircraftType", "Aircraft type");

  if (Object.values(AircraftType).includes(value as AircraftType)) {
    return value as AircraftType;
  }

  throw new CrewCoreWorkflowError("Aircraft type is not valid.");
}

function parseSeatRole(formData: FormData): SeatRole {
  const value = getRequiredText(formData, "seatRole", "Seat role");

  if (Object.values(SeatRole).includes(value as SeatRole)) {
    return value as SeatRole;
  }

  throw new CrewCoreWorkflowError("Seat role is not valid.");
}

function parseOptionalAircraftType(formData: FormData, key: string, label: string): AircraftType | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  if (Object.values(AircraftType).includes(value as AircraftType)) {
    return value as AircraftType;
  }

  throw new CrewCoreWorkflowError(`${label} is not valid.`);
}

function parseOptionalSeatRole(formData: FormData, key: string, label: string): SeatRole | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  if (Object.values(SeatRole).includes(value as SeatRole)) {
    return value as SeatRole;
  }

  throw new CrewCoreWorkflowError(`${label} is not valid.`);
}

function parseMedicalClass(formData: FormData): MedicalCertificateClass {
  const value = getOptionalText(formData, "initialMedicalClass") ?? MedicalCertificateClass.FIRST_CLASS;

  if (Object.values(MedicalCertificateClass).includes(value as MedicalCertificateClass)) {
    return value as MedicalCertificateClass;
  }

  throw new CrewCoreWorkflowError("Medical class is not valid.");
}

function parseComplianceRequirementType(formData: FormData): CrewComplianceRequirementType {
  const value = getRequiredText(formData, "requirementType", "Requirement type");

  if (Object.values(CrewComplianceRequirementType).includes(value as CrewComplianceRequirementType)) {
    return value as CrewComplianceRequirementType;
  }

  throw new CrewCoreWorkflowError("Requirement type is not valid.");
}

function parseOperatingPartList(formData: FormData): OperatingPart[] {
  return formData.getAll("coveredOperatingParts").map((value) => {
    if (Object.values(OperatingPart).includes(value as OperatingPart)) {
      return value as OperatingPart;
    }

    throw new CrewCoreWorkflowError("Operating part coverage is not valid.");
  });
}

function parseRequirementTypeList(
  formData: FormData,
  fallback: CrewComplianceRequirementType,
): CrewComplianceRequirementType[] {
  const values = formData.getAll("satisfiesRequirements");

  if (values.length === 0) {
    return [fallback];
  }

  return values.map((value) => {
    if (Object.values(CrewComplianceRequirementType).includes(value as CrewComplianceRequirementType)) {
      return value as CrewComplianceRequirementType;
    }

    throw new CrewCoreWorkflowError("Satisfied requirement selection is not valid.");
  });
}

function parseDrawerMedicalClass(formData: FormData): MedicalCertificateClass {
  const value = getOptionalText(formData, "medicalClass") ?? MedicalCertificateClass.FIRST_CLASS;

  if (Object.values(MedicalCertificateClass).includes(value as MedicalCertificateClass)) {
    return value as MedicalCertificateClass;
  }

  throw new CrewCoreWorkflowError("Medical class is not valid.");
}

function parseCrewMemberInput(formData: FormData): CrewMemberInput {
  return {
    baseStationId: getRequiredText(formData, "baseStationId", "Base station"),
    dutyStatus: parseDutyStatus(formData),
    email: getOptionalText(formData, "email"),
    employeeNumber: getRequiredText(formData, "employeeNumber", "Employee number"),
    employmentStatus: parseEmploymentStatus(formData),
    dateOfBirth: parseOptionalDate(formData, "dateOfBirth", "Date of birth"),
    firstName: getRequiredText(formData, "firstName", "First name"),
    hireDate: parseOptionalDate(formData, "hireDate", "Hire date"),
    lastName: getRequiredText(formData, "lastName", "Last name"),
    phone: getOptionalText(formData, "phone"),
  };
}

function parseCrewQualificationInput(formData: FormData): CrewQualificationInput {
  const issuedAt = parseRequiredDate(formData, "issuedAt", "Issued date");
  const expiresAt = parseOptionalDate(formData, "expiresAt", "Expiry date");

  if (expiresAt && expiresAt <= issuedAt) {
    throw new CrewCoreWorkflowError("Expiry date must be after issued date.");
  }

  return {
    aircraftType: parseAircraftType(formData),
    expiresAt,
    issuedAt,
    notes: getOptionalText(formData, "notes"),
    seatRole: parseSeatRole(formData),
  };
}

function parseInitialCrewEvidenceInput(formData: FormData): InitialCrewEvidenceInput {
  const medicalIssuedAt = parseOptionalDate(formData, "initialMedicalIssuedAt", "Medical issued date");
  const medicalExpiresAt = parseOptionalDate(formData, "initialMedicalExpiresAt", "Medical expiry date");
  const typeRatingAircraftType = parseOptionalAircraftType(formData, "initialTypeRatingAircraftType", "Type rating aircraft");
  const typeRatingSeatRole = parseOptionalSeatRole(formData, "initialTypeRatingSeatRole", "Type rating seat role");
  const typeRatingIssuedAt = parseOptionalDate(formData, "initialTypeRatingIssuedAt", "Type rating issued date");
  const typeRatingExpiresAt = parseOptionalDate(formData, "initialTypeRatingExpiresAt", "Type rating expiry date");

  if (medicalIssuedAt && medicalExpiresAt && medicalExpiresAt <= medicalIssuedAt) {
    throw new CrewCoreWorkflowError("Medical expiry date must be after the medical issued date.");
  }

  if ((typeRatingIssuedAt || typeRatingExpiresAt || typeRatingSeatRole) && !typeRatingAircraftType) {
    throw new CrewCoreWorkflowError("Aircraft type is required when starter type rating details are entered.");
  }

  if (typeRatingIssuedAt && typeRatingExpiresAt && typeRatingExpiresAt <= typeRatingIssuedAt) {
    throw new CrewCoreWorkflowError("Type rating expiry date must be after the issued date.");
  }

  return {
    instrumentCheckCompletedAt: parseOptionalDate(formData, "initialInstrumentCheckCompletedAt", "Instrument check date"),
    lineCheckCompletedAt: parseOptionalDate(formData, "initialLineCheckCompletedAt", "Line check date"),
    medicalClass: parseMedicalClass(formData),
    medicalExpiresAt,
    medicalIssuedAt,
    proficiencyCheckCompletedAt: parseOptionalDate(formData, "initialProficiencyCheckCompletedAt", "Proficiency check date"),
    recurrentTrainingCompletedAt: parseOptionalDate(formData, "initialRecurrentTrainingCompletedAt", "Recurrent training date"),
    takeoffLandingRecencyAt: parseOptionalDate(formData, "initialTakeoffLandingRecencyAt", "Takeoff/landing recency date"),
    typeRatingAircraftType,
    typeRatingExpiresAt,
    typeRatingIssuedAt,
    typeRatingSeatRole,
  };
}

function encodeError(error: unknown): string {
  if (error instanceof CrewCoreWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Crew record or qualification already exists.");
  }

  return encodeURIComponent("Crew workflow failed.");
}

function crewReturnPath(formData: FormData, fallback: string): string {
  const returnTo = getOptionalText(formData, "returnTo");

  if (!returnTo || !returnTo.startsWith("/crew")) {
    return fallback;
  }

  return returnTo;
}

function crewErrorReturnPath(formData: FormData, fallback: string, error: unknown): string {
  const returnTo = crewReturnPath(formData, fallback);
  const [pathAndQuery, hash] = returnTo.split("#", 2);
  const separator = pathAndQuery.includes("?") ? "&" : "?";
  const suffix = hash ? `#${hash}` : "";

  return `${pathAndQuery}${separator}error=${encodeError(error)}${suffix}`;
}

async function ensureStationExists(tx: Prisma.TransactionClient, stationId: string) {
  const station = await tx.station.findUnique({
    where: { id: stationId },
    select: { id: true },
  });

  if (!station) {
    throw new CrewCoreWorkflowError("Base station was not found.");
  }
}

async function ensureCrewMemberExists(tx: Prisma.TransactionClient, crewMemberId: string) {
  const crewMember = await tx.crewMember.findUnique({
    where: { id: crewMemberId },
    select: { id: true },
  });

  if (!crewMember) {
    throw new CrewCoreWorkflowError("Crew member was not found.");
  }
}

async function ensureQualificationBelongsToCrew(
  tx: Prisma.TransactionClient,
  crewMemberId: string,
  qualificationId: string,
) {
  const qualification = await tx.crewQualification.findUnique({
    where: { id: qualificationId },
    select: { crewMemberId: true },
  });

  if (!qualification || qualification.crewMemberId !== crewMemberId) {
    throw new CrewCoreWorkflowError("Crew qualification was not found for this crew member.");
  }
}

function revalidateCrewCorePaths(crewMemberId?: string) {
  revalidatePath("/");
  revalidatePath("/crew");
  revalidatePath("/crew/scheduling");
  revalidatePath("/crew/scheduling/time-off");
  revalidatePath("/crew/scheduling/periods");
  revalidatePath("/aircraft");
  revalidatePath("/operations-control");

  if (crewMemberId) {
    revalidatePath(`/crew/${crewMemberId}`);
    revalidatePath(`/crew/${crewMemberId}/compliance`);
    revalidatePath(`/crew/${crewMemberId}/logistics`);
  }
}

async function createInitialCrewEvidence(
  tx: Prisma.TransactionClient,
  crewMemberId: string,
  evidence: InitialCrewEvidenceInput,
) {
  if (evidence.medicalIssuedAt || evidence.medicalExpiresAt) {
    await tx.crewMedical.create({
      data: {
        crewMemberId,
        expiresAt: evidence.medicalExpiresAt,
        issuedAt: evidence.medicalIssuedAt,
        medicalClass: evidence.medicalClass,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    });
  }

  if (evidence.typeRatingAircraftType) {
    await tx.crewCertificate.create({
      data: {
        aircraftType: evidence.typeRatingAircraftType,
        certificateType: CrewCertificateType.TYPE_RATING,
        crewMemberId,
        expiresAt: evidence.typeRatingExpiresAt,
        issuedAt: evidence.typeRatingIssuedAt,
        ratingOrEndorsement: evidence.typeRatingAircraftType.replaceAll("_", "-"),
        seatRole: evidence.typeRatingSeatRole,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    });

    if (evidence.typeRatingIssuedAt && evidence.typeRatingSeatRole) {
      await tx.crewQualification.create({
        data: {
          aircraftType: evidence.typeRatingAircraftType,
          crewMemberId,
          expiresAt: evidence.typeRatingExpiresAt,
          issuedAt: evidence.typeRatingIssuedAt,
          notes: "Created from starter crew evidence.",
          seatRole: evidence.typeRatingSeatRole,
        },
      });
    }
  }

  if (evidence.recurrentTrainingCompletedAt) {
    await tx.crewTrainingEvent.create({
      data: {
        completedAt: evidence.recurrentTrainingCompletedAt,
        crewMemberId,
        programName: "Starter recurrent training evidence",
        result: CrewComplianceResult.SATISFACTORY,
        status: CrewComplianceRecordStatus.ACTIVE,
        trainingType: CrewTrainingEventType.RECURRENT,
      },
    });
  }

  const checkEvents: Array<{
    checkType: CrewCheckEventType;
    completedAt: Date | null;
  }> = [
    {
      checkType: CrewCheckEventType.PROFICIENCY,
      completedAt: evidence.proficiencyCheckCompletedAt,
    },
    {
      checkType: CrewCheckEventType.INSTRUMENT_CHECK,
      completedAt: evidence.instrumentCheckCompletedAt,
    },
    {
      checkType: CrewCheckEventType.LINE_CHECK,
      completedAt: evidence.lineCheckCompletedAt,
    },
  ];

  for (const checkEvent of checkEvents) {
    if (!checkEvent.completedAt) {
      continue;
    }

    await tx.crewCheckEvent.create({
      data: {
        aircraftType: evidence.typeRatingAircraftType,
        checkType: checkEvent.checkType,
        completedAt: checkEvent.completedAt,
        crewMemberId,
        result: CrewComplianceResult.SATISFACTORY,
        seatRole: evidence.typeRatingSeatRole,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    });
  }

  if (evidence.takeoffLandingRecencyAt) {
    await tx.crewRecencyEvent.create({
      data: {
        aircraftType: evidence.typeRatingAircraftType,
        crewMemberId,
        eventAt: evidence.takeoffLandingRecencyAt,
        recencyType: CrewRecencyEventType.TAKEOFF_LANDING,
        result: CrewComplianceResult.SATISFACTORY,
        seatRole: evidence.typeRatingSeatRole,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    });
  }
}

export async function createCrewMemberAction(formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  let crewMemberId: string | undefined;

  try {
    const input = parseCrewMemberInput(formData);
    const starterEvidence = parseInitialCrewEvidenceInput(formData);
    const created = await prisma.$transaction(async (tx) => {
      await ensureStationExists(tx, input.baseStationId);
      const crewMember = await tx.crewMember.create({
        data: input,
        select: { id: true },
      });

      await createInitialCrewEvidence(tx, crewMember.id, starterEvidence);

      return crewMember;
    });
    crewMemberId = created.id;
  } catch (error) {
    redirect(`/crew?error=${encodeError(error)}`);
  }

  revalidateCrewCorePaths(crewMemberId);
  redirect(crewMemberId ? `/crew/${crewMemberId}` : "/crew");
}

export async function updateCrewMemberAction(crewMemberId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parseCrewMemberInput(formData);
    await prisma.$transaction(async (tx) => {
      await ensureCrewMemberExists(tx, crewMemberId);
      await ensureStationExists(tx, input.baseStationId);
      await tx.crewMember.update({
        where: { id: crewMemberId },
        data: input,
      });
    });
  } catch (error) {
    redirect(`/crew/${crewMemberId}?error=${encodeError(error)}`);
  }

  revalidateCrewCorePaths(crewMemberId);
  redirect(crewReturnPath(formData, `/crew/${crewMemberId}`));
}

export async function createCrewQualificationAction(crewMemberId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const returnTo = crewReturnPath(formData, `/crew/${crewMemberId}#qualifications`);

  try {
    const input = parseCrewQualificationInput(formData);
    await prisma.$transaction(async (tx) => {
      await ensureCrewMemberExists(tx, crewMemberId);
      await tx.crewQualification.create({
        data: {
          ...input,
          crewMemberId,
        },
      });
    });
  } catch (error) {
    redirect(crewErrorReturnPath(formData, `/crew/${crewMemberId}#qualifications`, error));
  }

  revalidateCrewCorePaths(crewMemberId);
  redirect(returnTo);
}

export async function updateCrewQualificationAction(
  crewMemberId: string,
  qualificationId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parseCrewQualificationInput(formData);
    await prisma.$transaction(async (tx) => {
      await ensureQualificationBelongsToCrew(tx, crewMemberId, qualificationId);
      await tx.crewQualification.update({
        where: { id: qualificationId },
        data: input,
      });
    });
  } catch (error) {
    redirect(`/crew/${crewMemberId}?error=${encodeError(error)}#qualifications`);
  }

  revalidateCrewCorePaths(crewMemberId);
  redirect(`/crew/${crewMemberId}#qualifications`);
}

export async function expireCrewQualificationAction(
  crewMemberId: string,
  qualificationId: string,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    await prisma.$transaction(async (tx) => {
      await ensureQualificationBelongsToCrew(tx, crewMemberId, qualificationId);
      await tx.crewQualification.update({
        where: { id: qualificationId },
        data: { expiresAt: new Date() },
      });
    });
  } catch (error) {
    redirect(`/crew/${crewMemberId}?error=${encodeError(error)}#qualifications`);
  }

  revalidateCrewCorePaths(crewMemberId);
  redirect(`/crew/${crewMemberId}#qualifications`);
}

export async function deleteCrewQualificationAction(
  crewMemberId: string,
  qualificationId: string,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    await prisma.$transaction(async (tx) => {
      await ensureQualificationBelongsToCrew(tx, crewMemberId, qualificationId);
      await tx.crewQualification.delete({
        where: { id: qualificationId },
      });
    });
  } catch (error) {
    redirect(`/crew/${crewMemberId}?error=${encodeError(error)}#qualifications`);
  }

  revalidateCrewCorePaths(crewMemberId);
  redirect(`/crew/${crewMemberId}#qualifications`);
}

export async function createCrewDrawerComplianceEvidenceAction(
  crewMemberId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const returnTo = crewReturnPath(formData, `/crew?panel=crew&selected=${crewMemberId}`);

  try {
    const requirementType = parseComplianceRequirementType(formData);
    const completedAt = parseRequiredDate(formData, "completedAt", "Record date");
    const expiresAt = parseOptionalDate(formData, "expiresAt", "Expiration date");
    const aircraftType = parseOptionalAircraftType(formData, "aircraftType", "Aircraft type");
    const coveredOperatingParts = parseOperatingPartList(formData);
    const seatRole = parseOptionalSeatRole(formData, "seatRole", "Seat role");
    const satisfiesRequirements = parseRequirementTypeList(formData, requirementType);
    const notes = getOptionalText(formData, "notes");
    const title = getOptionalText(formData, "title") ?? "Crew compliance requirement";

    if (expiresAt && expiresAt <= completedAt) {
      throw new CrewCoreWorkflowError("Expiration date must be after the record date.");
    }

    await prisma.$transaction(async (tx) => {
      await ensureCrewMemberExists(tx, crewMemberId);

      if (
        requirementType === CrewComplianceRequirementType.TYPE_RATING ||
        requirementType === CrewComplianceRequirementType.SIC_QUALIFICATION
      ) {
        if (!aircraftType) {
          throw new CrewCoreWorkflowError("Aircraft type is required for type rating or SIC qualification evidence.");
        }

        await tx.crewCertificate.create({
          data: {
            aircraftType,
            certificateType:
              requirementType === CrewComplianceRequirementType.TYPE_RATING
                ? CrewCertificateType.TYPE_RATING
                : CrewCertificateType.AIRCRAFT_RATING,
            coveredOperatingParts,
            crewMemberId,
            expiresAt,
            issuedAt: completedAt,
            notes,
            ratingOrEndorsement: title,
            satisfiesRequirements,
            seatRole:
              seatRole ??
              (requirementType === CrewComplianceRequirementType.TYPE_RATING ? SeatRole.CPT : SeatRole.FO),
            status: CrewComplianceRecordStatus.ACTIVE,
          },
        });
        return;
      }

      if (requirementType === CrewComplianceRequirementType.MEDICAL) {
        await tx.crewMedical.create({
          data: {
            crewMemberId,
            coveredOperatingParts,
            expiresAt,
            issuedAt: completedAt,
            medicalClass: parseDrawerMedicalClass(formData),
            notes,
            satisfiesRequirements,
            status: CrewComplianceRecordStatus.ACTIVE,
          },
        });
        return;
      }

      if (
        requirementType === CrewComplianceRequirementType.FLIGHT_REVIEW ||
        requirementType === CrewComplianceRequirementType.RECURRENT_TRAINING
      ) {
        await tx.crewTrainingEvent.create({
          data: {
            aircraftType,
            completedAt,
            coveredOperatingParts,
            crewMemberId,
            expiresAt,
            notes,
            programName:
              requirementType === CrewComplianceRequirementType.RECURRENT_TRAINING
                ? "Recurrent training"
                : title,
            result: CrewComplianceResult.SATISFACTORY,
            satisfiesRequirements,
            status: CrewComplianceRecordStatus.ACTIVE,
            trainingType:
              requirementType === CrewComplianceRequirementType.RECURRENT_TRAINING
                ? CrewTrainingEventType.RECURRENT
                : CrewTrainingEventType.OTHER,
          },
        });
        return;
      }

      if (requirementType === CrewComplianceRequirementType.RECENCY) {
        await tx.crewRecencyEvent.create({
          data: {
            aircraftType,
            coveredOperatingParts,
            crewMemberId,
            eventAt: completedAt,
            notes,
            quantity: 1,
            recencyType: CrewRecencyEventType.TAKEOFF_LANDING,
            result: CrewComplianceResult.SATISFACTORY,
            satisfiesRequirements,
            seatRole,
            status: CrewComplianceRecordStatus.ACTIVE,
          },
        });
        return;
      }

      const checkType =
        requirementType === CrewComplianceRequirementType.COMPETENCY_CHECK
          ? CrewCheckEventType.COMPETENCY
          : requirementType === CrewComplianceRequirementType.LINE_CHECK
            ? CrewCheckEventType.LINE_CHECK
            : requirementType === CrewComplianceRequirementType.INSTRUMENT_CHECK
              ? CrewCheckEventType.INSTRUMENT_CHECK
              : CrewCheckEventType.PROFICIENCY;

      await tx.crewCheckEvent.create({
        data: {
          aircraftType,
          checkType,
          completedAt,
          coveredOperatingParts,
          crewMemberId,
          expiresAt,
          notes,
          result: CrewComplianceResult.SATISFACTORY,
          satisfiesRequirements,
          seatRole,
          status: CrewComplianceRecordStatus.ACTIVE,
        },
      });
    });
  } catch (error) {
    redirect(crewErrorReturnPath(formData, `/crew?panel=crew&selected=${crewMemberId}`, error));
  }

  revalidateCrewCorePaths(crewMemberId);
  redirect(returnTo);
}
