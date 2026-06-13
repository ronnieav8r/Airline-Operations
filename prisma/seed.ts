import {
  AirworthinessReleaseStatus,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AircraftFuelEventType,
  AircraftCapabilityStatus,
  AircraftConfigurationStatus,
  AssignmentStatus,
  AircraftStatus,
  AircraftType,
  DeferralStatus,
  DiscrepancyStatus,
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  CrewScheduleRequestType,
  DutyStatus,
  EmploymentStatus,
  AuthorityStatus,
  FlightLocatingStatus,
  FlightLegStatus,
  FlightStatus,
  IdDocumentType,
  ManifestStatus,
  OperatingPart,
  PrismaClient,
  ReleaseStatus,
  SeatRole,
  MaintenanceEventStatus,
  MaintenanceEventType,
  TimeOffRequestStatus,
  TimeOffRequestType,
  UserRole,
  WeightBalanceStatus,
} from "@prisma/client";

import { createPasswordHash } from "../lib/auth/password";
import { seedCrewComplianceDemo } from "../lib/crew-compliance-demo-seed";
import { seedDefaultDutyRestPolicies } from "../lib/duty-rest-policy-defaults";
import { seedDefaultReleasePolicies } from "../lib/release-policy-defaults";

const prisma = new PrismaClient();
const DEFAULT_ADMIN_PASSWORD = "AeroOpsDemoAdmin!2026";
const DEFAULT_OPS_PASSWORD = "AeroOpsDemoOps!2026";
const DEFAULT_JET_A_DENSITY_LBS_PER_GALLON = 6.7;

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

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function fuelGallons(pounds: number): number {
  return Number((pounds / DEFAULT_JET_A_DENSITY_LBS_PER_GALLON).toFixed(2));
}

function mapLegStatus(flightStatus: FlightStatus, releaseStatus: ReleaseStatus): FlightLegStatus {
  if (flightStatus === FlightStatus.CANCELLED) {
    return FlightLegStatus.CANCELLED;
  }

  if (flightStatus === FlightStatus.COMPLETE) {
    return FlightLegStatus.COMPLETE;
  }

  if (flightStatus === FlightStatus.ENROUTE) {
    return FlightLegStatus.ENROUTE;
  }

  if (flightStatus === FlightStatus.DELAYED) {
    return FlightLegStatus.DELAYED;
  }

  if (releaseStatus === ReleaseStatus.RELEASED) {
    return FlightLegStatus.RELEASED;
  }

  return FlightLegStatus.SCHEDULED;
}

function mapAssignmentStatus(flightStatus: FlightStatus): AssignmentStatus {
  if (flightStatus === FlightStatus.CANCELLED) {
    return AssignmentStatus.CANCELLED;
  }

  if (flightStatus === FlightStatus.COMPLETE) {
    return AssignmentStatus.RELIEVED;
  }

  if (flightStatus === FlightStatus.ENROUTE) {
    return AssignmentStatus.ACTIVE;
  }

  return AssignmentStatus.PLANNED;
}

async function seedFlightLegFoundation() {
  const flights = await prisma.flight.findMany({
    include: {
      operationalControlRecord: {
        include: {
          release: true,
        },
      },
      aircraft: {
        select: {
          crewAssignments: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              crewMemberId: true,
              seatRole: true,
              startsAt: true,
              endsAt: true,
              assignedById: true,
            },
          },
        },
      },
    },
    orderBy: { scheduledDeparture: "asc" },
  });

  const flightLegsByAircraft = new Map<
    string,
    { id: string; scheduledDeparture: Date; scheduledArrival: Date }[]
  >();

  for (const flight of flights) {
    const controlRecord = flight.operationalControlRecord;

    if (!controlRecord) {
      continue;
    }

    const tripNumber = `TRIP-${flight.flightNumber}-${formatDateKey(flight.scheduledDeparture)}`;
    const tripOrMission = await prisma.tripOrMission.upsert({
      where: {
        operatorId_tripNumber: {
          operatorId: controlRecord.operatorId,
          tripNumber,
        },
      },
      create: {
        operatorId: controlRecord.operatorId,
        tripNumber,
        requestedStart: flight.scheduledDeparture,
        requestedEnd: flight.scheduledArrival,
        notes: `Seeded from legacy Flight ${flight.flightNumber}.`,
      },
      update: {
        requestedStart: flight.scheduledDeparture,
        requestedEnd: flight.scheduledArrival,
        notes: `Seeded from legacy Flight ${flight.flightNumber}.`,
      },
    });

    const assignmentStatus = mapAssignmentStatus(flight.status);
    const flightLeg = await prisma.flightLeg.upsert({
      where: { legacyFlightId: flight.id },
      create: {
        legacyFlightId: flight.id,
        tripOrMissionId: tripOrMission.id,
        operatorId: controlRecord.operatorId,
        operatingAuthorityId: controlRecord.operatingAuthorityId,
        authorityRevisionId: controlRecord.authorityRevisionId,
        legNumber: 1,
        flightNumber: flight.flightNumber,
        departureStationId: flight.departureStationId,
        arrivalStationId: flight.arrivalStationId,
        scheduledDeparture: flight.scheduledDeparture,
        scheduledArrival: flight.scheduledArrival,
        actualDeparture: flight.actualDeparture,
        actualArrival: flight.actualArrival,
        status: mapLegStatus(flight.status, controlRecord.release?.status ?? ReleaseStatus.PLANNED),
        notes: flight.notes,
      },
      update: {
        tripOrMissionId: tripOrMission.id,
        operatorId: controlRecord.operatorId,
        operatingAuthorityId: controlRecord.operatingAuthorityId,
        authorityRevisionId: controlRecord.authorityRevisionId,
        legNumber: 1,
        flightNumber: flight.flightNumber,
        departureStationId: flight.departureStationId,
        arrivalStationId: flight.arrivalStationId,
        scheduledDeparture: flight.scheduledDeparture,
        scheduledArrival: flight.scheduledArrival,
        actualDeparture: flight.actualDeparture,
        actualArrival: flight.actualArrival,
        status: mapLegStatus(flight.status, controlRecord.release?.status ?? ReleaseStatus.PLANNED),
        notes: flight.notes,
      },
    });

    await prisma.aircraftAssignment.upsert({
      where: {
        flightLegId_aircraftId: {
          flightLegId: flightLeg.id,
          aircraftId: flight.aircraftId,
        },
      },
      create: {
        flightLegId: flightLeg.id,
        aircraftId: flight.aircraftId,
        status: assignmentStatus,
        assignedAt: flight.scheduledDeparture,
        releasedAt: flight.actualArrival,
        notes: `Seeded from legacy Flight ${flight.flightNumber}.`,
      },
      update: {
        status: assignmentStatus,
        assignedAt: flight.scheduledDeparture,
        releasedAt: flight.actualArrival,
        notes: `Seeded from legacy Flight ${flight.flightNumber}.`,
      },
    });

    await prisma.operationalControlRecord.update({
      where: { id: controlRecord.id },
      data: { flightLegId: flightLeg.id },
    });

    const activeCrew = flight.aircraft.crewAssignments.filter(
      (assignment) =>
        assignment.startsAt <= flight.scheduledDeparture &&
        (assignment.endsAt === null || assignment.endsAt > flight.scheduledDeparture),
    );

    for (const assignment of activeCrew) {
      await prisma.crewLegAssignment.upsert({
        where: {
          flightLegId_crewMemberId_seatRole: {
            flightLegId: flightLeg.id,
            crewMemberId: assignment.crewMemberId,
            seatRole: assignment.seatRole,
          },
        },
        create: {
          flightLegId: flightLeg.id,
          crewMemberId: assignment.crewMemberId,
          seatRole: assignment.seatRole,
          status: assignmentStatus,
          reportTime: flight.scheduledDeparture,
          releaseTime: flight.actualArrival,
          assignedById: assignment.assignedById,
          sourceAircraftCrewAssignmentId: assignment.id,
          notes: `Seeded from aircraft-block assignment for legacy Flight ${flight.flightNumber}.`,
        },
        update: {
          status: assignmentStatus,
          reportTime: flight.scheduledDeparture,
          releaseTime: flight.actualArrival,
          assignedById: assignment.assignedById,
          sourceAircraftCrewAssignmentId: assignment.id,
          notes: `Seeded from aircraft-block assignment for legacy Flight ${flight.flightNumber}.`,
        },
      });
    }

    const aircraftLegs = flightLegsByAircraft.get(flight.aircraftId) ?? [];
    aircraftLegs.push({
      id: flightLeg.id,
      scheduledDeparture: flight.scheduledDeparture,
      scheduledArrival: flight.scheduledArrival,
    });
    flightLegsByAircraft.set(flight.aircraftId, aircraftLegs);
  }

  for (const aircraftLegs of flightLegsByAircraft.values()) {
    aircraftLegs.sort(
      (first, second) => first.scheduledDeparture.getTime() - second.scheduledDeparture.getTime(),
    );

    for (let index = 0; index < aircraftLegs.length - 1; index += 1) {
      const inbound = aircraftLegs[index];
      const outbound = aircraftLegs[index + 1];

      if (outbound.scheduledDeparture < inbound.scheduledArrival) {
        continue;
      }

      const minimumTurnMinutes = Math.floor(
        (outbound.scheduledDeparture.getTime() - inbound.scheduledArrival.getTime()) / 60000,
      );

      await prisma.turnaroundLink.upsert({
        where: {
          inboundFlightLegId_outboundFlightLegId: {
            inboundFlightLegId: inbound.id,
            outboundFlightLegId: outbound.id,
          },
        },
        create: {
          inboundFlightLegId: inbound.id,
          outboundFlightLegId: outbound.id,
          minimumTurnMinutes,
          notes: "Seeded same-aircraft consecutive leg link.",
        },
        update: {
          minimumTurnMinutes,
          notes: "Seeded same-aircraft consecutive leg link.",
        },
      });
    }
  }
}

