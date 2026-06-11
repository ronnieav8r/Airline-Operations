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
const smokeLabel = `REQUEST-TIMEOFF-SMOKE-${runKey}`;

function atUtcDay(daysFromNow: number, hour = 0, minute = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  assertSmokeTestAuthEnabled();
  await ensureSmokeTestUsers(prisma);

  const [admin, crewUser, crewMember] = await Promise.all([
    prisma.user.findUnique({
      where: { email: "admin@aeroops.local" },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { email: "crew@aeroops.local" },
      select: { id: true },
    }),
    prisma.crewMember.findFirst({
      where: { employmentStatus: "ACTIVE" },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true },
    }),
  ]);

  if (!admin || !crewUser) {
    throw new Error("Smoke users were not found. Run local seed first.");
  }

  if (!crewMember) {
    throw new Error("No active crew member was found. Run local seed first.");
  }

  const [aircraftAssignmentCountBefore, crewScheduleCountBefore, scheduleEntryCountBefore] =
    await Promise.all([
      prisma.aircraftCrewAssignment.count(),
      prisma.crewSchedule.count(),
      prisma.crewScheduleEntry.count(),
    ]);
  const period = await prisma.crewSchedulePeriod.create({
    data: {
      createdById: admin.id,
      endsAt: atUtcDay(75, 23, 59),
      name: `${smokeLabel} Period`,
      notes: `${smokeLabel} runtime QA`,
      periodKey: smokeLabel,
      startsAt: atUtcDay(60),
      status: CrewSchedulePeriodStatus.BID_OPEN,
    },
    select: { id: true },
  });
  const [approvedRequest, deniedRequest] = await Promise.all([
    prisma.crewScheduleRequest.create({
      data: {
        crewMemberId: crewMember.id,
        endDate: atUtcDay(64, 23, 59),
        periodId: period.id,
        preferredDutyStatus: DutyStatus.ON_DUTY,
        requestNotes: `${smokeLabel} approve me`,
        requestType: CrewScheduleRequestType.PREFERRED_WORK_DAYS,
        startDate: atUtcDay(63),
        status: CrewScheduleRequestStatus.SUBMITTED,
        submittedById: crewUser.id,
      },
      select: { id: true },
    }),
    prisma.crewScheduleRequest.create({
      data: {
        crewMemberId: crewMember.id,
        endDate: atUtcDay(67, 23, 59),
        periodId: period.id,
        preferredDutyStatus: DutyStatus.OFF_DUTY,
        requestNotes: `${smokeLabel} deny me`,
        requestType: CrewScheduleRequestType.PREFERRED_OFF_DAYS,
        startDate: atUtcDay(66),
        status: CrewScheduleRequestStatus.SUBMITTED,
        submittedById: crewUser.id,
      },
      select: { id: true },
    }),
  ]);

  await prisma.$transaction([
    prisma.crewScheduleRequest.update({
      where: { id: approvedRequest.id },
      data: {
        reviewedAt: new Date(),
        reviewedById: admin.id,
        reviewNotes: `${smokeLabel} approved`,
        status: CrewScheduleRequestStatus.APPROVED,
      },
    }),
    prisma.crewScheduleRequest.update({
      where: { id: deniedRequest.id },
      data: {
        reviewedAt: new Date(),
        reviewedById: admin.id,
        reviewNotes: `${smokeLabel} denied`,
        status: CrewScheduleRequestStatus.DENIED,
      },
    }),
  ]);

  const [approvedAfter, deniedAfter] = await Promise.all([
    prisma.crewScheduleRequest.findUnique({
      where: { id: approvedRequest.id },
      select: { reviewedAt: true, reviewedById: true, status: true },
    }),
    prisma.crewScheduleRequest.findUnique({
      where: { id: deniedRequest.id },
      select: { reviewedAt: true, reviewedById: true, status: true },
    }),
  ]);

  if (
    approvedAfter?.status !== CrewScheduleRequestStatus.APPROVED ||
    approvedAfter.reviewedById !== admin.id ||
    !approvedAfter.reviewedAt ||
    deniedAfter?.status !== CrewScheduleRequestStatus.DENIED ||
    deniedAfter.reviewedById !== admin.id ||
    !deniedAfter.reviewedAt
  ) {
    throw new Error("Crew schedule request review did not persist expected statuses and review metadata.");
  }

  const [approvedTimeOff, deniedTimeOff, cancelledTimeOff] = await Promise.all([
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: crewMember.id,
        endDate: atUtcDay(70, 23, 59),
        reason: `${smokeLabel} approve vacation`,
        requestedById: crewUser.id,
        requestType: TimeOffRequestType.VACATION,
        startDate: atUtcDay(69),
        status: TimeOffRequestStatus.PENDING,
      },
      select: { id: true },
    }),
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: crewMember.id,
        endDate: atUtcDay(72, 23, 59),
        reason: `${smokeLabel} deny personal`,
        requestedById: crewUser.id,
        requestType: TimeOffRequestType.PERSONAL,
        startDate: atUtcDay(71),
        status: TimeOffRequestStatus.PENDING,
      },
      select: { id: true },
    }),
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: crewMember.id,
        endDate: atUtcDay(74, 23, 59),
        reason: `${smokeLabel} cancel training`,
        requestedById: crewUser.id,
        requestType: TimeOffRequestType.TRAINING,
        startDate: atUtcDay(73),
        status: TimeOffRequestStatus.PENDING,
      },
      select: { id: true },
    }),
  ]);

  await prisma.$transaction([
    prisma.timeOffRequest.update({
      where: { id: approvedTimeOff.id },
      data: {
        reviewedAt: new Date(),
        reviewedById: admin.id,
        status: TimeOffRequestStatus.APPROVED,
      },
    }),
    prisma.timeOffRequest.update({
      where: { id: deniedTimeOff.id },
      data: {
        reviewedAt: new Date(),
        reviewedById: admin.id,
        status: TimeOffRequestStatus.DENIED,
      },
    }),
    prisma.timeOffRequest.update({
      where: { id: cancelledTimeOff.id },
      data: {
        reviewedAt: new Date(),
        reviewedById: admin.id,
        status: TimeOffRequestStatus.CANCELLED,
      },
    }),
  ]);

  const timeOffStatuses = await prisma.timeOffRequest.findMany({
    where: {
      id: { in: [approvedTimeOff.id, deniedTimeOff.id, cancelledTimeOff.id] },
    },
    select: {
      reviewedAt: true,
      reviewedById: true,
      status: true,
    },
  });
  const expectedTimeOffStatuses: Set<TimeOffRequestStatus> = new Set([
    TimeOffRequestStatus.APPROVED,
    TimeOffRequestStatus.DENIED,
    TimeOffRequestStatus.CANCELLED,
  ]);

  if (
    timeOffStatuses.length !== 3 ||
    timeOffStatuses.some(
      (request) =>
        !expectedTimeOffStatuses.has(request.status) ||
        request.reviewedById !== admin.id ||
        !request.reviewedAt,
    )
  ) {
    throw new Error("Time-off review did not persist expected statuses and review metadata.");
  }

  const [aircraftAssignmentCountAfter, crewScheduleCountAfter, scheduleEntryCountAfter] =
    await Promise.all([
      prisma.aircraftCrewAssignment.count(),
      prisma.crewSchedule.count(),
      prisma.crewScheduleEntry.count(),
    ]);

  if (
    aircraftAssignmentCountAfter !== aircraftAssignmentCountBefore ||
    crewScheduleCountAfter !== crewScheduleCountBefore ||
    scheduleEntryCountAfter !== scheduleEntryCountBefore
  ) {
    throw new Error("Request/time-off review created scheduling bridge, schedule entry, or aircraft assignment side effects.");
  }

  console.log(
    `crew request/time-off smoke: reviewed requests ${approvedRequest.id}/${deniedRequest.id} and time off ${timeOffStatuses.length}.`,
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
