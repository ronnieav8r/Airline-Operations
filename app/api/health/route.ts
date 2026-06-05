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
      operatorCount,
      operatingAuthorityCount,
      operationalControlRecordCount,
      flightReleaseCount,
    ] = await Promise.all([
      prisma.station.count(),
      prisma.aircraft.count(),
      prisma.crewMember.count(),
      prisma.flight.count(),
      prisma.aircraftCrewAssignment.count(),
      prisma.alert.count({ where: { status: "ACTIVE" } }),
      prisma.operator.count(),
      prisma.operatingAuthority.count(),
      prisma.operationalControlRecord.count(),
      prisma.flightRelease.count(),
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
        operators: operatorCount,
        operatingAuthorities: operatingAuthorityCount,
        operationalControlRecords: operationalControlRecordCount,
        flightReleases: flightReleaseCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
