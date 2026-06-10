"use server";

import {
  CrewLocationSource,
  CrewLogisticsNeedStatus,
  CrewLogisticsNeedType,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const LOGISTICS_ROLES = [UserRole.ADMIN, UserRole.OPS] as const;

function encodeError(error: unknown): string {
  return encodeURIComponent(error instanceof Error ? error.message : "Unable to save logistics record.");
}

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function optionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalDate(formData: FormData, key: string): Date | null {
  const value = optionalString(formData, key);
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${key} must be a valid date/time.`);
  }
  return parsed;
}

function enumValue<T extends Record<string, string>>(value: string, source: T, label: string): T[keyof T] {
  const allowed = Object.values(source);
  if (!allowed.includes(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as T[keyof T];
}

async function ensureCrewMember(crewMemberId: string) {
  const crewMember = await prisma.crewMember.findUnique({
    where: { id: crewMemberId },
    select: { id: true },
  });

  if (!crewMember) {
    throw new Error("Crew member not found.");
  }
}

async function validateOptionalReference(
  id: string | null,
  model: "aircraft" | "flightLeg" | "station",
  label: string,
) {
  if (!id) {
    return;
  }

  const record =
    model === "aircraft"
      ? await prisma.aircraft.findUnique({ where: { id }, select: { id: true } })
      : model === "flightLeg"
        ? await prisma.flightLeg.findUnique({ where: { id }, select: { id: true } })
        : await prisma.station.findUnique({ where: { id }, select: { id: true } });

  if (!record) {
    throw new Error(`${label} was not found.`);
  }
}

function revalidateLogisticsViews(crewMemberId: string) {
  revalidatePath(`/crew/${crewMemberId}`);
  revalidatePath(`/crew/${crewMemberId}/logistics`);
  revalidatePath("/crew");
  revalidatePath("/crew/scheduling");
  revalidatePath("/aircraft");
  revalidatePath("/api/health");
}

export async function createCrewLocationRecordAction(crewMemberId: string, formData: FormData) {
  const currentUser = await requireRole(LOGISTICS_ROLES);

  try {
    await ensureCrewMember(crewMemberId);
    const stationId = optionalString(formData, "stationId");
    const locationText = optionalString(formData, "locationText");

    if (!stationId && !locationText) {
      throw new Error("Station or free-text location is required.");
    }

    await validateOptionalReference(stationId, "station", "Station");

    await prisma.crewLocationRecord.create({
      data: {
        crewMemberId,
        createdById: currentUser.id,
        effectiveAt: optionalDate(formData, "effectiveAt") ?? new Date(),
        locationText,
        notes: optionalString(formData, "notes"),
        source: enumValue(requiredString(formData, "source"), CrewLocationSource, "Location source"),
        stationId,
      },
    });
  } catch (error) {
    redirect(`/crew/${crewMemberId}/logistics?error=${encodeError(error)}`);
  }

  revalidateLogisticsViews(crewMemberId);
  redirect(`/crew/${crewMemberId}/logistics`);
}

export async function updateCrewLocationRecordAction(
  crewMemberId: string,
  locationRecordId: string,
  formData: FormData,
) {
  await requireRole(LOGISTICS_ROLES);

  try {
    const existing = await prisma.crewLocationRecord.findUnique({
      where: { id: locationRecordId },
      select: { crewMemberId: true },
    });

    if (!existing || existing.crewMemberId !== crewMemberId) {
      throw new Error("Location record not found for this crew member.");
    }

    const stationId = optionalString(formData, "stationId");
    const locationText = optionalString(formData, "locationText");

    if (!stationId && !locationText) {
      throw new Error("Station or free-text location is required.");
    }

    await validateOptionalReference(stationId, "station", "Station");

    await prisma.crewLocationRecord.update({
      where: { id: locationRecordId },
      data: {
        effectiveAt: optionalDate(formData, "effectiveAt") ?? new Date(),
        locationText,
        notes: optionalString(formData, "notes"),
        source: enumValue(requiredString(formData, "source"), CrewLocationSource, "Location source"),
        stationId,
      },
    });
  } catch (error) {
    redirect(`/crew/${crewMemberId}/logistics?error=${encodeError(error)}`);
  }

  revalidateLogisticsViews(crewMemberId);
  redirect(`/crew/${crewMemberId}/logistics`);
}

export async function createCrewLogisticsNeedAction(crewMemberId: string, formData: FormData) {
  const currentUser = await requireRole(LOGISTICS_ROLES);

  try {
    await ensureCrewMember(crewMemberId);
    const aircraftId = optionalString(formData, "aircraftId");
    const flightLegId = optionalString(formData, "flightLegId");
    const fromStationId = optionalString(formData, "fromStationId");
    const toStationId = optionalString(formData, "toStationId");

    await validateOptionalReference(aircraftId, "aircraft", "Aircraft");
    await validateOptionalReference(flightLegId, "flightLeg", "FlightLeg");
    await validateOptionalReference(fromStationId, "station", "From station");
    await validateOptionalReference(toStationId, "station", "To station");

    await prisma.crewLogisticsNeed.create({
      data: {
        aircraftId,
        confirmationNumber: optionalString(formData, "confirmationNumber"),
        createdById: currentUser.id,
        flightLegId,
        fromStationId,
        needType: enumValue(requiredString(formData, "needType"), CrewLogisticsNeedType, "Need type"),
        neededBy: optionalDate(formData, "neededBy"),
        notes: optionalString(formData, "notes"),
        providerName: optionalString(formData, "providerName"),
        status: enumValue(requiredString(formData, "status"), CrewLogisticsNeedStatus, "Need status"),
        toStationId,
        crewMemberId,
      },
    });
  } catch (error) {
    redirect(`/crew/${crewMemberId}/logistics?error=${encodeError(error)}`);
  }

  revalidateLogisticsViews(crewMemberId);
  redirect(`/crew/${crewMemberId}/logistics`);
}

export async function updateCrewLogisticsNeedAction(
  crewMemberId: string,
  logisticsNeedId: string,
  formData: FormData,
) {
  await requireRole(LOGISTICS_ROLES);

  try {
    const existing = await prisma.crewLogisticsNeed.findUnique({
      where: { id: logisticsNeedId },
      select: { crewMemberId: true },
    });

    if (!existing || existing.crewMemberId !== crewMemberId) {
      throw new Error("Logistics need not found for this crew member.");
    }

    const aircraftId = optionalString(formData, "aircraftId");
    const flightLegId = optionalString(formData, "flightLegId");
    const fromStationId = optionalString(formData, "fromStationId");
    const toStationId = optionalString(formData, "toStationId");
    const status = enumValue(requiredString(formData, "status"), CrewLogisticsNeedStatus, "Need status");

    await validateOptionalReference(aircraftId, "aircraft", "Aircraft");
    await validateOptionalReference(flightLegId, "flightLeg", "FlightLeg");
    await validateOptionalReference(fromStationId, "station", "From station");
    await validateOptionalReference(toStationId, "station", "To station");

    await prisma.crewLogisticsNeed.update({
      where: { id: logisticsNeedId },
      data: {
        aircraftId,
        completedAt: status === CrewLogisticsNeedStatus.COMPLETED ? new Date() : null,
        confirmationNumber: optionalString(formData, "confirmationNumber"),
        flightLegId,
        fromStationId,
        needType: enumValue(requiredString(formData, "needType"), CrewLogisticsNeedType, "Need type"),
        neededBy: optionalDate(formData, "neededBy"),
        notes: optionalString(formData, "notes"),
        providerName: optionalString(formData, "providerName"),
        status,
        toStationId,
      },
    });
  } catch (error) {
    redirect(`/crew/${crewMemberId}/logistics?error=${encodeError(error)}`);
  }

  revalidateLogisticsViews(crewMemberId);
  redirect(`/crew/${crewMemberId}/logistics`);
}
