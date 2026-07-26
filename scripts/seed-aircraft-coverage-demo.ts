import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AircraftStatus,
  AircraftType,
  AssignmentStatus,
  AuthorityStatus,
  DutyStatus,
  EmploymentStatus,
  FlightLegStatus,
  OperatingPart,
  PrismaClient,
  SeatRole,
} from "@prisma/client";

function loadLocalDatabaseUrl() {
  const envPath = join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const envText = readFileSync(envPath, "utf8");
  const match = envText.match(/^DATABASE_URL=(.*)$/m);

  if (!match) {
    return;
  }

  process.env.DATABASE_URL = match[1].trim().replace(/^"(.*)"$/, "$1");
}

loadLocalDatabaseUrl();
const prisma = new PrismaClient();
const DEMO_PREFIX = "COVDEMO";

type DemoAircraftSeed = {
  tailNumber: string;
  name: string;
  type: typeof AircraftType.CL_65 | typeof AircraftType.EMB_135_145;
  seats: number;
  stationCode: string;
};

type DemoFlightSeed = {
  flightNumber: string;
  tailNumber: string;
  dayOffset: number;
  departureHour: number;
  durationHours: number;
  departureCode: string;
  arrivalCode: string;
  status: typeof FlightLegStatus.SCHEDULED | typeof FlightLegStatus.READY_FOR_RELEASE | typeof FlightLegStatus.RELEASED;
};

type DemoCoverageCrew = {
  crewMemberId: string;
  employeeNumber: string;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + hours);
  return next;
}

function setUtcTime(date: Date, hour: number, minute = 0): Date {
  const next = new Date(date);
  next.setUTCHours(hour, minute, 0, 0);
  return next;
}

function startOfUtcDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

const demoStations = [
  { code: "TEB", city: "Teterboro", state: "NJ", name: "Teterboro Airport", timezone: "America/New_York" },
  { code: "HPN", city: "White Plains", state: "NY", name: "Westchester County Airport", timezone: "America/New_York" },
  { code: "DAL", city: "Dallas", state: "TX", name: "Dallas Love Field", timezone: "America/Chicago" },
  { code: "MIA", city: "Miami", state: "FL", name: "Miami International Airport", timezone: "America/New_York" },
  { code: "ORD", city: "Chicago", state: "IL", name: "Chicago O'Hare International Airport", timezone: "America/Chicago" },
  { code: "LAS", city: "Las Vegas", state: "NV", name: "Harry Reid International Airport", timezone: "America/Los_Angeles" },
  { code: "BOS", city: "Boston", state: "MA", name: "Boston Logan International Airport", timezone: "America/New_York" },
  { code: "DEN", city: "Denver", state: "CO", name: "Denver International Airport", timezone: "America/Denver" },
] as const;

const demoAircraft: DemoAircraftSeed[] = [
  { tailNumber: "N930AO", name: "Coverage 930", type: AircraftType.EMB_135_145, seats: 13, stationCode: "TEB" },
  { tailNumber: "N931AO", name: "Coverage 931", type: AircraftType.EMB_135_145, seats: 20, stationCode: "HPN" },
  { tailNumber: "N932AO", name: "Coverage 932", type: AircraftType.EMB_135_145, seats: 30, stationCode: "DAL" },
  { tailNumber: "N933AO", name: "Coverage 933", type: AircraftType.EMB_135_145, seats: 16, stationCode: "MIA" },
  { tailNumber: "N920AO", name: "Coverage 920", type: AircraftType.CL_65, seats: 9, stationCode: "TEB" },
  { tailNumber: "N921AO", name: "Coverage 921", type: AircraftType.CL_65, seats: 12, stationCode: "ORD" },
  { tailNumber: "N922AO", name: "Coverage 922", type: AircraftType.CL_65, seats: 20, stationCode: "LAS" },
];

