import {
  AircraftStatus,
  AircraftType,
  CrewLocationSource,
  CrewLogisticsNeedStatus,
  CrewLogisticsNeedType,
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  DutyStatus,
  EmploymentStatus,
  PrismaClient,
  SeatRole,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";

import { getCrewSchedulingWorkbenchData } from "../lib/crew-scheduling-workbench-queries";
import {
  assertSmokeTestAuthEnabled,
  ensureSmokeTestUsers,
} from "./smoke-test-auth";

const prisma = new PrismaClient();
const runKey = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const smokeLabel = `SCHED-WORKBENCH-${runKey}`;
const smokeEmployeePrefix = "SCHED-WORKBENCH-";
const smokeFlightPrefix = "SCHEDWORKBENCH";
const smokeTailPrefix = "N-SCHED-WB-";

function requireLocalOrExplicitRemoteSmoke() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (
    process.env.AEROOPS_ALLOW_REMOTE_SMOKE !== "1" &&
    !databaseUrl.includes("127.0.0.1") &&
    !databaseUrl.includes("localhost")
  ) {
    throw new Error(
      "Crew scheduling workbench smoke writes are blocked unless DATABASE_URL is local or AEROOPS_ALLOW_REMOTE_SMOKE=1 is set.",
    );
  }
}

