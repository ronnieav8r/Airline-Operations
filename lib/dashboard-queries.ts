import {
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
import {
  getFlightLegOperationsControlData,
  OperationsControlRecordRead,
} from "@/lib/flightleg-operations-control-queries";
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
        select: { tailNumber: true },
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
  coverage: FlightCoverage | null;
  releaseEvidence: DashboardReleaseEvidence | null;
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

export type DashboardPriorityFlightLeg = {
  id: string;
  flightNumber: string;
  scheduledDeparture: Date | null;
  route: string;
  tailNumber: string;
  releaseStatus: ReleaseStatus | null;
  evidenceState: "Ready" | "Needs attention" | "Missing";
  attentionReasons: string[];
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
    plannedOrUnreleased: number;
    released: number;
    operationsEvidenceReady: number;
    operationsEvidencePartialMissing: number;
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

function dashboardEvidenceReady(record: OperationsControlRecordRead): boolean {
  const evidence = record.leg?.releaseEvidence;

  return Boolean(
    evidence &&
      (evidence.manifestStatus === ManifestStatus.READY ||
        evidence.manifestStatus === ManifestStatus.LOCKED) &&
      (evidence.weightBalanceStatus === WeightBalanceStatus.CALCULATED ||
        evidence.weightBalanceStatus === WeightBalanceStatus.APPROVED) &&
      (evidence.locatingStatus === FlightLocatingStatus.FILED ||
        evidence.locatingStatus === FlightLocatingStatus.ACTIVE ||
        evidence.locatingStatus === FlightLocatingStatus.CLOSED) &&
      evidence.dispatchPackageReady &&
      evidence.weatherSnapshotReady &&
      evidence.notamSnapshotReady &&
      Boolean(evidence.flightPlanStatus),
  );
}

function dashboardEvidenceMissing(record: OperationsControlRecordRead): boolean {
  const evidence = record.leg?.releaseEvidence;

  return (
    !evidence ||
    !evidence.manifestStatus ||
    !evidence.weightBalanceStatus ||
    !evidence.locatingStatus ||
    !evidence.dispatchPackageReady
  );
}

function dashboardEvidenceState(
  record: OperationsControlRecordRead,
): DashboardPriorityFlightLeg["evidenceState"] {
  if (dashboardEvidenceReady(record)) {
    return "Ready";
  }

  if (dashboardEvidenceMissing(record)) {
    return "Missing";
  }

  return "Needs attention";
}

function buildAttentionReasons(record: OperationsControlRecordRead): string[] {
  const reasons: string[] = [];
  const evidence = record.leg?.releaseEvidence;

  if (record.release?.status !== ReleaseStatus.RELEASED) {
    reasons.push(record.release?.status ? `Release ${record.release.status}` : "No release record");
  }

  if (!evidence) {
    reasons.push("No FlightLeg evidence");
    return reasons;
  }

  if (
    evidence.manifestStatus !== ManifestStatus.READY &&
    evidence.manifestStatus !== ManifestStatus.LOCKED
  ) {
    reasons.push(`Manifest ${evidence.manifestStatus ?? "missing"}`);
  }

  if (
    evidence.weightBalanceStatus !== WeightBalanceStatus.CALCULATED &&
    evidence.weightBalanceStatus !== WeightBalanceStatus.APPROVED
  ) {
    reasons.push(`W&B ${evidence.weightBalanceStatus ?? "missing"}`);
  }

  if (
    evidence.locatingStatus !== FlightLocatingStatus.FILED &&
    evidence.locatingStatus !== FlightLocatingStatus.ACTIVE &&
    evidence.locatingStatus !== FlightLocatingStatus.CLOSED
  ) {
    reasons.push(`Locating ${evidence.locatingStatus ?? "missing"}`);
  }

  if (
    !evidence.dispatchPackageReady ||
    !evidence.weatherSnapshotReady ||
    !evidence.notamSnapshotReady ||
    !evidence.flightPlanStatus
  ) {
    reasons.push("Dispatch incomplete");
  }

  return reasons;
}

function routeLabel(record: OperationsControlRecordRead): string {
  if (record.leg?.departureStation && record.leg.arrivalStation) {
    return `${record.leg.departureStation.code} -> ${record.leg.arrivalStation.code}`;
  }

  return "Route not assigned";
}

function buildPriorityFlightLegs(
  records: OperationsControlRecordRead[],
): DashboardPriorityFlightLeg[] {
  return records
    .filter((record) => record.readSource === "FLIGHT_LEG" && record.leg?.id)
    .map((record) => ({
      id: record.leg?.id ?? "",
      flightNumber: record.leg?.flightNumber ?? "Unnumbered",
      scheduledDeparture: record.leg?.scheduledDeparture ?? null,
      route: routeLabel(record),
      tailNumber: record.leg?.aircraft?.tailNumber ?? "Unassigned",
      releaseStatus: record.release?.status ?? null,
      evidenceState: dashboardEvidenceState(record),
      attentionReasons: buildAttentionReasons(record),
    }))
    .filter(
      (record) =>
        record.attentionReasons.length > 0 ||
        record.releaseStatus !== ReleaseStatus.RELEASED ||
        record.evidenceState !== "Ready",
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

function normalizeFlightLeg(flightLeg: DashboardFlightLegPayload): Omit<DashboardFlight, "coverage"> {
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
      flightLeg.aircraftAssignments[0]?.aircraft.tailNumber ??
      flightLeg.legacyFlight?.aircraft.tailNumber ??
      "Unassigned",
    releaseEvidence: buildDashboardReleaseEvidence(flightLeg),
    releaseStatus: flightLeg.operationalControlRecord?.release?.status ?? null,
    releasedAt: flightLeg.operationalControlRecord?.release?.releasedAt ?? null,
  };
}

function normalizeFallbackFlight(
  flight: FallbackDashboardFlightPayload,
): Omit<DashboardFlight, "coverage"> {
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
    releaseStatus: null,
    releasedAt: null,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const { start, end } = getTodayRange(now);
  const [aircraftCount, crewCount, todayFlights, alerts, fleetStatusGroups, operationsControl] =
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
      getFlightLegOperationsControlData(),
    ]);

  const flightsWithCoverage: DashboardFlight[] = await Promise.all(
    todayFlights.map(async (flight) => {
      return {
        ...flight,
        coverage: await resolveFlightCoverage(flight.flightLegId ?? flight.legacyFlightId),
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
  const operationsEvidenceReady = operationsControl.records.filter(dashboardEvidenceReady).length;
  const plannedOrUnreleased = operationsControl.records.filter(
    (record) => record.release?.status !== ReleaseStatus.RELEASED,
  ).length;

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
      plannedOrUnreleased,
      released: operationsControl.records.filter(
        (record) => record.release?.status === ReleaseStatus.RELEASED,
      ).length,
      operationsEvidenceReady,
      operationsEvidencePartialMissing: operationsControl.records.length - operationsEvidenceReady,
    },
    operationsAttention: {
      priorityFlightLegs: buildPriorityFlightLegs(operationsControl.records),
    },
    flights: flightsWithCoverage,
    coverageGaps,
    alerts: alertsWithContext,
    fleetSnapshot,
  };
}