function mapLocatingStatus(status: FlightLegStatus): FlightLocatingStatus {
  if (status === FlightLegStatus.COMPLETE) {
    return FlightLocatingStatus.CLOSED;
  }

  if (status === FlightLegStatus.ENROUTE) {
    return FlightLocatingStatus.ACTIVE;
  }

  if (status === FlightLegStatus.RELEASED || status === FlightLegStatus.READY_FOR_RELEASE) {
    return FlightLocatingStatus.FILED;
  }

  return FlightLocatingStatus.NOT_STARTED;
}

async function seedReleaseEvidenceFoundation() {
  const flightLegs = await prisma.flightLeg.findMany({
    include: {
      departureStation: true,
      arrivalStation: true,
      legacyFlight: {
        include: {
          flightPassengers: {
            include: {
              passenger: true,
            },
            orderBy: { seatNumber: "asc" },
          },
        },
      },
    },
    orderBy: { scheduledDeparture: "asc" },
  });

  for (const flightLeg of flightLegs) {
    const passengers = flightLeg.legacyFlight?.flightPassengers ?? [];
    const manifest = await prisma.manifest.upsert({
      where: { flightLegId: flightLeg.id },
      create: {
        flightLegId: flightLeg.id,
        status: passengers.length > 0 ? ManifestStatus.READY : ManifestStatus.DRAFT,
      },
      update: {
        status: passengers.length > 0 ? ManifestStatus.READY : ManifestStatus.DRAFT,
      },
    });

    await prisma.manifestItem.deleteMany({
      where: { manifestId: manifest.id },
    });

    if (passengers.length > 0) {
      await prisma.manifestItem.createMany({
        data: passengers.map((flightPassenger, index) => ({
          manifestId: manifest.id,
          passengerId: flightPassenger.passengerId,
          personName: `${flightPassenger.passenger.firstName} ${flightPassenger.passenger.lastName}`,
          seatNumber: flightPassenger.seatNumber,
          checkedInAt: flightPassenger.checkedInAt,
          boardedAt: flightPassenger.boardedAt,
          weight: 185 + index * 5,
          baggageWeight: 25,
          notes: "Seeded from current FlightPassenger demo data.",
        })),
      });
    }

    const routeText = `${flightLeg.departureStation.code} ${flightLeg.arrivalStation.code}`;
    const weatherSnapshot = await prisma.weatherBriefingSnapshot.upsert({
      where: { snapshotKey: `demo-weather-${flightLeg.id}` },
      create: {
        snapshotKey: `demo-weather-${flightLeg.id}`,
        provider: "AeroOps Demo",
        briefingAt: flightLeg.scheduledDeparture,
        routeSummary: `Demo weather briefing for ${routeText}.`,
        rawSnapshot: {
          source: "demo",
          route: routeText,
          conditions: "VFR demo conditions",
        },
      },
      update: {
        provider: "AeroOps Demo",
        briefingAt: flightLeg.scheduledDeparture,
        routeSummary: `Demo weather briefing for ${routeText}.`,
        rawSnapshot: {
          source: "demo",
          route: routeText,
          conditions: "VFR demo conditions",
        },
      },
    });

    const notamSnapshot = await prisma.notamSnapshot.upsert({
      where: { snapshotKey: `demo-notam-${flightLeg.id}` },
      create: {
        snapshotKey: `demo-notam-${flightLeg.id}`,
        capturedAt: flightLeg.scheduledDeparture,
        affectedStationCodes: routeText,
        rawSnapshot: {
          source: "demo",
          affectedStations: [flightLeg.departureStation.code, flightLeg.arrivalStation.code],
          summary: "No critical demo NOTAM restrictions.",
        },
      },
      update: {
        capturedAt: flightLeg.scheduledDeparture,
        affectedStationCodes: routeText,
        rawSnapshot: {
          source: "demo",
          affectedStations: [flightLeg.departureStation.code, flightLeg.arrivalStation.code],
          summary: "No critical demo NOTAM restrictions.",
        },
      },
    });

    const flightPlanReference = await prisma.flightPlanReference.upsert({
      where: {
        flightLegId_externalReference: {
          flightLegId: flightLeg.id,
          externalReference: `DEMO-FPL-${flightLeg.id}`,
        },
      },
      create: {
        flightLegId: flightLeg.id,
        provider: "AeroOps Demo",
        externalReference: `DEMO-FPL-${flightLeg.id}`,
        filedAt: flightLeg.status === FlightLegStatus.SCHEDULED ? null : flightLeg.scheduledDeparture,
        status: flightLeg.status === FlightLegStatus.CANCELLED ? "cancelled" : "planned",
        routeText,
      },
      update: {
        provider: "AeroOps Demo",
        filedAt: flightLeg.status === FlightLegStatus.SCHEDULED ? null : flightLeg.scheduledDeparture,
        status: flightLeg.status === FlightLegStatus.CANCELLED ? "cancelled" : "planned",
        routeText,
      },
    });

    await prisma.flightLocatingRecord.upsert({
      where: { flightLegId: flightLeg.id },
      create: {
        flightLegId: flightLeg.id,
        status: mapLocatingStatus(flightLeg.status),
        responsibleParty: "AeroOps Operations Control",
        plannedRoute: routeText,
        lastKnownPosition:
          flightLeg.status === FlightLegStatus.COMPLETE ? flightLeg.arrivalStation.code : null,
        activatedAt:
          flightLeg.status === FlightLegStatus.ENROUTE ? flightLeg.actualDeparture : null,
        closedAt: flightLeg.status === FlightLegStatus.COMPLETE ? flightLeg.actualArrival : null,
        notes: "Seeded demo locating record.",
      },
      update: {
        status: mapLocatingStatus(flightLeg.status),
        responsibleParty: "AeroOps Operations Control",
        plannedRoute: routeText,
        lastKnownPosition:
          flightLeg.status === FlightLegStatus.COMPLETE ? flightLeg.arrivalStation.code : null,
        activatedAt:
          flightLeg.status === FlightLegStatus.ENROUTE ? flightLeg.actualDeparture : null,
        closedAt: flightLeg.status === FlightLegStatus.COMPLETE ? flightLeg.actualArrival : null,
        notes: "Seeded demo locating record.",
      },
    });

    const passengerWeight = passengers.reduce((total, _passenger, index) => total + 185 + index * 5, 0);
    const baggageWeight = passengers.length * 25;
    const hasLoadData = passengers.length > 0;

    await prisma.weightBalanceRun.upsert({
      where: {
        flightLegId_runLabel: {
          flightLegId: flightLeg.id,
          runLabel: "Demo baseline",
        },
      },
      create: {
        flightLegId: flightLeg.id,
        manifestId: manifest.id,
        runLabel: "Demo baseline",
        status: hasLoadData ? WeightBalanceStatus.CALCULATED : WeightBalanceStatus.DRAFT,
        takeoffWeight: hasLoadData ? 20000 + passengerWeight + baggageWeight : null,
        landingWeight: hasLoadData ? 19500 + passengerWeight + baggageWeight : null,
        centerOfGravity: hasLoadData ? "Demo envelope nominal" : null,
        calculatedAt: hasLoadData ? flightLeg.scheduledDeparture : null,
        calculationSnapshot: {
          source: "seed",
          passengerCount: passengers.length,
          assumedPassengerWeight: "185 lb plus demo variance",
          assumedBaggageWeight: "25 lb each",
        },
      },
      update: {
        manifestId: manifest.id,
        status: hasLoadData ? WeightBalanceStatus.CALCULATED : WeightBalanceStatus.DRAFT,
        takeoffWeight: hasLoadData ? 20000 + passengerWeight + baggageWeight : null,
        landingWeight: hasLoadData ? 19500 + passengerWeight + baggageWeight : null,
        centerOfGravity: hasLoadData ? "Demo envelope nominal" : null,
        calculatedAt: hasLoadData ? flightLeg.scheduledDeparture : null,
        calculationSnapshot: {
          source: "seed",
          passengerCount: passengers.length,
          assumedPassengerWeight: "185 lb plus demo variance",
          assumedBaggageWeight: "25 lb each",
        },
      },
    });

    await prisma.dispatchPackage.upsert({
      where: { flightLegId: flightLeg.id },
      create: {
        flightLegId: flightLeg.id,
        weatherBriefingId: weatherSnapshot.id,
        notamSnapshotId: notamSnapshot.id,
        flightPlanReferenceId: flightPlanReference.id,
        performanceData: {
          source: "seed",
          manifestStatus: manifest.status,
          route: routeText,
        },
      },
      update: {
        weatherBriefingId: weatherSnapshot.id,
        notamSnapshotId: notamSnapshot.id,
        flightPlanReferenceId: flightPlanReference.id,
        performanceData: {
          source: "seed",
          manifestStatus: manifest.status,
          route: routeText,
        },
      },
    });
  }
}

