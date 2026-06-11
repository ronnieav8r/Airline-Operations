import {
  AssignmentStatus,
  CrewLocationSource,
  CrewLogisticsNeedStatus,
  CrewLogisticsNeedType,
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  CrewScheduleRequestType,
  DutyStatus,
  FlightLegStatus,
  FlightStatus,
  PrismaClient,
  ReleaseAuthorityClass,
  ReleaseFindingStatus,
  ReleasePackageEvidenceType,
  ReleasePackageStatus,
  ReleaseRuleSeverity,
  ReleaseSnapshotStatus,
  ReleaseStatus,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";

import { verifyPassword } from "../lib/auth/password";
import {
  assertSmokeTestAuthEnabled,
  ensureSmokeTestUsers,
  SMOKE_TEST_PASSWORD,
  SMOKE_TEST_USERS,
} from "./smoke-test-auth";

const prisma = new PrismaClient();

type SmokeContext = {
  adminUserId: string;
  crewUserId: string;
  crewMemberId: string;
  operatorId: string;
  operatingAuthorityId: string;
  authorityRevisionId: string;
  policyProfileId: string;
  policyAuthorityClass: ReleaseAuthorityClass;
  aircraftId: string;
  departureStationId: string;
  arrivalStationId: string;
};

type SmokeFlightLegResult = {
  flightLegId: string;
  flightReleaseId: string;
  operationalControlRecordId: string;
};

const runKey = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const smokeLabel = `SMOKE-${runKey}`;

function requireLocalOrExplicitRemoteSmoke() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (
    process.env.AEROOPS_ALLOW_REMOTE_SMOKE !== "1" &&
    !databaseUrl.includes("127.0.0.1") &&
    !databaseUrl.includes("localhost")
  ) {
    throw new Error(
      "Workflow smoke writes are blocked unless DATABASE_URL is local or AEROOPS_ALLOW_REMOTE_SMOKE=1 is set.",
    );
  }
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function atUtcHour(value: Date, hour: number, minute = 0): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), hour, minute));
}

function assertRecord<T>(record: T | null | undefined, label: string): T {
  if (!record) {
    throw new Error(`${label} is required for workflow smoke testing.`);
  }

  return record;
}

async function verifySmokeLogins() {
  await ensureSmokeTestUsers(prisma);

  for (const testUser of SMOKE_TEST_USERS) {
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
      select: {
        isActive: true,
        passwordCredential: {
          select: { passwordHash: true },
        },
        role: true,
      },
    });

    if (!user?.isActive || user.role !== testUser.role || !user.passwordCredential) {
      throw new Error(`Smoke user ${testUser.email} is not active with the expected role and credential.`);
    }

    const passwordOk = await verifyPassword(SMOKE_TEST_PASSWORD, user.passwordCredential.passwordHash);
    if (!passwordOk) {
      throw new Error(`Smoke user ${testUser.email} password verification failed.`);
    }
  }

  console.log(`login: verified ${SMOKE_TEST_USERS.length} smoke-test credentials`);
}

async function getSmokeContext(): Promise<SmokeContext> {
  const [adminUser, crewUser] = await Promise.all([
    prisma.user.findUnique({
      where: { email: "admin@aeroops.local" },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { email: "crew@aeroops.local" },
      select: {
        crewMember: {
          select: { id: true },
        },
        id: true,
      },
    }),
  ]);

  const authority = await prisma.operatingAuthority.findFirst({
    where: {
      releasePolicyProfiles: { some: {} },
      revisions: { some: {} },
    },
    orderBy: [{ operatingPart: "asc" }],
    select: {
      id: true,
      operatorId: true,
      releasePolicyProfiles: {
        orderBy: [{ isDefault: "desc" }, { effectiveFrom: "desc" }],
        select: {
          authorityClass: true,
          id: true,
        },
        take: 1,
      },
      revisions: {
        orderBy: [{ effectiveStart: "desc" }],
        select: { id: true },
        take: 1,
      },
    },
  });

  const [aircraft, stations] = await Promise.all([
    prisma.aircraft.findFirst({
      orderBy: [{ tailNumber: "asc" }],
      select: { id: true },
    }),
    prisma.station.findMany({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      select: { id: true },
      take: 2,
    }),
  ]);

  const selectedAuthority = assertRecord(authority, "Operating authority with default release policy");
  const selectedProfile = assertRecord(selectedAuthority.releasePolicyProfiles[0], "Release policy profile");

  return {
    adminUserId: assertRecord(adminUser, "Admin smoke user").id,
    aircraftId: assertRecord(aircraft, "Aircraft").id,
    arrivalStationId: assertRecord(stations[1], "Arrival station").id,
    authorityRevisionId: assertRecord(selectedAuthority.revisions[0], "Authority revision").id,
    crewMemberId: assertRecord(assertRecord(crewUser, "Crew smoke user").crewMember, "Linked crew member").id,
    crewUserId: assertRecord(crewUser, "Crew smoke user").id,
    departureStationId: assertRecord(stations[0], "Departure station").id,
    operatingAuthorityId: selectedAuthority.id,
    operatorId: selectedAuthority.operatorId,
    policyAuthorityClass: selectedProfile.authorityClass,
    policyProfileId: selectedProfile.id,
  };
}

