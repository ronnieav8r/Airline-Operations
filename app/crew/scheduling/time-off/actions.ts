"use server";

import {
  EmploymentStatus,
  Prisma,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

class TimeOffWorkflowError extends Error {}

type TimeOffRequestInput = {
  crewMemberId: string;
  endDate: Date;
  reason: string | null;
  requestType: TimeOffRequestType;
  startDate: Date;
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
    throw new TimeOffWorkflowError(`${label} is required.`);
  }

  return value;
}

function parseRequiredDateTime(formData: FormData, key: string, label: string): Date {
  const value = getRequiredText(formData, key, label);
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new TimeOffWorkflowError(`${label} must be a valid date and time.`);
  }

  return parsed;
}

function parseRequestType(formData: FormData): TimeOffRequestType {
  const value = getRequiredText(formData, "requestType", "Request type");

  if (
    value === TimeOffRequestType.VACATION ||
    value === TimeOffRequestType.SICK ||
    value === TimeOffRequestType.PERSONAL ||
    value === TimeOffRequestType.TRAINING ||
    value === TimeOffRequestType.OTHER
  ) {
    return value;
  }

  throw new TimeOffWorkflowError("Request type is not valid.");
}

function parseRequestInput(formData: FormData): TimeOffRequestInput {
  const startDate = parseRequiredDateTime(formData, "startDate", "Start date/time");
  const endDate = parseRequiredDateTime(formData, "endDate", "End date/time");

  if (endDate <= startDate) {
    throw new TimeOffWorkflowError("End date/time must be after start date/time.");
  }

  return {
    crewMemberId: getRequiredText(formData, "crewMemberId", "Crew member"),
    endDate,
    reason: getOptionalText(formData, "reason"),
    requestType: parseRequestType(formData),
    startDate,
  };
}

function encodeError(error: unknown): string {
  if (error instanceof TimeOffWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return encodeURIComponent("Time-off workflow failed because a database rule was violated.");
  }

  return encodeURIComponent("Time-off workflow failed.");
}

async function ensureActiveCrewMember(tx: Prisma.TransactionClient, crewMemberId: string) {
  const crewMember = await tx.crewMember.findUnique({
    where: { id: crewMemberId },
    select: {
      employmentStatus: true,
    },
  });

  if (!crewMember) {
    throw new TimeOffWorkflowError("Crew member was not found.");
  }

  if (crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new TimeOffWorkflowError("Crew member must have active employment.");
  }
}

async function ensureReviewableRequest(
  tx: Prisma.TransactionClient,
  requestId: string,
  nextStatus: TimeOffRequestStatus,
) {
  const request = await tx.timeOffRequest.findUnique({
    where: { id: requestId },
    select: {
      crewMemberId: true,
      status: true,
    },
  });

  if (!request) {
    throw new TimeOffWorkflowError("Time-off request was not found.");
  }

  if (
    (nextStatus === TimeOffRequestStatus.APPROVED ||
      nextStatus === TimeOffRequestStatus.DENIED) &&
    request.status !== TimeOffRequestStatus.PENDING
  ) {
    throw new TimeOffWorkflowError("Only pending requests can be approved or denied.");
  }

  if (
    nextStatus === TimeOffRequestStatus.CANCELLED &&
    request.status !== TimeOffRequestStatus.PENDING &&
    request.status !== TimeOffRequestStatus.APPROVED
  ) {
    throw new TimeOffWorkflowError("Only pending or approved requests can be cancelled.");
  }

  return request;
}

function revalidateTimeOffWorkflowPaths(crewMemberId?: string) {
  revalidatePath("/");
  revalidatePath("/crew");
  revalidatePath("/crew/scheduling");
  revalidatePath("/crew/scheduling/time-off");
  revalidatePath("/aircraft");
  revalidatePath("/operations-control");

  if (crewMemberId) {
    revalidatePath(`/crew/${crewMemberId}`);
  }
}

export async function createTimeOffRequestAction(formData: FormData) {
  let crewMemberId: string | undefined;

  try {
    const input = parseRequestInput(formData);
    crewMemberId = input.crewMemberId;

    await prisma.$transaction(async (tx) => {
      await ensureActiveCrewMember(tx, input.crewMemberId);
      await tx.timeOffRequest.create({
        data: {
          crewMemberId: input.crewMemberId,
          endDate: input.endDate,
          reason: input.reason,
          requestType: input.requestType,
          startDate: input.startDate,
          status: TimeOffRequestStatus.PENDING,
        },
      });
    });
  } catch (error) {
    redirect(`/crew/scheduling/time-off?error=${encodeError(error)}`);
  }

  revalidateTimeOffWorkflowPaths(crewMemberId);
  redirect("/crew/scheduling/time-off");
}

export async function reviewTimeOffRequestAction(
  requestId: string,
  nextStatus: TimeOffRequestStatus,
) {
  let crewMemberId: string | undefined;

  try {
    if (
      nextStatus !== TimeOffRequestStatus.APPROVED &&
      nextStatus !== TimeOffRequestStatus.DENIED &&
      nextStatus !== TimeOffRequestStatus.CANCELLED
    ) {
      throw new TimeOffWorkflowError("Review status is not valid.");
    }

    await prisma.$transaction(async (tx) => {
      const request = await ensureReviewableRequest(tx, requestId, nextStatus);
      crewMemberId = request.crewMemberId;
      await tx.timeOffRequest.update({
        where: { id: requestId },
        data: {
          reviewedAt: new Date(),
          status: nextStatus,
        },
      });
    });
  } catch (error) {
    redirect(`/crew/scheduling/time-off?error=${encodeError(error)}`);
  }

  revalidateTimeOffWorkflowPaths(crewMemberId);
  redirect("/crew/scheduling/time-off");
}
