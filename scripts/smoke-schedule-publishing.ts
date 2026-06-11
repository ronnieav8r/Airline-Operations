import {
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  DutyStatus,
  PrismaClient,
} from "@prisma/client";

import { publishSchedulePeriod } from "../lib/crew-schedule-publishing";

const prisma = new PrismaClient();
const runKey = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const smokeLabel = `SCHEDULE-PUBLISH-SMOKE-${runKey}`;

function atUtcHour(daysFromNow: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hour, minute, 0, 0);
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
      endsAt: atUtcHour(39, 23, 59),
      name: `${smokeLabel} Period`,
      notes: `${smokeLabel} runtime QA`,
      periodKey: smokeLabel,
      startsAt: atUtcHour(33, 0),
      status: CrewSchedulePeriodStatus.DRAFTING,
    },
    select: { id: true },
  });
  const entry = await prisma.crewScheduleEntry.create({
    data: {
      createdById: admin.id,
      crewMemberId: crewMember.id,
      date: atUtcHour(34, 0),
      dutyStatus: DutyStatus.ON_DUTY,
      endsAt: atUtcHour(34, 17),
      notes: `${smokeLabel} draft entry`,
      periodId: period.id,
      startsAt: atUtcHour(34, 8),
      stationId: station?.id ?? null,
      status: CrewScheduleEntryStatus.DRAFT,
    },
    select: { id: true },
  });

  const firstAffected = await prisma.$transaction((tx) =>
    publishSchedulePeriod(tx, period.id, admin.id),
  );
  const afterFirstPublish = await prisma.crewScheduleEntry.findUnique({
    where: { id: entry.id },
    select: {
      generatedCrewScheduleId: true,
      publishedAt: true,
      publishedById: true,
      status: true,
      period: {
        select: {
          publishedAt: true,
          publishedById: true,
          status: true,
        },
      },
    },
  });

  if (
    !afterFirstPublish ||
    afterFirstPublish.status !== CrewScheduleEntryStatus.PUBLISHED ||
    afterFirstPublish.period.status !== CrewSchedulePeriodStatus.PUBLISHED ||
    !afterFirstPublish.generatedCrewScheduleId ||
    !afterFirstPublish.publishedAt ||
    afterFirstPublish.publishedById !== admin.id ||
    !afterFirstPublish.period.publishedAt ||
    afterFirstPublish.period.publishedById !== admin.id
  ) {
    throw new Error("First schedule publish did not create the expected published period, entry, and bridge row.");
  }

  const secondAffected = await prisma.$transaction((tx) =>
    publishSchedulePeriod(tx, period.id, admin.id),
  );
  const afterSecondPublish = await prisma.crewScheduleEntry.findUnique({
    where: { id: entry.id },
    select: {
      generatedCrewScheduleId: true,
      publishedAt: true,
      period: {
        select: {
          publishedAt: true,
          status: true,
        },
      },
    },
  });

  if (
    !afterSecondPublish ||
    afterSecondPublish.generatedCrewScheduleId !== afterFirstPublish.generatedCrewScheduleId ||
    afterSecondPublish.publishedAt?.getTime() !== afterFirstPublish.publishedAt.getTime() ||
    afterSecondPublish.period.publishedAt?.getTime() !== afterFirstPublish.period.publishedAt.getTime()
  ) {
    throw new Error("Schedule publish was not idempotent for an already-published period.");
  }

  const bridge = await prisma.crewSchedule.findUnique({
    where: { id: afterFirstPublish.generatedCrewScheduleId },
    select: {
      crewMemberId: true,
      dutyStatus: true,
      stationId: true,
    },
  });

  if (
    !bridge ||
    bridge.crewMemberId !== crewMember.id ||
    bridge.dutyStatus !== DutyStatus.ON_DUTY ||
    bridge.stationId !== (station?.id ?? null)
  ) {
    throw new Error("Generated CrewSchedule bridge row did not match the published entry.");
  }

  const assignmentCountAfter = await prisma.aircraftCrewAssignment.count();

  if (assignmentCountAfter !== assignmentCountBefore) {
    throw new Error("Schedule publishing changed AircraftCrewAssignment row count.");
  }

  console.log(
    `schedule publishing smoke: published ${period.id}, bridge ${afterFirstPublish.generatedCrewScheduleId}, affected ${firstAffected.length}/${secondAffected.length} crew member(s).`,
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