async function smokeFlightLegWorkflow(context: SmokeContext): Promise<SmokeFlightLegResult> {
  const scheduledDeparture = atUtcHour(addDays(new Date(), 10), 14);
  const scheduledArrival = atUtcHour(addDays(new Date(), 10), 16, 15);
  const flightNumber = smokeLabel.replace("-", "");

  const created = await prisma.$transaction(async (tx) => {
    const legacyFlight = await tx.flight.create({
      data: {
        aircraftId: context.aircraftId,
        arrivalStationId: context.arrivalStationId,
        departureStationId: context.departureStationId,
        flightNumber,
        notes: `${smokeLabel} compatibility bridge`,
        scheduledArrival,
        scheduledDeparture,
        status: FlightStatus.SCHEDULED,
      },
      select: { id: true },
    });

    const trip = await tx.tripOrMission.create({
      data: {
        customerName: "Workflow Smoke",
        missionType: "Runtime QA",
        notes: `${smokeLabel} generated trip`,
        operatorId: context.operatorId,
        requestedEnd: scheduledArrival,
        requestedStart: scheduledDeparture,
        tripNumber: `TRIP-${flightNumber}`,
      },
      select: { id: true },
    });

    const flightLeg = await tx.flightLeg.create({
      data: {
        arrivalStationId: context.arrivalStationId,
        authorityRevisionId: context.authorityRevisionId,
        departureStationId: context.departureStationId,
        flightNumber,
        legacyFlightId: legacyFlight.id,
        notes: `${smokeLabel} created by workflow smoke`,
        operatingAuthorityId: context.operatingAuthorityId,
        operatorId: context.operatorId,
        scheduledArrival,
        scheduledDeparture,
        status: FlightLegStatus.SCHEDULED,
        tripOrMissionId: trip.id,
      },
      select: { id: true },
    });

    await tx.aircraftAssignment.create({
      data: {
        aircraftId: context.aircraftId,
        assignedAt: scheduledDeparture,
        assignedById: context.adminUserId,
        flightLegId: flightLeg.id,
        notes: `${smokeLabel} aircraft assignment`,
        status: AssignmentStatus.ACTIVE,
      },
    });

    const control = await tx.operationalControlRecord.create({
      data: {
        authorityRevisionId: context.authorityRevisionId,
        controlNotes: `${smokeLabel} control record`,
        controllingEntity: "AeroOps Runtime QA",
        createdById: context.adminUserId,
        flightId: legacyFlight.id,
        flightLegId: flightLeg.id,
        operatingAuthorityId: context.operatingAuthorityId,
        operatorId: context.operatorId,
      },
      select: { id: true },
    });

    const release = await tx.flightRelease.create({
      data: {
        operationalControlRecordId: control.id,
        releaseNotes: `${smokeLabel} planned release`,
        status: ReleaseStatus.PLANNED,
      },
      select: { id: true },
    });

    return {
      flightId: legacyFlight.id,
      flightLegId: flightLeg.id,
      flightReleaseId: release.id,
      operationalControlRecordId: control.id,
      tripId: trip.id,
    };
  });

  const editedArrival = atUtcHour(addDays(new Date(), 10), 16, 35);
  await prisma.$transaction([
    prisma.flight.update({
      where: { id: created.flightId },
      data: {
        notes: `${smokeLabel} compatibility bridge edited`,
        scheduledArrival: editedArrival,
        status: FlightStatus.DELAYED,
      },
    }),
    prisma.flightLeg.update({
      where: { id: created.flightLegId },
      data: {
        notes: `${smokeLabel} FlightLeg edited`,
        scheduledArrival: editedArrival,
        status: FlightLegStatus.READY_FOR_RELEASE,
      },
    }),
    prisma.operationalControlRecord.update({
      where: { id: created.operationalControlRecordId },
      data: {
        controlNotes: `${smokeLabel} control record edited`,
      },
    }),
    prisma.tripOrMission.update({
      where: { id: created.tripId },
      data: {
        requestedEnd: editedArrival,
      },
    }),
  ]);

  const verified = await prisma.flightLeg.findUnique({
    where: { id: created.flightLegId },
    select: {
      legacyFlight: { select: { scheduledArrival: true, status: true } },
      operationalControlRecord: { select: { release: { select: { id: true } } } },
      scheduledArrival: true,
      status: true,
    },
  });

  if (
    !verified ||
    verified.status !== FlightLegStatus.READY_FOR_RELEASE ||
    verified.legacyFlight?.status !== FlightStatus.DELAYED ||
    verified.scheduledArrival.getTime() !== editedArrival.getTime() ||
    verified.legacyFlight.scheduledArrival.getTime() !== editedArrival.getTime() ||
    !verified.operationalControlRecord?.release
  ) {
    throw new Error("FlightLeg create/edit smoke verification failed.");
  }

  console.log(`flightleg: created and edited ${created.flightLegId}`);
  return {
    flightLegId: created.flightLegId,
    flightReleaseId: created.flightReleaseId,
    operationalControlRecordId: created.operationalControlRecordId,
  };
}

