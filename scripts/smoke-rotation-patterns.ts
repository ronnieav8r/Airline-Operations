import {
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  DutyStatus,
  PrismaClient,
} from "@prisma/client";

import { generatePatternDraftEntries } from "../lib/crew-schedule-pattern-generation";

const prisma = new PrismaClient();
const runKey = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const smokeLabel = `ROTATION-PATTERN-SMOKE-${runKey}`;

function atUtcDay(daysFromNow: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function main() {
  const [admin, crewMember, station] = await Promise.all([
    prisma.user.findUnique({
      where: { email: "admin@aeroops.local" },
      select: { id: true },
    }),
    prisma.crewMember.findFirst({
      where: { employmentStatus: "ACTIVE" },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true },
    }),
    prisma.station.findFirst({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      select: { id: true },
    }),
  ]);

  if (!admin) {
    throw new Error("admin@aeroops.local was not found. Run local seed first.");
  }

  if (!crewMember) {
    throw new Error("No active crew member was found. Run local seed first.");
  }

  const assignmentCountBefore = await prisma.aircraftCrewAssignment.count();
  const period = await prisma.crewSchedulePeriod.create({
    data: {
      createdById: admin.id,
      endsAt: atUtcDay(45),
      name: `${smokeLabel} Period`,
      notes: `${smokeLabel} runtime QA`,
      periodKey: smokeLabel,
      startsAt: atUtcDay(40),
      status: CrewSchedulePeriodStatus.DRAFTING,
    },
    select: { id: true },
  });
  const pattern = await prisma.crewRotationPattern.create({
    data: {
      createdById: admin.id,
      cycleLengthDays: 2,
      days: {
        create: [
          {
            dayNumber: 1,
            dutyStatus: DutyStatus.ON_DUTY,
            endsAtMinutes: 17 * 60,
            startsAtMinutes: 8 * 60,
            stationId: station?.id ?? null,
          },
          {
            dayNumber: 2,
            dutyStatus: DutyStatus.OFF_DUTY,
            stationId: station?.id ?? null,
          },
        ],
      },
      isActive: true,
      name: `${smokeLabel} 2-day`,
      notes: `${smokeLabel} runtime QA`,
      patternKey: smokeLabel,
    },
    select: { id: true },
  });
  const input = {
    crewMemberId: crewMember.id,
    days: 4,
    endDate: atUtcDay(43),
    patternId: pattern.id,
    sourceRequestId: null,
    startDate: atUtcDay(40),
  };
  const firstResult = await prisma.$transaction((tx) =>
    generatePatternDraftEntries(tx, period.id, input, admin.id),
  );

  if (firstResult.generated !== 4 || firstResult.skipped !== 0) {
    throw new Error(`Expected 4 generated rows and 0 skipped rows, got ${firstResult.generated}/${firstResult.skipped}.`);
  }

  const entriesAfterFirstRun = await prisma.crewScheduleEntry.findMany({
    where: {
      periodId: period.id,
    },
    orderBy: [{ date: "asc" }],
    select: {
      generatedCrewScheduleId: true,
      rotationPatternId: true,
      status: true,
    },
  });

  if (
    entriesAfterFirstRun.length !== 4 ||
    entriesAfterFirstRun.some(
      (entry) =>
        entry.status !== CrewScheduleEntryStatus.DRAFT ||
        entry.rotationPatternId !== pattern.id ||
        entry.generatedCrewScheduleId !== null,
    )
  ) {
    throw new Error("Generated pattern entries did not remain draft-only and pattern-linked.");
  }

  const secondResult = await prisma.$transaction((tx) =>
    generatePatternDraftEntries(tx, period.id, input, admin.id),
  );
  const entryCountAfterSecondRun = await prisma.crewScheduleEntry.count({
    where: { periodId: period.id },
  });

  if (secondResult.generated !== 0 || secondResult.skipped !== 4 || entryCountAfterSecondRun !== 4) {
    throw new Error(
      `Expected duplicate generation to skip 4 rows without creating more entries, got ${secondResult.generated}/${secondResult.skipped}/${entryCountAfterSecondRun}.`,
    );
  }

  const assignmentCountAfter = await prisma.aircraftCrewAssignment.count();

  if (assignmentCountAfter !== assignmentCountBefore) {
    throw new Error("Rotation pattern generation changed AircraftCrewAssignment row count.");
  }

  console.log(
    `rotation pattern smoke: generated ${firstResult.generated}, skipped ${secondResult.skipped}, period ${period.id}.`,
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
