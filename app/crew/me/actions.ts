"use server";

import {
  AircraftFuelEventType,
  AssignmentStatus,
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  CrewScheduleRequestType,
  DutyStatus,
  EmploymentStatus,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCrewPortalUser } from "@/lib/auth/crew-portal";
import { assertCrewAssignedToFlightLeg } from "@/lib/crew-me-queries";
import {
  AircraftLogbookError,
  createCrewSquawkLogbookEntry,
  parseLogbookAttachmentFile,
} from "@/lib/aircraft-logbook";
import {
  gallonsFromPounds,
  getDefaultOperatorFuelSetting,
  parseNonNegativeDecimalInput,
} from "@/lib/fuel";
import { prisma } from "@/lib/prisma";

class CrewMeRequestError extends Error {}

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
    throw new CrewMeRequestError(`${label} is required.`);
  }

  return value;
}

function parseRequiredDateTime(formData: FormData, key: string, label: string): Date {
  const parsed = new Date(getRequiredText(formData, key, label));

  if (Number.isNaN(parsed.getTime())) {
    throw new CrewMeRequestError(`${label} must be a valid date/time.`);
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
    throw new CrewMeRequestError(`${label} must be a valid date.`);
  }

  return parsed;
}

function parseTimeOffRequestType(formData: FormData): TimeOffRequestType {
  const value = getRequiredText(formData, "requestType", "Request type");

  if (Object.values(TimeOffRequestType).includes(value as TimeOffRequestType)) {
    return value as TimeOffRequestType;
  }

  throw new CrewMeRequestError("Time-off request type is not valid.");
}

function parseScheduleRequestType(formData: FormData): CrewScheduleRequestType {
  const value = getRequiredText(formData, "requestType", "Request type");

  if (Object.values(CrewScheduleRequestType).includes(value as CrewScheduleRequestType)) {
    return value as CrewScheduleRequestType;
  }

  throw new CrewMeRequestError("Schedule request type is not valid.");
}

function parseOptionalDutyStatus(formData: FormData): DutyStatus | null {
  const value = getOptionalText(formData, "preferredDutyStatus");

  if (!value) {
    return null;
  }

  if (Object.values(DutyStatus).includes(value as DutyStatus)) {
    return value as DutyStatus;
  }

  throw new CrewMeRequestError("Preferred duty status is not valid.");
}

function encodeError(error: unknown): string {
  if (error instanceof CrewMeRequestError || error instanceof Error) {
    return encodeURIComponent(error.message);
  }

  return encodeURIComponent("Crew request failed.");
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
    throw new CrewMeRequestError("Your user account is not linked to a crew profile.");
  }

  if (crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new CrewMeRequestError("Crew profile must be active before submitting requests.");
  }

  return crewMember;
}

function revalidateCrewMePaths(crewMemberId: string) {
  revalidatePath("/crew/me");
  revalidatePath(`/crew/${crewMemberId}`);
  revalidatePath("/crew/scheduling");
  revalidatePath("/crew/scheduling/time-off");
  revalidatePath("/crew/scheduling/periods");
}

function revalidateCrewFuelPaths(flightLegId: string, aircraftId: string) {
  revalidatePath("/crew/me");
  revalidatePath(`/crew/me/flights/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}/fuel`);
  revalidatePath(`/operations-control/${flightLegId}/weight-balance`);
  revalidatePath(`/aircraft/${aircraftId}`);
  revalidatePath(`/aircraft/${aircraftId}/fuel`);
}

function revalidateCrewSquawkPaths(flightLegId: string, aircraftId: string) {
  revalidatePath("/crew/me");
  revalidatePath(`/crew/me/flights/${flightLegId}`);
  revalidatePath(`/aircraft/${aircraftId}`);
  revalidatePath(`/aircraft/${aircraftId}/airworthiness`);
  revalidatePath(`/aircraft/${aircraftId}/logbook`);
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath("/operations-control");
}

function crewRedirectTarget(value: string | null): string {
  if (value?.startsWith("/crew/me")) {
    return value;
  }

  return "/crew/me?tab=today";
}