async function seedFuelFoundation() {
  const operators = await prisma.operator.findMany({
    orderBy: { code: "asc" },
    select: { id: true },
  });

  for (const operator of operators) {
    await prisma.operatorFuelSetting.upsert({
      where: { operatorId: operator.id },
      create: {
        operatorId: operator.id,
        defaultJetAFuelDensityLbsPerGallon: DEFAULT_JET_A_DENSITY_LBS_PER_GALLON.toFixed(3),
      },
      update: {},
    });
  }

  const aircraft = await prisma.aircraft.findMany({
    orderBy: { tailNumber: "asc" },
    select: { id: true },
  });

  for (const [index, item] of aircraft.entries()) {
    const onboard = 2800 + index * 350;

    await prisma.aircraftFuelEvent.create({
      data: {
        aircraftId: item.id,
        eventType: AircraftFuelEventType.CORRECTION,
        fuelDensityLbsPerGallon: DEFAULT_JET_A_DENSITY_LBS_PER_GALLON.toFixed(3),
        fuelOnboardGallons: fuelGallons(onboard),
        fuelOnboardLbs: onboard,
        notes: "Seeded current aircraft fuel state.",
        recordedAt: addHours(new Date(), -6 + index),
      },
    });
  }

  const flightLegs = await prisma.flightLeg.findMany({
    orderBy: { scheduledDeparture: "asc" },
    select: {
      aircraftAssignments: {
        orderBy: { assignedAt: "desc" },
        select: { aircraftId: true },
        take: 1,
      },
      actualArrival: true,
      id: true,
      scheduledDeparture: true,
      status: true,
    },
  });

  for (const [index, flightLeg] of flightLegs.entries()) {
    const aircraftId = flightLeg.aircraftAssignments[0]?.aircraftId;

    if (!aircraftId) {
      continue;
    }

    const onboard = 2600 + (index % 4) * 250;
    const fueledReady = index % 3 !== 1;

    await prisma.aircraftFuelEvent.create({
      data: {
        aircraftId,
        eventType: AircraftFuelEventType.RELEASE_ONBOARD,
        flightLegId: flightLeg.id,
        fuelDensityLbsPerGallon: DEFAULT_JET_A_DENSITY_LBS_PER_GALLON.toFixed(3),
        fueledReady,
        fuelOnboardGallons: fuelGallons(onboard),
        fuelOnboardLbs: onboard,
        notes: fueledReady
          ? "Seeded release fuel ready snapshot."
          : "Seeded release fuel snapshot requiring fueled-ready confirmation.",
        recordedAt: addHours(flightLeg.scheduledDeparture, -1),
      },
    });

    if (flightLeg.status === FlightLegStatus.COMPLETE) {
      const postflight = Math.max(0, onboard - 700);

      await prisma.aircraftFuelEvent.create({
        data: {
          aircraftId,
          eventType: AircraftFuelEventType.POSTFLIGHT_ONBOARD,
          flightLegId: flightLeg.id,
          fuelDensityLbsPerGallon: DEFAULT_JET_A_DENSITY_LBS_PER_GALLON.toFixed(3),
          fuelOnboardGallons: fuelGallons(postflight),
          fuelOnboardLbs: postflight,
          notes: "Seeded postflight fuel snapshot.",
          recordedAt: addHours(flightLeg.actualArrival ?? flightLeg.scheduledDeparture, 1),
        },
      });
    }
  }
}

