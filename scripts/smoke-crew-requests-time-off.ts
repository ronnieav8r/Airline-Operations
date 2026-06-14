import {
  EmploymentStatus,
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  CrewScheduleRequestType,
  DutyStatus,
  PrismaClient,
  SeatRole,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";

import { getTimeOffWorkflowData } from "../lib/time-off-workflow-queries";
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

async function createCoverageCrew({
  aircraftType,
  employeeSuffix,
  firstName,
  lastName,
  seatRole,
  stationId,
}: {
  aircraftType: Awaited<ReturnType<typeof prisma.aircraft.findFirstOrThrow>>["type"];
  employeeSuffix: string;
  firstName: string;
  lastName: string;
  seatRole: SeatRole;
  stationId: string;
}) {
  return prisma.crewMember.create({
    data: {
      baseStationId: stationId,
      dutyStatus: DutyStatus.OFF_DUTY,
      employeeNumber: `${smokeLabel}-${employeeSuffix}`,
      employmentStatus: EmploymentStatus.ACTIVE,
      firstName,
      lastName,
      qualifications: {
        create: {
          aircraftType,
          issuedAt: atUtcDay(-30),
          seatRole,
        },
      },
    },
    select: {
      id: true,
    },
  });
}

function hasCrew(crew: Array<{ crewMemberId: string }>, crewMemberId: string): boolean {
  return crew.some((crewMember) => crewMember.crewMemberId === crewMemberId);
}

async function main() {
  assertSmokeTestAuthEnabled();
  await ensureSmokeTestUsers(prisma);

  const [admin, crewUser, crewMember, station, aircraft] = await Promise.all([
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
    prisma.station.findFirst({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      select: { id: true },
    }),
    prisma.aircraft.findFirst({
      orderBy: [{ tailNumber: "asc" }],
      select: { id: true, tailNumber: true, type: true },
    }),
  ]);

  if (!admin || !crewUser) {
    throw new Error("Smoke users were not found. Run local seed first.");
  }

  if (!crewMember) {
    throw new Error("No active crew member was found. Run local seed first.");
  }

  if (!station || !aircraft) {
    throw new Error("Station or aircraft seed data was not found. Run local seed first.");
  }

  const assignedRole = SeatRole.FA;
  const fallbackRole = SeatRole.CA;
  const assignedWindowStart = atUtcDay(120);
  const assignedWindowEnd = atUtcDay(122, 23, 59);
  const fallbackWindowStart = atUtcDay(130);
  const fallbackWindowEnd = atUtcDay(132, 23, 59);
  const [
    assignedRequester,
    scheduledAvailableCrew,
    pendingOverlapCrew,
    approvedOverlapCrew,
    occupiedCrew,
    scheduledUnavailableCrew,
    fallbackRequester,
    fallbackAvailableCrew,
  ] = await Promise.all([
    createCoverageCrew({
      aircraftType: aircraft.type,
      employeeSuffix: "ASSIGNED-REQUESTER",
      firstName: "Assigned",
      lastName: "Requester",
      seatRole: assignedRole,
      stationId: station.id,
    }),
    createCoverageCrew({
      aircraftType: aircraft.type,
      employeeSuffix: "SCHEDULED-AVAILABLE",
      firstName: "Scheduled",
      lastName: "Available",
      seatRole: assignedRole,
      stationId: station.id,
    }),
    createCoverageCrew({
      aircraftType: aircraft.type,
      employeeSuffix: "PENDING-OVERLAP",
      firstName: "Pending",
      lastName: "Overlap",
      seatRole: assignedRole,
      stationId: station.id,
    }),
    createCoverageCrew({
      aircraftType: aircraft.type,
      employeeSuffix: "APPROVED-OVERLAP",
      firstName: "Approved",
      lastName: "Overlap",
      seatRole: assignedRole,
      stationId: station.id,
    }),
    createCoverageCrew({
      aircraftType: aircraft.type,
      employeeSuffix: "OCCUPIED",
      firstName: "Occupied",
      lastName: "Crew",
      seatRole: assignedRole,
      stationId: station.id,
    }),
    createCoverageCrew({
      aircraftType: aircraft.type,
      employeeSuffix: "SCHEDULED-UNAVAILABLE",
      firstName: "Scheduled",
      lastName: "Unavailable",
      seatRole: assignedRole,
      stationId: station.id,
    }),
    createCoverageCrew({
      aircraftType: aircraft.type,
      employeeSuffix: "FALLBACK-REQUESTER",
      firstName: "Fallback",
      lastName: "Requester",
      seatRole: fallbackRole,
      stationId: station.id,
    }),
    createCoverageCrew({
      aircraftType: aircraft.type,
      employeeSuffix: "FALLBACK-AVAILABLE",
      firstName: "Fallback",
      lastName: "Available",
      seatRole: fallbackRole,
      stationId: station.id,
    }),
  ]);

  const [assignedCoverageRequest, fallbackCoverageRequest] = await Promise.all([
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: assignedRequester.id,
        endDate: assignedWindowEnd,
        reason: `${smokeLabel} assigned coverage request`,
        requestedById: crewUser.id,
        requestType: TimeOffRequestType.VACATION,
        startDate: assignedWindowStart,
        status: TimeOffRequestStatus.PENDING,
      },
      select: { id: true },
    }),
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: fallbackRequester.id,
        endDate: fallbackWindowEnd,
        reason: `${smokeLabel} fallback coverage request`,
        requestedById: crewUser.id,
        requestType: TimeOffRequestType.PERSONAL,
        startDate: fallbackWindowStart,
        status: TimeOffRequestStatus.PENDING,
      },
      select: { id: true },
    }),
  ]);

  await prisma.$transaction([
    prisma.aircraftCrewAssignment.create({
      data: {
        aircraftId: aircraft.id,
        crewMemberId: assignedRequester.id,
        isActive: true,
        seatRole: assignedRole,
        startsAt: atUtcDay(119),
        endsAt: atUtcDay(123, 23, 59),
        notes: `${smokeLabel} requester assignment`,
      },
    }),
    prisma.aircraftCrewAssignment.create({
      data: {
        aircraftId: aircraft.id,
        crewMemberId: occupiedCrew.id,
        isActive: true,
        seatRole: assignedRole,
        startsAt: assignedWindowStart,
        endsAt: assignedWindowEnd,
        notes: `${smokeLabel} occupied same-position crew`,
      },
    }),
    prisma.crewSchedule.create({
      data: {
        crewMemberId: scheduledAvailableCrew.id,
        date: assignedWindowStart,
        dutyStatus: DutyStatus.ON_DUTY,
        stationId: station.id,
        startsAt: assignedWindowStart,
        endsAt: atUtcDay(120, 12),
        notes: `${smokeLabel} workable schedule`,
      },
    }),
    prisma.crewSchedule.create({
      data: {
        crewMemberId: scheduledUnavailableCrew.id,
        date: assignedWindowStart,
        dutyStatus: DutyStatus.TRAINING,
        stationId: station.id,
        startsAt: assignedWindowStart,
        endsAt: atUtcDay(120, 12),
        notes: `${smokeLabel} unavailable schedule`,
      },
    }),
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: pendingOverlapCrew.id,
        endDate: assignedWindowEnd,
        reason: `${smokeLabel} pending overlap`,
        requestedById: crewUser.id,
        requestType: TimeOffRequestType.PERSONAL,
        startDate: assignedWindowStart,
        status: TimeOffRequestStatus.PENDING,
      },
    }),
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: approvedOverlapCrew.id,
        endDate: assignedWindowEnd,
        reason: `${smokeLabel} approved overlap`,
        requestedById: crewUser.id,
        requestType: TimeOffRequestType.VACATION,
        startDate: assignedWindowStart,
        status: TimeOffRequestStatus.APPROVED,
      },
    }),
  ]);

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

  const workflowData = await getTimeOffWorkflowData({
    crewMemberId: "all",
    fromDate: atUtcDay(118),
    requestType: "all",
    status: TimeOffRequestStatus.PENDING,
    toDate: atUtcDay(134),
  });
  const assignedWorkflowRequest = workflowData.requestsByStatus.PENDING.find(
    (request) => request.id === assignedCoverageRequest.id,
  );
  const fallbackWorkflowRequest = workflowData.requestsByStatus.PENDING.find(
    (request) => request.id === fallbackCoverageRequest.id,
  );
  const assignedImpact = assignedWorkflowRequest?.coverageImpact.find(
    (impact) => impact.aircraftType === aircraft.type && impact.seatRole === assignedRole,
  );
  const fallbackImpact = fallbackWorkflowRequest?.coverageImpact.find(
    (impact) => impact.aircraftType === aircraft.type && impact.seatRole === fallbackRole,
  );

  if (!assignedImpact || assignedImpact.source !== "ASSIGNMENT") {
    throw new Error("Time-off coverage did not use the requester's active aircraft assignment first.");
  }

  if (
    assignedImpact.scheduleMode !== "SCHEDULED" ||
    !hasCrew(assignedImpact.available, scheduledAvailableCrew.id) ||
    !hasCrew(assignedImpact.pendingOff, pendingOverlapCrew.id) ||
    !hasCrew(assignedImpact.approvedOff, approvedOverlapCrew.id) ||
    !hasCrew(assignedImpact.occupied, occupiedCrew.id) ||
    !hasCrew(assignedImpact.scheduledUnavailable, scheduledUnavailableCrew.id)
  ) {
    throw new Error("Time-off coverage did not bucket scheduled same-position crew as expected.");
  }

  if (!fallbackImpact || fallbackImpact.source !== "QUALIFICATION") {
    throw new Error("Time-off coverage did not fall back to qualifications when no assignment existed.");
  }

  if (
    fallbackImpact.scheduleMode !== "QUALIFIED_POOL" ||
    !hasCrew(fallbackImpact.available, fallbackAvailableCrew.id)
  ) {
    throw new Error("Time-off coverage did not show an unscheduled qualified-pool estimate.");
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
