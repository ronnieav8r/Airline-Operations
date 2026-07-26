import { UserRole } from "@prisma/client";

import { getAircraftLogbookExportPackage } from "@/lib/aircraft-logbook";
import { requireRole } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{
    aircraftId: string;
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
  const { aircraftId } = await context.params;
  const payload = await getAircraftLogbookExportPackage(aircraftId, currentUser.id);
  const filename = `${payload.aircraft.tailNumber}-logbook-export.json`;

  return Response.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
