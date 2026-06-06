import {
  AssignmentStatus,
  AuthorityStatus,
  FlightLegStatus,
  FlightStatus,
  OperatingPart,
  Prisma,
  PrismaClient,
  ReleaseStatus,
} from "@prisma/client";

import { resolveFlightCoverage } from "../lib/crew-resolution";

const prisma = new PrismaClient();

type FlightForBackfill = Prisma.FlightGetPayload<{
  include: {
    operationalControlRecord: {
      include: {
        release: true;
      };
    };
  };
}>;

type FlightLegForTurnaround = {
  id: string;
  aircraftId: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function getTripNumber(flight: Pick<FlightForBackfill, "flightNumber" | "scheduledDeparture">) {
  return `TRIP-${flight.flightNumber}-${formatDateKey(flight.scheduledDeparture)}`;
}

function mapLegStatus(
  flightStatus: FlightStatus,
  releaseStatus: ReleaseStatus | null | undefined,
): FlightLegStatus {
  if (flightStatus === FlightStatus.CANCELLED) {
    return FlightLegStatus.CANCELLED;
  }

  if (flightStatus === FlightStatus.COMPLETE) {
    return FlightLegStatus.COMPLETE;
  }

  if (flightStatus === FlightStatus.ENROUTE) {
    return FlightLegStatus.ENROUTE;
  }

  if (flightStatus === FlightStatus.DELAYED) {
    return FlightLegStatus.DELAYED;
  }

  if (releaseStatus === ReleaseStatus.RELEASED) {
    return FlightLegStatus.RELEASED;
  }

  return FlightLegStatus.SCHEDULED;
}

function mapAssignmentStatus(flightStatus: FlightStatus): AssignmentStatus {
  if (flightStatus === FlightStatus.CANCELLED) {
    return AssignmentStatus.CANCELLED;
  }

  if (flightStatus === FlightStatus.COMPLETE) {
    return AssignmentStatus.RELIEVED;
  }

  if (flightStatus === FlightStatus.ENROUTE) {
    return AssignmentStatus.ACTIVE;
  }

  return AssignmentStatus.PLANNED;
}

async function getFallbackAuthority() {
  const effectiveStart = addDays(new Date(), -30);

  const operator = await prisma.operator.upsert({
    where: { code: "AEROOPS-DEMO" },
    create: {
      code: "AEROOPS-DEMO",
      name: "AeroOps Demo Operator",
      isActive: true,
    },
    update: {
      name: "AeroOps Demo Operator",
      isActive: true,
    },
  });

  const authority = await prisma.operatingAuthority.upsert({
    where: {
      operatorId_operatingPart: {
        operatorId: operator.id,
        operatingPart: OperatingPart.PART_91,
      },
    },
    create: {
      operatorId: operator.id,
      operatingPart: OperatingPart.PART_91,
      displayName: "Part 91 Company Operations",
      status: AuthorityStatus.ACTIVE,
    },
    update: {
      displayName: "Part 91 Company Operations",
      status: AuthorityStatus.ACTIVE,
    },
  });

  const revision = await prisma.authorityRevision.upsert({
    where: {
      operatingAuthorityId_revisionLabel: {
        operatingAuthorityId: authority.id,
        revisionLabel: "Initial demo authority",
      },
    },
    create: {
      operatingAuthorityId: authority.id,
      revisionLabel: "Initial demo authority",
      effectiveStart,
      status: AuthorityStatus.ACTIVE,
      notes: "Demo Part 91 authority revision for FlightLeg backfill fallback.",
    },
    update: {
      effectiveStart,
      status: AuthorityStatus.ACTIVE,
      notes: "Demo Part 91 authority revision for FlightLeg backfill fallback.",
    },
  });

  return { operator, authority, revision };
}

async function backfillFlightLeg(flight: FlightForBackfill) {
  const fallback = await getFallbackAuthority();
  const controlRecord = flight.operationalControlRecord;
  const operatorId = controlRecord?.operatorId ?? fallback.operator.id;
  const operatingAuthorityId = controlRecord?.operatingAuthorityId ?? fallback.authority.id;
  const authorityRevisionId = controlRecord?.authorityRevisionId ?? fallback.revision.id;
  const assignmentStatus = mapAssignmentStatus(flight.status);
  const tripNumber = getTripNumber(flight);

  const tripOrMission = await prisma.tripOrMission.upsert({
    where: {
      operatorId_tripNumber: {
        operatorId,
        tripNumber,
      },
    },
    create: {
      operatorId,
      tripNumber,
      requestedStart: flight.scheduledDeparture,
      requestedEnd: flight.scheduledArrival,
      notes: `Backfilled from legacy Flight ${flight.flightNumber}.`,
    },
    update: {
      requestedStart: flight.scheduledDeparture,
      requestedEnd: flight.scheduledArrival,
      notes: `Backfilled from legacy Flight ${flight.flightNumber}.`,
    },
  });

  const flightLeg = await prisma.flightLeg.upsert({
    where: { legacyFlightId: flight.id },
    create: {
      legacyFlightId: flight.id,
      tripOrMissionId: tripOrMission.id,
      operatorId,
      operatingAuthorityId,
      authorityRevisionId,
      legNumber: 1,
      flightNumber: flight.flightNumber,
      departureStationId: flight.departureStationId,
      arrivalStationId: flight.arrivalStationId,
      scheduledDeparture: flight.scheduledDeparture,
      scheduledArrival: flight.scheduledArrival,
      actualDeparture: flight.actualDeparture,
      actualArrival: flight.actualArrival,
      status: mapLegStatus(flight.status, controlRecord?.release?.status),
      notes: flight.notes,
    },
    update: {
      tripOrMissionId: tripOrMission.id,
      operatorId,
      operatingAuthorityId,
      authorityRevisionId,
      legNumber: 1,
      flightNumber: flight.flightNumber,
      departureStationId: flight.departureStationId,
      arrivalStationId: flight.arrivalStationId,
      scheduledDeparture: flight.scheduledDeparture,
      scheduledArrival: flight.scheduledArrival,
      actualDeparture: flight.actualDeparture,
      actualArrival: flight.actualArrival,
      status: mapLegStatus(flight.status, controlRecord?.release?.status),
      notes: flight.notes,
    },
  });

  await prisma.aircraftAssignment.upsert({
    where: {
      flightLegId_aircraftId: {
        flightLegId: flightLeg.id,
        aircraftId: flight.aircraftId,
      },
    },
    create: {
      flightLegId: flightLeg.id,
      aircraftId: flight.aircraftId,
      status: assignmentStatus,
      assignedAt: flight.scheduledDeparture,
      releasedAt: flight.actualArrival,
      notes: `Backfilled from legacy Flight ${flight.flightNumber}.`,
    },
    update: {
      status: assignmentStatus,
      assignedAt: flight.scheduledDeparture,
      releasedAt: flight.actualArrival,
      notes: `Backfilled from legacy Flight ${flight.flightNumber}.`,
    },
  });

  if (controlRecord) {
    await prisma.operationalControlRecord.update({
      where: { id: controlRecord.id },
      data: { flightLegId: flightLeg.id },
    });
  }

  const coverage = await resolveFlightCoverage(flight.id);

  for (const assignment of coverage?.assignedCrew ?? []) {
    await prisma.crewLegAssignment.upsert({
      where: {
        flightLegId_crewMemberId_seatRole: {
          flightLegId: flightLeg.id,
          crewMemberId: assignment.crewMemberId,
          seatRole: assignment.seatRole,
        },
      },
      create: {
        flightLegId: flightLeg.id,
        crewMemberId: assignment.crewMemberId,
        seatRole: assignment.seatRole,
        status: assignmentStatus,
        reportTime: flight.scheduledDeparture,
        releaseTime: flight.actualArrival,
        sourceAircraftCrewAssignmentId: assignment.assignmentId,
        notes: `Backfilled from aircraft-block assignment for legacy Flight ${flight.flightNumber}.`,
      },
      update: {
        status: assignmentStatus,
        reportTime: flight.scheduledDeparture,
        releaseTime: flight.actualArrival,
        sourceAircraftCrewAssignmentId: assignment.assignmentId,
        notes: `Backfilled from aircraft-block assignment for legacy Flight ${flight.flightNumber}.`,
      },
    });
  }

  return {
    id: flightLeg.id,
    aircraftId: flight.aircraftId,
    scheduledDeparture: flight.scheduledDeparture,
    scheduledArrival: flight.scheduledArrival,
  } satisfies FlightLegForTurnaround;
}

async function backfillTurnarounds(flightLegs: FlightLegForTurnaround[]) {
  const legsByAircraft = new Map<string, FlightLegForTurnaround[]>();

  for (const flightLeg of flightLegs) {
    const existing = legsByAircraft.get(flightLeg.aircraftId) ?? [];
    existing.push(flightLeg);
    legsByAircraft.set(flightLeg.aircraftId, existing);
  }

  let turnaroundCount = 0;

  for (const legs of legsByAircraft.values()) {
    legs.sort((first, second) => first.scheduledDeparture.getTime() - second.scheduledDeparture.getTime());

    for (let index = 0; index < legs.length - 1; index += 1) {
      const inbound = legs[index];
      const outbound = legs[index + 1];

      if (outbound.scheduledDeparture.getTime() < inbound.scheduledArrival.getTime()) {
        continue;
      }

      const minimumTurnMinutes = Math.floor(
        (outbound.scheduledDeparture.getTime() - inbound.scheduledArrival.getTime()) / 60000,
      );

      await prisma.turnaroundLink.upsert({
        where: {
          inboundFlightLegId_outboundFlightLegId: {
            inboundFlightLegId: inbound.id,
            outboundFlightLegId: outbound.id,
          },
        },
        create: {
          inboundFlightLegId: inbound.id,
          outboundFlightLegId: outbound.id,
          minimumTurnMinutes,
          notes: "Backfilled same-aircraft consecutive leg link.",
        },
        update: {
          minimumTurnMinutes,
          notes: "Backfilled same-aircraft consecutive leg link.",
        },
      });

      turnaroundCount += 1;
    }
  }

  return turnaroundCount;
}

async function main() {
  if (process.env.RUN_FLIGHTLEG_BACKFILL !== "1") {
    console.log("Skipping FlightLeg backfill. Set RUN_FLIGHTLEG_BACKFILL=1 to run.");
    return;
  }

  const flights = await prisma.flight.findMany({
    include: {
      operationalControlRecord: {
        include: {
          release: true,
        },
      },
    },
    orderBy: { scheduledDeparture: "asc" },
  });

  const flightLegs: FlightLegForTurnaround[] = [];

  for (const flight of flights) {
    flightLegs.push(await backfillFlightLeg(flight));
  }

  const turnaroundCount = await backfillTurnarounds(flightLegs);

  console.log(
    `FlightLeg backfill complete for ${flightLegs.length} legs and ${turnaroundCount} turnaround links.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
