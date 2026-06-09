import {
  AssignmentStatus,
  DutyStatus,
  EmploymentStatus,
  FlightLegStatus,
  FlightStatus,
  Prisma,
  SeatRole,
  TimeOffRequestStatus,
} from "@prisma/client";

import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";
import { prisma } from "@/lib/prisma";

export const CREW_MEMBER_CONTEXT_WINDOW_DAYS = 7;

const crewMemberContextSelect = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  dutyStatus: true,
  employmentStatus: true,
  phone: true,
  email: true,
  baseStation: {
    select: {
      code: true,
      city: true,
    },
  },
  qualifications: {
    orderBy: [{ aircraftType: "asc" }, { seatRole: "asc" }],
    select: {
      id: true,
      aircraftType: true,
      seatRole: true,
      issuedAt: true,
      expiresAt: true,
    },
  },
  assignments: {
    where: {
      isActive: true,
    },
    orderBy: [{ aircraft: { tailNumber: "asc" } }, { seatRole: "asc" }],
    select: {
      id: true,
      seatRole: true,
      startsAt: true,
      endsAt: true,
      notes: true,
      aircraft: {
        select: {
          id: true,
          tailNumber: true,
          type: true,
          status: true,
          homeStation: {
            select: {
              code: true,
              city: true,
            },
          },
        },
      },
    },
  },
  schedules: {
    orderBy: [{ date: "asc" }, { startsAt: "asc" }],
    select: {
      id: true,
      date: true,
      dutyStatus: true,
      startsAt: true,
      endsAt: true,
      notes: true,
      station: {
        select: {
          code: true,
          city: true,
        },
      },
    },
  },
  timeOffRequests: {
    where: {
      status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
    },
    orderBy: [{ startDate: "asc" }],
    select: {
      id: true,
      requestType: true,
      status: true,
      startDate: true,
      endDate: true,
      reason: true,
    },
  },
} satisfies Prisma.CrewMemberSelect;

