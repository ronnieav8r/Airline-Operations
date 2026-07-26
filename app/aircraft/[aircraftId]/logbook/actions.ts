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
import {
  safeSameAppReturnDestination,
  withSameAppReturnMessage,
} from "@/lib/same-app-return";

function errorMessage(error: unknown): string {
  if (error instanceof AircraftLogbookError || error instanceof Error) {
    return error.message;
  }

  return "Aircraft logbook action failed.";
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
  const returnTo = safeSameAppReturnDestination(
    formData.get("returnTo"),
    `/aircraft/${aircraftId}/logbook`,
  );

  try {
    await createCorrectiveActionDraft({
      actorId: currentUser.id,
      aircraftId,
      formData,
    });
  } catch (error) {
    redirect(withSameAppReturnMessage(returnTo, "error", errorMessage(error)));
  }

  revalidateAircraftLogbook(aircraftId);
  redirect(withSameAppReturnMessage(returnTo, "submitted", "corrective-action"));
}

export async function signAircraftLogbookEntryAction(
  aircraftId: string,
  entryId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);
  const returnTo = safeSameAppReturnDestination(
    formData.get("returnTo"),
    `/aircraft/${aircraftId}/logbook`,
  );

  try {
    await signAircraftLogbookEntry({
      actorId: currentUser.id,
      actorRole: currentUser.role,
      entryId,
      formData,
    });
  } catch (error) {
    redirect(withSameAppReturnMessage(returnTo, "error", errorMessage(error)));
  }

  revalidateAircraftLogbook(aircraftId);
  redirect(withSameAppReturnMessage(returnTo, "submitted", "signed"));
}

export async function uploadAircraftLogbookAttachmentAction(
  aircraftId: string,
  entryId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = safeSameAppReturnDestination(
    formData.get("returnTo"),
    `/aircraft/${aircraftId}/logbook`,
  );
  const file = parseLogbookAttachmentFile(formData);

  if (!file) {
    redirect(
      withSameAppReturnMessage(
        returnTo,
        "error",
        "Choose an attachment before saving.",
      ),
    );
  }

  try {
    await uploadAircraftLogbookAttachment({
      actorId: currentUser.id,
      aircraftId,
      entryId,
      file,
    });
  } catch (error) {
    redirect(withSameAppReturnMessage(returnTo, "error", errorMessage(error)));
  }

  revalidateAircraftLogbook(aircraftId);
  redirect(withSameAppReturnMessage(returnTo, "submitted", "attachment"));
}