const demoFlights: DemoFlightSeed[] = [
  {
    flightNumber: "COV101",
    tailNumber: "N930AO",
    dayOffset: 1,
    departureHour: 13,
    durationHours: 2,
    departureCode: "TEB",
    arrivalCode: "BOS",
    status: FlightLegStatus.SCHEDULED,
  },
  {
    flightNumber: "COV102",
    tailNumber: "N930AO",
    dayOffset: 4,
    departureHour: 16,
    durationHours: 3,
    departureCode: "BOS",
    arrivalCode: "MIA",
    status: FlightLegStatus.READY_FOR_RELEASE,
  },
  {
    flightNumber: "COV201",
    tailNumber: "N931AO",
    dayOffset: 2,
    departureHour: 14,
    durationHours: 4,
    departureCode: "HPN",
    arrivalCode: "DAL",
    status: FlightLegStatus.SCHEDULED,
  },
  {
    flightNumber: "COV202",
    tailNumber: "N931AO",
    dayOffset: 8,
    departureHour: 15,
    durationHours: 3,
    departureCode: "DAL",
    arrivalCode: "DEN",
    status: FlightLegStatus.RELEASED,
  },
  {
    flightNumber: "COV301",
    tailNumber: "N932AO",
    dayOffset: 3,
    departureHour: 12,
    durationHours: 3,
    departureCode: "DAL",
    arrivalCode: "LAS",
    status: FlightLegStatus.SCHEDULED,
  },
  {
    flightNumber: "COV302",
    tailNumber: "N932AO",
    dayOffset: 9,
    departureHour: 17,
    durationHours: 4,
    departureCode: "LAS",
    arrivalCode: "TEB",
    status: FlightLegStatus.READY_FOR_RELEASE,
  },
  {
    flightNumber: "COV401",
    tailNumber: "N933AO",
    dayOffset: 5,
    departureHour: 13,
    durationHours: 2,
    departureCode: "MIA",
    arrivalCode: "HPN",
    status: FlightLegStatus.SCHEDULED,
  },
  {
    flightNumber: "COV501",
    tailNumber: "N920AO",
    dayOffset: 1,
    departureHour: 18,
    durationHours: 2,
    departureCode: "TEB",
    arrivalCode: "ORD",
    status: FlightLegStatus.SCHEDULED,
  },
  {
    flightNumber: "COV601",
    tailNumber: "N921AO",
    dayOffset: 6,
    departureHour: 15,
    durationHours: 3,
    departureCode: "ORD",
    arrivalCode: "MIA",
    status: FlightLegStatus.READY_FOR_RELEASE,
  },
  {
    flightNumber: "COV701",
    tailNumber: "N922AO",
    dayOffset: 10,
    departureHour: 12,
    durationHours: 4,
    departureCode: "LAS",
    arrivalCode: "DAL",
    status: FlightLegStatus.SCHEDULED,
  },
];

const crewFirstNames = [
  "Alex",
  "Bailey",
  "Cameron",
  "Devon",
  "Elliot",
  "Finley",
  "Gray",
  "Harper",
  "Indigo",
  "Jordan",
  "Kai",
  "Logan",
  "Morgan",
  "Noel",
  "Parker",
  "Quinn",
  "Riley",
  "Sawyer",
  "Taylor",
  "Vale",
  "Wynn",
];

function requiredRolesForAircraft(seats: number) {
  return seats > 19 ? [SeatRole.CPT, SeatRole.FO, SeatRole.FA] : [SeatRole.CPT, SeatRole.FO];
}

function roleName(role: typeof SeatRole.CPT | typeof SeatRole.FO | typeof SeatRole.FA): string {
  if (role === SeatRole.CPT) {
    return "Captain";
  }
  if (role === SeatRole.FO) {
    return "Firstofficer";
  }

  return "Cabin";
}

