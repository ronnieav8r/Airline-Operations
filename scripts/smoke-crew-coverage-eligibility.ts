import fs from "node:fs";
import path from "node:path";
import type { SeatRole as SeatRoleType } from "@prisma/client";

const SMOKE_PREFIX = "CREW-COVERAGE-SMOKE";
const scheduledDeparture = new Date("2030-06-15T14:00:00.000Z");
const scheduledArrival = new Date("2030-06-15T16:00:00.000Z");
let prisma: Awaited<ReturnType<typeof loadRuntime>>["prisma"];
let resolveFlightCoverage: Awaited<ReturnType<typeof loadRuntime>>["resolveFlightCoverage"];
let AircraftType: Awaited<ReturnType<typeof loadRuntime>>["AircraftType"];
let AssignmentStatus: Awaited<ReturnType<typeof loadRuntime>>["AssignmentStatus"];
let AuthorityStatus: Awaited<ReturnType<typeof loadRuntime>>["AuthorityStatus"];
let CrewPlannedComplianceEventStatus: Awaited<ReturnType<typeof loadRuntime>>["CrewPlannedComplianceEventStatus"];
let CrewPlannedComplianceEventType: Awaited<ReturnType<typeof loadRuntime>>["CrewPlannedComplianceEventType"];
let FlightLegStatus: Awaited<ReturnType<typeof loadRuntime>>["FlightLegStatus"];
let OperatingPart: Awaited<ReturnType<typeof loadRuntime>>["OperatingPart"];
let SeatRole: Awaited<ReturnType<typeof loadRuntime>>["SeatRole"];

function preferLocalDatabaseUrl() {
  const envLocal = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envLocal)) {
    return;
  }

  const match = fs.readFileSync(envLocal, "utf8").match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m);
  if (!match) {
    return;
  }

  process.env.DATABASE_URL = match[1];
}

async function loadRuntime() {
  preferLocalDatabaseUrl();
  const prismaClientModule = await import("@prisma/client");
  const crewResolutionModule = await import("@/lib/crew-resolution");

  return {
    AircraftType: prismaClientModule.AircraftType,
    AssignmentStatus: prismaClientModule.AssignmentStatus,
    AuthorityStatus: prismaClientModule.AuthorityStatus,
    CrewPlannedComplianceEventStatus: prismaClientModule.CrewPlannedComplianceEventStatus,
    CrewPlannedComplianceEventType: prismaClientModule.CrewPlannedComplianceEventType,
    FlightLegStatus: prismaClientModule.FlightLegStatus,
    OperatingPart: prismaClientModule.OperatingPart,
    SeatRole: prismaClientModule.SeatRole,
    prisma: new prismaClientModule.PrismaClient(),
    resolveFlightCoverage: crewResolutionModule.resolveFlightCoverage,
  };
}

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function resetSmokeAssignments(aircraftId: string) {
  await prisma.aircraftCrewAssignment.deleteMany({
    where: {
      aircraftId,
      notes: { startsWith: SMOKE_PREFIX },
    },
  });
}

async function upsertSmokeCrew(employeeNumber: string, firstName: string, baseStationId: string) {
  return prisma.crewMember.upsert({
    where: { employeeNumber },
    create: {
      baseStationId,
      email: `${employeeNumber.toLowerCase()}@example.test`,
      employeeNumber,
      firstName,
      lastName: "Coverage",
    },
    update: {
      baseStationId,
      firstName,
      lastName: "Coverage",
    },
  });
}

async function setQualification(
  crewMemberId: string,
  seatRole: SeatRoleType,
  expiresAt: Date | null,
) {
  await prisma.crewQualification.upsert({
    where: {
      crewMemberId_aircraftType_seatRole: {
        aircraftType: AircraftType.CL_65,
        crewMemberId,
        seatRole,
      },
    },
    create: {
      aircraftType: AircraftType.CL_65,
      crewMemberId,
      expiresAt,
      seatRole,
    },
    update: {
      expiresAt,
    },
  });
}

