import {
  AircraftConfigurationStatus,
  AlertSeverity,
  AlertStatus,
  AssignmentStatus,
  AircraftFuelEventType,
  AircraftStatus,
  DeferralStatus,
  DiscrepancyStatus,
  DispatchPackageStatus,
  FaaFlightPlanStatus,
  FlightLegStatus,
  FlightStatus,
  FlightPhaseStatus,
  ManifestStatus,
  OperatorManifestMode,
  Prisma,
  ReleaseStatus,
  SeatRole,
  WeightBalanceStatus,
} from "@prisma/client";

import { FlightCoverage, resolveFlightCoverage } from "@/lib/crew-resolution";
import { evaluateAircraftServiceability } from "@/lib/aircraft-serviceability";
import {
  isDispatchReady,
  isFlightPlanBasisReady,
  isLocatingReady,
  isLocatingRequired,
  isManifestReady,
  isPostflightComplete,
  isPreflightComplete,
  resolveOperatorReleaseSetting,
} from "@/lib/flight-workflow";
import { timeOperation } from "@/lib/performance-monitor";
import { prisma } from "@/lib/prisma";

const dashboardFlightLegSelect = {
  id: true,
  legacyFlightId: true,
  flightNumber: true,
  scheduledDeparture: true,
  status: true,
  faaFlightPlanStatus: true,
  operator: {
    select: {
      releaseSetting: {
        select: {
          dispatcherEnabled: true,
          manifestMode: true,
        },
      },
    },
  },
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
          configurations: {
            where: { status: AircraftConfigurationStatus.ACTIVE },
            select: { id: true },
            take: 1,
          },
          deferrals: {
            where: { status: DeferralStatus.ACTIVE },
            select: {
              dueAt: true,
              id: true,
              operatingLimitations: true,
              requiredProcedures: true,
              status: true,
            },
          },
          discrepancies: {
            where: {
              status: {
                in: [
                  DiscrepancyStatus.OPEN,
                  DiscrepancyStatus.DEFERRED,
                  DiscrepancyStatus.CORRECTED_PENDING_RTS,
                ],
              },
            },
            select: { id: true, status: true },
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
  fuelEvents: {
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    select: {
      eventType: true,
      fueledReady: true,
      fuelOnboardGallons: true,
      fuelOnboardLbs: true,
      recordedAt: true,
    },
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
          releaseAuditEvents: {
            orderBy: { createdAt: "desc" },
            select: {
              actorRole: true,
              createdAt: true,
              eventType: true,
              id: true,
              message: true,
            },
            take: 5,
          },
        },
      },
    },
  },
  dispatchPackage: {
    select: {
      id: true,
      status: true,
      weatherBriefingId: true,
      notamSnapshotId: true,
      flightPlanReferenceId: true,
    },
  },
  preflightRecord: {
    select: {
      status: true,
      manifestVerified: true,
    },
  },
  postflightRecord: {
    select: {
      status: true,
      outTime: true,
      offTime: true,
      onTime: true,
      inTime: true,
      delayNotes: true,
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
  faaFlightPlanStatus: FaaFlightPlanStatus;
  departureCode: string;
  arrivalCode: string;
  tailNumber: string;
  assignedAircraft: {
    configurations: Array<{ id: string }>;
    deferralCount: number;
    deferrals: Array<{
      dueAt: Date | null;
      id: string;
      operatingLimitations: string | null;
      requiredProcedures: string | null;
      status: DeferralStatus;
    }>;
    discrepancies: Array<{
      id: string;
      status: DiscrepancyStatus;
    }>;
    discrepancyCount: number;
    id: string;
    status: AircraftStatus;
    tailNumber: string;
  } | null;
  coverage: FlightCoverage | null;
  releaseEvidence: DashboardReleaseEvidence | null;
  releaseSetting: {
    dispatcherEnabled: boolean;
    manifestMode: OperatorManifestMode;
  };
  releaseSummary: DashboardReleaseSummary;
  releaseStatus: ReleaseStatus | null;
  releasedAt: Date | null;
  releaseAuditEvents: Array<{
    actorRole: string | null;
    createdAt: Date;
    eventType: string;
    id: string;
    message: string;
  }>;
};

export type DashboardReleaseEvidence = {
  manifestStatus: ManifestStatus | null;
  manifestItemCount: number;
  fuelOnboardGallons: Prisma.Decimal | null;
  fuelOnboardLbs: Prisma.Decimal | null;
  fueledReady: boolean | null;
  fuelRecordedAt: Date | null;
  weightBalanceStatus: WeightBalanceStatus | null;
  locatingStatus: string | null;
  dispatchPackageReady: boolean;
  dispatchStatus: DispatchPackageStatus | null;
  preflightComplete: boolean;
  postflightComplete: boolean;
  preflightStatus: FlightPhaseStatus | null;
  postflightStatus: FlightPhaseStatus | null;
  complete: boolean;
};

export type DashboardReleaseComponentKey =
  | "crew"
  | "dispatch"
  | "flight-following"
  | "fuel"
  | "manifest"
  | "mx"
  | "postflight"
  | "preflight"
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
    complete: number;
    cancelled: number;
    activeAlerts: number;
    activeAlertsInView: number;
    availableAircraft: number;
    flightLegReads: number;
    fallbackFlightReads: number;
    releaseEvidenceComplete: number;
    releaseEvidenceMissing: number;
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
  const releaseSetting = resolveOperatorReleaseSetting(flightLeg.operator.releaseSetting);
  const releaseFuel =
    flightLeg.fuelEvents.find((event) => event.eventType === AircraftFuelEventType.RELEASE_ONBOARD) ??
    null;
  const dispatchPackageReady = isDispatchReady(flightLeg.dispatchPackage);
  const preflightComplete = isPreflightComplete({
    fuelEvents: flightLeg.fuelEvents,
    manifestMode: releaseSetting.manifestMode,
    preflightRecord: flightLeg.preflightRecord,
    weightBalanceStatus,
  });
  const postflightComplete = isPostflightComplete({
    flightStatus: flightLeg.status,
    fuelEvents: flightLeg.fuelEvents,
    postflightRecord: flightLeg.postflightRecord,
  });

  return {
    manifestStatus: flightLeg.manifest?.status ?? null,
    manifestItemCount: flightLeg.manifest?.items.length ?? 0,
    fuelOnboardGallons: releaseFuel?.fuelOnboardGallons ?? null,
    fuelOnboardLbs: releaseFuel?.fuelOnboardLbs ?? null,
    fueledReady: releaseFuel?.fueledReady ?? null,
    fuelRecordedAt: releaseFuel?.recordedAt ?? null,
    weightBalanceStatus,
    locatingStatus: flightLeg.flightLocatingRecord?.status ?? null,
    dispatchPackageReady,
    dispatchStatus: flightLeg.dispatchPackage?.status ?? null,
    preflightComplete,
    postflightComplete,
    preflightStatus: flightLeg.preflightRecord?.status ?? null,
    postflightStatus: flightLeg.postflightRecord?.status ?? null,
    complete: preflightComplete && postflightComplete,
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
  const serviceability = evaluateAircraftServiceability(aircraft, now);
  const firstCrewWarning = coverage?.warnings[0]?.message;
  const releaseSetting = flight.releaseSetting;
  const manifestReady = isManifestReady(
    evidence?.manifestStatus,
    evidence?.manifestItemCount ?? 0,
  );
  const locatingReady = isLocatingReady(evidence?.locatingStatus);
  const locatingRequired = isLocatingRequired(flight.faaFlightPlanStatus);
  const mxReady = Boolean(aircraft && serviceability.ready);
  const crewStatus: DashboardReleaseComponentStatus = !coverage
    ? "missing"
    : coverage.isCovered && coverage.warnings.length === 0
      ? "ready"
      : coverage.isCovered
        ? "warning"
        : "missing";

  const components: DashboardReleaseComponent[] = [
    releaseComponent(
      "crew",
      "Crew",
      crewStatus,
      !coverage
        ? "Crew coverage has not been resolved."
        : coverage.isCovered && coverage.warnings.length === 0
          ? "Required crew roles are covered."
          : coverage.isCovered
            ? firstCrewWarning ??
              `${coverage.warnings.length} crew qualification warning${coverage.warnings.length === 1 ? "" : "s"}.`
            : coverage.pendingAssignments.length > 0
              ? `${coverage.pendingAssignments.length} planned crew assignment(s) are pending eligibility.`
              : `Missing ${coverage.missingRoles.join(", ")} crew coverage.`,
    ),
    releaseComponent(
      "mx",
      "MX",
      mxReady ? "ready" : !aircraft ? "missing" : serviceability.blocksRelease ? "missing" : "warning",
      !aircraft
        ? "No assigned aircraft for MX review."
        : `${aircraft.tailNumber}: ${serviceability.message}`,
    ),
  ];

  if (releaseSetting.manifestMode === OperatorManifestMode.OPS_REQUIRED) {
    components.push(
      releaseComponent(
        "manifest",
        "Manifest",
        manifestReady ? "ready" : evidence?.manifestStatus ? "review" : "missing",
        manifestReady
          ? `Manifest ready with ${evidence?.manifestItemCount ?? 0} item(s).`
          : "Ops Release requires a READY or LOCKED manifest.",
      ),
    );
  }

  if (!isFlightPlanBasisReady(flight.faaFlightPlanStatus)) {
    components.push(
      releaseComponent(
        "flight-following",
        "Flight plan",
        "missing",
        "FAA flight-plan status must be set before Ops Release.",
      ),
    );
  } else if (locatingRequired) {
    components.push(
      releaseComponent(
        "flight-following",
        "Locating",
        locatingReady ? "ready" : evidence?.locatingStatus ? "review" : "missing",
        locatingReady
          ? `No FAA flight plan filed; locating record is ${evidence?.locatingStatus}.`
          : "No FAA flight plan filed; locating record is required.",
      ),
    );
  }

  if (releaseSetting.dispatcherEnabled) {
    components.push(
      releaseComponent(
        "dispatch",
        "Dispatch",
        evidence?.dispatchPackageReady ? "ready" : "missing",
        evidence?.dispatchPackageReady
          ? "Dispatch package has weather, NOTAM, and flight-plan evidence."
          : "Dispatcher is enabled; dispatch package is required.",
      ),
    );
  }
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
    faaFlightPlanStatus: flightLeg.faaFlightPlanStatus,
    departureCode: flightLeg.departureStation.code,
    arrivalCode: flightLeg.arrivalStation.code,
    tailNumber:
      assignedAircraft?.tailNumber ?? flightLeg.legacyFlight?.aircraft.tailNumber ?? "Unassigned",
    assignedAircraft: assignedAircraft
      ? {
          configurations: assignedAircraft.configurations,
          deferralCount: assignedAircraft.deferrals.length,
          deferrals: assignedAircraft.deferrals,
          discrepancies: assignedAircraft.discrepancies,
          discrepancyCount: assignedAircraft.discrepancies.length,
          id: assignedAircraft.id,
          status: assignedAircraft.status,
          tailNumber: assignedAircraft.tailNumber,
        }
      : null,
    releaseEvidence: buildDashboardReleaseEvidence(flightLeg),
    releaseSetting: resolveOperatorReleaseSetting(flightLeg.operator.releaseSetting),
    releaseAuditEvents:
      flightLeg.operationalControlRecord?.release?.releaseAuditEvents.map((event) => ({
        actorRole: event.actorRole,
        createdAt: event.createdAt,
        eventType: event.eventType,
        id: event.id,
        message: event.message,
      })) ?? [],
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
    faaFlightPlanStatus: FaaFlightPlanStatus.NOT_APPLICABLE,
    departureCode: flight.departureStation.code,
    arrivalCode: flight.arrivalStation.code,
    tailNumber: flight.aircraft.tailNumber,
    assignedAircraft: null,
    releaseEvidence: null,
    releaseSetting: resolveOperatorReleaseSetting(null),
    releaseAuditEvents: [],
    releaseStatus: null,
    releasedAt: null,
  };
}

