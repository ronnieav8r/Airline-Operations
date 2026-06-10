"use server";

import {
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  CrewScheduleRequestType,
  DutyStatus,
  EmploymentStatus,
  TimeOffRequestStatus,
  TimeOffRequestType,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

class CrewPortalRequestError extends Error {}

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
    throw new CrewPortalRequestError(`${label} is required.`);
  }

  return value;
}

function parseRequiredDateTime(formData: FormData, key: string, label: string): Date {
  const value = getRequiredText(formData, key, label);
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new CrewPortalRequestError(`${label} must be a valid date/time.`);
  }

  return parsed;
}

function parseOptionalDate(formData: FormData, key: string, label: string): Date | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new CrewPortalRequestError(`${label} must be a valid date.`);
  }

  return parsed;
}

function parseTimeOffRequestType(formData: FormData): TimeOffRequestType {
  const value = getRequiredText(formData, "requestType", "Request type");

  if (Object.values(TimeOffRequestType).includes(value as TimeOffRequestType)) {
    return value as TimeOffRequestType;
  }

  throw new CrewPortalRequestError("Time-off request type is not valid.");
}

function parseScheduleRequestType(formData: FormData): CrewScheduleRequestType {
  const value = getRequiredText(formData, "requestType", "Request type");

  if (Object.values(CrewScheduleRequestType).includes(value as CrewScheduleRequestType)) {
    return value as CrewScheduleRequestType;
  }

  throw new CrewPortalRequestError("Schedule request type is not valid.");
}

function parseOptionalDutyStatus(formData: FormData): DutyStatus | null {
  const value = getOptionalText(formData, "preferredDutyStatus");

  if (!value) {
    return null;
  }

  if (Object.values(DutyStatus).includes(value as DutyStatus)) {
    return value as DutyStatus;
  }

  throw new CrewPortalRequestError("Preferred duty status is not valid.");
}

function encodeError(error: unknown): string {
  if (error instanceof CrewPortalRequestError) {
    return encodeURIComponent(error.message);
  }

  return encodeURIComponent("Crew portal request failed.");
}

async function getLinkedCrewMember(userId: string) {
  const crewMember = await prisma.crewMember.findUnique({
    where: { userId },
    select: {
      id: true,
      employmentStatus: true,
    },
  });

  if (!crewMember) {
    throw new CrewPortalRequestError("Your user account is not linked to a crew profile.");
  }

  if (crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new CrewPortalRequestError("Crew profile must be active before submitting requests.");
  }

  return crewMember;
}

function revalidateCrewPortalPaths(crewMemberId: string) {
  revalidatePath("/crew/portal");
  revalidatePath(`/crew/${crewMemberId}`);
  revalidatePath("/crew/scheduling");
  revalidatePath("/crew/scheduling/time-off");
  revalidatePath("/crew/scheduling/periods");
}

export async function submitCrewPortalTimeOffRequestAction(formData: FormData) {
  const currentUser = await requireRole([UserRole.CREW]);
  let crewMemberId: string | undefined;

  try {
    const crewMember = await getLinkedCrewMember(currentUser.id);
    crewMemberId = crewMember.id;
    const startDate = parseRequiredDateTime(formData, "startDate", "Start date/time");
    const endDate = parseRequiredDateTime(formData, "endDate", "End date/time");

    if (endDate <= startDate) {
      throw new CrewPortalRequestError("End date/time must be after start date/time.");
    }

    await prisma.timeOffRequest.create({
      data: {
        crewMemberId: crewMember.id,
        endDate,
        reason: getOptionalText(formData, "reason"),
        requestedById: currentUser.id,
        requestType: parseTimeOffRequestType(formData),
        startDate,
        status: TimeOffRequestStatus.PENDING,
      },
    });
  } catch (error) {
    redirect(`/crew/portal?error=${encodeError(error)}#request-submission`);
  }

  if (crewMemberId) {
    revalidateCrewPortalPaths(crewMemberId);
  }
  redirect("/crew/portal?submitted=time-off#request-submission");
}

export async function submitCrewPortalScheduleRequestAction(formData: FormData) {
  const currentUser = await requireRole([UserRole.CREW]);
  let crewMemberId: string | undefined;

  try {
    const crewMember = await getLinkedCrewMember(currentUser.id);
    crewMemberId = crewMember.id;
    const periodId = getRequiredText(formData, "periodId", "Schedule period");
    const requestType = parseScheduleRequestType(formData);
    const startDate = parseOptionalDate(formData, "startDate", "Start date");
    const endDate = parseOptionalDate(formData, "endDate", "End date");
    const requestedPatternId = getOptionalText(formData, "requestedPatternId");
    const requestedSwapCrewMemberId = getOptionalText(formData, "requestedSwapCrewMemberId");

    if (startDate && endDate && endDate < startDate) {
      throw new CrewPortalRequestError("End date must be on or after start date.");
    }

    if (requestType === CrewScheduleRequestType.PATTERN_REQUEST && !requestedPatternId) {
      throw new CrewPortalRequestError("Pattern request requires a requested pattern.");
    }

    if (requestType === CrewScheduleRequestType.SWAP_REQUEST && !requestedSwapCrewMemberId) {
      throw new CrewPortalRequestError("Swap request requires another crew member.");
    }

    const [period, requestedPattern, requestedSwapCrewMember] = await Promise.all([
      prisma.crewSchedulePeriod.findUnique({
        where: { id: periodId },
        select: { id: true, status: true },
      }),
      requestedPatternId
        ? prisma.crewRotationPattern.findUnique({
            where: { id: requestedPatternId },
            select: { id: true, isActive: true },
          })
        : Promise.resolve(null),
      requestedSwapCrewMemberId
        ? prisma.crewMember.findUnique({
            where: { id: requestedSwapCrewMemberId },
            select: { id: true, employmentStatus: true },
          })
        : Promise.resolve(null),
    ]);

    if (
      !period ||
      (period.status !== CrewSchedulePeriodStatus.BID_OPEN &&
        period.status !== CrewSchedulePeriodStatus.DRAFTING)
    ) {
      throw new CrewPortalRequestError("Schedule period is not open for requests.");
    }

    if (requestedPatternId && (!requestedPattern || !requestedPattern.isActive)) {
      throw new CrewPortalRequestError("Requested pattern is not active.");
    }

    if (
      requestedSwapCrewMemberId &&
      (!requestedSwapCrewMember ||
        requestedSwapCrewMember.employmentStatus !== EmploymentStatus.ACTIVE ||
        requestedSwapCrewMember.id === crewMember.id)
    ) {
      throw new CrewPortalRequestError("Requested swap crew member is not valid.");
    }

    await prisma.crewScheduleRequest.create({
      data: {
        crewMemberId: crewMember.id,
        endDate,
        periodId,
        preferredDutyStatus: parseOptionalDutyStatus(formData),
        requestedPatternId,
        requestedSwapCrewMemberId,
        requestNotes: getOptionalText(formData, "requestNotes"),
        requestType,
        startDate,
        status: CrewScheduleRequestStatus.SUBMITTED,
        submittedById: currentUser.id,
      },
    });
  } catch (error) {
    redirect(`/crew/portal?error=${encodeError(error)}#request-submission`);
  }

  if (crewMemberId) {
    revalidateCrewPortalPaths(crewMemberId);
  }
  redirect("/crew/portal?submitted=schedule#request-submission");
}
