"use server";

import { AircraftFuelEventType, AssignmentStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  gallonsFromPounds,
  getDefaultOperatorFuelSetting,
  parseNonNegativeDecimalInput,
} from "@/lib/fuel";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

class FlightLegFuelWorkflowError extends Error {}

function getOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRecordedAt(value: string | null): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new FlightLegFuelWorkflowError("Recorded time must be a valid date/time.");
  }

  return parsed;
}

function encodeError(error: unknown): string {
  if (error instanceof FlightLegFuelWorkflowError || error instanceof Error) {
    return encodeURIComponent(error.message);
  }

  throw error;
}

async function getFlightLegFuelContext(flightLegId: string) {
  const flightLeg = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: {
      aircraftAssignments: {
        orderBy: { assignedAt: "desc" },
        select: {
          aircraftId: true,
        },
        take: 1,
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
      },
      id: true,
      operatorId: true,
    },
  });

  if (!flightLeg) {
    throw new FlightLegFuelWorkflowError("FlightLeg was not found.");
  }

  const aircraftId = flightLeg.aircraftAssignments[0]?.aircraftId ?? null;

  if (!aircraftId) {
    throw new FlightLegFuelWorkflowError("FlightLeg does not have an assigned aircraft.");
  }

  return {
    aircraftId,
    operatorId: flightLeg.operatorId,
  };
}

function revalidateFlightLegFuelPaths(flightLegId: string, aircraftId: string) {
  revalidatePath("/");
  revalidatePath("/operations-control");
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}/fuel`);
  revalidatePath(`/operations-control/${flightLegId}/weight-balance`);
  revalidatePath("/aircraft");
  revalidatePath(`/aircraft/${aircraftId}`);
  revalidatePath(`/aircraft/${aircraftId}/fuel`);
  revalidatePath("/api/health");
}

async function createFlightLegFuelEvent(
  flightLegId: string,
  eventType: AircraftFuelEventType,
  formData: FormData,
) {
  const currentUser = await requireRole([
    UserRole.ADMIN,
    UserRole.OPS,
    UserRole.DISPATCH,
    UserRole.CREW,
    UserRole.MAINTENANCE,
  ]);

  try {
    const context = await getFlightLegFuelContext(flightLegId);
    const setting = await getDefaultOperatorFuelSetting(context.operatorId);
    const density = setting.defaultJetAFuelDensityLbsPerGallon.toString();
    const fuelOnboardLbs = parseNonNegativeDecimalInput(
      formData.get("fuelOnboardLbs"),
      "Fuel onboard",
      { required: true },
    );
    if (fuelOnboardLbs === null) {
      throw new FlightLegFuelWorkflowError("Fuel onboard is required.");
    }
    const fueledReady =
      eventType === AircraftFuelEventType.RELEASE_ONBOARD
        ? formData.get("fueledReady") === "on"
        : null;

    await prisma.aircraftFuelEvent.create({
      data: {
        aircraftId: context.aircraftId,
        eventType,
        flightLegId,
        fuelDensityLbsPerGallon: density,
        fueledReady,
        fuelOnboardGallons: gallonsFromPounds(fuelOnboardLbs, density),
        fuelOnboardLbs,
        notes: getOptionalText(formData, "notes"),
        recordedAt: parseRecordedAt(getOptionalText(formData, "recordedAt")),
        recordedById: currentUser.id,
      },
    });

    revalidateFlightLegFuelPaths(flightLegId, context.aircraftId);
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/fuel?error=${encodeError(error)}`);
  }

  redirect(`/operations-control/${flightLegId}/fuel`);
}

export async function recordReleaseFuelAction(flightLegId: string, formData: FormData) {
  await createFlightLegFuelEvent(flightLegId, AircraftFuelEventType.RELEASE_ONBOARD, formData);
}

export async function recordPostflightFuelAction(flightLegId: string, formData: FormData) {
  await createFlightLegFuelEvent(flightLegId, AircraftFuelEventType.POSTFLIGHT_ONBOARD, formData);
}
