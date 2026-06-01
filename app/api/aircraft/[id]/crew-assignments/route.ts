import { NextResponse } from "next/server";

import { badRequest, handleApiError, notFound, parseIsoDate } from "@/lib/api-errors";
import { resolveAircraftCrewAssignmentsAt } from "@/lib/crew-resolution";

type AircraftRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: AircraftRouteContext) {
  try {
    const { id } = await context.params;
    const atRaw = new URL(request.url).searchParams.get("at");

    if (!atRaw) {
      throw badRequest("Query parameter 'at' is required.");
    }

    const at = parseIsoDate(atRaw);
    const assignments = await resolveAircraftCrewAssignmentsAt(id, at);

    if (!assignments) {
      throw notFound("Aircraft not found.", { aircraftId: id });
    }

    return NextResponse.json(assignments);
  } catch (error) {
    return handleApiError(error);
  }
}
