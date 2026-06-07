import {
  FlightLegStatus,
  FlightStatus,
  Prisma,
  ReleaseStatus,
  SeatRole,
} from "@prisma/client";

import { resolveFlightCoverage } from "@/lib/crew-resolution";
import { prisma } from "@/lib/prisma";

const flightParitySelect = {
  id: true,
  flightNumber: true,
  aircraftId: true,
  departureStationId: true,
  arrivalStationId: true,
  scheduledDeparture: true,
  scheduledArrival: true,
  actualDeparture: true,
  actualArrival: true,
  status: true,
  notes: true,
  departureStation: {
    select: {
      code: true,
    },
  },
  arrivalStation: {
    select: {
      code: true,
    },
  },
  aircraft: {
    select: {
      tailNumber: true,
    },
  },
  operationalControlRecord: {
    select: {
      id: true,
      operatorId: true,
      operatingAuthorityId: true,
      authorityRevisionId: true,
      controllingEntity: true,
      release: {
        select: {
          status: true,
          releasedAt: true,
        },
      },
    },
  },
  flightLeg: {
    select: {
      id: true,
      legacyFlightId: true,
      operatorId: true,
      operatingAuthorityId: true,
      authorityRevisionId: true,
      flightNumber: true,
      departureStationId: true,
      arrivalStationId: true,
      scheduledDeparture: true,
      scheduledArrival: true,
      actualDeparture: true,
      actualArrival: true,
      status: true,
      notes: true,
      aircraftAssignments: {
        select: {
          aircraftId: true,
          status: true,
        },
        orderBy: {
          assignedAt: "asc",
        },
      },
      crewAssignments: {
        select: {
          crewMemberId: true,
          seatRole: true,
          sourceAircraftCrewAssignmentId: true,
        },
        orderBy: [
          {
            seatRole: "asc",
          },
          {
            crewMemberId: "asc",
          },
        ],
      },
      operationalControlRecord: {
        select: {
          id: true,
          operatorId: true,
          operatingAuthorityId: true,
          authorityRevisionId: true,
          release: {
            select: {
              status: true,
              releasedAt: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.FlightSelect;

type FlightParityPayload = Prisma.FlightGetPayload<{
  select: typeof flightParitySelect;
}>;

type ExpectedTurnarounds = {
  allKeys: Set<string>;
  byFlightId: Map<string, Set<string>>;
};

export type ParityStatus = "PASS" | "FAIL";

export type FlightLegParityRow = {
  flightId: string;
  flightLegId: string | null;
  flightNumber: string;
  route: string;
  scheduledDeparture: Date;
  aircraftTailNumber: string;
  status: ParityStatus;
  issueCount: number;
  issues: string[];
  checks: {
    bridge: boolean;
    core: boolean;
    aircraft: boolean;
    crew: boolean;
    control: boolean;
    turnaround: boolean;
  };
  expected: {
    status: FlightLegStatus;
    crew: string[];
    turnarounds: string[];
  };
  actual: {
    status: FlightLegStatus | null;
    crew: string[];
    turnarounds: string[];
  };
};

export type FlightLegParityReport = {
  generatedAt: Date;
  summary: {
    totalFlights: number;
    linkedLegs: number;
    passingRows: number;
    failingRows: number;
    missingFlightLegRows: number;
    crewMismatches: number;
    aircraftMismatches: number;
    controlMismatches: number;
    turnaroundMismatches: number;
  };
  rows: FlightLegParityRow[];
};

function mapLegStatus(
  flightStatus: FlightStatus,
  releaseStatus: ReleaseStatus | null | undefined,
): FlightLegStatus {
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

function nullableDateEquals(first: Date | null, second: Date | null): boolean {
  if (!first || !second) {
    return first === second;
  }

  return first.getTime() === second.getTime();
}

function formatCrewKey(input: {
  crewMemberId: string;
  seatRole: SeatRole;
  sourceAircraftCrewAssignmentId?: string | null;
}): string {
  return `${input.seatRole}:${input.crewMemberId}:${input.sourceAircraftCrewAssignmentId ?? "none"}`;
}

function compareSets(expected: Set<string>, actual: Set<string>): boolean {
  if (expected.size !== actual.size) {
    return false;
  }

  for (const key of expected) {
    if (!actual.has(key)) {
      return false;
    }
  }

  return true;
}

function addTurnaroundKey(target: Map<string, Set<string>>, flightId: string, key: string) {
  const existing = target.get(flightId) ?? new Set<string>();
  existing.add(key);
  target.set(flightId, existing);
}

function buildExpectedTurnarounds(flights: FlightParityPayload[]): ExpectedTurnarounds {
  const allKeys = new Set<string>();
  const byFlightId = new Map<string, Set<string>>();
  const byAircraft = new Map<string, FlightParityPayload[]>();

  for (const flight of flights) {
    const existing = byAircraft.get(flight.aircraftId) ?? [];
    existing.push(flight);
    byAircraft.set(flight.aircraftId, existing);
  }

  for (const aircraftFlights of byAircraft.values()) {
    aircraftFlights.sort(
      (first, second) => first.scheduledDeparture.getTime() - second.scheduledDeparture.getTime(),
    );

    for (let index = 0; index < aircraftFlights.length - 1; index += 1) {
      const inbound = aircraftFlights[index];
      const outbound = aircraftFlights[index + 1];

      if (outbound.scheduledDeparture.getTime() < inbound.scheduledArrival.getTime()) {
        continue;
      }

      const key = `${inbound.id}->${outbound.id}`;
      allKeys.add(key);
      addTurnaroundKey(byFlightId, inbound.id, key);
      addTurnaroundKey(byFlightId, outbound.id, key);
    }
  }

  return { allKeys, byFlightId };
}

async function buildActualTurnarounds(): Promise<Map<string, Set<string>>> {
  const links = await prisma.turnaroundLink.findMany({
    select: {
      inboundFlightLeg: {
        select: {
          legacyFlightId: true,
        },
      },
      outboundFlightLeg: {
        select: {
          legacyFlightId: true,
        },
      },
    },
  });
  const byFlightId = new Map<string, Set<string>>();

  for (const link of links) {
    const inboundFlightId = link.inboundFlightLeg.legacyFlightId;
    const outboundFlightId = link.outboundFlightLeg.legacyFlightId;

    if (!inboundFlightId || !outboundFlightId) {
      continue;
    }

    const key = `${inboundFlightId}->${outboundFlightId}`;
    addTurnaroundKey(byFlightId, inboundFlightId, key);
    addTurnaroundKey(byFlightId, outboundFlightId, key);
  }

  return byFlightId;
}

function getCoreIssues(flight: FlightParityPayload): string[] {
  const flightLeg = flight.flightLeg;

  if (!flightLeg) {
    return ["Missing FlightLeg bridge row."];
  }

  const issues: string[] = [];
  const expectedStatus = mapLegStatus(
    flight.status,
    flight.operationalControlRecord?.release?.status,
  );

  if (flightLeg.legacyFlightId !== flight.id) {
    issues.push("FlightLeg legacyFlightId does not match Flight id.");
  }

  if (flightLeg.flightNumber !== flight.flightNumber) {
    issues.push("Flight number mismatch.");
  }

  if (flightLeg.departureStationId !== flight.departureStationId) {
    issues.push("Departure station mismatch.");
  }

  if (flightLeg.arrivalStationId !== flight.arrivalStationId) {
    issues.push("Arrival station mismatch.");
  }

  if (flightLeg.scheduledDeparture.getTime() !== flight.scheduledDeparture.getTime()) {
    issues.push("Scheduled departure mismatch.");
  }

  if (flightLeg.scheduledArrival.getTime() !== flight.scheduledArrival.getTime()) {
    issues.push("Scheduled arrival mismatch.");
  }

  if (!nullableDateEquals(flightLeg.actualDeparture, flight.actualDeparture)) {
    issues.push("Actual departure mismatch.");
  }

  if (!nullableDateEquals(flightLeg.actualArrival, flight.actualArrival)) {
    issues.push("Actual arrival mismatch.");
  }

  if (flightLeg.notes !== flight.notes) {
    issues.push("Notes mismatch.");
  }

  if (flightLeg.status !== expectedStatus) {
    issues.push(`Status mismatch: expected ${expectedStatus}, got ${flightLeg.status}.`);
  }

  return issues;
}

function getAircraftIssues(flight: FlightParityPayload): string[] {
  const assignments = flight.flightLeg?.aircraftAssignments ?? [];

  if (!flight.flightLeg) {
    return ["Cannot compare aircraft without FlightLeg."];
  }

  if (assignments.length === 0) {
    return ["No AircraftAssignment linked to FlightLeg."];
  }

  if (!assignments.some((assignment) => assignment.aircraftId === flight.aircraftId)) {
    return ["AircraftAssignment does not match Flight aircraft."];
  }

  return [];
}

async function getCrewIssues(flight: FlightParityPayload): Promise<{
  expectedCrew: string[];
  actualCrew: string[];
  issues: string[];
}> {
  if (!flight.flightLeg) {
    return {
      expectedCrew: [],
      actualCrew: [],
      issues: ["Cannot compare crew without FlightLeg."],
    };
  }

  const coverage = await resolveFlightCoverage(flight.id);
  const expectedCrew = new Set(
    (coverage?.assignedCrew ?? []).map((assignment) =>
      formatCrewKey({
        crewMemberId: assignment.crewMemberId,
        seatRole: assignment.seatRole,
        sourceAircraftCrewAssignmentId: assignment.assignmentId,
      }),
    ),
  );
  const actualCrew = new Set(
    flight.flightLeg.crewAssignments.map((assignment) =>
      formatCrewKey({
        crewMemberId: assignment.crewMemberId,
        seatRole: assignment.seatRole,
        sourceAircraftCrewAssignmentId: assignment.sourceAircraftCrewAssignmentId,
      }),
    ),
  );

  if (actualCrew.size === 0) {
    return {
      expectedCrew: Array.from(expectedCrew).sort(),
      actualCrew: [],
      issues: [],
    };
  }

  return {
    expectedCrew: Array.from(expectedCrew).sort(),
    actualCrew: Array.from(actualCrew).sort(),
    issues: compareSets(expectedCrew, actualCrew) ? [] : ["CrewLegAssignment snapshot mismatch."],
  };
}

function getControlIssues(flight: FlightParityPayload): string[] {
  const flightControl = flight.operationalControlRecord;
  const legControl = flight.flightLeg?.operationalControlRecord;

  if (!flight.flightLeg) {
    return ["Cannot compare control without FlightLeg."];
  }

  if (!flightControl || !legControl) {
    return ["Missing operational-control link on Flight or FlightLeg."];
  }

  const issues: string[] = [];

  if (flightControl.id !== legControl.id) {
    issues.push("Flight and FlightLeg point to different control records.");
  }

  if (flightControl.operatorId !== legControl.operatorId) {
    issues.push("Control operator mismatch.");
  }

  if (flightControl.operatingAuthorityId !== legControl.operatingAuthorityId) {
    issues.push("Control operating authority mismatch.");
  }

  if (flightControl.authorityRevisionId !== legControl.authorityRevisionId) {
    issues.push("Control authority revision mismatch.");
  }

  if (flightControl.release?.status !== legControl.release?.status) {
    issues.push("Release status mismatch.");
  }

  if (!nullableDateEquals(flightControl.release?.releasedAt ?? null, legControl.release?.releasedAt ?? null)) {
    issues.push("Release timestamp mismatch.");
  }

  return issues;
}

function getTurnaroundIssues(
  flightId: string,
  expectedTurnaroundsByFlight: Map<string, Set<string>>,
  actualTurnaroundsByFlight: Map<string, Set<string>>,
): {
  expectedTurnarounds: string[];
  actualTurnarounds: string[];
  issues: string[];
} {
  const expected = expectedTurnaroundsByFlight.get(flightId) ?? new Set<string>();
  const actual = actualTurnaroundsByFlight.get(flightId) ?? new Set<string>();

  return {
    expectedTurnarounds: Array.from(expected).sort(),
    actualTurnarounds: Array.from(actual).sort(),
    issues: compareSets(expected, actual) ? [] : ["TurnaroundLink sequence mismatch."],
  };
}

export async function getFlightLegParityReport(): Promise<FlightLegParityReport> {
  const flights = await prisma.flight.findMany({
    select: flightParitySelect,
    orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
  });
  const expectedTurnarounds = buildExpectedTurnarounds(flights);
  const actualTurnaroundsByFlight = await buildActualTurnarounds();

  const rows = await Promise.all(
    flights.map(async (flight) => {
      const coreIssues = getCoreIssues(flight);
      const aircraftIssues = getAircraftIssues(flight);
      const crewResult = await getCrewIssues(flight);
      const controlIssues = getControlIssues(flight);
      const turnaroundResult = getTurnaroundIssues(
        flight.id,
        expectedTurnarounds.byFlightId,
        actualTurnaroundsByFlight,
      );
      const issues = [
        ...coreIssues,
        ...aircraftIssues,
        ...crewResult.issues,
        ...controlIssues,
        ...turnaroundResult.issues,
      ];

      return {
        flightId: flight.id,
        flightLegId: flight.flightLeg?.id ?? null,
        flightNumber: flight.flightNumber,
        route: `${flight.departureStation.code} -> ${flight.arrivalStation.code}`,
        scheduledDeparture: flight.scheduledDeparture,
        aircraftTailNumber: flight.aircraft.tailNumber,
        status: issues.length === 0 ? "PASS" : "FAIL",
        issueCount: issues.length,
        issues,
        checks: {
          bridge: Boolean(flight.flightLeg),
          core: coreIssues.length === 0,
          aircraft: aircraftIssues.length === 0,
          crew: crewResult.issues.length === 0,
          control: controlIssues.length === 0,
          turnaround: turnaroundResult.issues.length === 0,
        },
        expected: {
          status: mapLegStatus(flight.status, flight.operationalControlRecord?.release?.status),
          crew: crewResult.expectedCrew,
          turnarounds: turnaroundResult.expectedTurnarounds,
        },
        actual: {
          status: flight.flightLeg?.status ?? null,
          crew: crewResult.actualCrew,
          turnarounds: turnaroundResult.actualTurnarounds,
        },
      } satisfies FlightLegParityRow;
    }),
  );
  const passingRows = rows.filter((row) => row.status === "PASS").length;

  return {
    generatedAt: new Date(),
    summary: {
      totalFlights: rows.length,
      linkedLegs: rows.filter((row) => row.flightLegId).length,
      passingRows,
      failingRows: rows.length - passingRows,
      missingFlightLegRows: rows.filter((row) => !row.checks.bridge).length,
      crewMismatches: rows.filter((row) => !row.checks.crew).length,
      aircraftMismatches: rows.filter((row) => !row.checks.aircraft).length,
      controlMismatches: rows.filter((row) => !row.checks.control).length,
      turnaroundMismatches: rows.filter((row) => !row.checks.turnaround).length,
    },
    rows,
  };
}