export async function getDashboardData(options: DashboardOptions = {}): Promise<DashboardData> {
  const now = new Date();
  const selectedWindow = normalizeWindow(options.window);
  const releaseWindow = getReleaseWindow(now, selectedWindow);
  const { start, end: todayEnd } = getTodayRange(now);
  const queryEnd =
    releaseWindow.end.getTime() > todayEnd.getTime() ? releaseWindow.end : todayEnd;
  const [todayFlights, alerts, fleetStatusGroups] =
    await timeOperation(
      "dashboard.database",
      () =>
        Promise.all([
          Promise.all([
            prisma.flightLeg.findMany({
              where: {
                scheduledDeparture: {
                  gte: start,
                  lt: queryEnd,
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
                  lt: queryEnd,
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
                  scheduledDeparture: true,
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
        ]),
      {
        metadata: {
          selectedWindow,
          queryEnd: queryEnd.toISOString(),
        },
      },
    );

  const flightsWithCoverage: DashboardFlight[] = await timeOperation(
    "dashboard.crewCoverage",
    () =>
      Promise.all(
        todayFlights.map(async (flight) => {
          const coverage = await resolveFlightCoverage(flight.flightLegId ?? flight.legacyFlightId);

          return {
            ...flight,
            coverage,
            releaseSummary: buildReleaseSummary(flight, coverage, now),
          };
        }),
      ),
    {
      metadata: {
        flightCount: todayFlights.length,
        selectedWindow,
      },
    },
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
  const availableAircraft =
    fleetSnapshot.find((bucket) => bucket.status === AircraftStatus.AVAILABLE)?.count ?? 0;
  const unreleasedFlightsInWindow = flightsInReleaseWindow.filter(
    (flight) => flight.releaseStatus !== ReleaseStatus.RELEASED,
  );
  const activeAlertsInView = alerts.filter((alert) => {
    const scheduledDeparture = alert.flight?.scheduledDeparture;

    return (
      scheduledDeparture &&
      scheduledDeparture.getTime() >= releaseWindow.start.getTime() &&
      scheduledDeparture.getTime() <= releaseWindow.end.getTime()
    );
  }).length;
  const statusCount = (status: string) =>
    flightsWithCoverage.filter((flight) => String(flight.status) === status).length;

  return {
    dateLabel: toDateLabel(now),
    releaseWindowLabel: releaseWindow.label,
    selectedWindow,
    statusSummary: {
      totalFlights: flightsWithCoverage.length,
      enroute: statusCount("ENROUTE"),
      delayed: statusCount("DELAYED"),
      complete: statusCount("COMPLETE"),
      cancelled: statusCount("CANCELLED"),
      activeAlerts: alerts.length,
      activeAlertsInView,
      availableAircraft,
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
      released: flightsInReleaseWindow.filter(
        (flight) => flight.releaseStatus === ReleaseStatus.RELEASED,
      ).length,
      releaseReady: unreleasedFlightsInWindow.filter((flight) => flight.releaseSummary.allReady)
        .length,
      releaseReviewNeeded: unreleasedFlightsInWindow.filter(
        (flight) => !flight.releaseSummary.allReady,
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
