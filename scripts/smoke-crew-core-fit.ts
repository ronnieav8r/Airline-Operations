import {
  AircraftType,
  DutyStatus,
  EmploymentStatus,
  Prisma,
  PrismaClient,
  SeatRole,
} from "@prisma/client";

import { getAircraftCrewWorkflowData } from "../lib/aircraft-crew-workflow-queries";
import {
  assertSmokeTestAuthEnabled,
  ensureSmokeTestUsers,
} from "./smoke-test-auth";

const prisma = new PrismaClient();
const runKey = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const smokeLabel = `CREW-CORE-FIT-${runKey}`;

function requireLocalOrExplicitRemoteSmoke() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (
    process.env.AEROOPS_ALLOW_REMOTE_SMOKE !== "1" &&
    !databaseUrl.includes("127.0.0.1") &&
    !databaseUrl.includes("localhost")
  ) {
    throw new Error(
      "Crew core smoke writes are blocked unless DATABASE_URL is local or AEROOPS_ALLOW_REMOTE_SMOKE=1 is set.",
    );
  }
}

function atUtcDay(daysFromNow: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function assertRecord<T>(record: T | null | undefined, label: string): T {
  if (!record) {
    throw new Error(`${label} is required for crew core smoke testing.`);
  }

  return record;
}

async function main() {
  requireLocalOrExplicitRemoteSmoke();
  assertSmokeTestAuthEnabled();
  await ensureSmokeTestUsers(prisma);

  const [station, aircraft] = await Promise.all([
    prisma.station.findFirst({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      select: { id: true },
    }),
    prisma.aircraft.findFirst({
      orderBy: [{ tailNumber: "asc" }],
      select: { id: true },
    }),
  ]);
  const selectedStation = assertRecord(station, "Active station");
  const selectedAircraft = assertRecord(aircraft, "Aircraft");

  const [assignmentCountBefore, scheduleCountBefore, scheduleEntryCountBefore] = await Promise.all([
    prisma.aircraftCrewAssignment.count(),
    prisma.crewSchedule.count(),
    prisma.crewScheduleEntry.count(),
  ]);

  const crewMember = await prisma.crewMember.create({
    data: {
      baseStationId: selectedStation.id,
      dutyStatus: DutyStatus.OFF_DUTY,
      email: `${smokeLabel.toLowerCase()}@aeroops.local`,
      employeeNumber: smokeLabel,
      employmentStatus: EmploymentStatus.ACTIVE,
      firstName: "Crew",
      hireDate: atUtcDay(-30),
      lastName: "Smoke",
      phone: "555-0100",
    },
    select: { id: true },
  });

  await prisma.crewMember.update({
    where: { id: crewMember.id },
    data: {
      dutyStatus: DutyStatus.RESERVE,
      phone: "555-0111",
    },
  });

  const qualification = await prisma.crewQualification.create({
    data: {
      aircraftType: AircraftType.CL_65,
      crewMemberId: crewMember.id,
      expiresAt: atUtcDay(180),
      issuedAt: atUtcDay(-10),
      notes: `${smokeLabel} initial qualification`,
      seatRole: SeatRole.FO,
    },
    select: { id: true },
  });

  try {
    await prisma.crewQualification.create({
      data: {
        aircraftType: AircraftType.CL_65,
        crewMemberId: crewMember.id,
        issuedAt: atUtcDay(-9),
        seatRole: SeatRole.FO,
      },
    });
    throw new Error("Duplicate crew qualification was unexpectedly allowed.");
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  await prisma.crewQualification.update({
    where: { id: qualification.id },
    data: {
      expiresAt: atUtcDay(90),
      notes: `${smokeLabel} updated qualification`,
    },
  });

  await prisma.crewQualification.update({
    where: { id: qualification.id },
    data: { expiresAt: new Date() },
  });

  await prisma.crewQualification.delete({
    where: { id: qualification.id },
  });

  const aircraftWorkflow = await getAircraftCrewWorkflowData(selectedAircraft.id);
  const prefillUrl = `/aircraft/${selectedAircraft.id}/crew?crewMemberId=${crewMember.id}&seatRole=${SeatRole.FO}`;

  if (!aircraftWorkflow) {
    throw new Error("Aircraft crew workflow data was not available for fit-panel smoke.");
  }

  if (!aircraftWorkflow.crewOptions.some((option) => option.id === crewMember.id)) {
    throw new Error("New active crew member did not appear as an aircraft crew fit option.");
  }

  const [assignmentCountAfter, scheduleCountAfter, scheduleEntryCountAfter] = await Promise.all([
    prisma.aircraftCrewAssignment.count(),
    prisma.crewSchedule.count(),
    prisma.crewScheduleEntry.count(),
  ]);

  if (
    assignmentCountAfter !== assignmentCountBefore ||
    scheduleCountAfter !== scheduleCountBefore ||
    scheduleEntryCountAfter !== scheduleEntryCountBefore
  ) {
    throw new Error("Crew core or fit-panel smoke changed assignment or scheduling row counts.");
  }

  console.log(
    `crew core/fit smoke: crew ${crewMember.id} updated, qualification CRUD verified, prefill URL ${prefillUrl} has no assignment side effect.`,
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
