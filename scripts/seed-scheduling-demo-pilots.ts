import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AircraftType,
  CrewLocationSource,
  DutyStatus,
  EmploymentStatus,
  PrismaClient,
  SeatRole,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";

const EMPLOYEE_PREFIX = "DEMO-CPT";

const DEMO_PILOTS = [
  ["Avery", "Cole"],
  ["Blake", "Harrison"],
  ["Cameron", "Stone"],
  ["Drew", "Lawson"],
  ["Elliot", "Mason"],
  ["Finley", "Hayes"],
  ["Gray", "Sullivan"],
  ["Harper", "Walsh"],
  ["Jamie", "Porter"],
  ["Kai", "Ellis"],
  ["Logan", "Bishop"],
  ["Micah", "Foster"],
  ["Noah", "Spencer"],
  ["Parker", "Vaughn"],
  ["Quinn", "Mercer"],
  ["Reese", "Dalton"],
  ["Sawyer", "Brooks"],
  ["Skyler", "Reynolds"],
  ["Tatum", "Pierce"],
  ["Teagan", "Collins"],
  ["Emerson", "Rhodes"],
  ["Rowan", "Carter"],
  ["Morgan", "Fields"],
  ["Jordan", "Keene"],
  ["Casey", "Archer"],
  ["Riley", "Bennett"],
  ["Taylor", "Monroe"],
  ["Dakota", "Grant"],
  ["Hayden", "Parker"],
  ["Kendall", "Reid"],
] as const;

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
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

function requireLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!databaseUrl.includes("127.0.0.1") && !databaseUrl.includes("localhost")) {
    throw new Error("Scheduling demo pilot seed is blocked unless DATABASE_URL points to local Postgres.");
  }
}

loadLocalEnv();
requireLocalDatabase();

const prisma = new PrismaClient();

function startOfLocalMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
}