async function smokeSchedulingPublish(context: SmokeContext) {
  const startsAt = atUtcHour(addDays(new Date(), 20), 0);
  const endsAt = atUtcHour(addDays(new Date(), 25), 23, 59);
  const dutyDate = atUtcHour(addDays(new Date(), 21), 0);
  const dutyStart = atUtcHour(addDays(new Date(), 21), 12);
  const dutyEnd = atUtcHour(addDays(new Date(), 21), 20);

  const result = await prisma.$transaction(async (tx) => {
    const period = await tx.crewSchedulePeriod.create({
      data: {
        createdById: context.adminUserId,
        endsAt,
        name: `${smokeLabel} Schedule Period`,
        notes: `${smokeLabel} publish smoke`,
        periodKey: smokeLabel,
        startsAt,
        status: CrewSchedulePeriodStatus.DRAFTING,
      },
      select: { id: true },
    });

    const entry = await tx.crewScheduleEntry.create({
      data: {
        createdById: context.adminUserId,
        crewMemberId: context.crewMemberId,
        date: dutyDate,
        dutyStatus: DutyStatus.ON_DUTY,
        endsAt: dutyEnd,
        notes: `${smokeLabel} draft schedule entry`,
        periodId: period.id,
        startsAt: dutyStart,
        status: CrewScheduleEntryStatus.DRAFT,
      },
      select: { id: true },
    });

    const bridge = await tx.crewSchedule.create({
      data: {
        crewMemberId: context.crewMemberId,
        date: dutyDate,
        dutyStatus: DutyStatus.ON_DUTY,
        endsAt: dutyEnd,
        notes: `Published from workflow smoke entry ${entry.id}.`,
        startsAt: dutyStart,
      },
      select: { id: true },
    });

    await tx.crewScheduleEntry.update({
      where: { id: entry.id },
      data: {
        generatedCrewScheduleId: bridge.id,
        publishedAt: new Date(),
        publishedById: context.adminUserId,
        status: CrewScheduleEntryStatus.PUBLISHED,
      },
    });

    await tx.crewSchedulePeriod.update({
      where: { id: period.id },
      data: {
        publishedAt: new Date(),
        publishedById: context.adminUserId,
        status: CrewSchedulePeriodStatus.PUBLISHED,
      },
    });

    return { bridgeId: bridge.id, entryId: entry.id, periodId: period.id };
  });

  const verified = await prisma.crewScheduleEntry.findUnique({
    where: { id: result.entryId },
    select: {
      generatedCrewSchedule: { select: { id: true } },
      period: { select: { status: true } },
      status: true,
    },
  });

  if (
    !verified ||
    verified.status !== CrewScheduleEntryStatus.PUBLISHED ||
    verified.period.status !== CrewSchedulePeriodStatus.PUBLISHED ||
    verified.generatedCrewSchedule?.id !== result.bridgeId
  ) {
    throw new Error("Schedule publish smoke verification failed.");
  }

  console.log(`scheduling: published period ${result.periodId} and bridge ${result.bridgeId}`);
}

