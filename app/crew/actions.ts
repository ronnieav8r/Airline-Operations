"use server";

import {
  AircraftType,
  DutyStatus,
  EmploymentStatus,
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

function parseCrewMemberInput(formData: FormData): CrewMemberInput {
  return {
    baseStationId: getRequiredText(formData, "baseStationId", "Base station"),
    dutyStatus: parseDutyStatus(formData),
    email: getOptionalText(formData, "email"),
    employeeNumber: getRequiredText(formData, "employeeNumber", "Employee number"),
    employmentStatus: parseEmploymentStatus(formData),
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

export async function createCrewMemberAction(formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  let crewMemberId: string | undefined;

  try {
    const input = parseCrewMemberInput(formData);
    const created = await prisma.$transaction(async (tx) => {
      await ensureStationExists(tx, input.baseStationId);
      return tx.crewMember.create({
        data: input,
        select: { id: true },
      });
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
    redirect(`/crew/${crewMemberId}?error=${encodeError(error)}#qualifications`);
  }

  revalidateCrewCorePaths(crewMemberId);
  redirect(`/crew/${crewMemberId}#qualifications`);
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
