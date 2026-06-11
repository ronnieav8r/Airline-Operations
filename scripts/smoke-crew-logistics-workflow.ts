import {
  CrewLocationSource,
  CrewLogisticsNeedStatus,
  CrewLogisticsNeedType,
  PrismaClient,
} from "@prisma/client";

import {
  assertSmokeTestAuthEnabled,
  ensureSmokeTestUsers,
} from "./smoke-test-auth";

const prisma = new PrismaClient();
const runKey = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const smokeLabel = `LOGISTICS-WORKFLOW-SMOKE-${runKey}`;

function atUtcHour(daysFromNow: number, hour: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function countSideEffectRows() {
  const [
    aircraftCrewAssignments,
    crewDutyPeriods,
    crewRestPeriods,
    crewScheduleEntries,
    crewSchedules,
    flightReleases,
  ] = await Promise.all([
    prisma.aircraftCrewAssignment.count(),
    prisma.crewDutyPeriod.count(),
    prisma.crewRestPeriod.count(),
    prisma.crewScheduleEntry.count(),
    prisma.crewSchedule.count(),
    prisma.flightRelease.count(),
  ]);

  return {
    aircraftCrewAssignments,
    crewDutyPeriods,
    crewRestPeriods,
    crewScheduleEntries,
    crewSchedules,
    flightReleases,
  };
}

async function main() {
  assertSmokeTestAuthEnabled();
  await ensureSmokeTestUsers(prisma);

  const [admin, crewMember, stations, aircraft, flightLeg] = await Promise.all([
    prisma.user.findUnique({
      where: { email: "admin@aeroops.local" },
      select: { id: true },
    }),
    prisma.crewMember.findFirst({
      where: { employmentStatus: "ACTIVE" },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true },
    }),
    prisma.station.findMany({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      take: 2,
      select: { id: true },
    }),
    prisma.aircraft.findFirst({
      orderBy: [{ tailNumber: "asc" }],
      select: { id: true },
    }),
    prisma.flightLeg.findFirst({
      orderBy: [{ scheduledDeparture: "asc" }],
      select: { id: true },
    }),
  ]);

  if (!admin) {
    throw new Error("admin@aeroops.local was not found. Run local seed first.");
  }

  if (!crewMember) {
    throw new Error("No active crew member was found. Run local seed first.");
  }

  if (stations.length < 2) {
    throw new Error("At least two active stations are required for logistics smoke.");
  }

  const sideEffectCountsBefore = await countSideEffectRows();
  const location = await prisma.crewLocationRecord.create({
    data: {
      createdById: admin.id,
      crewMemberId: crewMember.id,
      effectiveAt: atUtcHour(1, 12),
      locationText: `${smokeLabel} initial hotel`,
      notes: `${smokeLabel} location create`,
      source: CrewLocationSource.MANUAL,
      stationId: stations[0].id,
    },
    select: { id: true },
  });
  const updatedLocation = await prisma.crewLocationRecord.update({
    where: { id: location.id },
    data: {
      effectiveAt: atUtcHour(2, 12),
      locationText: `${smokeLabel} updated FBO`,
      notes: `${smokeLabel} location update`,
      source: CrewLocationSource.SCHEDULE,
      stationId: stations[1].id,
    },
    select: {
      locationText: true,
      source: true,
      stationId: true,
    },
  });

  if (
    updatedLocation.locationText !== `${smokeLabel} updated FBO` ||
    updatedLocation.source !== CrewLocationSource.SCHEDULE ||
    updatedLocation.stationId !== stations[1].id
  ) {
    throw new Error("Crew location create/update verification failed.");
  }

  const needTypes = [
    CrewLogisticsNeedType.POSITIONING,
    CrewLogisticsNeedType.DEADHEAD,
    CrewLogisticsNeedType.AIRLINE_TICKET,
    CrewLogisticsNeedType.HOTEL,
    CrewLogisticsNeedType.GROUND_TRANSPORT,
    CrewLogisticsNeedType.OTHER,
  ];
  const createdNeeds = [];

  for (const [index, needType] of needTypes.entries()) {
    const need = await prisma.crewLogisticsNeed.create({
      data: {
        aircraftId: aircraft?.id ?? null,
        confirmationNumber: `${smokeLabel}-${index}`,
        createdById: admin.id,
        crewMemberId: crewMember.id,
        flightLegId: flightLeg?.id ?? null,
        fromStationId: stations[0].id,
        needType,
        neededBy: atUtcHour(index + 3, 9),
        notes: `${smokeLabel} ${needType}`,
        providerName: `${smokeLabel} Provider`,
        status: CrewLogisticsNeedStatus.REQUESTED,
        toStationId: stations[1].id,
      },
      select: { id: true, needType: true },
    });

    createdNeeds.push(need);
  }

  for (const need of createdNeeds) {
    await prisma.crewLogisticsNeed.update({
      where: { id: need.id },
      data: {
        completedAt:
          need.needType === CrewLogisticsNeedType.OTHER ? atUtcHour(12, 15) : null,
        confirmationNumber: `${smokeLabel}-${need.needType}-CONF`,
        providerName: `${smokeLabel} Updated Provider`,
        status:
          need.needType === CrewLogisticsNeedType.OTHER
            ? CrewLogisticsNeedStatus.COMPLETED
            : CrewLogisticsNeedStatus.BOOKED,
      },
    });
  }

  const verifiedNeeds = await prisma.crewLogisticsNeed.findMany({
    where: {
      id: { in: createdNeeds.map((need) => need.id) },
    },
    select: {
      completedAt: true,
      confirmationNumber: true,
      needType: true,
      providerName: true,
      status: true,
    },
  });

  if (
    verifiedNeeds.length !== needTypes.length ||
    verifiedNeeds.some(
      (need) =>
        need.providerName !== `${smokeLabel} Updated Provider` ||
        !need.confirmationNumber?.includes("-CONF") ||
        (need.needType === CrewLogisticsNeedType.OTHER
          ? need.status !== CrewLogisticsNeedStatus.COMPLETED || !need.completedAt
          : need.status !== CrewLogisticsNeedStatus.BOOKED || need.completedAt !== null),
    )
  ) {
    throw new Error("Crew logistics need create/update/status verification failed.");
  }

  const sideEffectCountsAfter = await countSideEffectRows();

  if (JSON.stringify(sideEffectCountsAfter) !== JSON.stringify(sideEffectCountsBefore)) {
    throw new Error("Crew logistics workflow changed schedule, assignment, release, or duty/rest row counts.");
  }

  console.log(
    `crew logistics workflow smoke: updated location ${location.id} and ${verifiedNeeds.length} logistics need(s).`,
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