async function smokeCrewPortalRequests(context: SmokeContext) {
  const startDate = atUtcHour(addDays(new Date(), 30), 0);
  const endDate = atUtcHour(addDays(new Date(), 31), 23, 59);
  const period =
    (await prisma.crewSchedulePeriod.findFirst({
      where: {
        endsAt: { gte: endDate },
        startsAt: { lte: startDate },
      },
      orderBy: [{ startsAt: "asc" }],
      select: { id: true },
    })) ??
    (await prisma.crewSchedulePeriod.create({
      data: {
        createdById: context.adminUserId,
        endsAt: atUtcHour(addDays(new Date(), 45), 23, 59),
        name: `${smokeLabel} Crew Portal Period`,
        notes: `${smokeLabel} crew portal fallback period`,
        periodKey: `${smokeLabel}-PORTAL`,
        startsAt: atUtcHour(addDays(new Date(), 29), 0),
        status: CrewSchedulePeriodStatus.BID_OPEN,
      },
      select: { id: true },
    }));

  const [timeOffRequest, scheduleRequest] = await prisma.$transaction([
    prisma.timeOffRequest.create({
      data: {
        crewMemberId: context.crewMemberId,
        endDate,
        reason: `${smokeLabel} crew portal time off`,
        requestedById: context.crewUserId,
        requestType: TimeOffRequestType.VACATION,
        startDate,
        status: TimeOffRequestStatus.PENDING,
      },
      select: { id: true },
    }),
    prisma.crewScheduleRequest.create({
      data: {
        crewMemberId: context.crewMemberId,
        endDate,
        periodId: period.id,
        preferredDutyStatus: DutyStatus.OFF_DUTY,
        requestNotes: `${smokeLabel} crew portal schedule preference`,
        requestType: CrewScheduleRequestType.PREFERRED_OFF_DAYS,
        startDate,
        status: CrewScheduleRequestStatus.SUBMITTED,
        submittedById: context.crewUserId,
      },
      select: { id: true },
    }),
  ]);

  const [storedTimeOff, storedScheduleRequest] = await Promise.all([
    prisma.timeOffRequest.findUnique({
      where: { id: timeOffRequest.id },
      select: { requestedById: true, status: true },
    }),
    prisma.crewScheduleRequest.findUnique({
      where: { id: scheduleRequest.id },
      select: { status: true, submittedById: true },
    }),
  ]);

  if (
    !storedTimeOff ||
    storedTimeOff.status !== TimeOffRequestStatus.PENDING ||
    storedTimeOff.requestedById !== context.crewUserId ||
    !storedScheduleRequest ||
    storedScheduleRequest.status !== CrewScheduleRequestStatus.SUBMITTED ||
    storedScheduleRequest.submittedById !== context.crewUserId
  ) {
    throw new Error("Crew portal request smoke verification failed.");
  }

  console.log(`crew portal: submitted time off ${timeOffRequest.id} and schedule request ${scheduleRequest.id}`);
}

