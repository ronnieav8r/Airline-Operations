import {
  AssignmentStatus,
  FlightLegStatus,
  FlightStatus,
  IdDocumentType,
  ManifestStatus,
  ReleaseStatus,
  UserRole,
} from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

let prismaClient: Awaited<typeof import("@/lib/prisma")>["prisma"] | null = null;

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator < 1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  loadLocalEnv();
  const { prisma } = await import("@/lib/prisma");
  prismaClient = prisma;

  const [operator, aircraft, opsUser, departureStation, arrivalStation] = await Promise.all([
    prisma.operator.findFirst({ orderBy: { code: "asc" }, select: { id: true } }),
    prisma.aircraft.findFirst({ orderBy: { tailNumber: "asc" }, select: { id: true } }),
    prisma.user.findFirst({
      where: { role: { in: [UserRole.ADMIN, UserRole.OPS] } },
      orderBy: { email: "asc" },
      select: { id: true },
    }),
    prisma.station.findFirst({ orderBy: { code: "asc" }, select: { id: true } }),
    prisma.station.findFirst({ orderBy: { code: "desc" }, select: { id: true } }),
  ]);

  assertCondition(Boolean(operator), "Smoke requires an operator.");
  assertCondition(Boolean(aircraft), "Smoke requires an aircraft.");
  assertCondition(Boolean(opsUser), "Smoke requires an ops/admin user.");
  assertCondition(Boolean(departureStation), "Smoke requires a departure station.");
  assertCondition(Boolean(arrivalStation), "Smoke requires an arrival station.");
  assertCondition(departureStation?.id !== arrivalStation?.id, "Smoke requires two stations.");

  const authority = await prisma.operatingAuthority.findFirst({
    where: { operatorId: operator!.id },
    orderBy: { operatingPart: "asc" },
    select: {
      id: true,
      revisions: {
        orderBy: { effectiveStart: "desc" },
        select: { id: true },
        take: 1,
      },
    },
  });

  assertCondition(Boolean(authority?.revisions[0]), "Smoke requires an authority revision.");

  const unique = Date.now().toString(36).toUpperCase();
  const scheduledDeparture = new Date("2031-01-15T14:00:00.000Z");
  const scheduledArrival = new Date("2031-01-15T15:00:00.000Z");

  const customer = await prisma.customer.create({
    data: {
      customerCode: `SMK-${unique}`,
      name: `Smoke Customer ${unique}`,
      operatorId: operator!.id,
    },
    select: { id: true, name: true },
  });

  const passenger = await prisma.passenger.create({
    data: {
      email: `smoke.passenger.${unique.toLowerCase()}@example.com`,
      firstName: "Smoke",
      idDocumentNumber: `P-${unique}`,
      idDocumentType: IdDocumentType.PASSPORT,
      idIssuingCountry: "USA",
      lastName: "Passenger",
    },
    select: { id: true },
  });

  await prisma.customerPassenger.create({
    data: {
      customerId: customer.id,
      passengerId: passenger.id,
      relationship: "Traveler",
    },
  });

  const linkedPassengerCount = await prisma.customerPassenger.count({
    where: {
      customerId: customer.id,
      passengerId: passenger.id,
    },
  });
  assertCondition(linkedPassengerCount === 1, "Passenger should link to customer.");

  const legacyFlight = await prisma.flight.create({
    data: {
      aircraftId: aircraft!.id,
      arrivalStationId: arrivalStation!.id,
      departureStationId: departureStation!.id,
      flightNumber: `SMK${unique}`,
      scheduledArrival,
      scheduledDeparture,
      status: FlightStatus.SCHEDULED,
    },
    select: { id: true },
  });

  const flightLeg = await prisma.flightLeg.create({
    data: {
      aircraftAssignments: {
        create: {
          aircraftId: aircraft!.id,
          assignedAt: scheduledDeparture,
          assignedById: opsUser!.id,
          status: AssignmentStatus.PLANNED,
        },
      },
      arrivalStationId: arrivalStation!.id,
      authorityRevisionId: authority!.revisions[0].id,
      departureStationId: departureStation!.id,
      flightNumber: `SMK${unique}`,
      legacyFlightId: legacyFlight.id,
      operatingAuthorityId: authority!.id,
      operatorId: operator!.id,
      scheduledArrival,
      scheduledDeparture,
      status: FlightLegStatus.SCHEDULED,
    },
    select: { id: true },
  });

  const controlRecord = await prisma.operationalControlRecord.create({
    data: {
      authorityRevisionId: authority!.revisions[0].id,
      controllingEntity: customer.name,
      customerId: customer.id,
      flightId: legacyFlight.id,
      flightLegId: flightLeg.id,
      operatingAuthorityId: authority!.id,
      operatorId: operator!.id,
    },
    select: { id: true },
  });

  await prisma.flightRelease.create({
    data: {
      operationalControlRecordId: controlRecord.id,
      status: ReleaseStatus.PLANNED,
    },
  });

  const manifest = await prisma.manifest.create({
    data: {
      flightLegId: flightLeg.id,
      status: ManifestStatus.DRAFT,
    },
    select: { id: true },
  });

  await prisma.manifestItem.create({
    data: {
      baggageWeight: "25.00",
      manifestId: manifest.id,
      passengerId: passenger.id,
      personName: "Smoke Passenger",
      seatNumber: "1A",
      weight: "185.00",
    },
  });

  const createdPassenger = await prisma.passenger.create({
    data: {
      firstName: "Inline",
      lastName: `Passenger ${unique}`,
    },
    select: { id: true },
  });

  await prisma.customerPassenger.upsert({
    where: {
      customerId_passengerId: {
        customerId: customer.id,
        passengerId: createdPassenger.id,
      },
    },
    create: {
      customerId: customer.id,
      passengerId: createdPassenger.id,
      relationship: "Passenger",
    },
    update: {},
  });

  await prisma.manifestItem.create({
    data: {
      manifestId: manifest.id,
      passengerId: createdPassenger.id,
      personName: `Inline Passenger ${unique}`,
    },
  });

  const manifestWithItems = await prisma.manifest.findUnique({
    where: { id: manifest.id },
    select: {
      items: {
        select: {
          passengerId: true,
          personName: true,
          weight: true,
        },
      },
    },
  });

  assertCondition(manifestWithItems?.items.length === 2, "Manifest should have two items.");
  assertCondition(
    manifestWithItems?.items.some((item) => !item.weight) === true,
    "Smoke manifest should detect an item missing weight.",
  );

  await prisma.manifestItem.updateMany({
    where: {
      manifestId: manifest.id,
      passengerId: createdPassenger.id,
    },
    data: {
      weight: "180.00",
    },
  });

  const readyManifest = await prisma.manifest.findUnique({
    where: { id: manifest.id },
    select: {
      items: {
        select: {
          passengerId: true,
          personName: true,
          weight: true,
        },
      },
    },
  });

  assertCondition(
    Boolean(
      readyManifest?.items.length &&
        readyManifest.items.every((item) => (item.passengerId || item.personName) && item.weight),
    ),
    "Manifest should be ready after all items have passenger/name and weight.",
  );

  await prisma.manifest.update({
    where: { id: manifest.id },
    data: { status: ManifestStatus.READY },
  });

  await prisma.$disconnect();
  prismaClient = null;

  console.log("Customer passenger manifest smoke passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient?.$disconnect();
  });
