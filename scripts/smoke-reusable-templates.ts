import {
  CrewPlanningDraftChangeStatus,
  CrewPlanningDraftChangeType,
  CrewPlanningDraftStatus,
  CrewSchedulePeriodStatus,
  DutyStatus,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();
const smokePrefix = "REUSABLE-TEMPLATE-SMOKE-";
const runKey = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const smokeLabel = `${smokePrefix}${runKey}`;

function atUtcDay(daysFromNow: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function cleanupSmokeArtifacts() {
  await prisma.crewRotationPatternDay.deleteMany({
    where: { pattern: { patternKey: { startsWith: smokePrefix } } },
  });
  await prisma.crewRotationPattern.deleteMany({
    where: { patternKey: { startsWith: smokePrefix } },
  });
  await prisma.crewSchedulePeriod.deleteMany({
    where: { periodKey: { startsWith: smokePrefix } },
  });
}

async function main() {
  await cleanupSmokeArtifacts();

  const crewMember = await prisma.crewMember.findFirst({
    where: { employmentStatus: "ACTIVE" },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true },
  });

  if (!crewMember) {
    throw new Error("No active crew member was found. Run local seed first.");
  }

  const period = await prisma.crewSchedulePeriod.create({
    data: {
      createdById: null,
      endsAt: atUtcDay(60),
      name: `${smokeLabel} Period`,
      notes: `${smokeLabel} runtime QA`,
      periodKey: smokeLabel,
      startsAt: atUtcDay(30),
      status: CrewSchedulePeriodStatus.DRAFTING,
    },
    select: { id: true },
  });

  const pattern = await prisma.crewRotationPattern.create({
    data: {
      createdById: null,
      cycleLengthDays: 14,
      days: {
        create: Array.from({ length: 14 }, (_value, index) => ({
          dayNumber: index + 1,
          dutyStatus: index < 7 ? DutyStatus.ON_DUTY : DutyStatus.OFF_DUTY,
        })),
      },
      isActive: true,
      name: `${smokeLabel} 7 on / 7 off`,
      notes: `${smokeLabel} nullable actor reusable template`,
      patternKey: smokeLabel,
    },
    include: { days: { orderBy: { dayNumber: "asc" } } },
  });

  const draft = await prisma.crewPlanningDraft.create({
    data: {
      createdById: null,
      draftKey: `${smokeLabel}-draft`,
      name: `${smokeLabel} Draft`,
      periodId: period.id,
      status: CrewPlanningDraftStatus.ACTIVE,
      updatedById: null,
    },
    select: { id: true },
  });

  if (pattern.days.length !== 14 || pattern.days.filter((day) => day.dutyStatus === DutyStatus.ON_DUTY).length !== 7) {
    throw new Error("7 on / 7 off pattern did not persist as a 14-day split template.");
  }

  const oneCycleStart = atUtcDay(30);
  await prisma.crewPlanningDraftChange.createMany({
    data: [
      {
        changeType: CrewPlanningDraftChangeType.ADD,
        crewMemberId: crewMember.id,
        date: oneCycleStart,
        draftId: draft.id,
        dutyStatus: DutyStatus.ON_DUTY,
        endDate: addDays(oneCycleStart, 6),
        status: CrewPlanningDraftChangeStatus.DRAFT,
      },
      {
        changeType: CrewPlanningDraftChangeType.ADD,
        crewMemberId: crewMember.id,
        date: addDays(oneCycleStart, 7),
        draftId: draft.id,
        dutyStatus: DutyStatus.OFF_DUTY,
        endDate: addDays(oneCycleStart, 13),
        status: CrewPlanningDraftChangeStatus.DRAFT,
      },
    ],
  });

  const twoCycleStart = atUtcDay(45);
  await prisma.crewPlanningDraftChange.createMany({
    data: [
      [0, 6, DutyStatus.ON_DUTY],
      [7, 13, DutyStatus.OFF_DUTY],
      [14, 20, DutyStatus.ON_DUTY],
      [21, 27, DutyStatus.OFF_DUTY],
    ].map(([startOffset, endOffset, dutyStatus]) => ({
      changeType: CrewPlanningDraftChangeType.ADD,
      crewMemberId: crewMember.id,
      date: addDays(twoCycleStart, startOffset as number),
      draftId: draft.id,
      dutyStatus: dutyStatus as DutyStatus,
      endDate: addDays(twoCycleStart, endOffset as number),
      status: CrewPlanningDraftChangeStatus.DRAFT,
    })),
  });

  const onDutyDraftChanges = await prisma.crewPlanningDraftChange.findMany({
    where: {
      crewMemberId: crewMember.id,
      draftId: draft.id,
      dutyStatus: DutyStatus.ON_DUTY,
      status: CrewPlanningDraftChangeStatus.DRAFT,
    },
    select: { date: true, endDate: true },
  });
  const scheduledDays = onDutyDraftChanges.reduce((total, change) => {
    const days = Math.floor((change.endDate.getTime() - change.date.getTime()) / 86_400_000) + 1;
    return total + days;
  }, 0);

  if (scheduledDays !== 21) {
    throw new Error(`Expected 21 draft scheduled days across one-cycle and two-cycle placements, got ${scheduledDays}.`);
  }

  console.log(`reusable template smoke: pattern ${pattern.id}, draft scheduled days ${scheduledDays}.`);
  await cleanupSmokeArtifacts();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