async function seedStations() {
  const stations = new Map<string, { id: string; code: string }>();

  for (const station of demoStations) {
    const row = await prisma.station.upsert({
      where: { code: station.code },
      create: {
        city: station.city,
        code: station.code,
        isActive: true,
        name: station.name,
        state: station.state,
        timezone: station.timezone,
      },
      update: {
        city: station.city,
        isActive: true,
        name: station.name,
        state: station.state,
        timezone: station.timezone,
      },
    });
    stations.set(row.code, row);
  }

  return stations;
}

async function getAuthority() {
  const operator = await prisma.operator.upsert({
    where: { code: "AEROOPS-DEMO" },
    create: {
      code: "AEROOPS-DEMO",
      isActive: true,
      name: "AeroOps Demo Operator",
    },
    update: {
      isActive: true,
      name: "AeroOps Demo Operator",
    },
  });

  const authority = await prisma.operatingAuthority.upsert({
    where: {
      operatorId_operatingPart: {
        operatingPart: OperatingPart.PART_135,
        operatorId: operator.id,
      },
    },
    create: {
      displayName: "Part 135 Demo Operations",
      operatingPart: OperatingPart.PART_135,
      operatorId: operator.id,
      status: AuthorityStatus.ACTIVE,
    },
    update: {
      displayName: "Part 135 Demo Operations",
      status: AuthorityStatus.ACTIVE,
    },
  });

  const revision = await prisma.authorityRevision.upsert({
    where: {
      operatingAuthorityId_revisionLabel: {
        operatingAuthorityId: authority.id,
        revisionLabel: "Coverage planner demo authority",
      },
    },
    create: {
      effectiveStart: addDays(new Date(), -30),
      notes: `${DEMO_PREFIX} authority revision for aircraft coverage demo flights.`,
      operatingAuthorityId: authority.id,
      revisionLabel: "Coverage planner demo authority",
      status: AuthorityStatus.ACTIVE,
    },
    update: {
      effectiveStart: addDays(new Date(), -30),
      notes: `${DEMO_PREFIX} authority revision for aircraft coverage demo flights.`,
      status: AuthorityStatus.ACTIVE,
    },
  });

  return { authority, operator, revision };
}

async function seedAircraft(stations: Map<string, { id: string; code: string }>) {
  const aircraft = new Map<string, { id: string; tailNumber: string }>();

  for (const seed of demoAircraft) {
    const homeStation = stations.get(seed.stationCode);

    const row = await prisma.aircraft.upsert({
      where: { tailNumber: seed.tailNumber },
      create: {
        homeStationId: homeStation?.id,
        name: seed.name,
        seats: seed.seats,
        status: AircraftStatus.AVAILABLE,
        tailNumber: seed.tailNumber,
        type: seed.type,
      },
      update: {
        homeStationId: homeStation?.id,
        name: seed.name,
        seats: seed.seats,
        status: AircraftStatus.AVAILABLE,
        type: seed.type,
      },
    });
    aircraft.set(row.tailNumber, row);
  }

  return aircraft;
}

