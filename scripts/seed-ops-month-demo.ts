import {
  AirworthinessReleaseStatus,
  AircraftFuelEventType,
  AircraftStatus,
  AircraftType,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AuthorityStatus,
  AssignmentStatus,
  DeferralStatus,
  DiscrepancyStatus,
  DispatchPackageStatus,
  DutyStatus,
  EmploymentStatus,
  FlightLegStatus,
  FlightLocatingStatus,
  FlightStatus,
  ManifestStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
  OperatingPart,
  Prisma,
  PrismaClient,
  ReleaseStatus,
  SeatRole,
  WeightBalanceStatus,
} from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_PREFIX = "MONTHDEMO";
const DEFAULT_JET_A_DENSITY_LBS_PER_GALLON = 6.7;

type SeedContext = {
  aircraft: Array<{ id: string; tailNumber: string }>;
  authorities: Array<{
    id: string;
    operatingPart: OperatingPart;
    operatorId: string;
    revisions: Array<{ id: string }>;
  }>;
  crew: Array<{ id: string; firstName: string; lastName: string }>;
  operator: { id: string };
  stations: Array<{ id: string; code: string }>;
};

type ReadinessCase =
  | "all-ready"
  | "dispatch-missing"
  | "follow-missing"
  | "manifest-missing"
  | "mx-deferral"
  | "mx-down"
  | "released-followup"
  | "wb-draft";

const readinessCases: ReadinessCase[] = [
  "all-ready",
  "dispatch-missing",
  "follow-missing",
  "manifest-missing",
  "mx-deferral",
  "mx-down",
  "released-followup",
  "wb-draft",
];

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + hours);
  return next;
}

function setUtcTime(date: Date, hour: number, minute = 0): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  next.setUTCHours(hour, minute, 0, 0);
  return next;
}

function dateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function decimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function fuelGallons(pounds: number): Prisma.Decimal {
  return decimal(Number((pounds / DEFAULT_JET_A_DENSITY_LBS_PER_GALLON).toFixed(2)));
}

