import {
  AlertSeverity,
  AlertStatus,
  AircraftStatus,
  FlightLegStatus,
  FlightStatus,
  ManifestStatus,
  Prisma,
  SeatRole,
  WeightBalanceStatus,
} from "@prisma/client";

import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";
import { prisma } from "@/lib/prisma";

const dashboardFlightSelect = {
  id: true,
  flightNumber: true,
  scheduledDeparture: true,
  status: true,
  departureStation: {
    select: { code: true },
  },
  arrivalStation: {
    select: { code: true },
  },
  aircraft: {
    select: { tailNumber: true },
  },
  flightLeg: {
    select: {
      id: true,
      flightNumber: true,
      scheduledDeparture: true,
      status: true,
      departureStation: {
        select: { code: true },
      },
      arrivalStation: {
        select: { code: true },
      },
      aircraftAssignments: {
        select: {
          aircraft: {
            select: { tailNumber: true },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
        take: 1,
      },
      manifest: {
        select: {
          status: true,
          items: {
            select: { id: true },
          },
        },
      },
      weightBalanceRuns: {
        select: {
          status: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      flightLocatingRecord: {
        select: {
          status: true,
        },
      },
      dispatchPackage: {
        select: {
          id: true,
          weatherBriefingId: true,
          notamSnapshotId: true,
          flightPlanReferenceId: true,
        },
      },
    },
  },
} satisfies Prisma.FlightSelect;

type DashboardFlightPayload = Prisma.FlightGetPayload<{
  select: typeof dashboardFlightSelect;
}>;

export type DashboardFlightReadSource = "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT";

export type DashboardFlight = {
  id: string;
  legacyFlightId: string;
  flightLegId: string | null;
  readSource: DashboardFlightReadSource;
  flightNumber: string;
  scheduledDeparture: Date;
  status: FlightStatus | FlightLegStatus;
  departureCode: string;
  arrivalCode: string;
  tailNumber: string;
  coverage: FlightCoverage | null;
  releaseEvidence: DashboardReleaseEvidence | null;
};

export type DashboardReleaseEvidence = {
  manifestStatus: ManifestStatus | null;
  manifestItemCount: number;
  weightBalanceStatus: WeightBalanceStatus | null;
  locatingStatus: string | null;
  dispatchPackageReady: boolean;
  complete: boolean;
};

export type AlertRow = {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  flightNumber: string | null;
  aircraftTail: string | null;
};

export type DashboardData = {
  dateLabel: string;
  statusSummary: {
    totalFlights: number;
    enroute: number;
    delayed: number;
    activeAlerts: number;
    aircraftCount: number;
    crewCount: number;
    flightLegReads: number;
    fallbackFlightReads: number;
    releaseEvidenceComplete: number;
    releaseEvidenceMissing: number;
  };
  flights: DashboardFlight[];
  coverageGaps: Array<DashboardFlight & { missingRoles: SeatRole[] }>;
  alerts: AlertRow[];
  fleetSnapshot: Array<{
    status: AircraftStatus;
    count: number;
  }>;
};

function getTodayRange(now: Date) {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return { start, end };
}

function toDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function buildFleetSnapshot(statusCounts: Array<{ status: AircraftStatus; count: number }>) {
  const order = [
    AircraftStatus.AVAILABLE,
    AircraftStatus.IN_FLIGHT,
    AircraftStatus.RESERVED,
    AircraftStatus.IN_MAINTENANCE,
    AircraftStatus.OUT_OF_SERVICE,
  ];
  const map = Object.fromEntries(
    Object.values(AircraftStatus).map((status) => [status, 0]),
  ) as Record<AircraftStatus, number>;

  for (const item of statusCounts) {
    map[item.status] = item.count;
  }

  return order.map((status) => ({ status, count: map[status] ?? 0 }));
}

function buildDashboardReleaseEvidence(
  flightLeg: NonNullable<DashboardFlightPayload["flightLeg"]>,
): DashboardReleaseEvidence {
  const weightBalanceStatus = flightLeg.weightBalanceRuns[0]?.status ?? null;
  const dispatchPackageReady = Boolean(
    flightLeg.dispatchPackage?.weatherBriefingId &&
      flightLeg.dispatchPackage.notamSnapshotId &&
      flightLeg.dispatchPackage.flightPlanReferenceId,
  );
  const complete =
    (flightLeg.manifest?.status === ManifestStatus.READY ||
      flightLeg.manifest?.status === ManifestStatus.LOCKED) &&
    (weightBalanceStatus === WeightBalanceStatus.CALCULATED ||
      weightBalanceStatus === WeightBalanceStatus.APPROVED) &&
    Boolean(flightLeg.flightLocatingRecord) &&
    dispatchPackageReady;

  return {
    manifestStatus: flightLeg.manifest?.status ?? null,
    manifestItemCount: flightLeg.manifest?.items.length ?? 0,
    weightBalanceStatus,
    locatingStatus: flightLeg.flightLocatingRecord?.status ?? null,
    dispatchPackageReady,
    complete,
  };
}

function normalizeFlight(flight: DashboardFlightPayload): Omit<DashboardFlight, "coverage"> {
  if (flight.flightLeg) {
    return {
      id: flight.id,
      legacyFlightId: flight.id,
      flightLegId: flight.flightLeg.id,
      readSource: "FLIGHT_LEG",
      flightNumber: flight.flightLeg.flightNumber ?? flight.flightNumber,
      scheduledDeparture: flight.flightLeg.scheduledDeparture,
      status: flight.flightLeg.status,
      departureCode: flight.flightLeg.departureStation.code,
      arrivalCode: flight.flightLeg.arrivalStation.code,
      tailNumber: flight.flightLeg.aircraftAssignments[0]?.aircraft.tailNumber ?? flight.aircraft.tailNumber,
      releaseEvidence: buildDashboardReleaseEvidence(flight.flightLeg),
    };
  }

  return {
    id: flight.id,
    legacyFlightId: flight.id,
    flightLegId: null,
    readSource: "LEG_MISSING_FALLBACK_FLIGHT",
    flightNumber: flight.flightNumber,
    scheduledDeparture: flight.scheduledDeparture,
    status: flight.status,
    departureCode: flight.departureStation.code,
    arrivalCode: flight.arrivalStation.code,
    tailNumber: flight.aircraft.tailNumber,
    releaseEvidence: null,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const { start, end } = getTodayRange(now);
  const [aircraftCount, crewCount, todayFlights, alerts, fleetStatusGroups] =
    await Promise.all([
      prisma.aircraft.count(),
      prisma.crewMember.count(),
      prisma.flight.findMany({
        where: {
          scheduledDeparture: {
            gte: start,
            lt: end,
          },
        },
        select: dashboardFlightSelect,
        orderBy: { scheduledDeparture: "asc" },
      }),
      prisma.alert.findMany({
        where: {
          status: AlertStatus.ACTIVE,
        },
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          message: true,
          flight: {
            select: {
              flightNumber: true,
            },
          },
          aircraft: {
            select: {
              tailNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.aircraft.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

  const flightsWithCoverage: DashboardFlight[] = await Promise.all(
    todayFlights.map(async (flight) => {
      const normalized = normalizeFlight(flight);

      return {
        ...normalized,
        coverage: await resolveFlightCoverage(normalized.legacyFlightId),
      };
    }),
  );
  const alertsWithContext: AlertRow[] = alerts.map((alert) => ({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    flightNumber: alert.flight?.flightNumber ?? null,
    aircraftTail: alert.aircraft?.tailNumber ?? null,
  }));
  const coverageGaps = flightsWithCoverage
    .map((flight) => {
      if (!flight.coverage || flight.coverage.isCovered) {
        return null;
      }

      return {
        ...flight,
        missingRoles: flight.coverage.missingRoles,
      };
    })
    .filter((item): item is DashboardFlight & { missingRoles: SeatRole[] } => Boolean(item));
  const fleetSnapshot = buildFleetSnapshot(
    fleetStatusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    })),
  );

  return {
    dateLabel: toDateLabel(now),
    statusSummary: {
      totalFlights: flightsWithCoverage.length,
      enroute: flightsWithCoverage.filter((flight) => flight.status === FlightStatus.ENROUTE)
        .length,
      delayed: flightsWithCoverage.filter((flight) => flight.status === FlightStatus.DELAYED)
        .length,
      activeAlerts: alerts.length,
      aircraftCount,
      crewCount,
      flightLegReads: flightsWithCoverage.filter((flight) => flight.readSource === "FLIGHT_LEG")
        .length,
      fallbackFlightReads: flightsWithCoverage.filter(
        (flight) => flight.readSource === "LEG_MISSING_FALLBACK_FLIGHT",
      ).length,
      releaseEvidenceComplete: flightsWithCoverage.filter(
        (flight) => flight.releaseEvidence?.complete,
      ).length,
      releaseEvidenceMissing: flightsWithCoverage.filter(
        (flight) => !flight.releaseEvidence?.complete,
      ).length,
    },
    flights: flightsWithCoverage,
    coverageGaps,
    alerts: alertsWithContext,
    fleetSnapshot,
  };
}
