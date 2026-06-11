import {
  AssignmentStatus,
  CrewDutyPeriodStatus,
  CrewRestPeriodStatus,
  DutyStatus,
  FlightLegStatus,
  OperatingPart,
  ReleaseStatus,
  SeatRole,
} from "@prisma/client";

import { prisma } from "../lib/prisma";

const SCENARIO_PREFIX = "DUTY_REST_SCENARIO";

type AuthorityContext = {
  authorityRevisionId: string;
  operatingAuthorityId: string;
  operatorId: string;
};

type BaseContext = {
  aircraftId: string;
  arrivalStationId: string;
  departureStationId: string;
};

type Scenario = {
  flightNumber: string;
  key: string;
  part: OperatingPart;
  setup: "PART_91_GUARDRAIL" | "PART_135_PASS" | "MISSING_REST" | "MISSING_INPUT" | "OVERLAP" | "DEFERRED";
};

const scenarios: Scenario[] = [
  {
    flightNumber: "DRQA91",
    key: "P91-GUARDRAIL",
    part: OperatingPart.PART_91,
    setup: "PART_91_GUARDRAIL",
  },
  {
    flightNumber: "DRQA135P",
    key: "135-PASS",
    part: OperatingPart.PART_135,
    setup: "PART_135_PASS",
  },
  {
    flightNumber: "DRQA135R",
    key: "135-MISSING-REST",
    part: OperatingPart.PART_135,
    setup: "MISSING_REST",
  },
  {
    flightNumber: "DRQA135I",
    key: "135-MISSING-INPUT",
    part: OperatingPart.PART_135,
    setup: "MISSING_INPUT",
  },
  {
    flightNumber: "DRQA135O",
    key: "135-OVERLAP",
    part: OperatingPart.PART_135,
    setup: "OVERLAP",
  },
  {
    flightNumber: "DRQA135D",
    key: "135-DEFERRED",
    part: OperatingPart.PART_135,
    setup: "DEFERRED",
  },
];

function addHours(value: Date, hours: number) {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function quarterStart(date: Date) {
  const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1, 0, 0, 0));
}

function scenarioNote(key: string) {
  return `${SCENARIO_PREFIX}:${key}`;
}