async function loadContext(): Promise<SeedContext> {
  await ensureMinimumDemoFoundation();

  const [operator, aircraft, stations, crew] = await Promise.all([
    prisma.operator.findFirst({ where: { isActive: true }, orderBy: { code: "asc" } }),
    prisma.aircraft.findMany({ orderBy: { tailNumber: "asc" }, select: { id: true, tailNumber: true } }),
    prisma.station.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true } }),
    prisma.crewMember.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  if (!operator) {
    throw new Error("No active Operator found. Run the base seed first.");
  }

  const authorities = await prisma.operatingAuthority.findMany({
    where: { operatorId: operator.id },
    orderBy: { operatingPart: "asc" },
    select: {
      id: true,
      operatingPart: true,
      operatorId: true,
      revisions: {
        orderBy: { effectiveStart: "desc" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (aircraft.length < 2 || stations.length < 4 || crew.length < 4 || authorities.length === 0) {
    throw new Error("Base demo data is too thin. Run npm run db:local:seed first.");
  }

  return { aircraft, authorities, crew, operator, stations };
}

async function ensureMinimumDemoFoundation() {
  const operator = await prisma.operator.upsert({
    where: { code: "AOD" },
    create: {
      code: "AOD",
      name: "AeroOps Demo Air",
    },
    update: {
      isActive: true,
      name: "AeroOps Demo Air",
    },
  });

  await prisma.operatorFuelSetting.upsert({
    where: { operatorId: operator.id },
    create: {
      defaultJetAFuelDensityLbsPerGallon: decimal(DEFAULT_JET_A_DENSITY_LBS_PER_GALLON),
      operatorId: operator.id,
    },
    update: {},
  });

  const stationSeeds = [
    {
      city: "St. Louis",
      code: "KSTL",
      name: "St. Louis Lambert International",
      state: "MO",
      timezone: "America/Chicago",
    },
    {
      city: "Chicago",
      code: "KORD",
      name: "Chicago O'Hare International",
      state: "IL",
      timezone: "America/Chicago",
    },
    {
      city: "Dallas",
      code: "KDFW",
      name: "Dallas/Fort Worth International",
      state: "TX",
      timezone: "America/Chicago",
    },
    {
      city: "Denver",
      code: "KDEN",
      name: "Denver International",
      state: "CO",
      timezone: "America/Denver",
    },
    {
      city: "Nashville",
      code: "KBNA",
      name: "Nashville International",
      state: "TN",
      timezone: "America/Chicago",
    },
    {
      city: "Charlotte",
      code: "KCLT",
      name: "Charlotte Douglas International",
      state: "NC",
      timezone: "America/New_York",
    },
  ];

  for (const station of stationSeeds) {
    await prisma.station.upsert({
      where: { code: station.code },
      create: station,
      update: station,
    });
  }

  const baseStation = await prisma.station.findUniqueOrThrow({ where: { code: "KSTL" } });

  for (const part of [OperatingPart.PART_91, OperatingPart.PART_91K, OperatingPart.PART_135]) {
    const authority = await prisma.operatingAuthority.upsert({
      where: {
        operatorId_operatingPart: {
          operatingPart: part,
          operatorId: operator.id,
        },
      },
      create: {
        displayName: `${part.replace("PART_", "Part ")} Demo Authority`,
        operatingPart: part,
        operatorId: operator.id,
        status: AuthorityStatus.ACTIVE,
      },
      update: {
        displayName: `${part.replace("PART_", "Part ")} Demo Authority`,
        status: AuthorityStatus.ACTIVE,
      },
    });

    await prisma.authorityRevision.upsert({
      where: {
        operatingAuthorityId_revisionLabel: {
          operatingAuthorityId: authority.id,
          revisionLabel: `${DEMO_PREFIX}-REV-1`,
        },
      },
      create: {
        effectiveStart: addDays(new Date(), -365),
        notes: `${DEMO_PREFIX} authority revision for monthly demo operations.`,
        operatingAuthorityId: authority.id,
        revisionLabel: `${DEMO_PREFIX}-REV-1`,
        status: AuthorityStatus.ACTIVE,
      },
      update: {
        status: AuthorityStatus.ACTIVE,
      },
    });
  }

  const aircraftSeeds = [
    { tailNumber: "N901AO", name: "Demo 901" },
    { tailNumber: "N902AO", name: "Demo 902" },
    { tailNumber: "N903AO", name: "Demo 903" },
    { tailNumber: "N904AO", name: "Demo 904" },
  ];

  for (const aircraft of aircraftSeeds) {
    await prisma.aircraft.upsert({
      where: { tailNumber: aircraft.tailNumber },
      create: {
        homeStationId: baseStation.id,
        name: aircraft.name,
        seats: 50,
        status: AircraftStatus.AVAILABLE,
        tailNumber: aircraft.tailNumber,
        type: AircraftType.CL_65,
      },
      update: {
        homeStationId: baseStation.id,
        name: aircraft.name,
        seats: 50,
        status: AircraftStatus.AVAILABLE,
      },
    });
  }

  const crewSeeds = [
    ["DEMO-CPT-1", "Avery", "Captain"],
    ["DEMO-FO-1", "Blake", "Firstofficer"],
    ["DEMO-CPT-2", "Casey", "Pilot"],
    ["DEMO-FO-2", "Drew", "Sic"],
    ["DEMO-CPT-3", "Emerson", "Commander"],
    ["DEMO-FO-3", "Finley", "Copilot"],
  ];

  for (const [employeeNumber, firstName, lastName] of crewSeeds) {
    await prisma.crewMember.upsert({
      where: { employeeNumber },
      create: {
        baseStationId: baseStation.id,
        dutyStatus: DutyStatus.ON_DUTY,
        email: `${employeeNumber.toLowerCase()}@aeroops.local`,
        employeeNumber,
        employmentStatus: EmploymentStatus.ACTIVE,
        firstName,
        lastName,
      },
      update: {
        baseStationId: baseStation.id,
        dutyStatus: DutyStatus.ON_DUTY,
        employmentStatus: EmploymentStatus.ACTIVE,
        firstName,
        lastName,
      },
    });
  }
}

function selectAuthority(context: SeedContext, dayIndex: number) {
  const preferredPart =
    dayIndex % 5 === 0
      ? OperatingPart.PART_91
      : dayIndex % 3 === 0
        ? OperatingPart.PART_91K
        : OperatingPart.PART_135;
  const authority =
    context.authorities.find((item) => item.operatingPart === preferredPart && item.revisions[0]) ??
    context.authorities.find((item) => item.revisions[0]);

  if (!authority?.revisions[0]) {
    throw new Error("No operating authority revision found.");
  }

  return { authority, revisionId: authority.revisions[0].id };
}

async function seedAircraftCrewBlock(
  aircraftId: string,
  captainId: string,
  firstOfficerId: string | null,
  startsAt: Date,
) {
  const captainAssignment = await prisma.aircraftCrewAssignment.upsert({
    where: {
      aircraftId_crewMemberId_seatRole_startsAt: {
        aircraftId,
        crewMemberId: captainId,
        seatRole: SeatRole.CPT,
        startsAt,
      },
    },
    create: {
      aircraftId,
      crewMemberId: captainId,
      seatRole: SeatRole.CPT,
      startsAt,
      notes: `${DEMO_PREFIX} monthly demo captain block.`,
    },
    update: {
      endsAt: null,
      isActive: true,
      notes: `${DEMO_PREFIX} monthly demo captain block.`,
    },
  });

  const firstOfficerAssignment = firstOfficerId
    ? await prisma.aircraftCrewAssignment.upsert({
        where: {
          aircraftId_crewMemberId_seatRole_startsAt: {
            aircraftId,
            crewMemberId: firstOfficerId,
            seatRole: SeatRole.FO,
            startsAt,
          },
        },
        create: {
          aircraftId,
          crewMemberId: firstOfficerId,
          seatRole: SeatRole.FO,
          startsAt,
          notes: `${DEMO_PREFIX} monthly demo first officer block.`,
        },
        update: {
          endsAt: null,
          isActive: true,
          notes: `${DEMO_PREFIX} monthly demo first officer block.`,
        },
      })
    : null;

  return { captainAssignment, firstOfficerAssignment };
}

async function seedMaintenanceContext(
  aircraft: { id: string; tailNumber: string },
  readinessCase: ReadinessCase,
  scheduledDeparture: Date,
) {
  const mxDown = readinessCase === "mx-down";
  const mxDeferral = readinessCase === "mx-deferral" || readinessCase === "released-followup";

  await prisma.aircraft.update({
    where: { id: aircraft.id },
    data: {
      status: mxDown ? AircraftStatus.IN_MAINTENANCE : AircraftStatus.AVAILABLE,
    },
  });

  await prisma.airworthinessRelease.upsert({
    where: {
      aircraftId_releaseNumber: {
        aircraftId: aircraft.id,
        releaseNumber: `${DEMO_PREFIX}-AWR-${aircraft.tailNumber}`,
      },
    },
    create: {
      aircraftId: aircraft.id,
      expiresAt: addDays(scheduledDeparture, 45),
      releaseNumber: `${DEMO_PREFIX}-AWR-${aircraft.tailNumber}`,
      releasedAt: addDays(scheduledDeparture, -3),
      releaseNotes: `${DEMO_PREFIX} current MX release for dashboard demo.`,
      status: AirworthinessReleaseStatus.RELEASED,
    },
    update: {
      expiresAt: addDays(scheduledDeparture, 45),
      releaseNotes: `${DEMO_PREFIX} current MX release for dashboard demo.`,
      status: AirworthinessReleaseStatus.RELEASED,
    },
  });

  const discrepancy = await prisma.discrepancy.upsert({
    where: {
      aircraftId_discrepancyNumber: {
        aircraftId: aircraft.id,
        discrepancyNumber: `${DEMO_PREFIX}-DISC-${aircraft.tailNumber}`,
      },
    },
    create: {
      aircraftId: aircraft.id,
      description: `${DEMO_PREFIX} dashboard demo discrepancy.`,
      discrepancyNumber: `${DEMO_PREFIX}-DISC-${aircraft.tailNumber}`,
      reportedAt: addDays(scheduledDeparture, -1),
      severity: mxDown ? "Aircraft down" : "Deferred item",
      status: mxDown ? DiscrepancyStatus.OPEN : mxDeferral ? DiscrepancyStatus.DEFERRED : DiscrepancyStatus.CLEARED,
      title: mxDown ? "Aircraft unavailable for release" : "Deferred cabin/interior item",
    },
    update: {
      clearedAt: mxDown || mxDeferral ? null : addDays(scheduledDeparture, -1),
      correctiveSummary: mxDown || mxDeferral ? null : "Demo item cleared.",
      severity: mxDown ? "Aircraft down" : "Deferred item",
      status: mxDown ? DiscrepancyStatus.OPEN : mxDeferral ? DiscrepancyStatus.DEFERRED : DiscrepancyStatus.CLEARED,
      title: mxDown ? "Aircraft unavailable for release" : "Deferred cabin/interior item",
    },
  });

  await prisma.deferral.upsert({
    where: {
      aircraftId_deferralNumber: {
        aircraftId: aircraft.id,
        deferralNumber: `${DEMO_PREFIX}-DEF-${aircraft.tailNumber}`,
      },
    },
    create: {
      aircraftId: aircraft.id,
      category: "DMI",
      deferredAt: addDays(scheduledDeparture, -1),
      deferralNumber: `${DEMO_PREFIX}-DEF-${aircraft.tailNumber}`,
      discrepancyId: discrepancy.id,
      dueAt: addDays(scheduledDeparture, 7),
      notes: `${DEMO_PREFIX} dashboard demo active deferral.`,
      status: mxDeferral ? DeferralStatus.ACTIVE : DeferralStatus.CLEARED,
    },
    update: {
      clearedAt: mxDeferral ? null : addDays(scheduledDeparture, -1),
      discrepancyId: discrepancy.id,
      dueAt: addDays(scheduledDeparture, 7),
      status: mxDeferral ? DeferralStatus.ACTIVE : DeferralStatus.CLEARED,
    },
  });

  await prisma.maintenanceEvent.upsert({
    where: {
      aircraftId_maintenanceNumber: {
        aircraftId: aircraft.id,
        maintenanceNumber: `${DEMO_PREFIX}-MX-${aircraft.tailNumber}`,
      },
    },
    create: {
      aircraftId: aircraft.id,
      completedAt: mxDown ? null : addDays(scheduledDeparture, -2),
      description: `${DEMO_PREFIX} dashboard demo maintenance context.`,
      eventType: mxDown
        ? MaintenanceEventType.UNSCHEDULED_MAINTENANCE
        : MaintenanceEventType.RETURN_TO_SERVICE,
      maintenanceNumber: `${DEMO_PREFIX}-MX-${aircraft.tailNumber}`,
      returnToServiceAt: mxDown ? null : addDays(scheduledDeparture, -2),
      scheduledAt: addDays(scheduledDeparture, -2),
      startedAt: addDays(scheduledDeparture, -2),
      status: mxDown ? MaintenanceEventStatus.IN_PROGRESS : MaintenanceEventStatus.COMPLETED,
    },
    update: {
      completedAt: mxDown ? null : addDays(scheduledDeparture, -2),
      eventType: mxDown
        ? MaintenanceEventType.UNSCHEDULED_MAINTENANCE
        : MaintenanceEventType.RETURN_TO_SERVICE,
      returnToServiceAt: mxDown ? null : addDays(scheduledDeparture, -2),
      status: mxDown ? MaintenanceEventStatus.IN_PROGRESS : MaintenanceEventStatus.COMPLETED,
    },
  });
}

async function seedFlightEvidence(
  flightLegId: string,
  flightNumber: string,
  readinessCase: ReadinessCase,
  scheduledDeparture: Date,
  departureCode: string,
  arrivalCode: string,
) {
  const manifestReady = readinessCase !== "manifest-missing";
  const wbReady = readinessCase !== "wb-draft";
  const followReady = readinessCase !== "follow-missing";
  const dispatchReady = readinessCase !== "dispatch-missing";

  const manifest = await prisma.manifest.upsert({
    where: { flightLegId },
    create: {
      flightLegId,
      lockedAt: manifestReady ? addHours(scheduledDeparture, -3) : null,
      status: manifestReady ? ManifestStatus.READY : ManifestStatus.DRAFT,
    },
    update: {
      lockedAt: manifestReady ? addHours(scheduledDeparture, -3) : null,
      status: manifestReady ? ManifestStatus.READY : ManifestStatus.DRAFT,
    },
  });

  await prisma.manifestItem.deleteMany({
    where: {
      manifestId: manifest.id,
      notes: { startsWith: DEMO_PREFIX },
    },
  });

  if (manifestReady) {
    for (let index = 0; index < 4; index += 1) {
      await prisma.manifestItem.create({
        data: {
          baggageWeight: decimal(22 + index * 3),
          checkedInAt: addHours(scheduledDeparture, -2),
          manifestId: manifest.id,
          notes: `${DEMO_PREFIX} passenger manifest row.`,
          personName: `Demo Passenger ${index + 1}`,
          seatNumber: `${index + 1}A`,
          weight: decimal(175 + index * 6),
        },
      });
    }
  }

  await prisma.weightBalanceRun.upsert({
    where: {
      flightLegId_runLabel: {
        flightLegId,
        runLabel: `${DEMO_PREFIX}-W&B`,
      },
    },
    create: {
      calculationSnapshot: {
        demo: true,
        route: `${departureCode}-${arrivalCode}`,
      },
      calculatedAt: wbReady ? addHours(scheduledDeparture, -2) : null,
      centerOfGravity: wbReady ? "24.8% MAC" : null,
      flightLegId,
      landingWeight: wbReady ? decimal(43800) : null,
      manifestId: manifest.id,
      runLabel: `${DEMO_PREFIX}-W&B`,
      status: wbReady ? WeightBalanceStatus.CALCULATED : WeightBalanceStatus.DRAFT,
      takeoffWeight: wbReady ? decimal(47200) : null,
    },
    update: {
      calculatedAt: wbReady ? addHours(scheduledDeparture, -2) : null,
      centerOfGravity: wbReady ? "24.8% MAC" : null,
      landingWeight: wbReady ? decimal(43800) : null,
      manifestId: manifest.id,
      status: wbReady ? WeightBalanceStatus.CALCULATED : WeightBalanceStatus.DRAFT,
      takeoffWeight: wbReady ? decimal(47200) : null,
    },
  });

  const locatingRecord = await prisma.flightLocatingRecord.upsert({
    where: { flightLegId },
    create: {
      activatedAt: followReady ? addHours(scheduledDeparture, -1) : null,
      flightLegId,
      lastKnownPosition: followReady ? `${departureCode} ramp` : null,
      notes: `${DEMO_PREFIX} dashboard demo flight following.`,
      plannedRoute: `${departureCode} DCT ${arrivalCode}`,
      responsibleParty: "AeroOps Dispatch",
      status: followReady ? FlightLocatingStatus.FILED : FlightLocatingStatus.NOT_STARTED,
    },
    update: {
      activatedAt: followReady ? addHours(scheduledDeparture, -1) : null,
      lastKnownPosition: followReady ? `${departureCode} ramp` : null,
      notes: `${DEMO_PREFIX} dashboard demo flight following.`,
      plannedRoute: `${departureCode} DCT ${arrivalCode}`,
      responsibleParty: "AeroOps Dispatch",
      status: followReady ? FlightLocatingStatus.FILED : FlightLocatingStatus.NOT_STARTED,
    },
  });

  if (followReady) {
    await prisma.positionReport.deleteMany({
      where: {
        flightLocatingRecordId: locatingRecord.id,
        notes: { startsWith: DEMO_PREFIX },
      },
    });

    await prisma.positionReport.create({
      data: {
        flightLocatingRecordId: locatingRecord.id,
        notes: `${DEMO_PREFIX} generated position report.`,
        positionSummary: `${departureCode} ramp / preflight`,
        reportedAt: addHours(scheduledDeparture, -1),
        source: "MANUAL",
      },
    });
  }

  const weather = dispatchReady
    ? await prisma.weatherBriefingSnapshot.upsert({
        where: { snapshotKey: `${DEMO_PREFIX}-WX-${flightNumber}` },
        create: {
          briefingAt: addHours(scheduledDeparture, -2),
          provider: "Demo Weather",
          routeSummary: `${departureCode}-${arrivalCode} VMC/IFR mix demo briefing`,
          snapshotKey: `${DEMO_PREFIX}-WX-${flightNumber}`,
        },
        update: {
          briefingAt: addHours(scheduledDeparture, -2),
          routeSummary: `${departureCode}-${arrivalCode} VMC/IFR mix demo briefing`,
        },
      })
    : null;
  const notams = dispatchReady
    ? await prisma.notamSnapshot.upsert({
        where: { snapshotKey: `${DEMO_PREFIX}-NOTAM-${flightNumber}` },
        create: {
          affectedStationCodes: `${departureCode},${arrivalCode}`,
          capturedAt: addHours(scheduledDeparture, -2),
          snapshotKey: `${DEMO_PREFIX}-NOTAM-${flightNumber}`,
        },
        update: {
          affectedStationCodes: `${departureCode},${arrivalCode}`,
          capturedAt: addHours(scheduledDeparture, -2),
        },
      })
    : null;
  const flightPlan = dispatchReady
    ? await prisma.flightPlanReference.upsert({
        where: {
          flightLegId_externalReference: {
            flightLegId,
            externalReference: `${DEMO_PREFIX}-FP-${flightNumber}`,
          },
        },
        create: {
          externalReference: `${DEMO_PREFIX}-FP-${flightNumber}`,
          filedAt: addHours(scheduledDeparture, -2),
          flightLegId,
          provider: "Demo Dispatch",
          routeText: `${departureCode} DCT ${arrivalCode}`,
          status: "filed",
        },
        update: {
          filedAt: addHours(scheduledDeparture, -2),
          routeText: `${departureCode} DCT ${arrivalCode}`,
          status: "filed",
        },
      })
    : null;

  await prisma.dispatchPackage.upsert({
    where: { flightLegId },
    create: {
      flightLegId,
      flightPlanReferenceId: flightPlan?.id,
      notamSnapshotId: notams?.id,
      performanceData: dispatchReady ? { demo: true, runwayAnalysis: "acceptable" } : Prisma.JsonNull,
      readyAt: dispatchReady ? addHours(scheduledDeparture, -2) : null,
      reviewNotes: `${DEMO_PREFIX} dashboard demo dispatch package.`,
      status: dispatchReady ? DispatchPackageStatus.READY : DispatchPackageStatus.DRAFT,
      weatherBriefingId: weather?.id,
    },
    update: {
      flightPlanReferenceId: flightPlan?.id,
      notamSnapshotId: notams?.id,
      performanceData: dispatchReady ? { demo: true, runwayAnalysis: "acceptable" } : Prisma.JsonNull,
      readyAt: dispatchReady ? addHours(scheduledDeparture, -2) : null,
      reviewNotes: `${DEMO_PREFIX} dashboard demo dispatch package.`,
      status: dispatchReady ? DispatchPackageStatus.READY : DispatchPackageStatus.DRAFT,
      weatherBriefingId: weather?.id,
    },
  });
}

async function seedFlightFuelEvidence({
  aircraftId,
  flightLegId,
  readinessCase,
  scheduledArrival,
  scheduledDeparture,
}: {
  aircraftId: string;
  flightLegId: string;
  readinessCase: ReadinessCase;
  scheduledArrival: Date;
  scheduledDeparture: Date;
}) {
  await prisma.aircraftFuelEvent.deleteMany({
    where: {
      eventType: {
        in: [AircraftFuelEventType.RELEASE_ONBOARD, AircraftFuelEventType.POSTFLIGHT_ONBOARD],
      },
      flightLegId,
    },
  });

  if (readinessCase === "follow-missing") {
    return;
  }

  const releaseFuelLbs =
    readinessCase === "mx-down" ? 2400 : readinessCase === "wb-draft" ? 3100 : 2800;
  const postflightFuelLbs = Math.max(900, releaseFuelLbs - (750 + (scheduledDeparture.getUTCDate() % 4) * 90));
  const fuelReady = readinessCase !== "dispatch-missing" && readinessCase !== "mx-down";

  await prisma.aircraftFuelEvent.create({
    data: {
      aircraftId,
      eventType: AircraftFuelEventType.RELEASE_ONBOARD,
      flightLegId,
      fuelChangeGallons: null,
      fuelChangeLbs: null,
      fuelDensityLbsPerGallon: decimal(DEFAULT_JET_A_DENSITY_LBS_PER_GALLON),
      fuelOnboardGallons: fuelGallons(releaseFuelLbs),
      fuelOnboardLbs: decimal(releaseFuelLbs),
      fueledReady: fuelReady,
      notes: `${DEMO_PREFIX} release fuel snapshot (${readinessCase}).`,
      recordedAt: addHours(scheduledDeparture, -1),
    },
  });

  if (readinessCase === "released-followup") {
    await prisma.aircraftFuelEvent.create({
      data: {
        aircraftId,
        eventType: AircraftFuelEventType.POSTFLIGHT_ONBOARD,
        flightLegId,
        fuelChangeGallons: null,
        fuelChangeLbs: null,
        fuelDensityLbsPerGallon: decimal(DEFAULT_JET_A_DENSITY_LBS_PER_GALLON),
        fuelOnboardGallons: fuelGallons(postflightFuelLbs),
        fuelOnboardLbs: decimal(postflightFuelLbs),
        fueledReady: null,
        notes: `${DEMO_PREFIX} postflight fuel snapshot.`,
        recordedAt: addHours(scheduledArrival, 1),
      },
    });
  }
}

async function seedFlight(
  context: SeedContext,
  dayIndex: number,
  legIndex: number,
  baseDate: Date,
) {
  const readinessCase = readinessCases[(dayIndex + legIndex * 3) % readinessCases.length];
  const aircraft = context.aircraft[(dayIndex + legIndex) % context.aircraft.length];
  const departure = context.stations[(dayIndex + legIndex) % context.stations.length];
  const arrival = context.stations[(dayIndex + legIndex + 2) % context.stations.length];
  const { authority, revisionId } = selectAuthority(context, dayIndex + legIndex);
  const scheduledDeparture = setUtcTime(baseDate, legIndex === 0 ? 14 : 20, legIndex === 0 ? 0 : 30);
  const scheduledArrival = addHours(scheduledDeparture, legIndex === 0 ? 2 : 3);
  const flightNumber = `DM${String(dayIndex + 1).padStart(2, "0")}${legIndex + 1}`;
  const releaseStatus =
    readinessCase === "all-ready" || readinessCase === "released-followup"
      ? ReleaseStatus.RELEASED
      : ReleaseStatus.PLANNED;
  const flightStatus =
    releaseStatus === ReleaseStatus.RELEASED ? FlightStatus.SCHEDULED : FlightStatus.SCHEDULED;
  const legStatus =
    releaseStatus === ReleaseStatus.RELEASED ? FlightLegStatus.RELEASED : FlightLegStatus.SCHEDULED;

  await seedMaintenanceContext(aircraft, readinessCase, scheduledDeparture);

  const flight = await prisma.flight.upsert({
    where: {
      flightNumber_scheduledDeparture: {
        flightNumber,
        scheduledDeparture,
      },
    },
    create: {
      aircraftId: aircraft.id,
      arrivalStationId: arrival.id,
      departureStationId: departure.id,
      flightNumber,
      notes: `${DEMO_PREFIX} generated 30-day operation demo (${readinessCase}).`,
      scheduledArrival,
      scheduledDeparture,
      status: flightStatus,
    },
    update: {
      aircraftId: aircraft.id,
      arrivalStationId: arrival.id,
      departureStationId: departure.id,
      notes: `${DEMO_PREFIX} generated 30-day operation demo (${readinessCase}).`,
      scheduledArrival,
      status: flightStatus,
    },
  });

  const trip = await prisma.tripOrMission.upsert({
    where: {
      operatorId_tripNumber: {
        operatorId: context.operator.id,
        tripNumber: `${DEMO_PREFIX}-TRIP-${flightNumber}-${dateKey(scheduledDeparture)}`,
      },
    },
    create: {
      customerName: `${DEMO_PREFIX} Customer`,
      missionType: legIndex === 0 ? "Charter" : "EAS route",
      notes: `${DEMO_PREFIX} generated monthly demo trip.`,
      operatorId: context.operator.id,
      requestedEnd: scheduledArrival,
      requestedStart: scheduledDeparture,
      tripNumber: `${DEMO_PREFIX}-TRIP-${flightNumber}-${dateKey(scheduledDeparture)}`,
    },
    update: {
      requestedEnd: scheduledArrival,
      requestedStart: scheduledDeparture,
    },
  });

  const flightLeg = await prisma.flightLeg.upsert({
    where: { legacyFlightId: flight.id },
    create: {
      authorityRevisionId: revisionId,
      arrivalStationId: arrival.id,
      departureStationId: departure.id,
      flightNumber,
      legacyFlightId: flight.id,
      legNumber: legIndex + 1,
      notes: `${DEMO_PREFIX} generated FlightLeg (${readinessCase}).`,
      operatingAuthorityId: authority.id,
      operatorId: context.operator.id,
      scheduledArrival,
      scheduledDeparture,
      status: legStatus,
      tripOrMissionId: trip.id,
    },
    update: {
      authorityRevisionId: revisionId,
      arrivalStationId: arrival.id,
      departureStationId: departure.id,
      flightNumber,
      legNumber: legIndex + 1,
      notes: `${DEMO_PREFIX} generated FlightLeg (${readinessCase}).`,
      operatingAuthorityId: authority.id,
      operatorId: context.operator.id,
      scheduledArrival,
      scheduledDeparture,
      status: legStatus,
      tripOrMissionId: trip.id,
    },
  });

  const control = await prisma.operationalControlRecord.upsert({
    where: { flightLegId: flightLeg.id },
    create: {
      authorityRevisionId: revisionId,
      controlNotes: `${DEMO_PREFIX} generated operational control record.`,
      controllingEntity: authority.operatingPart === OperatingPart.PART_135 ? "AeroOps Dispatch" : "PIC / Operator",
      flightId: flight.id,
      flightLegId: flightLeg.id,
      operatingAuthorityId: authority.id,
      operatorId: context.operator.id,
    },
    update: {
      authorityRevisionId: revisionId,
      controlNotes: `${DEMO_PREFIX} generated operational control record.`,
      controllingEntity: authority.operatingPart === OperatingPart.PART_135 ? "AeroOps Dispatch" : "PIC / Operator",
      flightId: flight.id,
      operatingAuthorityId: authority.id,
      operatorId: context.operator.id,
    },
  });

  await prisma.flightRelease.upsert({
    where: { operationalControlRecordId: control.id },
    create: {
      operationalControlRecordId: control.id,
      releaseNotes: `${DEMO_PREFIX} generated release state (${readinessCase}).`,
      releasedAt: releaseStatus === ReleaseStatus.RELEASED ? addHours(scheduledDeparture, -1) : null,
      status: releaseStatus,
    },
    update: {
      releaseNotes: `${DEMO_PREFIX} generated release state (${readinessCase}).`,
      releasedAt: releaseStatus === ReleaseStatus.RELEASED ? addHours(scheduledDeparture, -1) : null,
      status: releaseStatus,
    },
  });

  await prisma.aircraftAssignment.upsert({
    where: {
      flightLegId_aircraftId: {
        aircraftId: aircraft.id,
        flightLegId: flightLeg.id,
      },
    },
    create: {
      aircraftId: aircraft.id,
      assignedAt: addHours(scheduledDeparture, -6),
      flightLegId: flightLeg.id,
      notes: `${DEMO_PREFIX} generated aircraft assignment.`,
      status: AssignmentStatus.PLANNED,
    },
    update: {
      assignedAt: addHours(scheduledDeparture, -6),
      notes: `${DEMO_PREFIX} generated aircraft assignment.`,
      status: AssignmentStatus.PLANNED,
    },
  });

  const captain = context.crew[(dayIndex + legIndex) % context.crew.length];
  const firstOfficerMissing = readinessCase === "released-followup" && legIndex === 0;
  const firstOfficer = firstOfficerMissing
    ? null
    : context.crew[(dayIndex + legIndex + 1) % context.crew.length];
  const crewBlockStart = addDays(baseDate, -1);
  const { captainAssignment, firstOfficerAssignment } = await seedAircraftCrewBlock(
    aircraft.id,
    captain.id,
    firstOfficer?.id ?? null,
    crewBlockStart,
  );

  await prisma.crewLegAssignment.upsert({
    where: {
      flightLegId_crewMemberId_seatRole: {
        crewMemberId: captain.id,
        flightLegId: flightLeg.id,
        seatRole: SeatRole.CPT,
      },
    },
    create: {
      crewMemberId: captain.id,
      flightLegId: flightLeg.id,
      notes: `${DEMO_PREFIX} generated CPT snapshot.`,
      reportTime: addHours(scheduledDeparture, -1),
      seatRole: SeatRole.CPT,
      sourceAircraftCrewAssignmentId: captainAssignment.id,
      status: AssignmentStatus.PLANNED,
    },
    update: {
      reportTime: addHours(scheduledDeparture, -1),
      sourceAircraftCrewAssignmentId: captainAssignment.id,
      status: AssignmentStatus.PLANNED,
    },
  });

  if (firstOfficer && firstOfficerAssignment) {
    await prisma.crewLegAssignment.upsert({
      where: {
        flightLegId_crewMemberId_seatRole: {
          crewMemberId: firstOfficer.id,
          flightLegId: flightLeg.id,
          seatRole: SeatRole.FO,
        },
      },
      create: {
        crewMemberId: firstOfficer.id,
        flightLegId: flightLeg.id,
        notes: `${DEMO_PREFIX} generated FO snapshot.`,
        reportTime: addHours(scheduledDeparture, -1),
        seatRole: SeatRole.FO,
        sourceAircraftCrewAssignmentId: firstOfficerAssignment.id,
        status: AssignmentStatus.PLANNED,
      },
      update: {
        reportTime: addHours(scheduledDeparture, -1),
        sourceAircraftCrewAssignmentId: firstOfficerAssignment.id,
        status: AssignmentStatus.PLANNED,
      },
    });
  }

  await seedFlightEvidence(
    flightLeg.id,
    flightNumber,
    readinessCase,
    scheduledDeparture,
    departure.code,
    arrival.code,
  );

  await seedFlightFuelEvidence({
    aircraftId: aircraft.id,
    flightLegId: flightLeg.id,
    readinessCase,
    scheduledArrival,
    scheduledDeparture,
  });

  if (readinessCase === "mx-down" || readinessCase === "released-followup") {
    await prisma.alert.upsert({
      where: { id: `${DEMO_PREFIX}-${flightNumber}-alert` },
      create: {
        id: `${DEMO_PREFIX}-${flightNumber}-alert`,
        aircraftId: aircraft.id,
        flightId: flight.id,
        message:
          readinessCase === "mx-down"
            ? `${aircraft.tailNumber} is in maintenance for demo release review.`
            : `${aircraft.tailNumber} has demo release follow-up items after release.`,
        severity: readinessCase === "mx-down" ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: readinessCase === "mx-down" ? "MX release hold" : "Released with follow-up",
        type: readinessCase === "mx-down" ? AlertType.MAINTENANCE : AlertType.GENERAL,
      },
      update: {
        aircraftId: aircraft.id,
        flightId: flight.id,
        message:
          readinessCase === "mx-down"
            ? `${aircraft.tailNumber} is in maintenance for demo release review.`
            : `${aircraft.tailNumber} has demo release follow-up items after release.`,
        severity: readinessCase === "mx-down" ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: readinessCase === "mx-down" ? "MX release hold" : "Released with follow-up",
        type: readinessCase === "mx-down" ? AlertType.MAINTENANCE : AlertType.GENERAL,
      },
    });
  }

  return flightLeg.id;
}

async function main() {
  if (process.env.RUN_OPS_MONTH_DEMO !== "1") {
    console.log("Skipping monthly ops demo seed. Set RUN_OPS_MONTH_DEMO=1 to run.");
    return;
  }

  const context = await loadContext();
  const today = new Date();
  const seededFlightLegIds: string[] = [];

  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
    const baseDate = addDays(today, dayIndex);
    const legsForDay = dayIndex % 2 === 0 ? 2 : 1;

    for (let legIndex = 0; legIndex < legsForDay; legIndex += 1) {
      seededFlightLegIds.push(await seedFlight(context, dayIndex, legIndex, baseDate));
    }
  }

  console.log(
    `Seeded ${seededFlightLegIds.length} monthly demo FlightLegs with varied release, MX, crew, and evidence readiness.`,
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
