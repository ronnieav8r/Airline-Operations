import {
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  CrewScheduleRequestType,
  DutyStatus,
  PrismaClient,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";

import {
  assertSmokeTestAuthEnabled,
  ensureSmokeTestUsers,
} from "./smoke-test-auth";

const prisma = new PrismaClient();
const runKey = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const smokeLabel = `CREW-PORTAL-SMOKE-${runKey}`;

function atUtcDay(daysFromNow: number, hour = 0, minute = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

async function countRestrictedRows() {
  const [
    aircraftCrewAssignments,
    crewCertificates,
    crewCheckEvents,
    crewLocationRecords,
    crewLogisticsNeeds,
    crewMedicals,
    crewRecencyEvents,
    crewRestPeriods,
    crewDutyPeriods,
    crewScheduleEntries,
    crewSchedules,
    crewTrainingEvents,
  ] = await Promise.all([
    prisma.aircraftCrewAssignment.count(),
    prisma.crewCertificate.count(),
    prisma.crewCheckEvent.count(),
    prisma.crewLocationRecord.count(),
    prisma.crewLogisticsNeed.count(),
    prisma.crewMedical.count(),
    prisma.crewRecencyEvent.count(),
    prisma.crewRestPeriod.count(),
    prisma.crewDutyPeriod.count(),
    prisma.crewScheduleEntry.count(),
    prisma.crewSchedule.count(),
    prisma.crewTrainingEvent.count(),
  ]);

  return {
    aircraftCrewAssignments,
    crewCertificates,
    crewCheckEvents,
    crewDutyPeriods,
    crewLocationRecords,
    crewLogisticsNeeds,
    crewMedicals,
    crewRecencyEvents,
    crewRestPeriods,
    crewScheduleEntries,
    crewSchedules,
    crewTrainingEvents,
  };
}

async function main() {
  assertSmokeTestAuthEnabled();
  await ensureSmokeTestUsers(prisma);

  const crewUser = await prisma.user.findUnique({
    where: { email: "crew@aeroops.local" },
    select: {
      id: true,
      crewMember: {
        select: { id: true },
      },
    },
  });

  if (!crewUser?.crewMember) {
    throw new Error("crew@aeroops.local is not linked to a crew member.");
  }

  const countsBefore = await countRestrictedRows();
  const period = await prisma.crewSchedulePeriod.create({
    data: {
      endsAt: atUtcDay(95, 23, 59),
      name: `${smokeLabel} Period`,
      notes: `${smokeLabel} crew portal backend QA`,
      periodKey: smokeLabel,
      startsAt: atUtcDay(80),
      status: CrewSchedulePeriodStatus.BID_OPEN,
    },
    select: { id: true },
  });
  const [timeOffRequest, scheduleRequest] = await Promise.all([
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: crewUser.crewMember.id,
        endDate: atUtcDay(84, 23, 59),
        reason: `${smokeLabel} crew self-service time off`,
        requestedById: crewUser.id,
        requestType: TimeOffRequestType.VACATION,
        startDate: atUtcDay(83),
        status: TimeOffRequestStatus.PENDING,
      },
      select: { id: true },
    }),
    prisma.crewScheduleRequest.create({
      data: {
        crewMemberId: crewUser.crewMember.id,
        endDate: atUtcDay(88, 23, 59),
        periodId: period.id,
        preferredDutyStatus: DutyStatus.OFF_DUTY,
        requestNotes: `${smokeLabel} crew self-service preference`,
        requestType: CrewScheduleRequestType.PREFERRED_OFF_DAYS,
        startDate: atUtcDay(87),
        status: CrewScheduleRequestStatus.SUBMITTED,
        submittedById: crewUser.id,
      },
      select: { id: true },
    }),
  ]);
  const [timeOffAfter, scheduleRequestAfter] = await Promise.all([
    prisma.timeOffRequest.findUnique({
      where: { id: timeOffRequest.id },
      select: {
        crewMemberId: true,
        requestedById: true,
        reviewedAt: true,
        reviewedById: true,
        status: true,
      },
    }),
    prisma.crewScheduleRequest.findUnique({
      where: { id: scheduleRequest.id },
      select: {
        crewMemberId: true,
        reviewedAt: true,
        reviewedById: true,
        status: true,
        submittedById: true,
      },
    }),
  ]);

  if (
    timeOffAfter?.crewMemberId !== crewUser.crewMember.id ||
    timeOffAfter.requestedById !== crewUser.id ||
    timeOffAfter.status !== TimeOffRequestStatus.PENDING ||
    timeOffAfter.reviewedAt !== null ||
    timeOffAfter.reviewedById !== null
  ) {
    throw new Error("Crew portal time-off submission was not scoped as a pending linked-crew request.");
  }

  if (
    scheduleRequestAfter?.crewMemberId !== crewUser.crewMember.id ||
    scheduleRequestAfter.submittedById !== crewUser.id ||
    scheduleRequestAfter.status !== CrewScheduleRequestStatus.SUBMITTED ||
    scheduleRequestAfter.reviewedAt !== null ||
    scheduleRequestAfter.reviewedById !== null
  ) {
    throw new Error("Crew portal schedule request submission was not scoped as a submitted linked-crew request.");
  }

  const countsAfter = await countRestrictedRows();

  if (JSON.stringify(countsAfter) !== JSON.stringify(countsBefore)) {
    throw new Error("Crew portal backend smoke changed restricted workflow row counts.");
  }

  console.log(
    `crew portal backend smoke: submitted time off ${timeOffRequest.id} and schedule request ${scheduleRequest.id}.`,
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
