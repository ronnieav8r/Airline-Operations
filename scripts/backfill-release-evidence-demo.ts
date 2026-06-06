import {
  FlightLegStatus,
  FlightLocatingStatus,
  ManifestStatus,
  PrismaClient,
  WeightBalanceStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

function mapLocatingStatus(status: FlightLegStatus): FlightLocatingStatus {
  if (status === FlightLegStatus.COMPLETE) {
    return FlightLocatingStatus.CLOSED;
  }

  if (status === FlightLegStatus.ENROUTE) {
    return FlightLocatingStatus.ACTIVE;
  }

  if (status === FlightLegStatus.RELEASED || status === FlightLegStatus.READY_FOR_RELEASE) {
    return FlightLocatingStatus.FILED;
  }

  return FlightLocatingStatus.NOT_STARTED;
}

async function backfillReleaseEvidence() {
  const flightLegs = await prisma.flightLeg.findMany({
    include: {
      departureStation: true,
      arrivalStation: true,
      legacyFlight: {
        include: {
          flightPassengers: {
            include: {
              passenger: true,
            },
            orderBy: { seatNumber: "asc" },
          },
        },
      },
    },
    orderBy: { scheduledDeparture: "asc" },
  });

  for (const flightLeg of flightLegs) {
    const passengers = flightLeg.legacyFlight?.flightPassengers ?? [];
    const manifest = await prisma.manifest.upsert({
      where: { flightLegId: flightLeg.id },
      create: {
        flightLegId: flightLeg.id,
        status: passengers.length > 0 ? ManifestStatus.READY : ManifestStatus.DRAFT,
      },
      update: {
        status: passengers.length > 0 ? ManifestStatus.READY : ManifestStatus.DRAFT,
      },
    });

    await prisma.manifestItem.deleteMany({
      where: { manifestId: manifest.id },
    });

    if (passengers.length > 0) {
      await prisma.manifestItem.createMany({
        data: passengers.map((flightPassenger, index) => ({
          manifestId: manifest.id,
          passengerId: flightPassenger.passengerId,
          personName: `${flightPassenger.passenger.firstName} ${flightPassenger.passenger.lastName}`,
          seatNumber: flightPassenger.seatNumber,
          checkedInAt: flightPassenger.checkedInAt,
          boardedAt: flightPassenger.boardedAt,
          weight: 185 + index * 5,
          baggageWeight: 25,
          notes: "Backfilled from current FlightPassenger demo data.",
        })),
      });
    }

    const routeText = `${flightLeg.departureStation.code} ${flightLeg.arrivalStation.code}`;
    const weatherSnapshot = await prisma.weatherBriefingSnapshot.upsert({
      where: { snapshotKey: `demo-weather-${flightLeg.id}` },
      create: {
        snapshotKey: `demo-weather-${flightLeg.id}`,
        provider: "AeroOps Demo",
        briefingAt: flightLeg.scheduledDeparture,
        routeSummary: `Demo weather briefing for ${routeText}.`,
        rawSnapshot: {
          source: "backfill",
          route: routeText,
          conditions: "VFR demo conditions",
        },
      },
      update: {
        provider: "AeroOps Demo",
        briefingAt: flightLeg.scheduledDeparture,
        routeSummary: `Demo weather briefing for ${routeText}.`,
        rawSnapshot: {
          source: "backfill",
          route: routeText,
          conditions: "VFR demo conditions",
        },
      },
    });

    const notamSnapshot = await prisma.notamSnapshot.upsert({
      where: { snapshotKey: `demo-notam-${flightLeg.id}` },
      create: {
        snapshotKey: `demo-notam-${flightLeg.id}`,
        capturedAt: flightLeg.scheduledDeparture,
        affectedStationCodes: routeText,
        rawSnapshot: {
          source: "backfill",
          affectedStations: [flightLeg.departureStation.code, flightLeg.arrivalStation.code],
          summary: "No critical demo NOTAM restrictions.",
        },
      },
      update: {
        capturedAt: flightLeg.scheduledDeparture,
        affectedStationCodes: routeText,
        rawSnapshot: {
          source: "backfill",
          affectedStations: [flightLeg.departureStation.code, flightLeg.arrivalStation.code],
          summary: "No critical demo NOTAM restrictions.",
        },
      },
    });

    const flightPlanReference = await prisma.flightPlanReference.upsert({
      where: {
        flightLegId_externalReference: {
          flightLegId: flightLeg.id,
          externalReference: `DEMO-FPL-${flightLeg.id}`,
        },
      },
      create: {
        flightLegId: flightLeg.id,
        provider: "AeroOps Demo",
        externalReference: `DEMO-FPL-${flightLeg.id}`,
        filedAt: flightLeg.status === FlightLegStatus.SCHEDULED ? null : flightLeg.scheduledDeparture,
        status: flightLeg.status === FlightLegStatus.CANCELLED ? "cancelled" : "planned",
        routeText,
      },
      update: {
        provider: "AeroOps Demo",
        filedAt: flightLeg.status === FlightLegStatus.SCHEDULED ? null : flightLeg.scheduledDeparture,
        status: flightLeg.status === FlightLegStatus.CANCELLED ? "cancelled" : "planned",
        routeText,
      },
    });

    await prisma.flightLocatingRecord.upsert({
      where: { flightLegId: flightLeg.id },
      create: {
        flightLegId: flightLeg.id,
        status: mapLocatingStatus(flightLeg.status),
        responsibleParty: "AeroOps Operations Control",
        plannedRoute: routeText,
        lastKnownPosition:
          flightLeg.status === FlightLegStatus.COMPLETE ? flightLeg.arrivalStation.code : null,
        activatedAt:
          flightLeg.status === FlightLegStatus.ENROUTE ? flightLeg.actualDeparture : null,
        closedAt: flightLeg.status === FlightLegStatus.COMPLETE ? flightLeg.actualArrival : null,
        notes: "Backfilled demo locating record.",
      },
      update: {
        status: mapLocatingStatus(flightLeg.status),
        responsibleParty: "AeroOps Operations Control",
        plannedRoute: routeText,
        lastKnownPosition:
          flightLeg.status === FlightLegStatus.COMPLETE ? flightLeg.arrivalStation.code : null,
        activatedAt:
          flightLeg.status === FlightLegStatus.ENROUTE ? flightLeg.actualDeparture : null,
        closedAt: flightLeg.status === FlightLegStatus.COMPLETE ? flightLeg.actualArrival : null,
        notes: "Backfilled demo locating record.",
      },
    });

    const passengerWeight = passengers.reduce((total, _passenger, index) => total + 185 + index * 5, 0);
    const baggageWeight = passengers.length * 25;
    const hasLoadData = passengers.length > 0;

    await prisma.weightBalanceRun.upsert({
      where: {
        flightLegId_runLabel: {
          flightLegId: flightLeg.id,
          runLabel: "Demo baseline",
        },
      },
      create: {
        flightLegId: flightLeg.id,
        manifestId: manifest.id,
        runLabel: "Demo baseline",
        status: hasLoadData ? WeightBalanceStatus.CALCULATED : WeightBalanceStatus.DRAFT,
        takeoffWeight: hasLoadData ? 20000 + passengerWeight + baggageWeight : null,
        landingWeight: hasLoadData ? 19500 + passengerWeight + baggageWeight : null,
        centerOfGravity: hasLoadData ? "Demo envelope nominal" : null,
        calculatedAt: hasLoadData ? flightLeg.scheduledDeparture : null,
        calculationSnapshot: {
          source: "backfill",
          passengerCount: passengers.length,
          assumedPassengerWeight: "185 lb plus demo variance",
          assumedBaggageWeight: "25 lb each",
        },
      },
      update: {
        manifestId: manifest.id,
        status: hasLoadData ? WeightBalanceStatus.CALCULATED : WeightBalanceStatus.DRAFT,
        takeoffWeight: hasLoadData ? 20000 + passengerWeight + baggageWeight : null,
        landingWeight: hasLoadData ? 19500 + passengerWeight + baggageWeight : null,
        centerOfGravity: hasLoadData ? "Demo envelope nominal" : null,
        calculatedAt: hasLoadData ? flightLeg.scheduledDeparture : null,
        calculationSnapshot: {
          source: "backfill",
          passengerCount: passengers.length,
          assumedPassengerWeight: "185 lb plus demo variance",
          assumedBaggageWeight: "25 lb each",
        },
      },
    });

    await prisma.dispatchPackage.upsert({
      where: { flightLegId: flightLeg.id },
      create: {
        flightLegId: flightLeg.id,
        weatherBriefingId: weatherSnapshot.id,
        notamSnapshotId: notamSnapshot.id,
        flightPlanReferenceId: flightPlanReference.id,
        performanceData: {
          source: "backfill",
          manifestStatus: manifest.status,
          route: routeText,
        },
      },
      update: {
        weatherBriefingId: weatherSnapshot.id,
        notamSnapshotId: notamSnapshot.id,
        flightPlanReferenceId: flightPlanReference.id,
        performanceData: {
          source: "backfill",
          manifestStatus: manifest.status,
          route: routeText,
        },
      },
    });
  }

  console.log(`Release evidence backfill complete for ${flightLegs.length} FlightLeg records.`);
}

async function main() {
  if (process.env.RUN_RELEASE_EVIDENCE_BACKFILL !== "1") {
    console.log(
      "Skipping release evidence backfill. Set RUN_RELEASE_EVIDENCE_BACKFILL=1 to run.",
    );
    return;
  }

  await backfillReleaseEvidence();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
