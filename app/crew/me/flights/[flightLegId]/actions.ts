"use server";

import {
  AircraftFuelEventType,
  FlightLegStatus,
  FlightPhaseStatus,
  OperatorManifestMode,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCrewPortalUser } from "@/lib/auth/crew-portal";
import { assertCrewAssignedToFlightLeg } from "@/lib/crew-me-queries";
import {
  isPostflightFuelReady,
  isPreflightComplete,
  resolveOperatorReleaseSetting,
} from "@/lib/flight-workflow";
import { prisma } from "@/lib/prisma";

class CrewFlightFormError extends Error {}

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
    throw new CrewFlightFormError(`${label} is required.`);
  }

  return value;
}

function parseRequiredDateTime(formData: FormData, key: string, label: string): Date {
  const parsed = new Date(getRequiredText(formData, key, label));

  if (Number.isNaN(parsed.getTime())) {
    throw new CrewFlightFormError(`${label} must be a valid date/time.`);
  }

  return parsed;
}

function encodeError(error: unknown): string {
  if (error instanceof CrewFlightFormError || error instanceof Error) {
    return encodeURIComponent(error.message);
  }

  return encodeURIComponent("Crew flight update failed.");
}

function assertChronologicalTimes(times: {
  inTime: Date;
  offTime: Date;
  onTime: Date;
  outTime: Date;
}) {
  if (times.offTime.getTime() < times.outTime.getTime()) {
    throw new CrewFlightFormError("OFF time must be after OUT time.");
  }

  if (times.onTime.getTime() < times.offTime.getTime()) {
    throw new CrewFlightFormError("ON time must be after OFF time.");
  }

  if (times.inTime.getTime() < times.onTime.getTime()) {
    throw new CrewFlightFormError("IN time must be after ON time.");
  }
}

function revalidateCrewFlightPaths(flightLegId: string) {
  revalidatePath("/crew/me");
  revalidatePath(`/crew/me/flights/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath("/operations-control");
}

export async function completeCrewPreflightAction(flightLegId: string, formData: FormData) {
  const currentUser = await requireCrewPortalUser();

  try {
    await assertCrewAssignedToFlightLeg(currentUser.id, flightLegId);

    const flightLeg = await prisma.flightLeg.findUnique({
      where: { id: flightLegId },
      select: {
        fuelEvents: {
          orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
          select: {
            eventType: true,
            fueledReady: true,
            fuelOnboardLbs: true,
          },
        },
        operator: {
          select: {
            releaseSetting: {
              select: {
                dispatcherEnabled: true,
                manifestMode: true,
              },
            },
          },
        },
        weightBalanceRuns: {
          orderBy: { createdAt: "desc" },
          select: { status: true },
          take: 1,
        },
      },
    });

    if (!flightLeg) {
      throw new CrewFlightFormError("Flight was not found.");
    }

    const releaseSetting = resolveOperatorReleaseSetting(flightLeg.operator.releaseSetting);
    const manifestVerified =
      releaseSetting.manifestMode === OperatorManifestMode.PREFLIGHT_VERIFY
        ? formData.get("manifestVerified") === "on"
        : false;
    const candidateRecord = {
      manifestVerified,
      status: FlightPhaseStatus.COMPLETE,
    };

    if (
      !isPreflightComplete({
        fuelEvents: flightLeg.fuelEvents,
        manifestMode: releaseSetting.manifestMode,
        preflightRecord: candidateRecord,
        weightBalanceStatus: flightLeg.weightBalanceRuns[0]?.status ?? null,
      })
    ) {
      throw new CrewFlightFormError(
        "Preflight requires release fuel ready, calculated or approved W&B, and manifest verification when configured.",
      );
    }

    await prisma.flightPreflightRecord.upsert({
      where: { flightLegId },
      create: {
        completedAt: new Date(),
        completedById: currentUser.id,
        flightLegId,
        manifestNotes: getOptionalText(formData, "manifestNotes"),
        manifestVerified,
        notes: getOptionalText(formData, "notes"),
        status: FlightPhaseStatus.COMPLETE,
      },
      update: {
        completedAt: new Date(),
        completedById: currentUser.id,
        manifestNotes: getOptionalText(formData, "manifestNotes"),
        manifestVerified,
        notes: getOptionalText(formData, "notes"),
        status: FlightPhaseStatus.COMPLETE,
      },
    });
  } catch (error) {
    redirect(`/crew/me/flights/${flightLegId}?error=${encodeError(error)}`);
  }

  revalidateCrewFlightPaths(flightLegId);
  redirect(`/crew/me/flights/${flightLegId}?submitted=preflight`);
}

export async function completeCrewPostflightAction(flightLegId: string, formData: FormData) {
  const currentUser = await requireCrewPortalUser();

  try {
    await assertCrewAssignedToFlightLeg(currentUser.id, flightLegId);

    const outTime = parseRequiredDateTime(formData, "outTime", "OUT time");
    const offTime = parseRequiredDateTime(formData, "offTime", "OFF time");
    const onTime = parseRequiredDateTime(formData, "onTime", "ON time");
    const inTime = parseRequiredDateTime(formData, "inTime", "IN time");
    const delayNotes = getOptionalText(formData, "delayNotes");
    const notes = getOptionalText(formData, "notes");

    assertChronologicalTimes({ inTime, offTime, onTime, outTime });

    const flightLeg = await prisma.flightLeg.findUnique({
      where: { id: flightLegId },
      select: {
        fuelEvents: {
          where: { eventType: AircraftFuelEventType.POSTFLIGHT_ONBOARD },
          orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
          select: {
            eventType: true,
            fueledReady: true,
            fuelOnboardLbs: true,
          },
        },
        status: true,
      },
    });

    if (!flightLeg) {
      throw new CrewFlightFormError("Flight was not found.");
    }

    if (flightLeg.status === FlightLegStatus.DELAYED && !delayNotes) {
      throw new CrewFlightFormError("Delay notes are required for delayed flights.");
    }

    if (!isPostflightFuelReady(flightLeg.fuelEvents)) {
      throw new CrewFlightFormError("Postflight requires landing/postflight fuel.");
    }

    await prisma.$transaction([
      prisma.flightPostflightRecord.upsert({
        where: { flightLegId },
        create: {
          completedAt: new Date(),
          completedById: currentUser.id,
          delayNotes,
          flightLegId,
          inTime,
          notes,
          offTime,
          onTime,
          outTime,
          status: FlightPhaseStatus.COMPLETE,
        },
        update: {
          completedAt: new Date(),
          completedById: currentUser.id,
          delayNotes,
          inTime,
          notes,
          offTime,
          onTime,
          outTime,
          status: FlightPhaseStatus.COMPLETE,
        },
      }),
      prisma.flightLeg.update({
        where: { id: flightLegId },
        data: {
          actualArrival: onTime,
          actualDeparture: offTime,
        },
      }),
    ]);
  } catch (error) {
    redirect(`/crew/me/flights/${flightLegId}?error=${encodeError(error)}`);
  }

  revalidateCrewFlightPaths(flightLegId);
  redirect(`/crew/me/flights/${flightLegId}?submitted=postflight`);
}
