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

function getOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseLocatingInput(formData: FormData): LocatingInput {
  return {
    responsibleParty: getOptionalText(formData, "responsibleParty"),
    plannedRoute: getOptionalText(formData, "plannedRoute"),
    lastKnownPosition: getOptionalText(formData, "lastKnownPosition"),
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