async function smokeLogisticsWrites(context: SmokeContext, flightLegId: string) {
  const location = await prisma.crewLocationRecord.create({
    data: {
      createdById: context.adminUserId,
      crewMemberId: context.crewMemberId,
      effectiveAt: new Date(),
      locationText: `${smokeLabel} manual location`,
      notes: `${smokeLabel} location smoke`,
      source: CrewLocationSource.MANUAL,
      stationId: context.departureStationId,
    },
    select: { id: true },
  });

  const need = await prisma.crewLogisticsNeed.create({
    data: {
      aircraftId: context.aircraftId,
      createdById: context.adminUserId,
      crewMemberId: context.crewMemberId,
      flightLegId,
      fromStationId: context.departureStationId,
      needType: CrewLogisticsNeedType.AIRLINE_TICKET,
      neededBy: addDays(new Date(), 9),
      notes: `${smokeLabel} logistics need`,
      status: CrewLogisticsNeedStatus.PLANNED,
      toStationId: context.arrivalStationId,
    },
    select: { id: true },
  });

  await prisma.crewLogisticsNeed.update({
    where: { id: need.id },
    data: {
      confirmationNumber: `${smokeLabel}-PNR`,
      providerName: "Smoke Air",
      status: CrewLogisticsNeedStatus.BOOKED,
    },
  });

  const verified = await prisma.crewLogisticsNeed.findUnique({
    where: { id: need.id },
    select: { confirmationNumber: true, flightLegId: true, status: true },
  });

  if (
    !verified ||
    verified.status !== CrewLogisticsNeedStatus.BOOKED ||
    verified.flightLegId !== flightLegId ||
    !verified.confirmationNumber
  ) {
    throw new Error("Crew logistics smoke verification failed.");
  }

  console.log(`logistics: recorded location ${location.id} and booked need ${need.id}`);
}

async function smokeReleasePackageCapture(context: SmokeContext, flightLeg: SmokeFlightLegResult) {
  const snapshot = await prisma.releaseReadinessSnapshot.create({
    data: {
      authorityClass: context.policyAuthorityClass,
      evaluatedById: context.adminUserId,
      findings: {
        create: [
          {
            isOverridable: false,
            readinessCategory: "runtime-smoke",
            ruleKey: `${smokeLabel}-release-ready`,
            severity: ReleaseRuleSeverity.INFO,
            status: ReleaseFindingStatus.PASS,
            summary: `${smokeLabel} preview finding`,
          },
        ],
      },
      flightLegId: flightLeg.flightLegId,
      flightReleaseId: flightLeg.flightReleaseId,
      policyProfileId: context.policyProfileId,
      snapshotStatus: ReleaseSnapshotStatus.PASS,
      summary: {
        blocks: 0,
        passes: 1,
        smokeLabel,
        warnings: 0,
      },
    },
    select: { id: true },
  });

  const releasePackage = await prisma.releasePackage.create({
    data: {
      capturedById: context.adminUserId,
      evidenceLinks: {
        create: [
          {
            evidenceId: flightLeg.operationalControlRecordId,
            evidenceLabel: "Operational control record",
            evidenceType: ReleasePackageEvidenceType.OPERATIONAL_CONTROL_RECORD,
            isRequired: true,
            statusLabel: "captured",
          },
          {
            evidenceId: flightLeg.flightReleaseId,
            evidenceLabel: "Flight release",
            evidenceType: ReleasePackageEvidenceType.FLIGHT_RELEASE,
            isRequired: true,
            statusLabel: "planned",
          },
          {
            evidenceId: snapshot.id,
            evidenceLabel: "Release readiness snapshot",
            evidenceType: ReleasePackageEvidenceType.RELEASE_READINESS_SNAPSHOT,
            isRequired: true,
            statusLabel: "pass",
          },
        ],
      },
      flightLegId: flightLeg.flightLegId,
      flightReleaseId: flightLeg.flightReleaseId,
      notes: `${smokeLabel} release package preview`,
      operationalControlRecordId: flightLeg.operationalControlRecordId,
      packageNumber: `${smokeLabel}-PKG`,
      readinessSnapshotId: snapshot.id,
      status: ReleasePackageStatus.PREVIEW,
      summary: {
        evidenceLinks: 3,
        smokeLabel,
      },
    },
    select: {
      _count: {
        select: { evidenceLinks: true },
      },
      id: true,
    },
  });

  if (releasePackage._count.evidenceLinks !== 3) {
    throw new Error("ReleasePackage capture smoke verification failed.");
  }

  console.log(`release package: captured preview ${releasePackage.id}`);
}

async function main() {
  assertSmokeTestAuthEnabled();
  requireLocalOrExplicitRemoteSmoke();

  await verifySmokeLogins();
  const context = await getSmokeContext();
  const flightLeg = await smokeFlightLegWorkflow(context);
  await smokeSchedulingPublish(context);
  await smokeCrewPortalRequests(context);
  await smokeLogisticsWrites(context, flightLeg.flightLegId);
  await smokeReleasePackageCapture(context, flightLeg);

  console.log(`workflow smoke complete: ${smokeLabel}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
