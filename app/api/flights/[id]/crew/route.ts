import { NextResponse } from "next/server";

import { handleApiError, notFound } from "@/lib/api-errors";
import { resolveFlightCrew } from "@/lib/crew-resolution";

type FlightRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: FlightRouteContext) {
  try {
    const { id } = await context.params;
    const resolvedCrew = await resolveFlightCrew(id);

    if (!resolvedCrew) {
      throw notFound("Flight or FlightLeg not found.", { id });
    }

    return NextResponse.json(resolvedCrew);
  } catch (error) {
    return handleApiError(error);
  }
}
