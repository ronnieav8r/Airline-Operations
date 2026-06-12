"use server";

import { AircraftFuelEventType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  gallonsFromPounds,
  getDeploymentOperatorFuelSetting,
  getLatestAircraftFuelEvent,
  parseNonNegativeDecimalInput,
} from "@/lib/fuel";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

class AircraftFuelWorkflowError extends Error {}

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
    throw new AircraftFuelWorkflowError("Recorded time must be a valid date/time.");
  }

  return parsed;
}

function encodeError(error: unknown): string {
  if (error instanceof AircraftFuelWorkflowError || error instanceof Error) {
    return encodeURIComponent(error.message);
  }

  throw error;
}

async function ensureAircraft(aircraftId: string) {
  const aircraft = await prisma.aircraft.findUnique({
    where: { id: aircraftId },
    select: { id: true },
  });

  if (!aircraft) {
    throw new AircraftFuelWorkflowError("Aircraft was not found.");
  }
}

async function validateOptionalFlightLeg(aircraftId: string, flightLegId: string | null) {
  if (!flightLegId) {
    return null;
  }

  const assignment = await prisma.aircraftAssignment.findFirst({
    where: {
      aircraftId,
      flightLegId,
    },
    select: {
      flightLegId: true,
    },
  });

  if (!assignment) {
    throw new AircraftFuelWorkflowError("Selected FlightLeg is not assigned to this aircraft.");
  }

  return flightLegId;
}

function revalidateAircraftFuelPaths(aircraftId: string, flightLegId: string | null) {
  revalidatePath("/");
  revalidatePath("/aircraft");
  revalidatePath(`/aircraft/${aircraftId}`);
  revalidatePath(`/aircraft/${aircraftId}/fuel`);
  revalidatePath("/operations-control");
  revalidatePath("/api/health");

  if (flightLegId) {
    revalidatePath(`/operations-control/${flightLegId}`);
    revalidatePath(`/operations-control/${flightLegId}/fuel`);
    revalidatePath(`/operations-control/${flightLegId}/weight-balance`);
  }
}

export async function recordAircraftFuelEventAction(
  aircraftId: string,
  eventType: AircraftFuelEventType,
  formData: FormData,
) {
  const currentUser = await requireRole([
    UserRole.ADMIN,
    UserRole.OPS,
    UserRole.DISPATCH,
    UserRole.MAINTENANCE,
  ]);

  try {
    await ensureAircraft(aircraftId);

    const setting = await getDeploymentOperatorFuelSetting();
    const density = setting.defaultJetAFuelDensityLbsPerGallon.toString();
    const latest = await getLatestAircraftFuelEvent(aircraftId);
    const flightLegId = await validateOptionalFlightLeg(
      aircraftId,
      getOptionalText(formData, "flightLegId"),
    );
    const notes = getOptionalText(formData, "notes");
    const recordedAt = parseRecordedAt(getOptionalText(formData, "recordedAt"));
    const enteredChange = parseNonNegativeDecimalInput(formData.get("fuelChangeLbs"), "Fuel change");
    const enteredOnboard = parseNonNegativeDecimalInput(formData.get("fuelOnboardLbs"), "Fuel onboard");
    let fuelChangeLbs: string | null = null;
    let fuelOnboardLbs: string | null = null;

    if (eventType === AircraftFuelEventType.CORRECTION) {
      if (!enteredOnboard) {
        throw new AircraftFuelWorkflowError("Fuel onboard is required for a correction.");
      }
      fuelOnboardLbs = enteredOnboard;
    } else {
      if (!enteredChange) {
        throw new AircraftFuelWorkflowError("Fuel change is required.");
      }

      const changeNumber =
        eventType === AircraftFuelEventType.DEFUEL ? -Number(enteredChange) : Number(enteredChange);
      fuelChangeLbs = changeNumber.toFixed(2);

      if (latest) {
        fuelOnboardLbs = (Number(latest.fuelOnboardLbs.toString()) + changeNumber).toFixed(2);
      } else if (enteredOnboard) {
        fuelOnboardLbs = enteredOnboard;
      } else {
        throw new AircraftFuelWorkflowError(
          "First uplift/defuel needs fuel onboard after event, or record a correction first.",
        );
      }
    }

    if (Number(fuelOnboardLbs) < 0) {
      throw new AircraftFuelWorkflowError("Fuel onboard cannot be negative.");
    }

    await prisma.aircraftFuelEvent.create({
      data: {
        aircraftId,
        eventType,
        flightLegId,
        fuelChangeGallons: fuelChangeLbs ? gallonsFromPounds(fuelChangeLbs, density) : null,
        fuelChangeLbs,
        fuelDensityLbsPerGallon: density,
        fuelOnboardGallons: gallonsFromPounds(fuelOnboardLbs, density),
        fuelOnboardLbs,
        notes,
        recordedAt,
        recordedById: currentUser.id,
      },
    });

    revalidateAircraftFuelPaths(aircraftId, flightLegId);
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/fuel?error=${encodeError(error)}`);
  }

  redirect(`/aircraft/${aircraftId}/fuel`);
}
