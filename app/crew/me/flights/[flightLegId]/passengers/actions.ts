"use server";

import { revalidatePath } from "next/cache";

import { requireCrewPortalUser } from "@/lib/auth/crew-portal";
import { assertCrewAssignedToFlightLeg } from "@/lib/crew-me-queries";
import { prisma } from "@/lib/prisma";

class CrewPassengerManifestError extends Error {}

async function requireManifestItemOnAssignedFlight(userId: string, flightLegId: string, manifestItemId: string) {
  await assertCrewAssignedToFlightLeg(userId, flightLegId);

  const item = await prisma.manifestItem.findFirst({
    where: {
      id: manifestItemId,
      manifest: {
        flightLegId,
      },
    },
    select: {
      boardedAt: true,
      checkedInAt: true,
      id: true,
    },
  });

  if (!item) {
    throw new CrewPassengerManifestError("Passenger manifest item was not found for this flight.");
  }

  return item;
}

function revalidatePassengerManifestPaths(flightLegId: string) {
  revalidatePath("/crew/me");
  revalidatePath(`/crew/me/flights/${flightLegId}`);
  revalidatePath(`/crew/me/flights/${flightLegId}/passengers`);
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath(`/operations-control/${flightLegId}/manifest`);
}

export async function toggleCrewPassengerCheckedInAction(flightLegId: string, manifestItemId: string) {
  const currentUser = await requireCrewPortalUser();
  const item = await requireManifestItemOnAssignedFlight(currentUser.id, flightLegId, manifestItemId);
  const isCheckedIn = Boolean(item.checkedInAt);

  await prisma.manifestItem.update({
    where: { id: item.id },
    data: {
      boardedAt: isCheckedIn ? null : item.boardedAt,
      checkedInAt: isCheckedIn ? null : new Date(),
    },
  });

  revalidatePassengerManifestPaths(flightLegId);
}

export async function toggleCrewPassengerBoardedAction(flightLegId: string, manifestItemId: string) {
  const currentUser = await requireCrewPortalUser();
  const item = await requireManifestItemOnAssignedFlight(currentUser.id, flightLegId, manifestItemId);
  const isBoarded = Boolean(item.boardedAt);

  await prisma.manifestItem.update({
    where: { id: item.id },
    data: {
      boardedAt: isBoarded ? null : new Date(),
      checkedInAt: item.checkedInAt ?? new Date(),
    },
  });

  revalidatePassengerManifestPaths(flightLegId);
}
