import {
  AirworthinessReleaseStatus,
  AircraftCapabilityStatus,
  AircraftConfigurationStatus,
  AircraftType,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

async function backfillAirworthiness() {
  const baselineStart = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
  const opsUser = await prisma.user.findUnique({
    where: { email: "ops@aeroops.local" },
    select: { id: true },
  });
  const aircraft = await prisma.aircraft.findMany({
    include: {
      aircraftAssignments: {
        include: {
          flightLeg: {
            select: { id: true },
          },
        },
        orderBy: { assignedAt: "asc" },
        take: 1,
      },
    },
    orderBy: { tailNumber: "asc" },
  });

  for (const item of aircraft) {
    await prisma.aircraftConfiguration.upsert({
      where: {
        aircraftId_configurationLabel_effectiveStart: {
          aircraftId: item.id,
          configurationLabel: "Demo baseline",
          effectiveStart: baselineStart,
        },
      },
      create: {
        aircraftId: item.id,
        configurationLabel: "Demo baseline",
        status: AircraftConfigurationStatus.ACTIVE,
        effectiveStart: baselineStart,
        passengerSeatCount: item.seats,
        emptyWeight: item.type === AircraftType.CL_65 ? "13000.00" : "12500.00",
        emptyWeightCg: "Demo envelope nominal",
        notes: "Backfilled airworthiness baseline configuration.",
      },
      update: {
        status: AircraftConfigurationStatus.ACTIVE,
        passengerSeatCount: item.seats,
        emptyWeight: item.type === AircraftType.CL_65 ? "13000.00" : "12500.00",
        emptyWeightCg: "Demo envelope nominal",
        notes: "Backfilled airworthiness baseline configuration.",
      },
    });

    for (const capabilityCode of ["IFR", "RNAV", "RVSM"]) {
      await prisma.aircraftCapability.upsert({
        where: {
          aircraftId_capabilityCode_effectiveStart: {
            aircraftId: item.id,
            capabilityCode,
            effectiveStart: baselineStart,
          },
        },
        create: {
          aircraftId: item.id,
          capabilityCode,
          status: AircraftCapabilityStatus.ACTIVE,
          effectiveStart: baselineStart,
          description: `Demo ${capabilityCode} capability.`,
          notes: "Backfilled active aircraft capability.",
        },
        update: {
          status: AircraftCapabilityStatus.ACTIVE,
          description: `Demo ${capabilityCode} capability.`,
          notes: "Backfilled active aircraft capability.",
        },
      });
    }

    await prisma.maintenanceEvent.upsert({
      where: {
        aircraftId_maintenanceNumber: {
          aircraftId: item.id,
          maintenanceNumber: `MX-${item.tailNumber}-BASELINE`,
        },
      },
      create: {
        aircraftId: item.id,
        approvedById: opsUser?.id ?? null,
        maintenanceNumber: `MX-${item.tailNumber}-BASELINE`,
        eventType: MaintenanceEventType.INSPECTION,
        status: MaintenanceEventStatus.COMPLETED,
        completedAt: addDays(baselineStart, 1),
        returnToServiceAt: addDays(baselineStart, 1),
        providerName: "AeroOps Demo Maintenance",
        description: "Backfilled baseline inspection and return to service.",
        notes: "Demo airworthiness foundation event.",
      },
      update: {
        approvedById: opsUser?.id ?? null,
        eventType: MaintenanceEventType.INSPECTION,
        status: MaintenanceEventStatus.COMPLETED,
        completedAt: addDays(baselineStart, 1),
        returnToServiceAt: addDays(baselineStart, 1),
        providerName: "AeroOps Demo Maintenance",
        description: "Backfilled baseline inspection and return to service.",
        notes: "Demo airworthiness foundation event.",
      },
    });

    await prisma.airworthinessRelease.upsert({
      where: {
        aircraftId_releaseNumber: {
          aircraftId: item.id,
          releaseNumber: `AWR-${item.tailNumber}-BASELINE`,
        },
      },
      create: {
        aircraftId: item.id,
        flightLegId: item.aircraftAssignments[0]?.flightLeg.id ?? null,
        releasedById: opsUser?.id ?? null,
        releaseNumber: `AWR-${item.tailNumber}-BASELINE`,
        status: AirworthinessReleaseStatus.RELEASED,
        releasedAt: addDays(baselineStart, 1),
        expiresAt: addMonths(baselineStart, 6),
        releaseNotes: "Backfilled demo aircraft-level airworthiness release.",
      },
      update: {
        flightLegId: item.aircraftAssignments[0]?.flightLeg.id ?? null,
        releasedById: opsUser?.id ?? null,
        status: AirworthinessReleaseStatus.RELEASED,
        releasedAt: addDays(baselineStart, 1),
        expiresAt: addMonths(baselineStart, 6),
        releaseNotes: "Backfilled demo aircraft-level airworthiness release.",
      },
    });
  }

  const deferredAircraft = aircraft[1];

  if (deferredAircraft) {
    const discrepancy = await prisma.discrepancy.upsert({
      where: {
        aircraftId_discrepancyNumber: {
          aircraftId: deferredAircraft.id,
          discrepancyNumber: `DISC-${deferredAircraft.tailNumber}-DEMO-001`,
        },
      },
      create: {
        aircraftId: deferredAircraft.id,
        reportedById: opsUser?.id ?? null,
        discrepancyNumber: `DISC-${deferredAircraft.tailNumber}-DEMO-001`,
        title: "Demo deferred cabin item",
        description: "Non-critical cabin placard discrepancy for readiness warning demos.",
        status: DiscrepancyStatus.DEFERRED,
        severity: "LOW",
        reportedAt: addDays(baselineStart, 2),
      },
      update: {
        reportedById: opsUser?.id ?? null,
        title: "Demo deferred cabin item",
        description: "Non-critical cabin placard discrepancy for readiness warning demos.",
        status: DiscrepancyStatus.DEFERRED,
        severity: "LOW",
        reportedAt: addDays(baselineStart, 2),
      },
    });

    await prisma.deferral.upsert({
      where: {
        aircraftId_deferralNumber: {
          aircraftId: deferredAircraft.id,
          deferralNumber: `DEF-${deferredAircraft.tailNumber}-DEMO-001`,
        },
      },
      create: {
        aircraftId: deferredAircraft.id,
        discrepancyId: discrepancy.id,
        authorizedById: opsUser?.id ?? null,
        deferralNumber: `DEF-${deferredAircraft.tailNumber}-DEMO-001`,
        status: DeferralStatus.ACTIVE,
        category: "Demo",
        deferredAt: addDays(baselineStart, 2),
        dueAt: addMonths(baselineStart, 1),
        notes: "Backfilled active deferral for warning-only airworthiness demos.",
      },
      update: {
        discrepancyId: discrepancy.id,
        authorizedById: opsUser?.id ?? null,
        status: DeferralStatus.ACTIVE,
        category: "Demo",
        deferredAt: addDays(baselineStart, 2),
        dueAt: addMonths(baselineStart, 1),
        notes: "Backfilled active deferral for warning-only airworthiness demos.",
      },
    });
  }

  console.log(`Airworthiness backfill complete for ${aircraft.length} aircraft.`);
}

async function main() {
  if (process.env.RUN_AIRWORTHINESS_BACKFILL !== "1") {
    console.log("Skipping airworthiness backfill. Set RUN_AIRWORTHINESS_BACKFILL=1 to run.");
    return;
  }

  await backfillAirworthiness();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
