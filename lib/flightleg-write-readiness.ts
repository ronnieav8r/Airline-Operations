import { AssignmentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const flightLegWriteReadinessSelect = {
  id: true,
  flightNumber: true,
  scheduledDeparture: true,
  scheduledArrival: true,
  departureStationId: true,
  arrivalStationId: true,
  tripOrMissionId: true,
  legacyFlight: {
    select: {
      id: true,
      flightNumber: true,
      aircraftId: true,
      departureStationId: true,
      arrivalStationId: true,
      scheduledDeparture: true,
      scheduledArrival: true,
    },
  },
  tripOrMission: {
    select: {
      tripNumber: true,
    },
  },
  aircraftAssignments: {
    where: {
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    select: {
      aircraftId: true,
      status: true,
      aircraft: {
        select: {
          tailNumber: true,
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  },
  operationalControlRecord: {
    select: {
      id: true,
      flightId: true,
      flightLegId: true,
      release: {
        select: {
          status: true,
        },
      },
    },
  },
  inboundTurnaroundLinks: {
    select: {
      inboundFlightLegId: true,
      outboundFlightLegId: true,
      outboundFlightLeg: {
        select: {
          scheduledDeparture: true,
        },
      },
    },
  },
  outboundTurnaroundLinks: {
    select: {
      inboundFlightLegId: true,
      outboundFlightLegId: true,
      inboundFlightLeg: {
        select: {
          scheduledArrival: true,
        },
      },
    },
  },
} satisfies Prisma.FlightLegSelect;

type FlightLegWriteReadinessPayload = Prisma.FlightLegGetPayload<{
  select: typeof flightLegWriteReadinessSelect;
}>;

export type FlightLegWriteReadinessRow = {
  id: string;
  flightNumber: string;
  scheduledDeparture: Date;
  tripNumber: string | null;
  currentAircraft: string | null;
  releaseStatus: string | null;
  issueCount: number;
  issues: string[];
};

export type FlightLegWriteReadinessReport = {
  generatedAt: Date;
  summary: {
    totalFlightLegs: number;
    readyFlightLegs: number;
    issueFlightLegs: number;
    totalIssues: number;
  };
  rows: FlightLegWriteReadinessRow[];
};

function sameDate(first: Date, second: Date): boolean {
  return first.getTime() === second.getTime();
}

function expectedTripNumber(flightNumber: string | null, scheduledDeparture: Date): string | null {
  if (!flightNumber) {
    return null;
  }

  const dateKey = scheduledDeparture.toISOString().slice(0, 10).replaceAll("-", "");
  return `TRIP-${flightNumber.replace(/\s+/g, "-")}-${dateKey}`;
}

function getIssues(row: FlightLegWriteReadinessPayload): string[] {
  const issues: string[] = [];
  const activeAssignments = row.aircraftAssignments;
  const currentAssignment = activeAssignments[0] ?? null;

  if (!row.legacyFlight) {
    issues.push("Missing legacy Flight bridge.");
  } else {
    if (row.legacyFlight.flightNumber !== row.flightNumber) {
      issues.push("Legacy Flight number does not match FlightLeg.");
    }

    if (!sameDate(row.legacyFlight.scheduledDeparture, row.scheduledDeparture)) {
      issues.push("Legacy Flight scheduled departure does not match FlightLeg.");
    }

    if (!sameDate(row.legacyFlight.scheduledArrival, row.scheduledArrival)) {
      issues.push("Legacy Flight scheduled arrival does not match FlightLeg.");
    }

    if (row.legacyFlight.departureStationId !== row.departureStationId) {
      issues.push("Legacy Flight departure station does not match FlightLeg.");
    }

    if (row.legacyFlight.arrivalStationId !== row.arrivalStationId) {
      issues.push("Legacy Flight arrival station does not match FlightLeg.");
    }
  }

  if (!row.tripOrMissionId || !row.tripOrMission) {
    issues.push("Missing TripOrMission link.");
  } else if (row.tripOrMission.tripNumber !== expectedTripNumber(row.flightNumber, row.scheduledDeparture)) {
    issues.push("TripOrMission trip number does not match auto trip policy.");
  }

  if (activeAssignments.length === 0) {
    issues.push("Missing planned or active AircraftAssignment.");
  }

  if (activeAssignments.length > 1) {
    issues.push("More than one planned or active AircraftAssignment exists.");
  }

  if (row.legacyFlight && currentAssignment?.aircraftId !== row.legacyFlight.aircraftId) {
    issues.push("Current AircraftAssignment does not match legacy Flight aircraft.");
  }

  if (!row.operationalControlRecord) {
    issues.push("Missing OperationalControlRecord.");
  } else {
    if (row.operationalControlRecord.flightLegId !== row.id) {
      issues.push("OperationalControlRecord flightLegId does not match FlightLeg.");
    }

    if (row.legacyFlight && row.operationalControlRecord.flightId !== row.legacyFlight.id) {
      issues.push("OperationalControlRecord flightId does not match legacy Flight.");
    }

    if (!row.operationalControlRecord.release) {
      issues.push("Missing FlightRelease placeholder.");
    }
  }

  for (const link of row.inboundTurnaroundLinks) {
    if (link.inboundFlightLegId === link.outboundFlightLegId) {
      issues.push("Turnaround link points to the same FlightLeg.");
    }

    if (link.outboundFlightLeg.scheduledDeparture.getTime() < row.scheduledArrival.getTime()) {
      issues.push("Outbound turnaround link departs before this leg arrives.");
    }
  }

  for (const link of row.outboundTurnaroundLinks) {
    if (link.inboundFlightLegId === link.outboundFlightLegId) {
      issues.push("Turnaround link points to the same FlightLeg.");
    }

    if (link.inboundFlightLeg.scheduledArrival.getTime() > row.scheduledDeparture.getTime()) {
      issues.push("Inbound turnaround link arrives after this leg departs.");
    }
  }

  return issues;
}

export async function getFlightLegWriteReadinessReport(): Promise<FlightLegWriteReadinessReport> {
  const flightLegs = await prisma.flightLeg.findMany({
    select: flightLegWriteReadinessSelect,
    orderBy: { scheduledDeparture: "asc" },
  });
  const rows = flightLegs.map((row) => {
    const issues = getIssues(row);

    return {
      id: row.id,
      flightNumber: row.flightNumber ?? "Unnumbered",
      scheduledDeparture: row.scheduledDeparture,
      tripNumber: row.tripOrMission?.tripNumber ?? null,
      currentAircraft: row.aircraftAssignments[0]?.aircraft.tailNumber ?? null,
      releaseStatus: row.operationalControlRecord?.release?.status ?? null,
      issueCount: issues.length,
      issues,
    };
  });

  return {
    generatedAt: new Date(),
    summary: {
      totalFlightLegs: rows.length,
      readyFlightLegs: rows.filter((row) => row.issueCount === 0).length,
      issueFlightLegs: rows.filter((row) => row.issueCount > 0).length,
      totalIssues: rows.reduce((total, row) => total + row.issueCount, 0),
    },
    rows,
  };
}
