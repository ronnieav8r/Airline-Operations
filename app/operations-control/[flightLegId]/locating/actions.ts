"use server";

import { FlightLocatingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

class FlightLocatingWorkflowError extends Error {}

type LocatingInput = {
  responsibleParty: string | null;
  plannedRoute: string | null;
  lastKnownPosition: string | null;
  notes: string | null;
};

type PositionReportInput = {
  reportedAt: Date;
  positionSummary: string;
  latitude: string | null;
  longitude: string | null;
  altitude: number | null;
  groundspeed: number | null;
  heading: number | null;
  source: string;
  notes: string | null;
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
    throw new FlightLocatingWorkflowError(`${label} is required.`);
  }

  return value;
}

function parseRequiredDate(formData: FormData, key: string, label: string): Date {
  const value = getRequiredText(formData, key, label);
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new FlightLocatingWorkflowError(`${label} must be a valid date and time.`);
  }

  return parsed;
}

function parseOptionalDecimalString(
  formData: FormData,
  key: string,
  label: string,
  min: number,
  max: number,
): string | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new FlightLocatingWorkflowError(`${label} must be between ${min} and ${max}.`);
  }

  return parsed.toFixed(6);
}

function parseOptionalInteger(
  formData: FormData,
  key: string,
  label: string,
  min: number,
  max: number,
): number | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new FlightLocatingWorkflowError(`${label} must be a whole number between ${min} and ${max}.`);
  }

  return parsed;
}

function parseLocatingInput(formData: FormData): LocatingInput {
  return {
    responsibleParty: getOptionalText(formData, "responsibleParty"),
    plannedRoute: getOptionalText(formData, "plannedRoute"),
    lastKnownPosition: getOptionalText(formData, "lastKnownPosition"),
    notes: getOptionalText(formData, "notes"),
  };
}

function parsePositionReportInput(formData: FormData): PositionReportInput {
  return {
    reportedAt: parseRequiredDate(formData, "reportedAt", "Reported time"),
    positionSummary: getRequiredText(formData, "positionSummary", "Position summary"),
    latitude: parseOptionalDecimalString(formData, "latitude", "Latitude", -90, 90),
    longitude: parseOptionalDecimalString(formData, "longitude", "Longitude", -180, 180),
    altitude: parseOptionalInteger(formData, "altitude", "Altitude", -1500, 100000),
    groundspeed: parseOptionalInteger(formData, "groundspeed", "Groundspeed", 0, 1000),
    heading: parseOptionalInteger(formData, "heading", "Heading", 0, 360),
    source: getOptionalText(formData, "source") ?? "MANUAL",
    notes: getOptionalText(formData, "notes"),
  };
}

function encodeError(error: unknown): string {
  if (error instanceof FlightLocatingWorkflowError) {
    return encodeURIComponent(error.message);
  }

  throw error;
}

async function ensureFlightLegExists(flightLegId: string) {
  const flightLeg = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: { id: true },
  });

  if (!flightLeg) {
    throw new FlightLocatingWorkflowError("FlightLeg was not found.");
  }
}

function revalidateLocatingPaths(flightLegId: string) {
  revalidatePath("/operations-control");
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}/locating`);
  revalidatePath("/api/health");
}

export async function saveFlightLocatingAction(flightLegId: string, formData: FormData) {
  try {
    await ensureFlightLegExists(flightLegId);
    const input = parseLocatingInput(formData);

    await prisma.flightLocatingRecord.upsert({
      where: { flightLegId },
      update: input,
      create: {
        flightLegId,
        ...input,
        status: FlightLocatingStatus.NOT_STARTED,
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/locating?error=${encodeError(error)}`);
  }

  revalidateLocatingPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/locating`);
}

export async function setFlightLocatingStatusAction(
  flightLegId: string,
  status: FlightLocatingStatus,
) {
  try {
    await ensureFlightLegExists(flightLegId);
    const now = new Date();

    await prisma.flightLocatingRecord.upsert({
      where: { flightLegId },
      update: {
        status,
        activatedAt: status === FlightLocatingStatus.ACTIVE ? now : undefined,
        closedAt: status === FlightLocatingStatus.CLOSED ? now : undefined,
      },
      create: {
        flightLegId,
        status,
        activatedAt: status === FlightLocatingStatus.ACTIVE ? now : undefined,
        closedAt: status === FlightLocatingStatus.CLOSED ? now : undefined,
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/locating?error=${encodeError(error)}`);
  }

  revalidateLocatingPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/locating`);
}

export async function addPositionReportAction(flightLegId: string, formData: FormData) {
  try {
    await ensureFlightLegExists(flightLegId);
    const input = parsePositionReportInput(formData);

    await prisma.$transaction(async (tx) => {
      const locatingRecord = await tx.flightLocatingRecord.upsert({
        where: { flightLegId },
        update: {},
        create: {
          flightLegId,
          status: FlightLocatingStatus.NOT_STARTED,
          lastKnownPosition: input.positionSummary,
        },
        select: { id: true },
      });

      await tx.positionReport.create({
        data: {
          flightLocatingRecordId: locatingRecord.id,
          reportedAt: input.reportedAt,
          positionSummary: input.positionSummary,
          latitude: input.latitude,
          longitude: input.longitude,
          altitude: input.altitude,
          groundspeed: input.groundspeed,
          heading: input.heading,
          source: input.source,
          notes: input.notes,
        },
      });

      const latestReport = await tx.positionReport.findFirst({
        where: { flightLocatingRecordId: locatingRecord.id },
        orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
        select: { positionSummary: true },
      });

      await tx.flightLocatingRecord.update({
        where: { id: locatingRecord.id },
        data: {
          lastKnownPosition: latestReport?.positionSummary ?? input.positionSummary,
        },
      });
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/locating?error=${encodeError(error)}`);
  }

  revalidateLocatingPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}/locating`);
}