async function seedAirworthinessFoundation() {
  const baselineStart = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
  const opsUser = await prisma.user.findUnique({
    where: { email: "ops@aeroops.local" },
    select: { id: true },
  });
  const aircraft = await prisma.aircraft.findMany({
    include: {
      aircraftAssignments: {
        include: {
          flightLeg: {
            select: { id: true },
          },
        },
        orderBy: { assignedAt: "asc" },
        take: 1,
      },
    },
    orderBy: { tailNumber: "asc" },
  });

  for (const item of aircraft) {
    await prisma.aircraftConfiguration.upsert({
      where: {
        aircraftId_configurationLabel_effectiveStart: {
          aircraftId: item.id,
          configurationLabel: "Demo baseline",
          effectiveStart: baselineStart,
        },
      },
      create: {
        aircraftId: item.id,
        configurationLabel: "Demo baseline",
        status: AircraftConfigurationStatus.ACTIVE,
        effectiveStart: baselineStart,
        passengerSeatCount: item.seats,
        emptyWeight: item.type === AircraftType.CL_65 ? "13000.00" : "12500.00",
        emptyWeightCg: "Demo envelope nominal",
        notes: "Seeded airworthiness baseline configuration.",
      },
      update: {
        status: AircraftConfigurationStatus.ACTIVE,
        passengerSeatCount: item.seats,
        emptyWeight: item.type === AircraftType.CL_65 ? "13000.00" : "12500.00",
        emptyWeightCg: "Demo envelope nominal",
        notes: "Seeded airworthiness baseline configuration.",
      },
    });

    for (const capabilityCode of ["IFR", "RNAV", "RVSM"]) {
      await prisma.aircraftCapability.upsert({
        where: {
          aircraftId_capabilityCode_effectiveStart: {
            aircraftId: item.id,
            capabilityCode,
            effectiveStart: baselineStart,
          },
        },
        create: {
          aircraftId: item.id,
          capabilityCode,
          status: AircraftCapabilityStatus.ACTIVE,
          effectiveStart: baselineStart,
          description: `Demo ${capabilityCode} capability.`,
          notes: "Seeded active aircraft capability.",
        },
        update: {
          status: AircraftCapabilityStatus.ACTIVE,
          description: `Demo ${capabilityCode} capability.`,
          notes: "Seeded active aircraft capability.",
        },
      });
    }

    await prisma.maintenanceEvent.upsert({
      where: {
        aircraftId_maintenanceNumber: {
          aircraftId: item.id,
          maintenanceNumber: `MX-${item.tailNumber}-BASELINE`,
        },
      },
      create: {
        aircraftId: item.id,
        approvedById: opsUser?.id ?? null,
        maintenanceNumber: `MX-${item.tailNumber}-BASELINE`,
        eventType: MaintenanceEventType.INSPECTION,
        status: MaintenanceEventStatus.COMPLETED,
        completedAt: addDays(baselineStart, 1),
        returnToServiceAt: addDays(baselineStart, 1),
        providerName: "AeroOps Demo Maintenance",
        description: "Seeded baseline inspection and return to service.",
        notes: "Demo airworthiness foundation event.",
      },
      update: {
        approvedById: opsUser?.id ?? null,
        eventType: MaintenanceEventType.INSPECTION,
        status: MaintenanceEventStatus.COMPLETED,
        completedAt: addDays(baselineStart, 1),
        returnToServiceAt: addDays(baselineStart, 1),
        providerName: "AeroOps Demo Maintenance",
        description: "Seeded baseline inspection and return to service.",
        notes: "Demo airworthiness foundation event.",
      },
    });

    await prisma.airworthinessRelease.upsert({
      where: {
        aircraftId_releaseNumber: {
          aircraftId: item.id,
          releaseNumber: `AWR-${item.tailNumber}-BASELINE`,
        },
      },
      create: {
        aircraftId: item.id,
        flightLegId: item.aircraftAssignments[0]?.flightLeg.id ?? null,
        releasedById: opsUser?.id ?? null,
        releaseNumber: `AWR-${item.tailNumber}-BASELINE`,
        status: AirworthinessReleaseStatus.RELEASED,
        releasedAt: addDays(baselineStart, 1),
        expiresAt: addMonths(baselineStart, 6),
        releaseNotes: "Seeded demo aircraft-level airworthiness release.",
      },
      update: {
        flightLegId: item.aircraftAssignments[0]?.flightLeg.id ?? null,
        releasedById: opsUser?.id ?? null,
        status: AirworthinessReleaseStatus.RELEASED,
        releasedAt: addDays(baselineStart, 1),
        expiresAt: addMonths(baselineStart, 6),
        releaseNotes: "Seeded demo aircraft-level airworthiness release.",
      },
    });
  }

  const deferredAircraft = aircraft[1];

  if (deferredAircraft) {
    const discrepancy = await prisma.discrepancy.upsert({
      where: {
        aircraftId_discrepancyNumber: {
          aircraftId: deferredAircraft.id,
          discrepancyNumber: `DISC-${deferredAircraft.tailNumber}-DEMO-001`,
        },
      },
      create: {
        aircraftId: deferredAircraft.id,
        reportedById: opsUser?.id ?? null,
        discrepancyNumber: `DISC-${deferredAircraft.tailNumber}-DEMO-001`,
        title: "Demo deferred cabin item",
        description: "Non-critical cabin placard discrepancy for readiness warning demos.",
        status: DiscrepancyStatus.DEFERRED,
        severity: "LOW",
        reportedAt: addDays(baselineStart, 2),
      },
      update: {
        reportedById: opsUser?.id ?? null,
        title: "Demo deferred cabin item",
        description: "Non-critical cabin placard discrepancy for readiness warning demos.",
        status: DiscrepancyStatus.DEFERRED,
        severity: "LOW",
        reportedAt: addDays(baselineStart, 2),
      },
    });

    await prisma.deferral.upsert({
      where: {
        aircraftId_deferralNumber: {
          aircraftId: deferredAircraft.id,
          deferralNumber: `DEF-${deferredAircraft.tailNumber}-DEMO-001`,
        },
      },
      create: {
        aircraftId: deferredAircraft.id,
        discrepancyId: discrepancy.id,
        authorizedById: opsUser?.id ?? null,
        deferralNumber: `DEF-${deferredAircraft.tailNumber}-DEMO-001`,
        status: DeferralStatus.ACTIVE,
        category: "Demo",
        deferredAt: addDays(baselineStart, 2),
        dueAt: addMonths(baselineStart, 1),
        notes: "Seeded active deferral for warning-only airworthiness demos.",
      },
      update: {
        discrepancyId: discrepancy.id,
        authorizedById: opsUser?.id ?? null,
        status: DeferralStatus.ACTIVE,
        category: "Demo",
        deferredAt: addDays(baselineStart, 2),
        dueAt: addMonths(baselineStart, 1),
        notes: "Seeded active deferral for warning-only airworthiness demos.",
      },
    });
  }
}