const flightContextSelect = {
  id: true,
  aircraftId: true,
  flightNumber: true,
  scheduledDeparture: true,
  scheduledArrival: true,
  status: true,
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
      id: true,
      tailNumber: true,
    },
  },
  flightLeg: {
    select: {
      id: true,
      flightNumber: true,
      scheduledDeparture: true,
      scheduledArrival: true,
      status: true,
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
      aircraftAssignments: {
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
        select: {
          aircraft: {
            select: {
              id: true,
              tailNumber: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
    },
  },
} satisfies Prisma.FlightSelect;

type CrewMemberContextPayload = Prisma.CrewMemberGetPayload<{
  select: typeof crewMemberContextSelect;
}>;

type FlightContextPayload = Prisma.FlightGetPayload<{
  select: typeof flightContextSelect;
}>;

export type CrewMemberContextFlight = {
  id: string;
  flightLegId: string | null;
  flightNumber: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  status: FlightStatus | FlightLegStatus;
  route: string;
  tailNumber: string;
  aircraftId: string;
  seatRoles: SeatRole[];
  coverage: FlightCoverage | null;
};

export type CrewMemberContextData = CrewMemberContextPayload & {
  activeAssignments: CrewMemberContextPayload["assignments"];
  availabilityWarnings: string[];
  schedulesInWindow: CrewMemberContextPayload["schedules"];
  timeOffInWindow: CrewMemberContextPayload["timeOffRequests"];
  upcomingFlights: CrewMemberContextFlight[];
  windowEnd: Date;
  windowStart: Date;
};

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function overlapsWindow(
  start: Date,
  end: Date | null,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  return start < windowEnd && (!end || end >= windowStart);
}

function hasActiveAssignment(
  assignment: CrewMemberContextPayload["assignments"][number],
  now: Date,
): boolean {
  return assignment.startsAt <= now && (!assignment.endsAt || assignment.endsAt > now);
}

function normalizeFlight(
  flight: FlightContextPayload,
  coverage: FlightCoverage | null,
): Omit<CrewMemberContextFlight, "seatRoles"> {
  if (flight.flightLeg) {
    const assignedAircraft = flight.flightLeg.aircraftAssignments[0]?.aircraft;

    return {
      id: flight.id,
      flightLegId: flight.flightLeg.id,
      flightNumber: flight.flightLeg.flightNumber ?? flight.flightNumber,
      scheduledDeparture: flight.flightLeg.scheduledDeparture,
      scheduledArrival: flight.flightLeg.scheduledArrival,
      status: flight.flightLeg.status,
      route: `${flight.flightLeg.departureStation.code} -> ${flight.flightLeg.arrivalStation.code}`,
      tailNumber: assignedAircraft?.tailNumber ?? flight.aircraft.tailNumber,
      aircraftId: assignedAircraft?.id ?? flight.aircraft.id,
      coverage,
    };
  }

  return {
    id: flight.id,
    flightLegId: null,
    flightNumber: flight.flightNumber,
    scheduledDeparture: flight.scheduledDeparture,
    scheduledArrival: flight.scheduledArrival,
    status: flight.status,
    route: `${flight.departureStation.code} -> ${flight.arrivalStation.code}`,
    tailNumber: flight.aircraft.tailNumber,
    aircraftId: flight.aircraft.id,
    coverage,
  };
}

function hasQualificationWarning(
  crewMember: CrewMemberContextPayload,
  flight: CrewMemberContextFlight,
): boolean {
  const matchingAssignment = crewMember.assignments.find(
    (assignment) => assignment.aircraft.tailNumber === flight.tailNumber,
  );

  if (!matchingAssignment) {
    return false;
  }

  return flight.seatRoles.some((seatRole) => {
    const qualification = crewMember.qualifications.find(
      (item) =>
        item.aircraftType === matchingAssignment.aircraft.type && item.seatRole === seatRole,
    );

    return !qualification || Boolean(qualification.expiresAt && qualification.expiresAt < flight.scheduledDeparture);
  });
}

function buildAvailabilityWarnings(
  crewMember: CrewMemberContextPayload,
  schedulesInWindow: CrewMemberContextPayload["schedules"],
  timeOffInWindow: CrewMemberContextPayload["timeOffRequests"],
  upcomingFlights: CrewMemberContextFlight[],
): string[] {
  const warnings: string[] = [];

  if (crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    warnings.push(`Employment status is ${crewMember.employmentStatus}.`);
  }

  if (
    crewMember.dutyStatus === DutyStatus.SICK ||
    crewMember.dutyStatus === DutyStatus.VACATION ||
    crewMember.dutyStatus === DutyStatus.TRAINING
  ) {
    warnings.push(`Current duty status is ${crewMember.dutyStatus}.`);
  }

  if (schedulesInWindow.length === 0) {
    warnings.push("No CrewSchedule block in the planning window.");
  }

  if (timeOffInWindow.length > 0) {
    warnings.push("Time-off request overlaps the planning window.");
  }

  if (upcomingFlights.some((flight) => hasQualificationWarning(crewMember, flight))) {
    warnings.push("Qualification warning exists for assigned upcoming coverage.");
  }

  return warnings;
}

export async function getCrewMemberContextData(
  crewMemberId: string,
): Promise<CrewMemberContextData | null> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = addDays(now, CREW_MEMBER_CONTEXT_WINDOW_DAYS);
  const crewMember = await prisma.crewMember.findUnique({
    where: { id: crewMemberId },
    select: {
      ...crewMemberContextSelect,
      schedules: {
        ...crewMemberContextSelect.schedules,
        where: {
          date: {
            gte: windowStart,
            lt: windowEnd,
          },
        },
      },
      timeOffRequests: {
        ...crewMemberContextSelect.timeOffRequests,
        where: {
          status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
          startDate: { lt: windowEnd },
          endDate: { gte: now },
        },
      },
    },
  });

  if (!crewMember) {
    return null;
  }

  const activeAssignments = crewMember.assignments.filter((assignment) =>
    hasActiveAssignment(assignment, now),
  );
  const aircraftIds = Array.from(
    new Set(activeAssignments.map((assignment) => assignment.aircraft.id)),
  );
  const flights =
    aircraftIds.length === 0
      ? []
      : await prisma.flight.findMany({
          where: {
            aircraftId: { in: aircraftIds },
            scheduledDeparture: {
              gte: now,
              lt: windowEnd,
            },
          },
          orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
          select: flightContextSelect,
        });

  const flightsWithCoverage = await Promise.all(
    flights.map(async (flight) => ({
      flight,
      coverage: await resolveFlightCoverage(flight.id),
    })),
  );
  const upcomingFlights = flightsWithCoverage.flatMap(({ flight, coverage }) => {
    const baseFlight = normalizeFlight(flight, coverage);
    const seatRoles =
      coverage?.assignedCrew
        .filter((assignment) => assignment.crewMemberId === crewMember.id)
        .map((assignment) => assignment.seatRole) ?? [];

    if (seatRoles.length === 0) {
      return [];
    }

    return [{ ...baseFlight, seatRoles }];
  });
  const schedulesInWindow = crewMember.schedules;
  const timeOffInWindow = crewMember.timeOffRequests.filter((request) =>
    overlapsWindow(request.startDate, request.endDate, now, windowEnd),
  );

  return {
    ...crewMember,
    activeAssignments,
    availabilityWarnings: buildAvailabilityWarnings(
      crewMember,
      schedulesInWindow,
      timeOffInWindow,
      upcomingFlights,
    ),
    schedulesInWindow,
    timeOffInWindow,
    upcomingFlights,
    windowEnd,
    windowStart,
  };
}