function startOfWeek(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function addHours(value: Date, hours: number): Date {
  const next = new Date(value);
  next.setHours(next.getHours() + hours);
  return next;
}

function dutyStatusForPilot(index: number, dayIndex: number): DutyStatus {
  if (index >= 24 && index <= 25 && dayIndex >= 10 && dayIndex <= 13) {
    return DutyStatus.VACATION;
  }
  if (index >= 26 && index <= 27 && dayIndex >= 17 && dayIndex <= 19) {
    return DutyStatus.TRAINING;
  }
  if (index === 28 && dayIndex >= 21 && dayIndex <= 22) {
    return DutyStatus.SICK;
  }
  if (index >= 18 && index <= 23) {
    return (dayIndex + index) % 14 < 7 ? DutyStatus.RESERVE : DutyStatus.OFF_DUTY;
  }

  return (dayIndex + index) % 14 < 7 ? DutyStatus.ON_DUTY : DutyStatus.OFF_DUTY;
}

async function main() {
  const monthStart = startOfLocalMonth(new Date());
  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1, 0, 0, 0, 0);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = addDays(startOfWeek(addDays(nextMonthStart, -1)), 7);
  const stations = await prisma.station.findMany({
    where: { isActive: true },
    orderBy: [{ code: "asc" }],
    select: { code: true, id: true },
  });
  const aircraft = await prisma.aircraft.findFirst({
    where: { type: AircraftType.CL_65 },
    orderBy: [{ tailNumber: "asc" }],
    select: { id: true },
  });
  const stationIds = stations.map((station) => station.id);

  if (stationIds.length === 0) {
    throw new Error("No active stations found. Run the base seed first.");
  }

  const crewIds: string[] = [];

  for (const [index, pilot] of DEMO_PILOTS.entries()) {
    const employeeNumber = `${EMPLOYEE_PREFIX}-${String(index + 1).padStart(3, "0")}`;
    const baseStationId = stationIds[index % stationIds.length];
    const crewMember = await prisma.crewMember.upsert({
      where: { employeeNumber },
      create: {
        baseStationId,
        dutyStatus: DutyStatus.OFF_DUTY,
        email: `${employeeNumber.toLowerCase()}@aeroops.local`,
        employeeNumber,
        employmentStatus: EmploymentStatus.ACTIVE,
        firstName: pilot[0],
        lastName: pilot[1],
      },
      update: {
        baseStationId,
        dutyStatus: DutyStatus.OFF_DUTY,
        email: `${employeeNumber.toLowerCase()}@aeroops.local`,
        employmentStatus: EmploymentStatus.ACTIVE,
        firstName: pilot[0],
        lastName: pilot[1],
      },
      select: { id: true },
    });

    crewIds.push(crewMember.id);

    await prisma.crewQualification.upsert({
      where: {
        crewMemberId_aircraftType_seatRole: {
          aircraftType: AircraftType.CL_65,
          crewMemberId: crewMember.id,
          seatRole: SeatRole.CPT,
        },
      },
      create: {
        aircraftType: AircraftType.CL_65,
        crewMemberId: crewMember.id,
        issuedAt: addDays(monthStart, -180),
        seatRole: SeatRole.CPT,
      },
      update: {
        expiresAt: null,
        issuedAt: addDays(monthStart, -180),
        notes: "Demo CL-65 captain qualification for schedule visualization.",
      },
    });
  }

  await prisma.crewSchedule.deleteMany({
    where: {
      crewMemberId: { in: crewIds },
      date: { gte: calendarStart, lt: calendarEnd },
    },
  });
  await prisma.timeOffRequest.deleteMany({
    where: {
      crewMemberId: { in: crewIds },
      startDate: { lt: calendarEnd },
      endDate: { gt: calendarStart },
    },
  });
  await prisma.crewLocationRecord.deleteMany({
    where: { crewMemberId: { in: crewIds } },
  });
  await prisma.aircraftCrewAssignment.deleteMany({
    where: {
      crewMemberId: { in: crewIds },
      startsAt: { lt: calendarEnd },
    },
  });

  const scheduleRows = crewIds.flatMap((crewMemberId, index) => {
    const rows = [];

    for (let date = new Date(calendarStart), dayIndex = 0; date < calendarEnd; date = addDays(date, 1), dayIndex += 1) {
      const dutyStatus = dutyStatusForPilot(index, dayIndex);
      const stationId = stationIds[(index + dayIndex) % stationIds.length];

      rows.push({
        crewMemberId,
        date: new Date(date),
        dutyStatus,
        endsAt: dutyStatus === DutyStatus.OFF_DUTY ? null : addHours(date, 18),
        notes: "Demo schedule row for board visualization.",
        startsAt: dutyStatus === DutyStatus.OFF_DUTY ? null : addHours(date, 8),
        stationId: dutyStatus === DutyStatus.OFF_DUTY ? null : stationId,
      });
    }

    return rows;
  });

  await prisma.crewSchedule.createMany({ data: scheduleRows });

  await prisma.timeOffRequest.createMany({
    data: [
      {
        crewMemberId: crewIds[4],
        endDate: addDays(monthStart, 8),
        reason: "Demo pending vacation request.",
        requestType: TimeOffRequestType.VACATION,
        startDate: addDays(monthStart, 4),
        status: TimeOffRequestStatus.PENDING,
      },
      {
        crewMemberId: crewIds[12],
        endDate: addDays(monthStart, 16),
        reason: "Demo approved personal leave.",
        requestType: TimeOffRequestType.PERSONAL,
        startDate: addDays(monthStart, 12),
        status: TimeOffRequestStatus.APPROVED,
      },
    ],
  });

  await prisma.crewLocationRecord.createMany({
    data: crewIds.map((crewMemberId, index) => ({
      crewMemberId,
      effectiveAt: addDays(monthStart, index % 7),
      locationText: null,
      notes: "Demo latest location for schedule board.",
      source: CrewLocationSource.SCHEDULE,
      stationId: stationIds[index % stationIds.length],
    })),
  });

  if (aircraft) {
    await prisma.aircraftCrewAssignment.createMany({
      data: crewIds.slice(0, 3).map((crewMemberId, index) => ({
        aircraftId: aircraft.id,
        crewMemberId,
        endsAt: addDays(monthStart, 10 + index),
        isActive: true,
        notes: "Demo aircraft assignment for schedule board visualization.",
        seatRole: SeatRole.CPT,
        startsAt: addDays(monthStart, 2 + index),
      })),
    });
  }

  console.log(
    `Seeded ${crewIds.length} CL-65 captain demo pilots and ${scheduleRows.length} schedule rows for ${monthStart.toLocaleString(
      "en-US",
      { month: "long", year: "numeric" },
    )} calendar weeks.`,
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