async function seedCrewSchedulingFoundation({
  anchor,
  cabinAttendantOneId,
  captainOneId,
  captainTwoId,
  firstOfficerOneId,
  opsUserId,
  stationByCode,
}: {
  anchor: Date;
  cabinAttendantOneId: string;
  captainOneId: string;
  captainTwoId: string;
  firstOfficerOneId: string;
  opsUserId: string;
  stationByCode: Record<string, { id: string }>;
}) {
  const periodStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1, 0, 0, 0));
  const period = await prisma.crewSchedulePeriod.upsert({
    where: { periodKey: "demo-current-month" },
    create: {
      periodKey: "demo-current-month",
      name: "Demo Current Month",
      status: CrewSchedulePeriodStatus.DRAFTING,
      startsAt: periodStart,
      endsAt: periodEnd,
      bidOpenAt: addDays(periodStart, -14),
      bidCloseAt: addDays(periodStart, -2),
      createdById: opsUserId,
      notes: "Seeded demo crew scheduling period for future schedule-building workflows.",
    },
    update: {
      name: "Demo Current Month",
      status: CrewSchedulePeriodStatus.DRAFTING,
      startsAt: periodStart,
      endsAt: periodEnd,
      bidOpenAt: addDays(periodStart, -14),
      bidCloseAt: addDays(periodStart, -2),
      createdById: opsUserId,
      notes: "Seeded demo crew scheduling period for future schedule-building workflows.",
    },
  });

  const pattern = await prisma.crewRotationPattern.upsert({
    where: { patternKey: "demo-7-on-7-off" },
    create: {
      patternKey: "demo-7-on-7-off",
      name: "Demo 7 on / 7 off",
      description: "Seven scheduled duty days followed by seven off-duty days.",
      cycleLengthDays: 14,
      createdById: opsUserId,
      notes: "Seeded pattern template; applying patterns remains deferred.",
    },
    update: {
      name: "Demo 7 on / 7 off",
      description: "Seven scheduled duty days followed by seven off-duty days.",
      cycleLengthDays: 14,
      isActive: true,
      createdById: opsUserId,
      notes: "Seeded pattern template; applying patterns remains deferred.",
    },
  });

  await prisma.crewRotationPatternDay.deleteMany({
    where: { patternId: pattern.id },
  });
  await prisma.crewRotationPatternDay.createMany({
    data: Array.from({ length: 14 }, (_value, index) => {
      const dayNumber = index + 1;
      const isDutyDay = dayNumber <= 7;

      return {
        patternId: pattern.id,
        dayNumber,
        dutyStatus: isDutyDay ? DutyStatus.ON_DUTY : DutyStatus.OFF_DUTY,
        stationId: isDutyDay ? stationByCode.TEB.id : null,
        startsAtMinutes: isDutyDay ? 8 * 60 : null,
        endsAtMinutes: isDutyDay ? 18 * 60 : null,
        notes: isDutyDay ? "Demo duty day." : "Demo off day.",
      };
    }),
  });

  const request = await prisma.crewScheduleRequest.create({
    data: {
      periodId: period.id,
      crewMemberId: cabinAttendantOneId,
      requestType: CrewScheduleRequestType.TIME_OFF,
      status: CrewScheduleRequestStatus.SUBMITTED,
      startDate: addDays(anchor, 7),
      endDate: addDays(anchor, 11),
      submittedById: opsUserId,
      requestNotes: "Seeded period-scoped request mirroring future crew bid behavior.",
    },
  });

  await prisma.crewScheduleEntry.createMany({
    data: [
      {
        periodId: period.id,
        crewMemberId: captainOneId,
        stationId: stationByCode.TEB.id,
        rotationPatternId: pattern.id,
        status: CrewScheduleEntryStatus.DRAFT,
        date: anchor,
        dutyStatus: DutyStatus.ON_DUTY,
        startsAt: addHours(anchor, -2),
        endsAt: addHours(anchor, 8),
        createdById: opsUserId,
        notes: "Seeded draft schedule entry beside current CrewSchedule.",
      },
      {
        periodId: period.id,
        crewMemberId: firstOfficerOneId,
        stationId: stationByCode.TEB.id,
        rotationPatternId: pattern.id,
        status: CrewScheduleEntryStatus.DRAFT,
        date: anchor,
        dutyStatus: DutyStatus.ON_DUTY,
        startsAt: addHours(anchor, -2),
        endsAt: addHours(anchor, 8),
        createdById: opsUserId,
        notes: "Seeded draft schedule entry beside current CrewSchedule.",
      },
      {
        periodId: period.id,
        crewMemberId: captainTwoId,
        stationId: stationByCode.HPN.id,
        sourceRequestId: request.id,
        status: CrewScheduleEntryStatus.DRAFT,
        date: addDays(anchor, 1),
        dutyStatus: DutyStatus.RESERVE,
        startsAt: addHours(addDays(anchor, 1), 1),
        endsAt: addHours(addDays(anchor, 1), 9),
        createdById: opsUserId,
        notes: "Seeded draft reserve entry for schedule-period admin preview.",
      },
    ],
  });
}