async function getAuthorityContext(part: OperatingPart): Promise<AuthorityContext> {
  const authority = await prisma.operatingAuthority.findFirst({
    where: { operatingPart: part },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      operatorId: true,
      revisions: {
        orderBy: { effectiveStart: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!authority || !authority.revisions[0]) {
    throw new Error(`Missing ${part} operating authority with at least one revision.`);
  }

  return {
    authorityRevisionId: authority.revisions[0].id,
    operatingAuthorityId: authority.id,
    operatorId: authority.operatorId,
  };
}

async function getBaseContext(): Promise<BaseContext> {
  const [aircraft, stations] = await Promise.all([
    prisma.aircraft.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
    prisma.station.findMany({
      orderBy: { code: "asc" },
      take: 2,
      select: { id: true },
    }),
  ]);

  if (!aircraft) {
    throw new Error("No aircraft found for duty/rest scenarios.");
  }

  if (stations.length < 2) {
    throw new Error("At least two stations are required for duty/rest scenarios.");
  }

  return {
    aircraftId: aircraft.id,
    arrivalStationId: stations[1].id,
    departureStationId: stations[0].id,
  };
}

async function upsertScenarioCrew(key: string, baseStationId: string) {
  return prisma.crewMember.upsert({
    where: { employeeNumber: `DRQA-${key}` },
    update: {
      baseStationId,
      dutyStatus: DutyStatus.OFF_DUTY,
      employmentStatus: "ACTIVE",
      firstName: "DutyRest",
      lastName: key,
    },
    create: {
      baseStationId,
      dutyStatus: DutyStatus.OFF_DUTY,
      email: `dutyrest-${key.toLowerCase()}@aeroops.local`,
      employeeNumber: `DRQA-${key}`,
      firstName: "DutyRest",
      lastName: key,
    },
    select: { id: true },
  });
}

async function clearScenarioLeg(key: string) {
  const existing = await prisma.flightLeg.findFirst({
    where: { notes: scenarioNote(key) },
    select: {
      id: true,
      operationalControlRecord: {
        select: {
          id: true,
          release: { select: { id: true } },
        },
      },
    },
  });

  if (!existing) {
    return;
  }

  await prisma.$transaction([
    prisma.releaseAuditEvent.deleteMany({ where: { flightLegId: existing.id } }),
    prisma.releaseReadinessFinding.deleteMany({
      where: { snapshot: { flightLegId: existing.id } },
    }),
    prisma.releaseReadinessSnapshot.deleteMany({ where: { flightLegId: existing.id } }),
    prisma.releasePackageEvidenceLink.deleteMany({
      where: { releasePackage: { flightLegId: existing.id } },
    }),
    prisma.releasePackage.deleteMany({ where: { flightLegId: existing.id } }),
    prisma.flightRelease.deleteMany({
      where: { operationalControlRecordId: existing.operationalControlRecord?.id ?? "__none__" },
    }),
    prisma.operationalControlRecord.deleteMany({ where: { flightLegId: existing.id } }),
    prisma.crewLegAssignment.deleteMany({ where: { flightLegId: existing.id } }),
    prisma.aircraftAssignment.deleteMany({ where: { flightLegId: existing.id } }),
    prisma.flightLeg.delete({ where: { id: existing.id } }),
  ]);
}

async function clearScenarioCrewEvidence(crewMemberId: string, key: string) {
  await prisma.$transaction([
    prisma.crewDutyPeriod.deleteMany({
      where: { crewMemberId, notes: { contains: scenarioNote(key) } },
    }),
    prisma.crewRestPeriod.deleteMany({
      where: { crewMemberId, notes: { contains: scenarioNote(key) } },
    }),
  ]);
}

async function createLeg(
  scenario: Scenario,
  authority: AuthorityContext,
  base: BaseContext,
  crewMemberId: string,
  departure: Date,
  arrival: Date,
) {
  const flightLeg = await prisma.flightLeg.create({
    data: {
      arrivalStationId: base.arrivalStationId,
      authorityRevisionId: authority.authorityRevisionId,
      departureStationId: base.departureStationId,
      flightNumber: scenario.flightNumber,
      notes: scenarioNote(scenario.key),
      operatingAuthorityId: authority.operatingAuthorityId,
      operatorId: authority.operatorId,
      scheduledArrival: arrival,
      scheduledDeparture: departure,
      status: FlightLegStatus.SCHEDULED,
    },
    select: { id: true },
  });

  const controlRecord = await prisma.operationalControlRecord.create({
    data: {
      authorityRevisionId: authority.authorityRevisionId,
      controllingEntity: "Duty/rest scenario QA",
      flightLegId: flightLeg.id,
      operatingAuthorityId: authority.operatingAuthorityId,
      operatorId: authority.operatorId,
      release: {
        create: {
          status: ReleaseStatus.PLANNED,
        },
      },
    },
    select: { id: true },
  });

  await prisma.aircraftAssignment.create({
    data: {
      aircraftId: base.aircraftId,
      flightLegId: flightLeg.id,
      notes: scenarioNote(scenario.key),
      status: AssignmentStatus.PLANNED,
    },
  });

  await prisma.crewLegAssignment.create({
    data: {
      crewMemberId,
      flightLegId: flightLeg.id,
      notes: scenarioNote(scenario.key),
      reportTime: addHours(departure, -1),
      releaseTime: addHours(arrival, 1),
      seatRole: SeatRole.CPT,
      status: AssignmentStatus.PLANNED,
    },
  });

  return { controlRecordId: controlRecord.id, flightLegId: flightLeg.id };
}

async function seedPassLikeDutyRest(crewMemberId: string, key: string, departure: Date, arrival: Date) {
  await prisma.crewDutyPeriod.create({
    data: {
      crewMemberId,
      endsAt: addHours(departure, -28),
      notes: `${scenarioNote(key)} non-overlap duty`,
      source: "duty-rest-scenario",
      startsAt: addHours(departure, -30),
      status: CrewDutyPeriodStatus.COMPLETED,
    },
  });

  await prisma.crewRestPeriod.create({
    data: {
      crewMemberId,
      endsAt: addHours(arrival, -1),
      notes: `${scenarioNote(key)} 10-hour rest`,
      source: "duty-rest-scenario",
      startsAt: addHours(arrival, -12),
      status: CrewRestPeriodStatus.COMPLETED,
    },
  });

  const start = quarterStart(departure);
  for (let index = 0; index < 13; index += 1) {
    const restStart = addDays(start, index * 3);
    await prisma.crewRestPeriod.create({
      data: {
        crewMemberId,
        endsAt: addHours(restStart, 24),
        notes: `${scenarioNote(key)} quarterly-rest-${index + 1}`,
        source: "duty-rest-scenario",
        startsAt: restStart,
        status: CrewRestPeriodStatus.COMPLETED,
      },
    });
  }
}

async function seedScenarioDutyRest(scenario: Scenario, crewMemberId: string, departure: Date, arrival: Date) {
  await clearScenarioCrewEvidence(crewMemberId, scenario.key);

  if (scenario.setup === "PART_91_GUARDRAIL" || scenario.setup === "MISSING_INPUT") {
    return;
  }

  if (scenario.setup === "PART_135_PASS" || scenario.setup === "DEFERRED") {
    await seedPassLikeDutyRest(crewMemberId, scenario.key, departure, arrival);
    return;
  }

  if (scenario.setup === "MISSING_REST") {
    await prisma.crewDutyPeriod.create({
      data: {
        crewMemberId,
        endsAt: addHours(departure, -20),
        notes: `${scenarioNote(scenario.key)} duty`,
        source: "duty-rest-scenario",
        startsAt: addHours(departure, -22),
        status: CrewDutyPeriodStatus.COMPLETED,
      },
    });
    await prisma.crewRestPeriod.create({
      data: {
        crewMemberId,
        endsAt: addHours(arrival, -1),
        notes: `${scenarioNote(scenario.key)} too-short-rest`,
        source: "duty-rest-scenario",
        startsAt: addHours(arrival, -3),
        status: CrewRestPeriodStatus.COMPLETED,
      },
    });
    return;
  }

  if (scenario.setup === "OVERLAP") {
    await prisma.crewDutyPeriod.create({
      data: {
        crewMemberId,
        endsAt: addHours(departure, -2),
        notes: `${scenarioNote(scenario.key)} overlap-duty`,
        source: "duty-rest-scenario",
        startsAt: addHours(departure, -8),
        status: CrewDutyPeriodStatus.COMPLETED,
      },
    });
    await prisma.crewRestPeriod.create({
      data: {
        crewMemberId,
        endsAt: addHours(departure, -1),
        notes: `${scenarioNote(scenario.key)} overlap-rest`,
        source: "duty-rest-scenario",
        startsAt: addHours(departure, -6),
        status: CrewRestPeriodStatus.COMPLETED,
      },
    });
  }
}

async function main() {
  if (process.env.RUN_DUTY_REST_SCENARIOS !== "1") {
    console.log("Skipping duty/rest scenario seed. Set RUN_DUTY_REST_SCENARIOS=1 to run.");
    return;
  }

  const base = await getBaseContext();
  const authorityContexts = new Map<OperatingPart, AuthorityContext>();
  const anchor = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 14, 14, 0, 0));

  for (const scenario of scenarios) {
    if (!authorityContexts.has(scenario.part)) {
      authorityContexts.set(scenario.part, await getAuthorityContext(scenario.part));
    }

    const authority = authorityContexts.get(scenario.part);
    if (!authority) {
      throw new Error(`Missing authority context for ${scenario.part}.`);
    }

    await clearScenarioLeg(scenario.key);
    const crew = await upsertScenarioCrew(scenario.key, base.departureStationId);
    const departure = addDays(anchor, scenarios.indexOf(scenario));
    const arrival = addHours(departure, scenario.setup === "PART_135_PASS" ? 2 : 3);

    await seedScenarioDutyRest(scenario, crew.id, departure, arrival);
    const result = await createLeg(scenario, authority, base, crew.id, departure, arrival);
    console.log(`Seeded ${scenario.key}: ${result.flightLegId}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
