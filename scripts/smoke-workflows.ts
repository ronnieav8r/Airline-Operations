import {
  AssignmentStatus,
  CrewCertificateType,
  CrewComplianceRecordStatus,
  CrewLocationSource,
  CrewLogisticsNeedStatus,
  CrewLogisticsNeedType,
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  CrewScheduleRequestType,
  DispatchPackageStatus,
  DutyStatus,
  FlightLegStatus,
  FlightLocatingStatus,
  FlightStatus,
  ManifestStatus,
  MedicalCertificateClass,
  PrismaClient,
  ReleaseAuditEventType,
  ReleaseAuthorityClass,
  ReleaseFindingStatus,
  ReleasePackageEvidenceType,
  ReleasePackageStatus,
  ReleaseRuleSeverity,
  ReleaseSnapshotStatus,
  ReleaseStatus,
  TimeOffRequestStatus,
  TimeOffRequestType,
  WeightBalanceStatus,
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

type SmokeReleaseEvidenceResult = {
  dispatchPackageId: string;
  flightLocatingRecordId: string;
  flightPlanReferenceId: string;
  manifestId: string;
  readinessSnapshotId: string;
  weightBalanceRunId: string;
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

async function smokeReleaseEvidence(
  context: SmokeContext,
  flightLeg: SmokeFlightLegResult,
): Promise<SmokeReleaseEvidenceResult> {
  const now = new Date();
  const routeText = `${smokeLabel} route`;

  const result = await prisma.$transaction(async (tx) => {
    const manifest = await tx.manifest.create({
      data: {
        flightLegId: flightLeg.flightLegId,
        status: ManifestStatus.READY,
        items: {
          create: [
            {
              baggageWeight: "20.00",
              checkedInAt: now,
              notes: `${smokeLabel} manifest item`,
              personName: "Smoke Passenger",
              seatNumber: "1A",
              weight: "185.00",
            },
          ],
        },
      },
      select: { id: true },
    });

    const weightBalanceRun = await tx.weightBalanceRun.create({
      data: {
        approvedAt: now,
        approvedById: context.adminUserId,
        calculatedAt: now,
        calculatedById: context.adminUserId,
        calculationSnapshot: {
          smokeLabel,
          source: "workflow-smoke",
        },
        centerOfGravity: "Within envelope",
        flightLegId: flightLeg.flightLegId,
        landingWeight: "10100.00",
        manifestId: manifest.id,
        runLabel: `${smokeLabel}-WB`,
        status: WeightBalanceStatus.APPROVED,
        takeoffWeight: "10800.00",
      },
      select: { id: true },
    });

    const locating = await tx.flightLocatingRecord.create({
      data: {
        activatedAt: now,
        flightLegId: flightLeg.flightLegId,
        lastKnownPosition: "AeroOps smoke route",
        notes: `${smokeLabel} locating smoke`,
        plannedRoute: routeText,
        positionReports: {
          create: [
            {
              notes: `${smokeLabel} manual position report`,
              positionSummary: "Smoke position report",
              reportedAt: now,
              source: "SMOKE",
            },
          ],
        },
        responsibleParty: "AeroOps Runtime QA",
        status: FlightLocatingStatus.ACTIVE,
      },
      select: { id: true },
    });

    const weather = await tx.weatherBriefingSnapshot.create({
      data: {
        briefingAt: now,
        provider: "AeroOps Smoke",
        rawSnapshot: { smokeLabel },
        routeSummary: routeText,
        snapshotKey: `${smokeLabel}-WX`,
      },
      select: { id: true },
    });

    const notam = await tx.notamSnapshot.create({
      data: {
        affectedStationCodes: routeText,
        capturedAt: now,
        rawSnapshot: { smokeLabel },
        snapshotKey: `${smokeLabel}-NOTAM`,
      },
      select: { id: true },
    });

    const flightPlan = await tx.flightPlanReference.create({
      data: {
        externalReference: `${smokeLabel}-FPL`,
        filedAt: now,
        flightLegId: flightLeg.flightLegId,
        provider: "AeroOps Smoke",
        routeText,
        status: "filed",
      },
      select: { id: true },
    });

    const dispatchPackage = await tx.dispatchPackage.create({
      data: {
        createdById: context.adminUserId,
        flightLegId: flightLeg.flightLegId,
        flightPlanReferenceId: flightPlan.id,
        notamSnapshotId: notam.id,
        performanceData: {
          smokeLabel,
          source: "workflow-smoke",
        },
        readyAt: now,
        reviewNotes: `${smokeLabel} dispatch review`,
        reviewedAt: now,
        reviewedById: context.adminUserId,
        status: DispatchPackageStatus.REVIEWED,
        weatherBriefingId: weather.id,
      },
      select: { id: true },
    });

    const snapshot = await tx.releaseReadinessSnapshot.create({
      data: {
        authorityClass: context.policyAuthorityClass,
        evaluatedById: context.adminUserId,
        findings: {
          create: [
            {
              evidenceRefId: manifest.id,
              evidenceRefType: "Manifest",
              isOverridable: false,
              readinessCategory: "manifest",
              ruleKey: `${smokeLabel}-manifest`,
              severity: ReleaseRuleSeverity.INFO,
              status: ReleaseFindingStatus.PASS,
              summary: `${smokeLabel} manifest ready`,
            },
            {
              evidenceRefId: weightBalanceRun.id,
              evidenceRefType: "WeightBalanceRun",
              isOverridable: false,
              readinessCategory: "weight-balance",
              ruleKey: `${smokeLabel}-weight-balance`,
              severity: ReleaseRuleSeverity.INFO,
              status: ReleaseFindingStatus.PASS,
              summary: `${smokeLabel} W&B approved`,
            },
            {
              evidenceRefId: locating.id,
              evidenceRefType: "FlightLocatingRecord",
              isOverridable: false,
              readinessCategory: "flight-locating",
              ruleKey: `${smokeLabel}-flight-locating`,
              severity: ReleaseRuleSeverity.INFO,
              status: ReleaseFindingStatus.PASS,
              summary: `${smokeLabel} locating active`,
            },
            {
              evidenceRefId: dispatchPackage.id,
              evidenceRefType: "DispatchPackage",
              isOverridable: false,
              readinessCategory: "dispatch",
              ruleKey: `${smokeLabel}-dispatch`,
              severity: ReleaseRuleSeverity.INFO,
              status: ReleaseFindingStatus.PASS,
              summary: `${smokeLabel} dispatch reviewed`,
            },
            {
              details: {
                subfindings: [
                  {
                    message: "Workflow smoke confirms duty/rest findings persist in readiness snapshots.",
                    status: "WARNING",
                  },
                ],
              },
              isOverridable: true,
              readinessCategory: "duty-rest",
              ruleKey: `${smokeLabel}-duty-rest`,
              severity: ReleaseRuleSeverity.WARN,
              status: ReleaseFindingStatus.WARNING,
              summary: `${smokeLabel} duty/rest warning-only finding`,
            },
          ],
        },
        flightLegId: flightLeg.flightLegId,
        flightReleaseId: flightLeg.flightReleaseId,
        policyProfileId: context.policyProfileId,
        snapshotStatus: ReleaseSnapshotStatus.WARNING_ONLY,
        summary: {
          passes: 4,
          smokeLabel,
          warnings: 1,
        },
      },
      select: { id: true },
    });

    return {
      dispatchPackageId: dispatchPackage.id,
      flightLocatingRecordId: locating.id,
      flightPlanReferenceId: flightPlan.id,
      manifestId: manifest.id,
      readinessSnapshotId: snapshot.id,
      weightBalanceRunId: weightBalanceRun.id,
    };
  });

  const verified = await prisma.releaseReadinessSnapshot.findUnique({
    where: { id: result.readinessSnapshotId },
    select: {
      findings: {
        select: {
          readinessCategory: true,
          status: true,
        },
      },
      snapshotStatus: true,
    },
  });
  const findingCategories = new Set(verified?.findings.map((finding) => finding.readinessCategory) ?? []);

  if (
    !verified ||
    verified.snapshotStatus !== ReleaseSnapshotStatus.WARNING_ONLY ||
    !findingCategories.has("manifest") ||
    !findingCategories.has("weight-balance") ||
    !findingCategories.has("flight-locating") ||
    !findingCategories.has("dispatch") ||
    !findingCategories.has("duty-rest")
  ) {
    throw new Error("Release evidence smoke verification failed.");
  }

  console.log(`release evidence: captured manifest, W&B, locating, dispatch, and snapshot ${result.readinessSnapshotId}`);
  return result;
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

async function smokeCrewComplianceAdmin(context: SmokeContext) {
  const certificate = await prisma.crewCertificate.create({
    data: {
      certificateNumber: `${smokeLabel}-CERT`,
      certificateType: CrewCertificateType.COMMERCIAL,
      createdById: context.adminUserId,
      crewMemberId: context.crewMemberId,
      issuedAt: new Date(),
      notes: `${smokeLabel} certificate admin smoke`,
      ratingOrEndorsement: "Smoke check",
      status: CrewComplianceRecordStatus.ACTIVE,
    },
    select: { id: true },
  });

  const medical = await prisma.crewMedical.create({
    data: {
      createdById: context.adminUserId,
      crewMemberId: context.crewMemberId,
      issuedAt: new Date(),
      medicalClass: MedicalCertificateClass.SECOND_CLASS,
      notes: `${smokeLabel} medical admin smoke`,
      status: CrewComplianceRecordStatus.ACTIVE,
    },
    select: { id: true },
  });

  await prisma.crewCertificate.update({
    where: { id: certificate.id },
    data: {
      status: CrewComplianceRecordStatus.VOIDED,
      verifiedAt: new Date(),
      verifiedById: context.adminUserId,
    },
  });

  await prisma.crewMedical.update({
    where: { id: medical.id },
    data: {
      status: CrewComplianceRecordStatus.VOIDED,
      verifiedAt: new Date(),
      verifiedById: context.adminUserId,
    },
  });

  const verifiedCertificate = await prisma.crewCertificate.findUnique({
    where: { id: certificate.id },
    select: { createdById: true, status: true, verifiedById: true },
  });
  const verifiedMedical = await prisma.crewMedical.findUnique({
    where: { id: medical.id },
    select: { createdById: true, status: true, verifiedById: true },
  });

  if (
    verifiedCertificate?.createdById !== context.adminUserId ||
    verifiedCertificate.verifiedById !== context.adminUserId ||
    verifiedCertificate.status !== CrewComplianceRecordStatus.VOIDED ||
    verifiedMedical?.createdById !== context.adminUserId ||
    verifiedMedical.verifiedById !== context.adminUserId ||
    verifiedMedical.status !== CrewComplianceRecordStatus.VOIDED
  ) {
    throw new Error("Crew compliance admin smoke verification failed.");
  }

  console.log(`compliance: reviewed and voided certificate ${certificate.id} and medical ${medical.id}`);
}

async function smokeReleasePackageCapture(
  context: SmokeContext,
  flightLeg: SmokeFlightLegResult,
  evidence: SmokeReleaseEvidenceResult,
) {
  const evidenceLinks = [
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
      evidenceId: evidence.readinessSnapshotId,
      evidenceLabel: "Release readiness snapshot",
      evidenceType: ReleasePackageEvidenceType.RELEASE_READINESS_SNAPSHOT,
      isRequired: true,
      statusLabel: "warning-only",
    },
    {
      evidenceId: evidence.manifestId,
      evidenceLabel: "Manifest",
      evidenceType: ReleasePackageEvidenceType.MANIFEST,
      isRequired: true,
      statusLabel: "ready",
    },
    {
      evidenceId: evidence.weightBalanceRunId,
      evidenceLabel: "Weight and balance",
      evidenceType: ReleasePackageEvidenceType.WEIGHT_BALANCE_RUN,
      isRequired: true,
      statusLabel: "approved",
    },
    {
      evidenceId: evidence.flightLocatingRecordId,
      evidenceLabel: "Flight locating",
      evidenceType: ReleasePackageEvidenceType.FLIGHT_LOCATING_RECORD,
      isRequired: true,
      statusLabel: "active",
    },
    {
      evidenceId: evidence.dispatchPackageId,
      evidenceLabel: "Dispatch package",
      evidenceType: ReleasePackageEvidenceType.DISPATCH_PACKAGE,
      isRequired: true,
      statusLabel: "reviewed",
    },
    {
      evidenceId: evidence.flightPlanReferenceId,
      evidenceLabel: "Flight plan reference",
      evidenceType: ReleasePackageEvidenceType.FLIGHT_PLAN_REFERENCE,
      isRequired: false,
      statusLabel: "filed",
    },
  ];

  const releasePackageBase = {
    capturedById: context.adminUserId,
    flightLegId: flightLeg.flightLegId,
    flightReleaseId: flightLeg.flightReleaseId,
    operationalControlRecordId: flightLeg.operationalControlRecordId,
    readinessSnapshotId: evidence.readinessSnapshotId,
    summary: {
      evidenceLinks: 8,
      smokeLabel,
    },
  };

  const releasePackage = await prisma.releasePackage.create({
    data: {
      ...releasePackageBase,
      evidenceLinks: {
        create: evidenceLinks,
      },
      notes: `${smokeLabel} release package preview`,
      packageNumber: `${smokeLabel}-PKG`,
      status: ReleasePackageStatus.PREVIEW,
    },
    select: {
      _count: {
        select: { evidenceLinks: true },
      },
      id: true,
    },
  });
  const finalizedAt = new Date();
  const finalPackage = await prisma.releasePackage.create({
    data: {
      ...releasePackageBase,
      evidenceLinks: {
        create: evidenceLinks,
      },
      finalizedAt,
      notes: `${smokeLabel} release package final`,
      packageNumber: `${smokeLabel}-PKG-FINAL`,
      status: ReleasePackageStatus.FINALIZED,
    },
    select: {
      _count: {
        select: { evidenceLinks: true },
      },
      finalizedAt: true,
      id: true,
      status: true,
    },
  });

  if (
    releasePackage._count.evidenceLinks !== 8 ||
    finalPackage._count.evidenceLinks !== 8 ||
    finalPackage.status !== ReleasePackageStatus.FINALIZED ||
    !finalPackage.finalizedAt
  ) {
    throw new Error("ReleasePackage capture smoke verification failed.");
  }

  console.log(`release package: captured preview ${releasePackage.id} and final ${finalPackage.id}`);
}

async function smokeReleaseAudit(context: SmokeContext, flightLeg: SmokeFlightLegResult, snapshotId: string) {
  await prisma.$transaction([
    prisma.flightRelease.update({
      where: { id: flightLeg.flightReleaseId },
      data: {
        releasedAt: new Date(),
        releasedById: context.adminUserId,
        releaseNotes: `${smokeLabel} warning-only release smoke`,
        status: ReleaseStatus.RELEASED,
      },
    }),
    prisma.releaseAuditEvent.create({
      data: {
        actorRole: "ADMIN",
        actorUserId: context.adminUserId,
        eventType: ReleaseAuditEventType.RELEASE_COMPLETED,
        flightLegId: flightLeg.flightLegId,
        flightReleaseId: flightLeg.flightReleaseId,
        message: `${smokeLabel} release status smoke`,
        metadata: {
          smokeLabel,
          warningOnly: true,
        },
        snapshotId,
      },
    }),
  ]);

  const verified = await prisma.flightRelease.findUnique({
    where: { id: flightLeg.flightReleaseId },
    select: {
      releaseAuditEvents: {
        where: { message: `${smokeLabel} release status smoke` },
        select: { actorRole: true, actorUserId: true, eventType: true, snapshotId: true },
      },
      releasedById: true,
      status: true,
    },
  });

  if (
    !verified ||
    verified.status !== ReleaseStatus.RELEASED ||
    verified.releasedById !== context.adminUserId ||
    verified.releaseAuditEvents[0]?.actorRole !== "ADMIN" ||
    verified.releaseAuditEvents[0]?.eventType !== ReleaseAuditEventType.RELEASE_COMPLETED ||
    verified.releaseAuditEvents[0]?.snapshotId !== snapshotId
  ) {
    throw new Error("Release audit smoke verification failed.");
  }

  console.log(`release audit: released ${flightLeg.flightReleaseId} with audit event`);
}

async function main() {
  assertSmokeTestAuthEnabled();
  requireLocalOrExplicitRemoteSmoke();

  await verifySmokeLogins();
  const context = await getSmokeContext();
  const flightLeg = await smokeFlightLegWorkflow(context);
  const evidence = await smokeReleaseEvidence(context, flightLeg);
  await smokeSchedulingPublish(context);
  await smokeCrewPortalRequests(context);
  await smokeLogisticsWrites(context, flightLeg.flightLegId);
  await smokeCrewComplianceAdmin(context);
  await smokeReleasePackageCapture(context, flightLeg, evidence);
  await smokeReleaseAudit(context, flightLeg, evidence.readinessSnapshotId);

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