async function assignCrew(aircraftId: string, crewMemberId: string, seatRole: SeatRoleType) {
  await prisma.aircraftCrewAssignment.create({
    data: {
      aircraftId,
      crewMemberId,
      notes: `${SMOKE_PREFIX} ${seatRole}`,
      seatRole,
      startsAt: addDays(scheduledDeparture, -2),
    },
  });
}

async function coverageFor(flightLegId: string) {
  const coverage = await resolveFlightCoverage(flightLegId);
  assertCondition(Boolean(coverage), "Expected smoke FlightLeg coverage to resolve.");
  return coverage!;
}

async function main() {
  ({
    AircraftType,
    AssignmentStatus,
    AuthorityStatus,
    CrewPlannedComplianceEventStatus,
    CrewPlannedComplianceEventType,
    FlightLegStatus,
    OperatingPart,
    SeatRole,
    prisma,
    resolveFlightCoverage,
  } = await loadRuntime());

  const operator = await prisma.operator.upsert({
    where: { code: "CCSMK" },
    create: { code: "CCSMK", name: "Crew Coverage Smoke" },
    update: { name: "Crew Coverage Smoke" },
  });

  const authority = await prisma.operatingAuthority.upsert({
    where: {
      operatorId_operatingPart: {
        operatingPart: OperatingPart.PART_135,
        operatorId: operator.id,
      },
    },
    create: {
      displayName: "Crew Coverage Smoke Part 135",
      operatingPart: OperatingPart.PART_135,
      operatorId: operator.id,
      status: AuthorityStatus.ACTIVE,
    },
    update: {
      displayName: "Crew Coverage Smoke Part 135",
      status: AuthorityStatus.ACTIVE,
    },
  });

  const revision = await prisma.authorityRevision.upsert({
    where: {
      operatingAuthorityId_revisionLabel: {
        operatingAuthorityId: authority.id,
        revisionLabel: "SMOKE",
      },
    },
    create: {
      effectiveStart: addDays(scheduledDeparture, -365),
      operatingAuthorityId: authority.id,
      revisionLabel: "SMOKE",
      status: AuthorityStatus.ACTIVE,
    },
    update: {
      effectiveStart: addDays(scheduledDeparture, -365),
      status: AuthorityStatus.ACTIVE,
    },
  });

  const departure = await prisma.station.upsert({
    where: { code: "CSM" },
    create: {
      city: "Coverage",
      code: "CSM",
      name: "Coverage Smoke Depart",
      timezone: "America/New_York",
    },
    update: { name: "Coverage Smoke Depart" },
  });
  const arrival = await prisma.station.upsert({
    where: { code: "CSE" },
    create: {
      city: "Coverage",
      code: "CSE",
      name: "Coverage Smoke Arrive",
      timezone: "America/New_York",
    },
    update: { name: "Coverage Smoke Arrive" },
  });

  const aircraft = await prisma.aircraft.upsert({
    where: { tailNumber: "NCSMK" },
    create: {
      homeStationId: departure.id,
      tailNumber: "NCSMK",
      type: AircraftType.CL_65,
    },
    update: {
      homeStationId: departure.id,
      type: AircraftType.CL_65,
    },
  });

  const existingFlightLeg = await prisma.flightLeg.findFirst({
    where: {
      flightNumber: "CCS100",
      scheduledDeparture,
    },
    select: { id: true },
  });
  const flightLeg = existingFlightLeg
    ? await prisma.flightLeg.update({
        where: { id: existingFlightLeg.id },
        data: {
          aircraftAssignments: {
            deleteMany: {},
            create: {
              aircraftId: aircraft.id,
              assignedAt: scheduledDeparture,
              status: AssignmentStatus.PLANNED,
            },
          },
          arrivalStationId: arrival.id,
          authorityRevisionId: revision.id,
          departureStationId: departure.id,
          operatingAuthorityId: authority.id,
          operatorId: operator.id,
          scheduledArrival,
          scheduledDeparture,
          status: FlightLegStatus.SCHEDULED,
        },
      })
    : await prisma.flightLeg.create({
        data: {
          aircraftAssignments: {
            create: {
              aircraftId: aircraft.id,
              assignedAt: scheduledDeparture,
              status: AssignmentStatus.PLANNED,
            },
          },
          arrivalStationId: arrival.id,
          authorityRevisionId: revision.id,
          departureStationId: departure.id,
          flightNumber: "CCS100",
          operatingAuthorityId: authority.id,
          operatorId: operator.id,
          scheduledArrival,
          scheduledDeparture,
          status: FlightLegStatus.SCHEDULED,
        },
      });

  const cpt = await upsertSmokeCrew("CCSMK-CPT", "Casey", departure.id);
  const fo = await upsertSmokeCrew("CCSMK-FO", "Finley", departure.id);
  await prisma.crewPlannedComplianceEvent.deleteMany({
    where: {
      crewMemberId: { in: [cpt.id, fo.id] },
      notes: { startsWith: SMOKE_PREFIX },
    },
  });

  await resetSmokeAssignments(aircraft.id);
  let coverage = await coverageFor(flightLeg.id);
  assertCondition(coverage.missingRoles.includes(SeatRole.CPT), "Missing CPT should count as crew open.");
  assertCondition(coverage.missingRoles.includes(SeatRole.FO), "Missing FO should count as crew open.");

  await setQualification(cpt.id, SeatRole.CPT, addDays(scheduledDeparture, 90));
  await setQualification(fo.id, SeatRole.FO, addDays(scheduledDeparture, 90));
  await resetSmokeAssignments(aircraft.id);
  await assignCrew(aircraft.id, cpt.id, SeatRole.CPT);
  await assignCrew(aircraft.id, fo.id, SeatRole.FO);
  coverage = await coverageFor(flightLeg.id);
  assertCondition(coverage.isCovered, "Valid CPT and FO should cleanly cover the flight.");

  await setQualification(cpt.id, SeatRole.CPT, addDays(scheduledDeparture, -1));
  await resetSmokeAssignments(aircraft.id);
  await assignCrew(aircraft.id, cpt.id, SeatRole.CPT);
  await assignCrew(aircraft.id, fo.id, SeatRole.FO);
  coverage = await coverageFor(flightLeg.id);
  assertCondition(!coverage.isCovered, "Expired CPT qualification should not cleanly cover the flight.");
  assertCondition(coverage.ineligibleAssignments.length === 1, "Expired CPT without planned event should be ineligible.");

  await prisma.crewPlannedComplianceEvent.create({
    data: {
      aircraftType: AircraftType.CL_65,
      crewMemberId: cpt.id,
      eventType: CrewPlannedComplianceEventType.RECURRENT_TRAINING,
      notes: `${SMOKE_PREFIX} pending recurrent`,
      scheduledFor: addDays(scheduledDeparture, -3),
      seatRole: SeatRole.CPT,
      status: CrewPlannedComplianceEventStatus.SCHEDULED,
    },
  });
  coverage = await coverageFor(flightLeg.id);
  assertCondition(!coverage.isCovered, "Pending event should not cleanly cover the flight.");
  assertCondition(coverage.pendingAssignments.length === 1, "Planned event before flight should mark assignment pending.");

  await prisma.crewPlannedComplianceEvent.deleteMany({
    where: {
      crewMemberId: cpt.id,
      notes: { startsWith: SMOKE_PREFIX },
    },
  });
  await setQualification(cpt.id, SeatRole.CPT, addDays(scheduledDeparture, 10));
  coverage = await coverageFor(flightLeg.id);
  assertCondition(coverage.isCovered, "Expiring-soon CPT should still cover the flight.");
  assertCondition(coverage.warnings.length === 1, "Expiring-soon CPT should create one coverage warning.");

  console.log("crew coverage eligibility smoke passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
