import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      stationCount,
      aircraftCount,
      crewMemberCount,
      flightCount,
      aircraftCrewAssignmentCount,
      activeAlertCount,
    ] = await Promise.all([
      prisma.station.count(),
      prisma.aircraft.count(),
      prisma.crewMember.count(),
      prisma.flight.count(),
      prisma.aircraftCrewAssignment.count(),
      prisma.alert.count({ where: { status: "ACTIVE" } }),
    ]);

    return NextResponse.json({
      ok: true,
      database: "connected",
      counts: {
        stations: stationCount,
        aircraft: aircraftCount,
        crewMembers: crewMemberCount,
        flights: flightCount,
        aircraftCrewAssignments: aircraftCrewAssignmentCount,
        activeAlerts: activeAlertCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