async function seedFlights({
  aircraft,
  authority,
  operator,
  revision,
  stations,
}: {
  aircraft: Map<string, { id: string; tailNumber: string }>;
  authority: { id: string };
  operator: { id: string };
  revision: { id: string };
  stations: Map<string, { id: string; code: string }>;
}) {
  const baseDate = startOfUtcDay(new Date());

  for (const seed of demoFlights) {
    const tail = aircraft.get(seed.tailNumber);
    const departure = stations.get(seed.departureCode);
    const arrival = stations.get(seed.arrivalCode);

    if (!tail || !departure || !arrival) {
      throw new Error(`Missing seed dependency for ${seed.flightNumber}.`);
    }

    const scheduledDeparture = setUtcTime(addDays(baseDate, seed.dayOffset), seed.departureHour);
    const scheduledArrival = addHours(scheduledDeparture, seed.durationHours);
    const tripNumber = `${DEMO_PREFIX}-${seed.flightNumber}`;

    const trip = await prisma.tripOrMission.upsert({
      where: {
        operatorId_tripNumber: {
          operatorId: operator.id,
          tripNumber,
        },
      },
      create: {
        notes: `${DEMO_PREFIX} aircraft coverage planner demo trip.`,
        operatorId: operator.id,
        requestedEnd: scheduledArrival,
        requestedStart: scheduledDeparture,
        tripNumber,
      },
      update: {
        notes: `${DEMO_PREFIX} aircraft coverage planner demo trip.`,
        requestedEnd: scheduledArrival,
        requestedStart: scheduledDeparture,
      },
    });

    const existingLeg = await prisma.flightLeg.findFirst({
      where: {
        flightNumber: seed.flightNumber,
        notes: { contains: DEMO_PREFIX },
      },
      select: { id: true },
    });

    const flightLeg = existingLeg
      ? await prisma.flightLeg.update({
          where: { id: existingLeg.id },
          data: {
            arrivalStationId: arrival.id,
            authorityRevisionId: revision.id,
            departureStationId: departure.id,
            notes: `${DEMO_PREFIX} aircraft coverage planner demo FlightLeg.`,
            operatingAuthorityId: authority.id,
            operatorId: operator.id,
            scheduledArrival,
            scheduledDeparture,
            status: seed.status,
            tripOrMissionId: trip.id,
          },
        })
      : await prisma.flightLeg.create({
          data: {
            arrivalStationId: arrival.id,
            authorityRevisionId: revision.id,
            departureStationId: departure.id,
            flightNumber: seed.flightNumber,
            legNumber: 1,
            notes: `${DEMO_PREFIX} aircraft coverage planner demo FlightLeg.`,
            operatingAuthorityId: authority.id,
            operatorId: operator.id,
            scheduledArrival,
            scheduledDeparture,
            status: seed.status,
            tripOrMissionId: trip.id,
          },
        });

    await prisma.aircraftAssignment.upsert({
      where: {
        flightLegId_aircraftId: {
          aircraftId: tail.id,
          flightLegId: flightLeg.id,
        },
      },
      create: {
        aircraftId: tail.id,
        assignedAt: addHours(scheduledDeparture, -6),
        flightLegId: flightLeg.id,
        notes: `${DEMO_PREFIX} assignment for aircraft coverage planner demo.`,
        status: AssignmentStatus.PLANNED,
      },
      update: {
        assignedAt: addHours(scheduledDeparture, -6),
        notes: `${DEMO_PREFIX} assignment for aircraft coverage planner demo.`,
        status: AssignmentStatus.PLANNED,
      },
    });
  }
}

