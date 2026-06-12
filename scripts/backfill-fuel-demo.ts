import { AircraftFuelEventType, Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_JET_A_DENSITY_LBS_PER_GALLON = 6.7;

function decimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function gallons(pounds: number): Prisma.Decimal {
  return decimal(Number((pounds / DEFAULT_JET_A_DENSITY_LBS_PER_GALLON).toFixed(2)));
}

async function main() {
  if (process.env.RUN_FUEL_BACKFILL !== "1") {
    console.log("Skipping fuel backfill. Set RUN_FUEL_BACKFILL=1 to run.");
    return;
  }

  const operators = await prisma.operator.findMany({
    orderBy: { code: "asc" },
    select: { id: true },
  });

  for (const operator of operators) {
    await prisma.operatorFuelSetting.upsert({
      where: { operatorId: operator.id },
      create: {
        defaultJetAFuelDensityLbsPerGallon: DEFAULT_JET_A_DENSITY_LBS_PER_GALLON.toFixed(3),
        operatorId: operator.id,
      },
      update: {},
    });
  }

  const flightLegs = await prisma.flightLeg.findMany({
    orderBy: { scheduledDeparture: "asc" },
    select: {
      aircraftAssignments: {
        orderBy: { assignedAt: "desc" },
        select: { aircraftId: true },
        take: 1,
      },
      fuelEvents: {
        select: { id: true },
        take: 1,
        where: { eventType: AircraftFuelEventType.RELEASE_ONBOARD },
      },
      id: true,
      scheduledDeparture: true,
    },
  });

  let createdEvents = 0;

  for (const [index, flightLeg] of flightLegs.entries()) {
    const aircraftId = flightLeg.aircraftAssignments[0]?.aircraftId;

    if (!aircraftId || flightLeg.fuelEvents.length > 0) {
      continue;
    }

    const onboard = 2600 + (index % 4) * 250;

    await prisma.aircraftFuelEvent.create({
      data: {
        aircraftId,
        eventType: AircraftFuelEventType.RELEASE_ONBOARD,
        flightLegId: flightLeg.id,
        fuelDensityLbsPerGallon: DEFAULT_JET_A_DENSITY_LBS_PER_GALLON.toFixed(3),
        fueledReady: index % 3 !== 1,
        fuelOnboardGallons: gallons(onboard),
        fuelOnboardLbs: onboard,
        notes: "Gated demo fuel backfill release snapshot.",
        recordedAt: new Date(flightLeg.scheduledDeparture.getTime() - 60 * 60 * 1000),
      },
    });
    createdEvents += 1;
  }

  console.log(
    `Fuel backfill complete. Operators checked: ${operators.length}. Release fuel events created: ${createdEvents}.`,
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
