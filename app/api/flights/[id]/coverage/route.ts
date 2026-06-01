import { NextResponse } from "next/server";

import { handleApiError, notFound } from "@/lib/api-errors";
import { resolveFlightCoverage } from "@/lib/crew-resolution";

type FlightRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: FlightRouteContext) {
  try {
    const { id } = await context.params;
    const coverage = await resolveFlightCoverage(id);

    if (!coverage) {
      throw notFound("Flight not found.", { flightId: id });
    }

    return NextResponse.json(coverage);
  } catch (error) {
    return handleApiError(error);
  }
}
