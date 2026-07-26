import { UserRole } from "@prisma/client";

import { AircraftLogbookError, readAircraftLogbookAttachment } from "@/lib/aircraft-logbook";
import { requireRole } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    aircraftId: string;
    attachmentId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const currentUser = await requireRole([
    UserRole.ADMIN,
    UserRole.OPS,
    UserRole.DISPATCH,
    UserRole.MAINTENANCE,
    UserRole.SAFETY,
    UserRole.VIEWER,
  ]);
  const { aircraftId, attachmentId } = await context.params;

  try {
    const result = await readAircraftLogbookAttachment(attachmentId, currentUser.id);

    if (result.attachment.aircraftId !== aircraftId) {
      return new Response("Attachment was not found.", { status: 404 });
    }

    return new Response(new Uint8Array(result.body), {
      headers: {
        "Content-Disposition": `inline; filename="${result.attachment.originalFilename ?? "logbook-attachment"}"`,
        "Content-Type": result.contentType,
      },
    });
  } catch (error) {
    if (error instanceof AircraftLogbookError) {
      return new Response(error.message, { status: 404 });
    }

    throw error;
  }
}