export async function submitCrewMeTimeOffRequestAction(formData: FormData) {
  const currentUser = await requireCrewPortalUser();
  let crewMemberId: string | undefined;

  try {
    const crewMember = await getLinkedCrewMember(currentUser.id);
    crewMemberId = crewMember.id;
    const startDate = parseRequiredDateTime(formData, "startDate", "Start date/time");
    const endDate = parseRequiredDateTime(formData, "endDate", "End date/time");

    if (endDate <= startDate) {
      throw new CrewMeRequestError("End date/time must be after start date/time.");
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
    redirect(`/crew/me?tab=requests&error=${encodeError(error)}`);
  }

  if (crewMemberId) {
    revalidateCrewMePaths(crewMemberId);
  }
  redirect("/crew/me?tab=requests&submitted=time-off");
}

export async function submitCrewMeScheduleRequestAction(formData: FormData) {
  const currentUser = await requireCrewPortalUser();
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
      throw new CrewMeRequestError("End date must be on or after start date.");
    }

    if (requestType === CrewScheduleRequestType.PATTERN_REQUEST && !requestedPatternId) {
      throw new CrewMeRequestError("Pattern request requires a requested pattern.");
    }

    if (requestType === CrewScheduleRequestType.SWAP_REQUEST && !requestedSwapCrewMemberId) {
      throw new CrewMeRequestError("Swap request requires another crew member.");
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
      throw new CrewMeRequestError("Schedule period is not open for requests.");
    }

    if (requestedPatternId && (!requestedPattern || !requestedPattern.isActive)) {
      throw new CrewMeRequestError("Requested pattern is not active.");
    }

    if (
      requestedSwapCrewMemberId &&
      (!requestedSwapCrewMember ||
        requestedSwapCrewMember.employmentStatus !== EmploymentStatus.ACTIVE ||
        requestedSwapCrewMember.id === crewMember.id)
    ) {
      throw new CrewMeRequestError("Requested swap crew member is not valid.");
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
    redirect(`/crew/me?tab=requests&error=${encodeError(error)}`);
  }

  if (crewMemberId) {
    revalidateCrewMePaths(crewMemberId);
  }
  redirect("/crew/me?tab=requests&submitted=schedule");
}

export async function recordCrewMeReleaseFuelAction(flightLegId: string, formData: FormData) {
  const currentUser = await requireCrewPortalUser();
  let aircraftId: string | null = null;

  try {
    await assertCrewAssignedToFlightLeg(currentUser.id, flightLegId);

    const flightLeg = await prisma.flightLeg.findUnique({
      where: { id: flightLegId },
      select: {
        aircraftAssignments: {
          orderBy: { assignedAt: "desc" },
          select: { aircraftId: true },
          take: 1,
          where: { status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] } },
        },
        operatorId: true,
      },
    });

    if (!flightLeg) {
      throw new CrewMeRequestError("Flight was not found.");
    }

    aircraftId = flightLeg.aircraftAssignments[0]?.aircraftId ?? null;

    if (!aircraftId) {
      throw new CrewMeRequestError("This flight does not have an assigned aircraft.");
    }

    const setting = await getDefaultOperatorFuelSetting(flightLeg.operatorId);
    const density = setting.defaultJetAFuelDensityLbsPerGallon.toString();
    const fuelOnboardLbs = parseNonNegativeDecimalInput(
      formData.get("fuelOnboardLbs"),
      "Fuel onboard",
      { required: true },
    );

    if (!fuelOnboardLbs) {
      throw new CrewMeRequestError("Fuel onboard is required.");
    }

    await prisma.aircraftFuelEvent.create({
      data: {
        aircraftId,
        eventType: AircraftFuelEventType.RELEASE_ONBOARD,
        flightLegId,
        fuelDensityLbsPerGallon: density,
        fueledReady: formData.get("fueledReady") === "on",
        fuelOnboardGallons: gallonsFromPounds(fuelOnboardLbs, density),
        fuelOnboardLbs,
        notes: getOptionalText(formData, "notes"),
        recordedAt: new Date(),
        recordedById: currentUser.id,
      },
    });
  } catch (error) {
    redirect(`/crew/me?tab=today&error=${encodeError(error)}`);
  }

  if (aircraftId) {
    revalidateCrewFuelPaths(flightLegId, aircraftId);
  }

  redirect("/crew/me?tab=today&submitted=fuel");
}

export async function submitCrewMeSquawkAction(flightLegId: string, formData: FormData) {
  const currentUser = await requireCrewPortalUser();
  let aircraftId: string | null = null;
  const redirectTo = crewRedirectTarget(getOptionalText(formData, "redirectTo"));

  try {
    const result = await createCrewSquawkLogbookEntry({
      actorId: currentUser.id,
      file: parseLogbookAttachmentFile(formData),
      flightLegId,
      formData,
    });
    aircraftId = result.aircraftId;
  } catch (error) {
    const encoded =
      error instanceof AircraftLogbookError || error instanceof Error
        ? encodeURIComponent(error.message)
        : encodeURIComponent("Crew squawk could not be saved.");
    redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}error=${encoded}`);
  }

  if (aircraftId) {
    revalidateCrewSquawkPaths(flightLegId, aircraftId);
  }

  redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}submitted=squawk`);
}
