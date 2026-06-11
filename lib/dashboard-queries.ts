import {
  AirworthinessReleaseStatus,
  AlertSeverity,
  AlertStatus,
  AssignmentStatus,
  AircraftStatus,
  FlightLocatingStatus,
  FlightLegStatus,
  FlightStatus,
  ManifestStatus,
  Prisma,
  ReleaseStatus,
  SeatRole,
  WeightBalanceStatus,
} from "@prisma/client";

import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";
import { prisma } from "@/lib/prisma";

const dashboardFlightLegSelect = {
  id: true,
  legacyFlightId: true,
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
    where: {
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    select: {
      aircraft: {
        select: {
          id: true,
          status: true,
          tailNumber: true,
          airworthinessReleases: {
            select: {
              expiresAt: true,
              releaseNumber: true,
              status: true,
            },
            orderBy: { releasedAt: "desc" },
            take: 3,
          },
          deferrals: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
          discrepancies: {
            where: { status: "OPEN" },
            select: { id: true },
          },
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
    take: 1,
  },
  legacyFlight: {
    select: {
      id: true,
      flightNumber: true,
      aircraft: {
        select: { tailNumber: true },
      },
    },
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
  operationalControlRecord: {
    select: {
      release: {
        select: {
          status: true,
          releasedAt: true,
        },
      },
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
} satisfies Prisma.FlightLegSelect;

const fallbackDashboardFlightSelect = {
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
} satisfies Prisma.FlightSelect;

type DashboardFlightLegPayload = Prisma.FlightLegGetPayload<{
  select: typeof dashboardFlightLegSelect;
}>;

type FallbackDashboardFlightPayload = Prisma.FlightGetPayload<{
  select: typeof fallbackDashboardFlightSelect;
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
  assignedAircraft: {
    airworthinessReleases: Array<{
      expiresAt: Date | null;
      releaseNumber: string;
      status: AirworthinessReleaseStatus;
    }>;
    deferralCount: number;
    discrepancyCount: number;
    id: string;
    status: AircraftStatus;
    tailNumber: string;
  } | null;
  coverage: FlightCoverage | null;
  releaseEvidence: DashboardReleaseEvidence | null;
  releaseSummary: DashboardReleaseSummary;
  releaseStatus: ReleaseStatus | null;
  releasedAt: Date | null;
};

export type DashboardReleaseEvidence = {
  manifestStatus: ManifestStatus | null;
  manifestItemCount: number;
  weightBalanceStatus: WeightBalanceStatus | null;
  locatingStatus: string | null;
  dispatchPackageReady: boolean;
  complete: boolean;
};

export type DashboardReleaseComponentKey =
  | "crew"
  | "dispatch"
  | "flight-following"
  | "manifest"
  | "mx"
  | "weight-balance";

export type DashboardReleaseComponentStatus = "missing" | "ready" | "review" | "warning";

export type DashboardReleaseComponent = {
  key: DashboardReleaseComponentKey;
  label: string;
  message: string;
  status: DashboardReleaseComponentStatus;
};

export type DashboardReleaseSummary = {
  allReady: boolean;
  components: DashboardReleaseComponent[];
  needsReview: boolean;
  reviewReasons: string[];
};

export type DashboardPriorityFlightLeg = {
  id: string;
  flightNumber: string;
  scheduledDeparture: Date | null;
  route: string;
  tailNumber: string;
  releaseStatus: ReleaseStatus | null;
  releaseSummary: DashboardReleaseSummary;
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
  releaseWindowLabel: string;
  selectedWindow: DashboardWindowValue;
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
    plannedOrUnreleased: number;
    released: number;
    releaseReady: number;
    releaseReviewNeeded: number;
  };
  operationsAttention: {
    priorityFlightLegs: DashboardPriorityFlightLeg[];
  };
  flights: DashboardFlight[];
  coverageGaps: Array<DashboardFlight & { missingRoles: SeatRole[] }>;
  alerts: AlertRow[];
  fleetSnapshot: Array<{
    status: AircraftStatus;
    count: number;
  }>;
};

export type DashboardWindowValue = "1" | "2" | "6" | "12" | "24" | "today";

export type DashboardOptions = {
  window?: DashboardWindowValue;
};

const DEFAULT_DASHBOARD_WINDOW: DashboardWindowValue = "6";

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

function normalizeWindow(value: DashboardOptions["window"]): DashboardWindowValue {
  if (
    value === "1" ||
    value === "2" ||
    value === "6" ||
    value === "12" ||
    value === "24" ||
    value === "today"
  ) {
    return value;
  }

  return DEFAULT_DASHBOARD_WINDOW;
}

function getReleaseWindow(now: Date, value: DashboardWindowValue) {
  const todayRange = getTodayRange(now);

  if (value === "today") {
    return {
      end: todayRange.end,
      label: "Through today",
      start: todayRange.start,
    };
  }

  const hours = Number(value);
  const end = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return {
    end,
    label: `Today + next ${hours} hr`,
    start: todayRange.start,
  };
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
  flightLeg: DashboardFlightLegPayload,
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

function releaseComponent(
  key: DashboardReleaseComponentKey,
  label: string,
  status: DashboardReleaseComponentStatus,
  message: string,
): DashboardReleaseComponent {
  return { key, label, message, status };
}

function buildReleaseSummary(
  flight: Omit<DashboardFlight, "coverage" | "releaseSummary">,
  coverage: FlightCoverage | null,
  now: Date,
): DashboardReleaseSummary {
  const evidence = flight.releaseEvidence;
  const aircraft = flight.assignedAircraft;
  const currentAirworthinessRelease = aircraft?.airworthinessReleases.find(
    (release) => release.status === AirworthinessReleaseStatus.RELEASED,
  );
  const airworthinessExpired =
    !!currentAirworthinessRelease?.expiresAt &&
    currentAirworthinessRelease.expiresAt.getTime() <= now.getTime();
  const mxBlockingStatus =
    aircraft?.status === AircraftStatus.IN_MAINTENANCE ||
    aircraft?.status === AircraftStatus.OUT_OF_SERVICE;

  const components: DashboardReleaseComponent[] = [
    releaseComponent(
      "manifest",
      "Manifest",
      evidence?.manifestStatus === ManifestStatus.READY ||
        evidence?.manifestStatus === ManifestStatus.LOCKED
        ? "ready"
        : evidence?.manifestStatus
          ? "review"
          : "missing",
      evidence?.manifestStatus
        ? `Manifest is ${evidence.manifestStatus}.`
        : "Manifest is missing.",
    ),
    releaseComponent(
      "weight-balance",
      "W&B",
      evidence?.weightBalanceStatus === WeightBalanceStatus.CALCULATED ||
        evidence?.weightBalanceStatus === WeightBalanceStatus.APPROVED
        ? "ready"
        : evidence?.weightBalanceStatus
          ? "review"
          : "missing",
      evidence?.weightBalanceStatus
        ? `Weight and balance is ${evidence.weightBalanceStatus}.`
        : "Weight and balance is missing.",
    ),
    releaseComponent(
      "flight-following",
      "Flt Follow",
      evidence?.locatingStatus === FlightLocatingStatus.FILED ||
        evidence?.locatingStatus === FlightLocatingStatus.ACTIVE ||
        evidence?.locatingStatus === FlightLocatingStatus.CLOSED
        ? "ready"
        : evidence?.locatingStatus
          ? "review"
          : "missing",
      evidence?.locatingStatus
        ? `Flight following record is ${evidence.locatingStatus}.`
        : "Flight following record is missing.",
    ),
    releaseComponent(
      "dispatch",
      "Dispatch",
      evidence?.dispatchPackageReady ? "ready" : "missing",
      evidence?.dispatchPackageReady
        ? "Dispatch package has core current-information records."
        : "Dispatch package is incomplete.",
    ),
    releaseComponent(
      "mx",
      "MX",
      !aircraft || !currentAirworthinessRelease || airworthinessExpired
        ? "missing"
        : mxBlockingStatus || aircraft.discrepancyCount > 0 || aircraft.deferralCount > 0
          ? "warning"
          : "ready",
      !aircraft
        ? "No assigned aircraft for MX review."
        : !currentAirworthinessRelease
          ? "No current aircraft maintenance release."
          : airworthinessExpired
            ? `MX release ${currentAirworthinessRelease.releaseNumber} is expired.`
            : mxBlockingStatus
              ? `${aircraft.tailNumber} status is ${aircraft.status}.`
              : aircraft.discrepancyCount > 0 || aircraft.deferralCount > 0
                ? `${aircraft.tailNumber} has ${aircraft.discrepancyCount} open discrepancy and ${aircraft.deferralCount} active deferral record(s).`
                : `${aircraft.tailNumber} has current MX release ${currentAirworthinessRelease.releaseNumber}.`,
    ),
    releaseComponent(
      "crew",
      "Crew",
      !coverage ? "missing" : coverage.isCovered ? "ready" : "missing",
      !coverage
        ? "Crew coverage has not been resolved."
        : coverage.isCovered
          ? "Required crew roles are covered."
          : `Missing ${coverage.missingRoles.join(", ")} crew coverage.`,
    ),
  ];
  const reviewReasons = components
    .filter((component) => component.status !== "ready")
    .map((component) => `${component.label}: ${component.message}`);

  return {
    allReady: reviewReasons.length === 0,
    components,
    needsReview: reviewReasons.length > 0 || flight.releaseStatus !== ReleaseStatus.RELEASED,
    reviewReasons:
      flight.releaseStatus === ReleaseStatus.RELEASED
        ? reviewReasons
        : [`Release ${flight.releaseStatus ?? "missing"}`, ...reviewReasons],
  };
}

function buildPriorityFlightLegs(
  flights: DashboardFlight[],
): DashboardPriorityFlightLeg[] {
  return flights
    .filter((flight) => flight.flightLegId)
    .map((flight) => ({
      id: flight.flightLegId ?? "",
      flightNumber: flight.flightNumber,
      scheduledDeparture: flight.scheduledDeparture,
      route: `${flight.departureCode} -> ${flight.arrivalCode}`,
      tailNumber: flight.tailNumber,
      releaseStatus: flight.releaseStatus,
      releaseSummary: flight.releaseSummary,
    }))
    .filter(
      (record) => record.releaseSummary.needsReview || record.releaseStatus !== ReleaseStatus.RELEASED,
    )
    .sort((first, second) => {
      const firstTime = first.scheduledDeparture?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const secondTime = second.scheduledDeparture?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (firstTime !== secondTime) {
        return firstTime - secondTime;
      }

      return first.flightNumber.localeCompare(second.flightNumber);
    })
    .slice(0, 6);
}

function normalizeFlightLeg(
  flightLeg: DashboardFlightLegPayload,
): Omit<DashboardFlight, "coverage" | "releaseSummary"> {
  const assignedAircraft = flightLeg.aircraftAssignments[0]?.aircraft;

  return {
    id: flightLeg.legacyFlightId ?? flightLeg.legacyFlight?.id ?? flightLeg.id,
    legacyFlightId: flightLeg.legacyFlightId ?? flightLeg.legacyFlight?.id ?? flightLeg.id,
    flightLegId: flightLeg.id,
    readSource: "FLIGHT_LEG",
    flightNumber: flightLeg.flightNumber ?? flightLeg.legacyFlight?.flightNumber ?? "UNNUMBERED",
    scheduledDeparture: flightLeg.scheduledDeparture,
    status: flightLeg.status,
    departureCode: flightLeg.departureStation.code,
    arrivalCode: flightLeg.arrivalStation.code,
    tailNumber:
      assignedAircraft?.tailNumber ?? flightLeg.legacyFlight?.aircraft.tailNumber ?? "Unassigned",
    assignedAircraft: assignedAircraft
      ? {
          airworthinessReleases: assignedAircraft.airworthinessReleases,
          deferralCount: assignedAircraft.deferrals.length,
          discrepancyCount: assignedAircraft.discrepancies.length,
          id: assignedAircraft.id,
          status: assignedAircraft.status,
          tailNumber: assignedAircraft.tailNumber,
        }
      : null,
    releaseEvidence: buildDashboardReleaseEvidence(flightLeg),
    releaseStatus: flightLeg.operationalControlRecord?.release?.status ?? null,
    releasedAt: flightLeg.operationalControlRecord?.release?.releasedAt ?? null,
  };
}

function normalizeFallbackFlight(
  flight: FallbackDashboardFlightPayload,
): Omit<DashboardFlight, "coverage" | "releaseSummary"> {
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
    assignedAircraft: null,
    releaseEvidence: null,
    releaseStatus: null,
    releasedAt: null,
  };
}

export async function getDashboardData(options: DashboardOptions = {}): Promise<DashboardData> {
  const now = new Date();
  const selectedWindow = normalizeWindow(options.window);
  const releaseWindow = getReleaseWindow(now, selectedWindow);
  const { start, end } = getTodayRange(now);
  const [aircraftCount, crewCount, todayFlights, alerts, fleetStatusGroups] =
    await Promise.all([
      prisma.aircraft.count(),
      prisma.crewMember.count(),
      Promise.all([
        prisma.flightLeg.findMany({
          where: {
            scheduledDeparture: {
              gte: start,
              lt: end,
            },
          },
          select: dashboardFlightLegSelect,
          orderBy: { scheduledDeparture: "asc" },
        }),
        prisma.flight.findMany({
          where: {
            flightLeg: null,
            scheduledDeparture: {
              gte: start,
              lt: end,
            },
          },
          select: fallbackDashboardFlightSelect,
          orderBy: { scheduledDeparture: "asc" },
        }),
      ]).then(([flightLegs, fallbackFlights]) =>
        [...flightLegs.map(normalizeFlightLeg), ...fallbackFlights.map(normalizeFallbackFlight)].sort(
          (first, second) => {
            const departureDelta =
              first.scheduledDeparture.getTime() - second.scheduledDeparture.getTime();

            if (departureDelta !== 0) {
              return departureDelta;
            }

            return first.flightNumber.localeCompare(second.flightNumber);
          },
        ),
      ),
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
      const coverage = await resolveFlightCoverage(flight.flightLegId ?? flight.legacyFlightId);

      return {
        ...flight,
        coverage,
        releaseSummary: buildReleaseSummary(flight, coverage, now),
      };
    }),
  );
  const flightsInReleaseWindow = flightsWithCoverage.filter(
    (flight) =>
      flight.scheduledDeparture.getTime() >= releaseWindow.start.getTime() &&
      flight.scheduledDeparture.getTime() <= releaseWindow.end.getTime(),
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
  const plannedOrUnreleased = flightsInReleaseWindow.filter(
    (flight) => flight.releaseStatus !== ReleaseStatus.RELEASED,
  ).length;

  return {
    dateLabel: toDateLabel(now),
    releaseWindowLabel: releaseWindow.label,
    selectedWindow,
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
      plannedOrUnreleased,
      released: flightsInReleaseWindow.filter(
        (flight) => flight.releaseStatus === ReleaseStatus.RELEASED,
      ).length,
      releaseReady: flightsInReleaseWindow.filter((flight) => flight.releaseSummary.allReady)
        .length,
      releaseReviewNeeded: flightsInReleaseWindow.filter(
        (flight) => flight.releaseSummary.needsReview,
      ).length,
    },
    operationsAttention: {
      priorityFlightLegs: buildPriorityFlightLegs(flightsInReleaseWindow),
    },
    flights: flightsWithCoverage,
    coverageGaps,
    alerts: alertsWithContext,
    fleetSnapshot,
  };
}
