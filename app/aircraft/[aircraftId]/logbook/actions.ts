"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AircraftLogbookError,
  createCorrectiveActionDraft,
  parseLogbookAttachmentFile,
  signAircraftLogbookEntry,
  uploadAircraftLogbookAttachment,
} from "@/lib/aircraft-logbook";
import { requireRole } from "@/lib/auth/guards";

function encodeError(error: unknown): string {
  if (error instanceof AircraftLogbookError || error instanceof Error) {
    return encodeURIComponent(error.message);
  }

  return encodeURIComponent("Aircraft logbook action failed.");
}

function revalidateAircraftLogbook(aircraftId: string) {
  revalidatePath(`/aircraft/${aircraftId}/logbook`);
  revalidatePath(`/aircraft/${aircraftId}/airworthiness`);
  revalidatePath(`/aircraft/${aircraftId}`);
  revalidatePath("/aircraft");
  revalidatePath("/maintenance");
  revalidatePath("/operations-control");
  revalidatePath("/crew/me");
}

export async function createCorrectiveActionDraftAction(aircraftId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);

  try {
    await createCorrectiveActionDraft({
      actorId: currentUser.id,
      aircraftId,
      formData,
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/logbook?error=${encodeError(error)}`);
  }

  revalidateAircraftLogbook(aircraftId);
  redirect(`/aircraft/${aircraftId}/logbook?submitted=corrective-action`);
}

export async function signAircraftLogbookEntryAction(
  aircraftId: string,
  entryId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);

  try {
    await signAircraftLogbookEntry({
      actorId: currentUser.id,
      actorRole: currentUser.role,
      entryId,
      formData,
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/logbook?error=${encodeError(error)}`);
  }

  revalidateAircraftLogbook(aircraftId);
  redirect(`/aircraft/${aircraftId}/logbook?submitted=signed`);
}

export async function uploadAircraftLogbookAttachmentAction(
  aircraftId: string,
  entryId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const file = parseLogbookAttachmentFile(formData);

  if (!file) {
    redirect(`/aircraft/${aircraftId}/logbook?error=${encodeURIComponent("Choose an attachment before saving.")}`);
  }

  try {
    await uploadAircraftLogbookAttachment({
      actorId: currentUser.id,
      aircraftId,
      entryId,
      file,
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/logbook?error=${encodeError(error)}`);
  }

  revalidateAircraftLogbook(aircraftId);
  redirect(`/aircraft/${aircraftId}/logbook?submitted=attachment`);
}