async function main() {
  const now = new Date();
  const anchor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0),
  );

  const yesterday = addDays(anchor, -1);
  const today = anchor;
  const tomorrow = addDays(anchor, 1);

  await prisma.releaseAuditEvent.deleteMany();
  await prisma.releaseOverride.deleteMany();
  await prisma.releaseReadinessFinding.deleteMany();
  await prisma.releaseReadinessSnapshot.deleteMany();
  await prisma.releasePolicyRule.deleteMany();
  await prisma.releasePolicyProfile.deleteMany();
  await prisma.dutyRestRuleSetting.deleteMany();
  await prisma.dutyRestPolicyProfile.deleteMany();
  await prisma.aircraftFuelEvent.deleteMany();
  await prisma.operatorFuelSetting.deleteMany();
  await prisma.turnaroundLink.deleteMany();
  await prisma.airworthinessRelease.deleteMany();
  await prisma.maintenanceEvent.deleteMany();
  await prisma.deferral.deleteMany();
  await prisma.discrepancy.deleteMany();
  await prisma.aircraftCapability.deleteMany();
  await prisma.aircraftConfiguration.deleteMany();
  await prisma.dispatchPackage.deleteMany();
  await prisma.weightBalanceRun.deleteMany();
  await prisma.manifestItem.deleteMany();
  await prisma.manifest.deleteMany();
  await prisma.flightLocatingRecord.deleteMany();
  await prisma.flightPlanReference.deleteMany();
  await prisma.weatherBriefingSnapshot.deleteMany();
  await prisma.notamSnapshot.deleteMany();
  await prisma.crewLegAssignment.deleteMany();
  await prisma.aircraftAssignment.deleteMany();
  await prisma.flightLeg.deleteMany();
  await prisma.tripOrMission.deleteMany();
  await prisma.flightRelease.deleteMany();
  await prisma.operationalControlRecord.deleteMany();
  await prisma.manualRevision.deleteMany();
  await prisma.manual.deleteMany();
  await prisma.authorityRevision.deleteMany();
  await prisma.operatingAuthority.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.flightPassenger.deleteMany();
  await prisma.passenger.deleteMany();
  await prisma.crewFlightLog.deleteMany();
  await prisma.crewScheduleEntry.deleteMany();
  await prisma.crewScheduleRequest.deleteMany();
  await prisma.crewRotationPatternDay.deleteMany();
  await prisma.crewRotationPattern.deleteMany();
  await prisma.crewSchedulePeriod.deleteMany();
  await prisma.crewSchedule.deleteMany();
  await prisma.aircraftCrewAssignment.deleteMany();
  await prisma.crewRestPeriod.deleteMany();
  await prisma.crewDutyPeriod.deleteMany();
  await prisma.crewRecencyEvent.deleteMany();
  await prisma.crewCheckEvent.deleteMany();
  await prisma.crewTrainingEvent.deleteMany();
  await prisma.crewMedical.deleteMany();
  await prisma.crewCertificate.deleteMany();
  await prisma.crewQualification.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.crewMember.deleteMany();
  await prisma.aircraft.deleteMany();
  await prisma.dutyRule.deleteMany();
  await prisma.station.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();

  const [adminUser, opsUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@aeroops.local",
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        email: "ops@aeroops.local",
        role: UserRole.OPS,
      },
    }),
  ]);

  await Promise.all([
    prisma.userPasswordCredential.create({
      data: {
        userId: adminUser.id,
        passwordHash: await createPasswordHash(
          process.env.AEROOPS_DEMO_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
        ),
        mustChangePassword: process.env.AEROOPS_DEMO_ADMIN_PASSWORD ? false : true,
      },
    }),
    prisma.userPasswordCredential.create({
      data: {
        userId: opsUser.id,
        passwordHash: await createPasswordHash(
          process.env.AEROOPS_DEMO_OPS_PASSWORD ?? DEFAULT_OPS_PASSWORD,
        ),
        mustChangePassword: process.env.AEROOPS_DEMO_OPS_PASSWORD ? false : true,
      },
    }),
  ]);

  await prisma.userProfile.createMany({
    data: [
      {
        userId: adminUser.id,
        firstName: "Alex",
        lastName: "Bennett",
        phone: "555-0100",
      },
      {
        userId: opsUser.id,
        firstName: "Morgan",
        lastName: "Keller",
        phone: "555-0101",
      },
    ],
  });

  await prisma.station.createMany({
    data: [
      {
        code: "TEB",
        name: "Teterboro Airport",
        city: "Teterboro",
        state: "NJ",
        timezone: "America/New_York",
      },
      {
        code: "HPN",
        name: "Westchester County Airport",
        city: "White Plains",
        state: "NY",
        timezone: "America/New_York",
      },
      {
        code: "BOS",
        name: "Logan International Airport",
        city: "Boston",
        state: "MA",
        timezone: "America/New_York",
      },
    ],
  });

  const stations = await prisma.station.findMany();
  const stationByCode = Object.fromEntries(stations.map((station) => [station.code, station]));

  const [acOne, acTwo] = await Promise.all([
    prisma.aircraft.create({
      data: {
        tailNumber: "N215AO",
        name: "AeroOps One",
        type: AircraftType.CL_65,
        status: AircraftStatus.AVAILABLE,
        homeStationId: stationByCode.TEB.id,
        seats: 50,
      },
    }),
    prisma.aircraft.create({
      data: {
        tailNumber: "N407AO",
        name: "AeroOps Two",
        type: AircraftType.EMB_135_145,
        status: AircraftStatus.RESERVED,
        homeStationId: stationByCode.HPN.id,
        seats: 37,
      },
    }),
  ]);

  const crewMembers = await Promise.all([
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1001",
        firstName: "Jordan",
        lastName: "Miles",
        baseStationId: stationByCode.TEB.id,
        employmentStatus: EmploymentStatus.ACTIVE,
        dutyStatus: DutyStatus.ON_DUTY,
        email: "jordan.miles@aeroops.local",
      },
    }),
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1002",
        firstName: "Taylor",
        lastName: "Reed",
        baseStationId: stationByCode.TEB.id,
        employmentStatus: EmploymentStatus.ACTIVE,
        dutyStatus: DutyStatus.ON_DUTY,
        email: "taylor.reed@aeroops.local",
      },
    }),
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1003",
        firstName: "Sam",
        lastName: "Ortega",
        baseStationId: stationByCode.HPN.id,
        employmentStatus: EmploymentStatus.ACTIVE,
        dutyStatus: DutyStatus.RESERVE,
        email: "sam.ortega@aeroops.local",
      },
    }),
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1004",
        firstName: "Riley",
        lastName: "Park",
        baseStationId: stationByCode.BOS.id,
        employmentStatus: EmploymentStatus.ACTIVE,
        dutyStatus: DutyStatus.OFF_DUTY,
        email: "riley.park@aeroops.local",
      },
    }),
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1005",
        firstName: "Casey",
        lastName: "Nguyen",
        baseStationId: stationByCode.HPN.id,
        employmentStatus: EmploymentStatus.ON_LEAVE,
        dutyStatus: DutyStatus.VACATION,
        email: "casey.nguyen@aeroops.local",
      },
    }),
  ]);

  const [captainOne, firstOfficerOne, captainTwo, flightAttendantOne, cabinAttendantOne] =
    crewMembers;

  await prisma.crewQualification.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.CPT,
        issuedAt: addDays(today, -120),
        expiresAt: addDays(today, 240),
      },
      {
        crewMemberId: firstOfficerOne.id,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.FO,
        issuedAt: addDays(today, -400),
        expiresAt: addDays(today, -3),
        notes: "Expired qualification to drive warning behavior.",
      },
      {
        crewMemberId: captainTwo.id,
        aircraftType: AircraftType.EMB_135_145,
        seatRole: SeatRole.CPT,
        issuedAt: addDays(today, -60),
        expiresAt: addDays(today, 300),
      },
      {
        crewMemberId: flightAttendantOne.id,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.FA,
        issuedAt: addDays(today, -40),
        expiresAt: addDays(today, 365),
      },
      {
        crewMemberId: cabinAttendantOne.id,
        aircraftType: AircraftType.EMB_135_145,
        seatRole: SeatRole.CA,
        issuedAt: addDays(today, -200),
        expiresAt: addDays(today, 120),
      },
    ],
  });

  await prisma.aircraftCrewAssignment.createMany({
    data: [
      {
        aircraftId: acOne.id,
        crewMemberId: captainOne.id,
        seatRole: SeatRole.CPT,
        startsAt: addDays(today, -2),
        isActive: true,
        assignedById: opsUser.id,
        notes: "Primary captain block assignment.",
      },
      {
        aircraftId: acOne.id,
        crewMemberId: firstOfficerOne.id,
        seatRole: SeatRole.FO,
        startsAt: addDays(today, -2),
        isActive: true,
        assignedById: opsUser.id,
      },
      {
        aircraftId: acOne.id,
        crewMemberId: flightAttendantOne.id,
        seatRole: SeatRole.FA,
        startsAt: addDays(today, -2),
        isActive: true,
        assignedById: opsUser.id,
      },
      {
        aircraftId: acTwo.id,
        crewMemberId: captainTwo.id,
        seatRole: SeatRole.CPT,
        startsAt: addDays(today, -1),
        isActive: true,
        assignedById: opsUser.id,
      },
      {
        aircraftId: acTwo.id,
        crewMemberId: cabinAttendantOne.id,
        seatRole: SeatRole.CA,
        startsAt: addDays(today, -1),
        isActive: true,
        assignedById: opsUser.id,
        notes: "No FO assigned to this aircraft to trigger coverage warning.",
      },
    ],
  });

  const flights = await Promise.all([
    prisma.flight.create({
      data: {
        flightNumber: "AO101",
        aircraftId: acOne.id,
        departureStationId: stationByCode.TEB.id,
        arrivalStationId: stationByCode.HPN.id,
        scheduledDeparture: addHours(yesterday, -3),
        scheduledArrival: addHours(yesterday, -2),
        actualDeparture: addHours(yesterday, -3),
        actualArrival: addHours(yesterday, -2),
        status: FlightStatus.COMPLETE,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "AO202",
        aircraftId: acTwo.id,
        departureStationId: stationByCode.HPN.id,
        arrivalStationId: stationByCode.BOS.id,
        scheduledDeparture: addHours(today, 2),
        scheduledArrival: addHours(today, 3),
        status: FlightStatus.SCHEDULED,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "AO303",
        aircraftId: acOne.id,
        departureStationId: stationByCode.BOS.id,
        arrivalStationId: stationByCode.TEB.id,
        scheduledDeparture: addHours(today, 6),
        scheduledArrival: addHours(today, 7),
        status: FlightStatus.DELAYED,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "AO404",
        aircraftId: acTwo.id,
        departureStationId: stationByCode.TEB.id,
        arrivalStationId: stationByCode.HPN.id,
        scheduledDeparture: addHours(tomorrow, 1),
        scheduledArrival: addHours(tomorrow, 2),
        status: FlightStatus.SCHEDULED,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "AO505",
        aircraftId: acOne.id,
        departureStationId: stationByCode.HPN.id,
        arrivalStationId: stationByCode.BOS.id,
        scheduledDeparture: addHours(tomorrow, 4),
        scheduledArrival: addHours(tomorrow, 5),
        status: FlightStatus.SCHEDULED,
      },
    }),
  ]);

  const operator = await prisma.operator.upsert({
    where: { code: "AO" },
    update: {
      name: "AeroOps Charter",
      isActive: true,
    },
    create: {
      name: "AeroOps Charter",
      code: "AO",
      isActive: true,
    },
  });

  const [authority91, authority135] = await Promise.all([
    prisma.operatingAuthority.upsert({
      where: {
        operatorId_operatingPart: {
          operatorId: operator.id,
          operatingPart: OperatingPart.PART_91,
        },
      },
      update: {
        status: AuthorityStatus.ACTIVE,
        displayName: "Part 91 - Corporate Operations",
      },
      create: {
        operatorId: operator.id,
        operatingPart: OperatingPart.PART_91,
        displayName: "Part 91 - Corporate Operations",
        status: AuthorityStatus.ACTIVE,
      },
    }),
    prisma.operatingAuthority.upsert({
      where: {
        operatorId_operatingPart: {
          operatorId: operator.id,
          operatingPart: OperatingPart.PART_135,
        },
      },
      update: {
        status: AuthorityStatus.ACTIVE,
        displayName: "Part 135 - Charter Operations",
      },
      create: {
        operatorId: operator.id,
        operatingPart: OperatingPart.PART_135,
        displayName: "Part 135 - Charter Operations",
        status: AuthorityStatus.ACTIVE,
      },
    }),
  ]);

  const [revision91, revision135] = await Promise.all([
    prisma.authorityRevision.upsert({
      where: {
        operatingAuthorityId_revisionLabel: {
          operatingAuthorityId: authority91.id,
          revisionLabel: "P91-2026-Q2",
        },
      },
      update: {
        status: AuthorityStatus.ACTIVE,
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
      },
      create: {
        operatingAuthorityId: authority91.id,
        revisionLabel: "P91-2026-Q2",
        effectiveStart: addMonths(anchor, -6),
        status: AuthorityStatus.ACTIVE,
        notes: "Initial part-91 operational compliance baseline.",
      },
    }),
    prisma.authorityRevision.upsert({
      where: {
        operatingAuthorityId_revisionLabel: {
          operatingAuthorityId: authority135.id,
          revisionLabel: "P135-2026-Q2",
        },
      },
      update: {
        status: AuthorityStatus.ACTIVE,
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
      },
      create: {
        operatingAuthorityId: authority135.id,
        revisionLabel: "P135-2026-Q2",
        effectiveStart: addMonths(anchor, -6),
        status: AuthorityStatus.ACTIVE,
        notes: "Initial part-135 operational compliance baseline.",
      },
    }),
  ]);

  const [manual91, manual135] = await Promise.all([
    prisma.manual.upsert({
      where: {
        operatingAuthorityId_name: {
          operatingAuthorityId: authority91.id,
          name: "AeroOps Operations Manual",
        },
      },
      update: {
        documentIdentifier: "AO-MAN-91",
        publishedAt: addMonths(anchor, 1),
      },
      create: {
        operatingAuthorityId: authority91.id,
        name: "AeroOps Operations Manual",
        documentIdentifier: "AO-MAN-91",
        publishedAt: addMonths(anchor, 1),
      },
    }),
    prisma.manual.upsert({
      where: {
        operatingAuthorityId_name: {
          operatingAuthorityId: authority135.id,
          name: "AeroOps Operations Manual",
        },
      },
      update: {
        documentIdentifier: "AO-MAN-135",
        publishedAt: addMonths(anchor, 1),
      },
      create: {
        operatingAuthorityId: authority135.id,
        name: "AeroOps Operations Manual",
        documentIdentifier: "AO-MAN-135",
        publishedAt: addMonths(anchor, 1),
      },
    }),
  ]);

  await Promise.all([
    prisma.manualRevision.upsert({
      where: {
        manualId_revisionLabel: {
          manualId: manual91.id,
          revisionLabel: "1.0",
        },
      },
      update: {
        revisionDate: addMonths(anchor, -6),
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
        notes: "Baseline manual revision for part 91 startup.",
      },
      create: {
        manualId: manual91.id,
        revisionLabel: "1.0",
        revisionDate: addMonths(anchor, -6),
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
        notes: "Baseline manual revision for part 91 startup.",
      },
    }),
    prisma.manualRevision.upsert({
      where: {
        manualId_revisionLabel: {
          manualId: manual135.id,
          revisionLabel: "1.0",
        },
      },
      update: {
        revisionDate: addMonths(anchor, -6),
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
        notes: "Baseline manual revision for part 135 startup.",
      },
      create: {
        manualId: manual135.id,
        revisionLabel: "1.0",
        revisionDate: addMonths(anchor, -6),
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
        notes: "Baseline manual revision for part 135 startup.",
      },
    }),
  ]);

  const [summitEnergy, metroMedical, harborCapital] = await Promise.all([
    prisma.customer.upsert({
      where: {
        operatorId_name: {
          operatorId: operator.id,
          name: "Summit Energy",
        },
      },
      update: { isActive: true },
      create: {
        operatorId: operator.id,
        name: "Summit Energy",
        customerCode: "SUMMIT",
        isActive: true,
      },
    }),
    prisma.customer.upsert({
      where: {
        operatorId_name: {
          operatorId: operator.id,
          name: "Metro Medical Transport",
        },
      },
      update: { isActive: true },
      create: {
        operatorId: operator.id,
        name: "Metro Medical Transport",
        customerCode: "MMT",
        isActive: true,
      },
    }),
    prisma.customer.upsert({
      where: {
        operatorId_name: {
          operatorId: operator.id,
          name: "Harbor Capital",
        },
      },
      update: { isActive: true },
      create: {
        operatorId: operator.id,
        name: "Harbor Capital",
        customerCode: "HARBOR",
        isActive: true,
      },
    }),
  ]);

  const flightControlBlueprints = [
    {
      flightId: flights[0].id,
      authority: authority91,
      revision: revision91,
      customer: harborCapital,
      controlNotes: "Corporate part 91 release policy path.",
      releaseStatus: ReleaseStatus.RELEASED,
    },
    {
      flightId: flights[1].id,
      authority: authority135,
      revision: revision135,
      customer: summitEnergy,
      controlNotes: "Charter flight under Part 135 authority.",
      releaseStatus: ReleaseStatus.RELEASED,
    },
    {
      flightId: flights[2].id,
      authority: authority91,
      revision: revision91,
      customer: harborCapital,
      controlNotes: "Part 91 operation with known scheduling risk.",
      releaseStatus: ReleaseStatus.PLANNED,
    },
    {
      flightId: flights[3].id,
      authority: authority135,
      revision: revision135,
      customer: metroMedical,
      controlNotes: "Future charter slot with planned release.",
      releaseStatus: ReleaseStatus.PLANNED,
    },
    {
      flightId: flights[4].id,
      authority: authority91,
      revision: revision91,
      customer: harborCapital,
      controlNotes: "Corporate route with planned release.",
      releaseStatus: ReleaseStatus.PLANNED,
    },
  ];

  for (const control of flightControlBlueprints) {
    const controlRecord = await prisma.operationalControlRecord.upsert({
      where: { flightId: control.flightId },
      create: {
        flightId: control.flightId,
        operatorId: operator.id,
        operatingAuthorityId: control.authority.id,
        authorityRevisionId: control.revision.id,
        customerId: control.customer.id,
        controllingEntity: control.customer.name,
        controlNotes: control.controlNotes,
        createdById: opsUser.id,
      },
      update: {
        operatorId: operator.id,
        operatingAuthorityId: control.authority.id,
        authorityRevisionId: control.revision.id,
        customerId: control.customer.id,
        controllingEntity: control.customer.name,
        controlNotes: control.controlNotes,
        createdById: opsUser.id,
      },
    });

    await prisma.flightRelease.upsert({
      where: { operationalControlRecordId: controlRecord.id },
      create: {
        operationalControlRecordId: controlRecord.id,
        status: control.releaseStatus,
        releasedById: opsUser.id,
        releasedAt:
          control.releaseStatus === ReleaseStatus.RELEASED ? addHours(anchor, -1) : null,
        releaseNotes: `Auto-seeded ${control.releaseStatus.toLowerCase()} status for ${control.flightId}.`,
      },
      update: {
        status: control.releaseStatus,
        releasedById: opsUser.id,
        releasedAt:
          control.releaseStatus === ReleaseStatus.RELEASED ? addHours(anchor, -1) : null,
        releaseNotes: `Auto-seeded ${control.releaseStatus.toLowerCase()} status for ${control.flightId}.`,
      },
    });
  }

  await seedFlightLegFoundation();

  await prisma.crewSchedule.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        stationId: stationByCode.TEB.id,
        date: today,
        dutyStatus: DutyStatus.ON_DUTY,
        startsAt: addHours(today, -2),
        endsAt: addHours(today, 8),
      },
      {
        crewMemberId: firstOfficerOne.id,
        stationId: stationByCode.TEB.id,
        date: today,
        dutyStatus: DutyStatus.ON_DUTY,
        startsAt: addHours(today, -2),
        endsAt: addHours(today, 8),
      },
      {
        crewMemberId: captainTwo.id,
        stationId: stationByCode.HPN.id,
        date: today,
        dutyStatus: DutyStatus.RESERVE,
        startsAt: addHours(today, 1),
        endsAt: addHours(today, 9),
      },
    ],
  });

  await prisma.crewFlightLog.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        flightId: flights[0].id,
        seatRole: SeatRole.CPT,
        reportTime: addHours(yesterday, -4),
        releaseTime: addHours(yesterday, -1),
      },
      {
        crewMemberId: firstOfficerOne.id,
        flightId: flights[0].id,
        seatRole: SeatRole.FO,
        reportTime: addHours(yesterday, -4),
        releaseTime: addHours(yesterday, -1),
      },
    ],
  });

  const passengers = await prisma.passenger.createManyAndReturn({
    data: [
      {
        firstName: "Olivia",
        lastName: "Diaz",
        email: "olivia.diaz@example.com",
        idDocumentType: IdDocumentType.PASSPORT,
        idDocumentNumber: "P1234501",
        idIssuingCountry: "USA",
        idDocumentExpiresAt: addMonths(anchor, 36),
      },
      {
        firstName: "Noah",
        lastName: "Brooks",
        email: "noah.brooks@example.com",
        idDocumentType: IdDocumentType.DRIVERS_LICENSE,
        idDocumentNumber: "D9988771",
        idIssuingState: "NY",
        idDocumentExpiresAt: addMonths(anchor, 24),
      },
      {
        firstName: "Ava",
        lastName: "Flores",
        idDocumentType: IdDocumentType.STATE_ID,
        idDocumentNumber: "S4422109",
        idIssuingState: "MA",
        idDocumentExpiresAt: addMonths(anchor, 18),
      },
    ],
  });

  await prisma.customerPassenger.createMany({
    data: [
      {
        customerId: summitEnergy.id,
        passengerId: passengers[0].id,
        relationship: "Traveler",
      },
      {
        customerId: summitEnergy.id,
        passengerId: passengers[1].id,
        relationship: "Traveler",
      },
      {
        customerId: harborCapital.id,
        passengerId: passengers[2].id,
        relationship: "Executive traveler",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.flightPassenger.createMany({
    data: [
      {
        flightId: flights[1].id,
        passengerId: passengers[0].id,
        seatNumber: "3A",
      },
      {
        flightId: flights[1].id,
        passengerId: passengers[1].id,
        seatNumber: "3C",
      },
      {
        flightId: flights[2].id,
        passengerId: passengers[2].id,
        seatNumber: "1D",
      },
    ],
  });

  await seedReleaseEvidenceFoundation();

  await seedFuelFoundation();

  await seedAirworthinessFoundation();

  await seedDefaultReleasePolicies(prisma);
  await seedDefaultDutyRestPolicies(prisma);

  await prisma.timeOffRequest.create({
    data: {
      crewMemberId: cabinAttendantOne.id,
      requestType: TimeOffRequestType.VACATION,
      status: TimeOffRequestStatus.PENDING,
      startDate: addDays(today, 7),
      endDate: addDays(today, 11),
      reason: "Family travel",
      requestedById: opsUser.id,
    },
  });

  await seedCrewSchedulingFoundation({
    anchor,
    cabinAttendantOneId: cabinAttendantOne.id,
    captainOneId: captainOne.id,
    captainTwoId: captainTwo.id,
    firstOfficerOneId: firstOfficerOne.id,
    opsUserId: opsUser.id,
    stationByCode,
  });

  await seedCrewComplianceDemo(prisma, anchor);

  await prisma.alert.createMany({
    data: [
      {
        type: AlertType.CREW_SHORTAGE,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        title: "FO Coverage Gap",
        message:
          "Aircraft N407AO has no active FO assignment for upcoming departures.",
        aircraftId: acTwo.id,
        flightId: flights[1].id,
        createdById: opsUser.id,
      },
      {
        type: AlertType.GENERAL,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: "Qualification Expired",
        message:
          "CM-1002 has an expired CL_65 FO qualification but remains scheduled.",
        crewMemberId: firstOfficerOne.id,
        createdById: adminUser.id,
      },
    ],
  });

  await prisma.dutyRule.createMany({
    data: [
      {
        name: "FAA Part 135 Daily Duty",
        description: "Maximum duty period threshold for standard operations.",
        maxDutyHours: 14,
        minRestHours: 10,
      },
      {
        name: "Crew Rest Baseline",
        description: "Minimum rest window between duty periods.",
        minRestHours: 10,
        maxConsecutiveDays: 6,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
