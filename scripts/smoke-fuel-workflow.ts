import { AircraftFuelEventType, PrismaClient } from "@prisma/client";

import { getReleaseEvidenceDetail } from "@/lib/release-evidence-detail-queries";
import { getReleaseReadinessItems } from "@/lib/release-readiness";

const prisma = new PrismaClient();
const SMOKE_PREFIX = "FUEL-SMOKE";
const TEST_DENSITY = "6.750";

function gallons(pounds: number, density = Number(TEST_DENSITY)) {
  return (pounds / density).toFixed(2);
}

async function main() {
  const flightLeg = await prisma.flightLeg.findFirst({
    orderBy: { scheduledDeparture: "asc" },
    select: {
      aircraftAssignments: {
        orderBy: { assignedAt: "desc" },
        select: { aircraftId: true },
        take: 1,
      },
      id: true,
      operatorId: true,
      scheduledArrival: true,
      scheduledDeparture: true,
    },
    where: {
      aircraftAssignments: {
        some: {},
      },
    },
  });

  if (!flightLeg) {
    throw new Error("No FlightLeg with aircraft assignment found for fuel smoke.");
  }

  const aircraftId = flightLeg.aircraftAssignments[0]?.aircraftId;
  if (!aircraftId) {
    throw new Error("Selected FlightLeg did not expose an aircraft assignment.");
  }

  await prisma.operatorFuelSetting.upsert({
    where: { operatorId: flightLeg.operatorId },
    create: {
      defaultJetAFuelDensityLbsPerGallon: TEST_DENSITY,
      operatorId: flightLeg.operatorId,
    },
    update: {
      defaultJetAFuelDensityLbsPerGallon: TEST_DENSITY,
    },
  });

  await prisma.aircraftFuelEvent.deleteMany({
    where: {
      OR: [
        { notes: { startsWith: SMOKE_PREFIX } },
        {
          eventType: {
            in: [AircraftFuelEventType.RELEASE_ONBOARD, AircraftFuelEventType.POSTFLIGHT_ONBOARD],
          },
          flightLegId: flightLeg.id,
        },
      ],
    },
  });

  const uplift = await prisma.aircraftFuelEvent.create({
    data: {
      aircraftId,
      eventType: AircraftFuelEventType.UPLIFT,
      fuelChangeGallons: gallons(500),
      fuelChangeLbs: "500.00",
      fuelDensityLbsPerGallon: TEST_DENSITY,
      fuelOnboardGallons: gallons(3200),
      fuelOnboardLbs: "3200.00",
      fueledReady: null,
      notes: `${SMOKE_PREFIX} uplift`,
      recordedAt: new Date(flightLeg.scheduledDeparture.getTime() - 90 * 60 * 1000),
    },
  });

  const release = await prisma.aircraftFuelEvent.create({
    data: {
      aircraftId,
      eventType: AircraftFuelEventType.RELEASE_ONBOARD,
      flightLegId: flightLeg.id,
      fuelChangeGallons: null,
      fuelChangeLbs: null,
      fuelDensityLbsPerGallon: TEST_DENSITY,
      fuelOnboardGallons: gallons(3000),
      fuelOnboardLbs: "3000.00",
      fueledReady: true,
      notes: `${SMOKE_PREFIX} release onboard`,
      recordedAt: new Date(flightLeg.scheduledDeparture.getTime() - 60 * 60 * 1000),
    },
  });

  const postflight = await prisma.aircraftFuelEvent.create({
    data: {
      aircraftId,
      eventType: AircraftFuelEventType.POSTFLIGHT_ONBOARD,
      flightLegId: flightLeg.id,
      fuelChangeGallons: null,
      fuelChangeLbs: null,
      fuelDensityLbsPerGallon: TEST_DENSITY,
      fuelOnboardGallons: gallons(2150),
      fuelOnboardLbs: "2150.00",
      fueledReady: null,
      notes: `${SMOKE_PREFIX} postflight onboard`,
      recordedAt: new Date(flightLeg.scheduledArrival.getTime() + 30 * 60 * 1000),
    },
  });

  const detail = await getReleaseEvidenceDetail(flightLeg.id);
  if (!detail) {
    throw new Error("Release evidence detail was not found after fuel smoke setup.");
  }

  const fuelItem = getReleaseReadinessItems(detail).find((item) => item.readinessCategory === "fuel");
  if (!fuelItem?.ready) {
    throw new Error("Fuel readiness did not become ready after release onboard fuel was recorded.");
  }

  const consumedLbs = Number(release.fuelOnboardLbs) - Number(postflight.fuelOnboardLbs);
  if (consumedLbs !== 850) {
    throw new Error(`Expected consumed fuel to be 850 lb, got ${consumedLbs}.`);
  }

  console.log("PASS fuel setting upserted");
  console.log(`PASS aircraft uplift recorded ${uplift.fuelChangeLbs?.toString()} lb`);
  console.log(`PASS release fuel ready ${release.fuelOnboardLbs.toString()} lb`);
  console.log(`PASS postflight fuel recorded ${postflight.fuelOnboardLbs.toString()} lb`);
  console.log("PASS release readiness fuel item is ready");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
