"use server";

import {
  AircraftStatus,
  AircraftType,
  Prisma,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

class AircraftWorkflowError extends Error {}

function getRequiredText(formData: FormData, key: string, label: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AircraftWorkflowError(`${label} is required.`);
  }

  return value.trim();
}

function getOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseAircraftType(value: string): AircraftType {
  if (value === AircraftType.CL_65 || value === AircraftType.EMB_135_145) {
    return value;
  }

  throw new AircraftWorkflowError("Aircraft type is invalid.");
}

function parseAircraftStatus(value: string): AircraftStatus {
  if (
    value === AircraftStatus.AVAILABLE ||
    value === AircraftStatus.IN_MAINTENANCE ||
    value === AircraftStatus.RESERVED ||
    value === AircraftStatus.IN_FLIGHT ||
    value === AircraftStatus.OUT_OF_SERVICE
  ) {
    return value;
  }

  throw new AircraftWorkflowError("Aircraft status is invalid.");
}

function parseSeats(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const seats = Number(value);

  if (!Number.isInteger(seats) || seats <= 0) {
    throw new AircraftWorkflowError("Seats must be a positive whole number.");
  }

  return seats;
}

function encodeError(error: unknown): string {
  if (error instanceof AircraftWorkflowError) {
    return error.message;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "An aircraft with that tail number already exists.";
  }

  throw error;
}

function aircraftFilterForStatus(status: AircraftStatus): string | null {
  if (status === AircraftStatus.AVAILABLE) {
    return "available";
  }

  if (status === AircraftStatus.IN_FLIGHT) {
    return "in-flight";
  }

  if (status === AircraftStatus.OUT_OF_SERVICE) {
    return "aog";
  }

  return null;
}

function createReturnHref(aircraftId: string, status: AircraftStatus, returnFilter: string | null): string {
  const params = new URLSearchParams();
  const statusFilter = aircraftFilterForStatus(status);

  if (returnFilter && returnFilter === statusFilter) {
    params.set("filter", returnFilter);
  }

  params.set("panel", "aircraft");
  params.set("selected", aircraftId);
  params.set("created", "1");

  return `/aircraft?${params.toString()}`;
}

function createErrorHref(returnFilter: string | null, error: unknown): string {
  const params = new URLSearchParams();

  if (returnFilter && returnFilter !== "all") {
    params.set("filter", returnFilter);
  }

  params.set("panel", "create");
  params.set("error", encodeError(error));

  return `/aircraft?${params.toString()}`;
}

async function ensureActiveStation(homeStationId: string | null) {
  if (!homeStationId) {
    return null;
  }

  const station = await prisma.station.findFirst({
    where: {
      id: homeStationId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!station) {
    throw new AircraftWorkflowError("Home station was not found.");
  }

  return station.id;
}

export async function createAircraftAction(formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  const returnFilter = getOptionalText(formData, "returnFilter");
  let createdAircraft: { id: string; status: AircraftStatus } | null = null;

  try {
    const status = parseAircraftStatus(getRequiredText(formData, "status", "Status"));
    const homeStationId = await ensureActiveStation(getOptionalText(formData, "homeStationId"));

    createdAircraft = await prisma.aircraft.create({
      data: {
        homeStationId,
        name: getOptionalText(formData, "name"),
        seats: parseSeats(getOptionalText(formData, "seats")),
        status,
        tailNumber: getRequiredText(formData, "tailNumber", "Tail number").toUpperCase(),
        type: parseAircraftType(getRequiredText(formData, "type", "Aircraft type")),
      },
      select: {
        id: true,
        status: true,
      },
    });
  } catch (error) {
    redirect(createErrorHref(returnFilter, error));
  }

  revalidatePath("/aircraft");
  revalidatePath("/api/health");

  redirect(createReturnHref(createdAircraft.id, createdAircraft.status, returnFilter));
}