async function seedCrewForRole({
  aircraftType,
  baseStationId,
  role,
  tailNumber,
}: {
  aircraftType: typeof AircraftType.CL_65 | typeof AircraftType.EMB_135_145;
  baseStationId: string;
  role: typeof SeatRole.CPT | typeof SeatRole.FO | typeof SeatRole.FA;
  tailNumber: string;
}): Promise<DemoCoverageCrew[]> {
  const tailKey = tailNumber.replace(/^N/, "");
  const crew: DemoCoverageCrew[] = [];

  for (let index = 0; index < 2; index += 1) {
    const employeeNumber = `${DEMO_PREFIX}-${tailKey}-${role}-${index + 1}`;
    const nameIndex = Math.abs(
      [...employeeNumber].reduce((total, character) => total + character.charCodeAt(0), 0),
    ) % crewFirstNames.length;
    const row = await prisma.crewMember.upsert({
      where: { employeeNumber },
      create: {
        baseStationId,
        dutyStatus: DutyStatus.ON_DUTY,
        email: `${employeeNumber.toLowerCase()}@aeroops.local`,
        employeeNumber,
        employmentStatus: EmploymentStatus.ACTIVE,
        firstName: crewFirstNames[(nameIndex + index) % crewFirstNames.length],
        lastName: `${tailKey}${roleName(role)}`,
      },
      update: {
        baseStationId,
        dutyStatus: DutyStatus.ON_DUTY,
        email: `${employeeNumber.toLowerCase()}@aeroops.local`,
        employmentStatus: EmploymentStatus.ACTIVE,
        firstName: crewFirstNames[(nameIndex + index) % crewFirstNames.length],
        lastName: `${tailKey}${roleName(role)}`,
      },
    });

    await prisma.crewQualification.upsert({
      where: {
        crewMemberId_aircraftType_seatRole: {
          aircraftType,
          crewMemberId: row.id,
          seatRole: role,
        },
      },
      create: {
        aircraftType,
        crewMemberId: row.id,
        expiresAt: addDays(startOfUtcDay(new Date()), 365),
        issuedAt: addDays(startOfUtcDay(new Date()), -180),
        notes: `${DEMO_PREFIX} qualification for aircraft coverage rotation demo.`,
        seatRole: role,
      },
      update: {
        expiresAt: addDays(startOfUtcDay(new Date()), 365),
        issuedAt: addDays(startOfUtcDay(new Date()), -180),
        notes: `${DEMO_PREFIX} qualification for aircraft coverage rotation demo.`,
      },
    });

    crew.push({ crewMemberId: row.id, employeeNumber });
  }

  return crew;
}

async function seedCrewRotations({
  aircraft,
  stations,
}: {
  aircraft: Map<string, { id: string; tailNumber: string }>;
  stations: Map<string, { id: string; code: string }>;
}) {
  const baseDate = startOfUtcDay(new Date());
  const horizonEnd = addDays(baseDate, 184);
  const aircraftIds = [...aircraft.values()].map((item) => item.id);

  await prisma.aircraftCrewAssignment.updateMany({
    where: {
      endsAt: null,
      notes: { contains: "monthly demo" },
    },
    data: {
      endsAt: addDays(baseDate, 8),
      notes: `${DEMO_PREFIX} closed legacy open-ended demo block.`,
    },
  });

  await prisma.aircraftCrewAssignment.deleteMany({
    where: {
      aircraftId: { in: aircraftIds },
      notes: { contains: DEMO_PREFIX },
    },
  });

  for (const seed of demoAircraft) {
    const tail = aircraft.get(seed.tailNumber);
    const baseStation = stations.get(seed.stationCode) ?? stations.get("TEB");

    if (!tail || !baseStation) {
      throw new Error(`Missing rotation dependency for ${seed.tailNumber}.`);
    }

    for (const role of requiredRolesForAircraft(seed.seats)) {
      const crew = await seedCrewForRole({
        aircraftType: seed.type,
        baseStationId: baseStation.id,
        role,
        tailNumber: seed.tailNumber,
      });

      for (
        let blockStart = new Date(baseDate), blockIndex = 0;
        blockStart < horizonEnd;
        blockStart = addDays(blockStart, 8), blockIndex += 1
      ) {
        const activeCrew = crew[blockIndex % crew.length];
        await prisma.aircraftCrewAssignment.create({
          data: {
            aircraftId: tail.id,
            crewMemberId: activeCrew.crewMemberId,
            endsAt: addDays(blockStart, 8),
            isActive: true,
            notes: `${DEMO_PREFIX} 8-day aircraft coverage rotation for ${seed.tailNumber}.`,
            seatRole: role,
            startsAt: blockStart,
          },
        });
      }
    }
  }
}

async function main() {
  const stations = await seedStations();
  const authorityContext = await getAuthority();
  const aircraft = await seedAircraft(stations);

  await seedFlights({ aircraft, stations, ...authorityContext });
  await seedCrewRotations({ aircraft, stations });

  console.log(
    `Seeded ${demoAircraft.length} aircraft, ${demoFlights.length} FlightLegs, and finite crew rotations for the aircraft coverage planner.`,
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
