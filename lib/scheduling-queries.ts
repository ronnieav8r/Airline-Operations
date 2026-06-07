import {
  AlertSeverity,
  AlertStatus,
  AssignmentStatus,
  FlightLegStatus,
  FlightStatus,
  Prisma,
  ReleaseStatus,
} from "@prisma/client";

import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";
import { prisma } from "@/lib/prisma";

const SCHEDULE_WINDOW_DAYS = 14;
const SCHEDULE_LIMIT = 80;

const schedulingFlightSelect = {
  id: true,
  flightNumber: true,
  aircraftId: true,
  scheduledDeparture: true,
  scheduledArrival: true,
  actualDeparture: true,
  actualArrival: true,
  status: true,
  notes: true,
  departureStation: {
    select: {
      code: true,
      city: true,
      timezone: true,
    },
  },
  arrivalStation: {
    select: {
      code: true,
      city: true,
      timezone: true,
    },
  },
  aircraft: {
    select: {
      id: true,
      tailNumber: true,
      type: true,
      status: true,
    },
  },
  operationalControlRecord: {
    select: {
      controllingEntity: true,
      operatingAuthority: {
        select: {
          operatingPart: true,
          displayName: true,
        },
      },
      authorityRevision: {
        select: {
          revisionLabel: true,
        },
      },
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
      flightNumber: true,
      scheduledDeparture: true,
      scheduledArrival: true,
      actualDeparture: true,
      actualArrival: true,
      status: true,
      departureStation: {
        select: {
          code: true,
          city: true,
          timezone: true,
        },
      },
      arrivalStation: {
        select: {
          code: true,
          city: true,
          timezone: true,
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
              type: true,
              status: true,
            },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
        take: 1,
      },
      operationalControlRecord: {
        select: {
          controllingEntity: true,
          operatingAuthority: {
            select: {
              operatingPart: true,
              displayName: true,
            },
          },
          authorityRevision: {
            select: {
              revisionLabel: true,
            },
          },
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

type SchedulingFlightPayload = Prisma.FlightGetPayload<{
  select: typeof schedulingFlightSelect;
}>;

type SchedulingControlRecord = NonNullable<SchedulingFlightPayload["operationalControlRecord"]>;

export type ScheduleAlert = {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  flightId: string | null;
  aircraftId: string | null;
};

export type ScheduleFlight = {
  id: string;
  legacyFlightId: string;
  flightLegId: string | null;
  readSource: "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT";
  flightNumber: string;
  aircraftId: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  actualDeparture: Date | null;
  actualArrival: Date | null;
  status: FlightStatus | FlightLegStatus;
  notes: string | null;
  departureStation: {
    code: string;
    city: string;
    timezone: string;
  };
  arrivalStation: {
    code: string;
    city: string;
    timezone: string;
  };
  aircraft: {
    id: string;
    tailNumber: string;
    type: string;
    status: string;
  };
  operationalControlRecord: SchedulingControlRecord | null;
  coverage: FlightCoverage | null;
  alerts: ScheduleAlert[];
};

export type ScheduleDayGroup = {
  key: string;
  label: string;
  flights: ScheduleFlight[];
};

export type SchedulingData = {
  windowLabel: string;
  groups: ScheduleDayGroup[];
  summary: {
    total: number;
    delayed: number;
    coverageGaps: number;
    released: number;
    activeAlerts: number;
    flightLegReads: number;
    fallbackFlightReads: number;
  };
};

function toDateKey(value: Date): string {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${value.getFullYear()}-${month}-${day}`;
}

function toDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
}

function buildDayGroups(flights: ScheduleFlight[]): ScheduleDayGroup[] {
  const groups = new Map<string, ScheduleDayGroup>();

  for (const flight of flights) {
    const key = toDateKey(flight.scheduledDeparture);
    const group = groups.get(key);

    if (group) {
      group.flights.push(flight);
    } else {
      groups.set(key, {
        key,
        label: toDateLabel(flight.scheduledDeparture),
        flights: [flight],
      });
    }
  }

  return Array.from(groups.values());
}

function normalizeFlight(flight: SchedulingFlightPayload): Omit<ScheduleFlight, "coverage" | "alerts"> {
  if (flight.flightLeg) {
    const assignedAircraft = flight.flightLeg.aircraftAssignments[0]?.aircraft ?? flight.aircraft;

    return {
      id: flight.id,
      legacyFlightId: flight.id,
      flightLegId: flight.flightLeg.id,
      readSource: "FLIGHT_LEG",
      flightNumber: flight.flightLeg.flightNumber ?? flight.flightNumber,
      aircraftId: assignedAircraft.id,
      scheduledDeparture: flight.flightLeg.scheduledDeparture,
      scheduledArrival: flight.flightLeg.scheduledArrival,
      actualDeparture: flight.flightLeg.actualDeparture,
      actualArrival: flight.flightLeg.actualArrival,
      status: flight.flightLeg.status,
      notes: flight.notes,
      departureStation: flight.flightLeg.departureStation,
      arrivalStation: flight.flightLeg.arrivalStation,
      aircraft: assignedAircraft,
      operationalControlRecord:
        flight.flightLeg.operationalControlRecord ?? flight.operationalControlRecord,
    };
  }

  return {
    id: flight.id,
    legacyFlightId: flight.id,
    flightLegId: null,
    readSource: "LEG_MISSING_FALLBACK_FLIGHT",
    flightNumber: flight.flightNumber,
    aircraftId: flight.aircraftId,
    scheduledDeparture: flight.scheduledDeparture,
    scheduledArrival: flight.scheduledArrival,
    actualDeparture: flight.actualDeparture,
    actualArrival: flight.actualArrival,
    status: flight.status,
    notes: flight.notes,
    departureStation: flight.departureStation,
    arrivalStation: flight.arrivalStation,
    aircraft: flight.aircraft,
    operationalControlRecord: flight.operationalControlRecord,
  };
}

function releaseStatus(flight: ScheduleFlight): ReleaseStatus | null {
  return flight.operationalControlRecord?.release?.status ?? null;
}

export async function getSchedulingData(): Promise<SchedulingData> {
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + SCHEDULE_WINDOW_DAYS);

  const flights = await prisma.flight.findMany({
    where: {
      scheduledDeparture: {
        gte: now,
        lt: windowEnd,
      },
    },
    select: schedulingFlightSelect,
    orderBy: [{ scheduledDeparture: "asc" }, { flightNumber: "asc" }],
    take: SCHEDULE_LIMIT,
  });

  const normalizedBase = flights.map(normalizeFlight);
  const legacyFlightIds = normalizedBase.map((flight) => flight.legacyFlightId);
  const aircraftIds = Array.from(new Set(normalizedBase.map((flight) => flight.aircraftId)));

  const alerts =
    legacyFlightIds.length === 0
      ? []
      : await prisma.alert.findMany({
          where: {
            status: AlertStatus.ACTIVE,
            OR: [{ flightId: { in: legacyFlightIds } }, { aircraftId: { in: aircraftIds } }],
          },
          select: {
            id: true,
            type: true,
            severity: true,
            title: true,
            flightId: true,
            aircraftId: true,
          },
          orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        });

  const scheduleFlights: ScheduleFlight[] = await Promise.all(
    normalizedBase.map(async (flight) => ({
      ...flight,
      coverage: await resolveFlightCoverage(flight.legacyFlightId),
      alerts: alerts.filter(
        (alert) => alert.flightId === flight.legacyFlightId || alert.aircraftId === flight.aircraftId,
      ),
    })),
  );

  const summary = {
    total: scheduleFlights.length,
    delayed: scheduleFlights.filter((flight) => flight.status === FlightStatus.DELAYED).length,
    coverageGaps: scheduleFlights.filter(
      (flight) => flight.coverage && !flight.coverage.isCovered,
    ).length,
    released: scheduleFlights.filter((flight) => releaseStatus(flight) === ReleaseStatus.RELEASED)
      .length,
    activeAlerts: alerts.length,
    flightLegReads: scheduleFlights.filter((flight) => flight.readSource === "FLIGHT_LEG").length,
    fallbackFlightReads: scheduleFlights.filter(
      (flight) => flight.readSource === "LEG_MISSING_FALLBACK_FLIGHT",
    ).length,
  };

  return {
    windowLabel: `${toDateLabel(now)} - ${toDateLabel(windowEnd)}`,
    groups: buildDayGroups(scheduleFlights),
    summary,
  };
}

export { SCHEDULE_WINDOW_DAYS };