function atLocalDay(daysFromNow: number, hour = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function assertRecord<T>(record: T | null | undefined, label: string): T {
  if (!record) {
    throw new Error(`${label} is required for crew scheduling workbench smoke.`);
  }

  return record;
}

async function cleanupSmokeRecords() {
  const smokeCrew = await prisma.crewMember.findMany({
    where: { employeeNumber: { startsWith: smokeEmployeePrefix } },
    select: { id: true },
  });
  const smokeCrewIds = smokeCrew.map((crewMember) => crewMember.id);

  if (smokeCrewIds.length > 0) {
    await prisma.$transaction([
      prisma.crewLogisticsNeed.deleteMany({ where: { crewMemberId: { in: smokeCrewIds } } }),
      prisma.crewLocationRecord.deleteMany({ where: { crewMemberId: { in: smokeCrewIds } } }),
      prisma.aircraftCrewAssignment.deleteMany({ where: { crewMemberId: { in: smokeCrewIds } } }),
      prisma.timeOffRequest.deleteMany({ where: { crewMemberId: { in: smokeCrewIds } } }),
      prisma.crewPlanningDraftChange.deleteMany({ where: { crewMemberId: { in: smokeCrewIds } } }),
      prisma.crewScheduleEntry.deleteMany({ where: { crewMemberId: { in: smokeCrewIds } } }),
      prisma.crewSchedule.deleteMany({ where: { crewMemberId: { in: smokeCrewIds } } }),
      prisma.crewScheduleRequest.deleteMany({ where: { crewMemberId: { in: smokeCrewIds } } }),
      prisma.crewQualification.deleteMany({ where: { crewMemberId: { in: smokeCrewIds } } }),
      prisma.crewMember.deleteMany({ where: { id: { in: smokeCrewIds } } }),
    ]);
  }

  await prisma.$transaction([
    prisma.flight.deleteMany({ where: { flightNumber: { startsWith: smokeFlightPrefix } } }),
    prisma.aircraft.deleteMany({ where: { tailNumber: { startsWith: smokeTailPrefix } } }),
    prisma.crewSchedulePeriod.deleteMany({
      where: { periodKey: { startsWith: smokeEmployeePrefix } },
    }),
  ]);
}

async function createCrew({
  baseStationId,
  employeeSuffix,
  firstName,
  role,
  type,
}: {
  baseStationId: string;
  employeeSuffix: string;
  firstName: string;
  role: SeatRole;
  type: Awaited<ReturnType<typeof prisma.aircraft.findFirstOrThrow>>["type"];
}) {
  return prisma.crewMember.create({
    data: {
      baseStationId,
      dutyStatus: DutyStatus.OFF_DUTY,
      employeeNumber: `${smokeLabel}-${employeeSuffix}`,
      employmentStatus: EmploymentStatus.ACTIVE,
      firstName,
      lastName: "Workbench",
      qualifications: {
        create: {
          aircraftType: type,
          issuedAt: atLocalDay(-30),
          seatRole: role,
        },
      },
    },
    select: { id: true },
  });
}

function hasCrew(crew: Array<{ crewMemberId: string }>, crewMemberId: string): boolean {
  return crew.some((candidate) => candidate.crewMemberId === crewMemberId);
}

async function main() {
  requireLocalOrExplicitRemoteSmoke();
  assertSmokeTestAuthEnabled();
  await ensureSmokeTestUsers(prisma);
  await cleanupSmokeRecords();

  const stations = await prisma.station.findMany({
    where: { isActive: true },
    orderBy: [{ code: "asc" }],
    select: { id: true },
    take: 2,
  });
  const departureStation = assertRecord(stations[0], "Departure station");
  const arrivalStation = stations[1] ?? departureStation;
  const selectedAircraft = await prisma.aircraft.create({
    data: {
      homeStationId: departureStation.id,
      status: AircraftStatus.AVAILABLE,
      tailNumber: `${smokeTailPrefix}${runKey}`,
      type: AircraftType.CL_65,
    },
    select: { id: true, type: true },
  });
  const periodStart = atLocalDay(95);
  const periodEnd = atLocalDay(99, 23);
  const targetDate = atLocalDay(96);
  const targetDateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(targetDate.getDate()).padStart(2, "0")}`;

  const [scheduledCpt, reserveFo, pendingFa, approvedCa, assignedCpt] = await Promise.all([
    createCrew({
      baseStationId: departureStation.id,
      employeeSuffix: "SCHEDULED-CPT",
      firstName: "Scheduled",
      role: SeatRole.CPT,
      type: selectedAircraft.type,
    }),
    createCrew({
      baseStationId: departureStation.id,
      employeeSuffix: "RESERVE-FO",
      firstName: "Reserve",
      role: SeatRole.FO,
      type: selectedAircraft.type,
    }),
    createCrew({
      baseStationId: departureStation.id,
      employeeSuffix: "PENDING-FA",
      firstName: "Pending",
      role: SeatRole.FA,
      type: selectedAircraft.type,
    }),
    createCrew({
      baseStationId: departureStation.id,
      employeeSuffix: "APPROVED-CA",
      firstName: "Approved",
      role: SeatRole.CA,
      type: selectedAircraft.type,
    }),
    createCrew({
      baseStationId: departureStation.id,
      employeeSuffix: "ASSIGNED-CPT",
      firstName: "Assigned",
      role: SeatRole.CPT,
      type: selectedAircraft.type,
    }),
  ]);
  const period = await prisma.crewSchedulePeriod.create({
    data: {
      endsAt: periodEnd,
      name: `${smokeLabel} Period`,
      periodKey: smokeLabel,
      startsAt: periodStart,
      status: CrewSchedulePeriodStatus.DRAFTING,
    },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.crewScheduleEntry.create({
      data: {
        crewMemberId: scheduledCpt.id,
        date: targetDate,
        dutyStatus: DutyStatus.ON_DUTY,
        periodId: period.id,
        startsAt: atLocalDay(96, 8),
        endsAt: atLocalDay(96, 18),
        status: CrewScheduleEntryStatus.DRAFT,
      },
    }),
    prisma.crewSchedule.create({
      data: {
        crewMemberId: reserveFo.id,
        date: targetDate,
        dutyStatus: DutyStatus.RESERVE,
        startsAt: atLocalDay(96, 8),
        endsAt: atLocalDay(96, 20),
        stationId: departureStation.id,
      },
    }),
    prisma.crewSchedule.create({
      data: {
        crewMemberId: pendingFa.id,
        date: targetDate,
        dutyStatus: DutyStatus.ON_DUTY,
        startsAt: atLocalDay(96, 7),
        endsAt: atLocalDay(96, 17),
        stationId: departureStation.id,
      },
    }),
    prisma.crewSchedule.create({
      data: {
        crewMemberId: approvedCa.id,
        date: targetDate,
        dutyStatus: DutyStatus.VACATION,
        startsAt: atLocalDay(96, 0),
        endsAt: atLocalDay(96, 23),
        stationId: departureStation.id,
      },
    }),
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: pendingFa.id,
        endDate: atLocalDay(96, 23),
        reason: `${smokeLabel} pending overlap`,
        requestType: TimeOffRequestType.PERSONAL,
        startDate: targetDate,
        status: TimeOffRequestStatus.PENDING,
      },
    }),
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: approvedCa.id,
        endDate: atLocalDay(96, 23),
        reason: `${smokeLabel} approved overlap`,
        requestType: TimeOffRequestType.VACATION,
        startDate: targetDate,
        status: TimeOffRequestStatus.APPROVED,
      },
    }),
    prisma.aircraftCrewAssignment.create({
      data: {
        aircraftId: selectedAircraft.id,
        crewMemberId: assignedCpt.id,
        endsAt: atLocalDay(97),
        isActive: true,
        seatRole: SeatRole.CPT,
        startsAt: atLocalDay(96, 14),
        notes: `${smokeLabel} assignment overlay`,
      },
    }),
    prisma.crewLocationRecord.create({
      data: {
        crewMemberId: assignedCpt.id,
        effectiveAt: targetDate,
        locationText: `${smokeLabel} FBO`,
        source: CrewLocationSource.MANUAL,
      },
    }),
    prisma.crewLogisticsNeed.create({
      data: {
        crewMemberId: assignedCpt.id,
        fromStationId: departureStation.id,
        needType: CrewLogisticsNeedType.GROUND_TRANSPORT,
        status: CrewLogisticsNeedStatus.REQUESTED,
        toStationId: arrivalStation.id,
      },
    }),
    prisma.flight.create({
      data: {
        aircraftId: selectedAircraft.id,
        arrivalStationId: arrivalStation.id,
        departureStationId: departureStation.id,
        flightNumber: smokeLabel.replaceAll("-", ""),
        scheduledArrival: atLocalDay(96, 15),
        scheduledDeparture: atLocalDay(96, 13),
      },
    }),
  ]);

  const [assignmentCountBefore, scheduleCountBefore, scheduleEntryCountBefore, legAssignmentCountBefore] =
    await Promise.all([
      prisma.aircraftCrewAssignment.count(),
      prisma.crewSchedule.count(),
      prisma.crewScheduleEntry.count(),
      prisma.crewLegAssignment.count(),
    ]);
  const data = await getCrewSchedulingWorkbenchData({
    date: targetDate,
    filters: {
      aircraftType: selectedAircraft.type,
      base: "all",
      role: "all",
    },
    view: "day",
  });
  const day = data.calendarDays.find((candidate) => candidate.dayKey === targetDateKey);
  const cptBucket = day?.buckets.find(
    (bucket) => bucket.aircraftType === selectedAircraft.type && bucket.seatRole === SeatRole.CPT,
  );
  const foBucket = day?.buckets.find(
    (bucket) => bucket.aircraftType === selectedAircraft.type && bucket.seatRole === SeatRole.FO,
  );
  const faBucket = day?.buckets.find(
    (bucket) => bucket.aircraftType === selectedAircraft.type && bucket.seatRole === SeatRole.FA,
  );
  const caBucket = day?.buckets.find(
    (bucket) => bucket.aircraftType === selectedAircraft.type && bucket.seatRole === SeatRole.CA,
  );

  if (!day || !cptBucket || !foBucket || !faBucket || !caBucket) {
    throw new Error("Workbench aggregation did not include expected CPT, FO, FA, and CA buckets.");
  }

  if (!hasCrew(cptBucket.crew.reserve, scheduledCpt.id)) {
    throw new Error("Workbench did not count the unassigned draft schedule entry as reserve CPT coverage.");
  }

  if (!hasCrew(foBucket.crew.reserve, reserveFo.id)) {
    throw new Error("Workbench did not count CrewSchedule reserve FO coverage.");
  }

  if (!hasCrew(faBucket.crew.pendingOff, pendingFa.id)) {
    throw new Error("Workbench did not separate pending FA time off.");
  }

  if (!hasCrew(caBucket.crew.approvedOff, approvedCa.id)) {
    throw new Error("Workbench did not separate approved CA time off.");
  }

  if (!hasCrew(cptBucket.crew.assigned, assignedCpt.id)) {
    throw new Error("Workbench did not count aircraft-block assignment overlay.");
  }

  if (!data.assignmentOverlay.some((overlay) => overlay.aircraftId === selectedAircraft.id)) {
    throw new Error("Workbench assignment overlay did not include the selected aircraft.");
  }

  if (data.summary.flightGaps < 1 || cptBucket.flightGaps.length < 1 || foBucket.flightGaps.length < 1) {
    throw new Error("Workbench did not surface existing CPT/FO flight-derived gaps.");
  }

  if (!data.crewMembers.some((crewMember) => crewMember.locationLabel.includes(smokeLabel))) {
    throw new Error("Workbench did not surface location/logistics drill-down data.");
  }

  const [assignmentCountAfter, scheduleCountAfter, scheduleEntryCountAfter, legAssignmentCountAfter] =
    await Promise.all([
      prisma.aircraftCrewAssignment.count(),
      prisma.crewSchedule.count(),
      prisma.crewScheduleEntry.count(),
      prisma.crewLegAssignment.count(),
    ]);

  if (
    assignmentCountAfter !== assignmentCountBefore ||
    scheduleCountAfter !== scheduleCountBefore ||
    scheduleEntryCountAfter !== scheduleEntryCountBefore ||
    legAssignmentCountAfter !== legAssignmentCountBefore
  ) {
    throw new Error("Loading the crew scheduling workbench created scheduling or assignment side effects.");
  }

  console.log(
    `crew scheduling workbench smoke: day ${targetDateKey} verified role buckets, assignment overlay, flight gaps, and read-only load.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanupSmokeRecords();
    await prisma.$disconnect();
  });
