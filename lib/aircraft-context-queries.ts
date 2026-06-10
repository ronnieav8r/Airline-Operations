import {
  AircraftCapabilityStatus,
  AircraftConfigurationStatus,
  AirworthinessReleaseStatus,
  AlertSeverity,
  AlertStatus,
  AlertType,
  AssignmentStatus,
  DeferralStatus,
  DiscrepancyStatus,
  FlightLocatingStatus,
  FlightLegStatus,
  MaintenanceEventStatus,
  ManifestStatus,
  OperatingPart,
  Prisma,
  ReleaseStatus,
  SeatRole,
  WeightBalanceStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const aircraftContextSelect = {
  id: true,
  tailNumber: true,
  name: true,
  type: true,
  status: true,
  seats: true,
  homeStation: {
    select: {
      code: true,
      city: true,
    },
  },
  crewAssignments: {
    select: {
      id: true,
      seatRole: true,
      startsAt: true,
      endsAt: true,
      notes: true,
      crewMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          dutyStatus: true,
          employmentStatus: true,
          qualifications: {
            select: {
              aircraftType: true,
              seatRole: true,
              expiresAt: true,
            },
          },
        },
      },
    },
    orderBy: [{ seatRole: "asc" }, { startsAt: "asc" }],
  },
  alerts: {
    where: {
      status: AlertStatus.ACTIVE,
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
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
    },
  },
  configurations: {
    where: {
      status: AircraftConfigurationStatus.ACTIVE,
    },
    orderBy: [{ effectiveStart: "desc" }],
    select: {
      id: true,
      configurationLabel: true,
      passengerSeatCount: true,
      emptyWeight: true,
      emptyWeightCg: true,
      effectiveStart: true,
      effectiveEnd: true,
      status: true,
    },
    take: 1,
  },
  capabilities: {
    where: {
      status: AircraftCapabilityStatus.ACTIVE,
    },
    orderBy: [{ capabilityCode: "asc" }],
    select: {
      id: true,
      capabilityCode: true,
      description: true,
      effectiveEnd: true,
      status: true,
    },
  },
  discrepancies: {
    where: {
      status: { in: [DiscrepancyStatus.OPEN, DiscrepancyStatus.DEFERRED] },
    },
    orderBy: [{ reportedAt: "desc" }],
    select: {
      id: true,
      discrepancyNumber: true,
      title: true,
      severity: true,
      status: true,
      reportedAt: true,
    },
  },
  deferrals: {
    where: {
      status: DeferralStatus.ACTIVE,
    },
    orderBy: [{ dueAt: "asc" }],
    select: {
      id: true,
      deferralNumber: true,
      category: true,
      dueAt: true,
      status: true,
      discrepancy: {
        select: {
          title: true,
        },
      },
    },
  },
  maintenanceEvents: {
    where: {
      status: MaintenanceEventStatus.COMPLETED,
    },
    orderBy: [{ completedAt: "desc" }],
    select: {
      id: true,
      maintenanceNumber: true,
      eventType: true,
      completedAt: true,
      providerName: true,
      returnToServiceAt: true,
      status: true,
    },
    take: 1,
  },
  airworthinessReleases: {
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      releaseNumber: true,
      releasedAt: true,
      expiresAt: true,
      status: true,
      flightLegId: true,
      updatedAt: true,
    },
    take: 5,
  },
} satisfies Prisma.AircraftSelect;

const aircraftLegAssignmentSelect = {
  id: true,
  status: true,
  assignedAt: true,
  releasedAt: true,
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
          city: true,
        },
      },
      arrivalStation: {
        select: {
          code: true,
          city: true,
        },
      },
      operationalControlRecord: {
        select: {
          controllingEntity: true,
          operatingAuthority: {
            select: {
              displayName: true,
              operatingPart: true,
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
          calculatedAt: true,
          approvedAt: true,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 1,
      },
      flightLocatingRecord: {
        select: {
          status: true,
          responsibleParty: true,
          lastKnownPosition: true,
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
      flightPlanReferences: {
        select: {
          status: true,
          filedAt: true,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 1,
      },
    },
  },
} satisfies Prisma.AircraftAssignmentSelect;

type AircraftContextPayload = Prisma.AircraftGetPayload<{
  select: typeof aircraftContextSelect;
}>;

type AircraftLegAssignmentPayload = Prisma.AircraftAssignmentGetPayload<{
  select: typeof aircraftLegAssignmentSelect;
}>;

export type AircraftContextCrewAssignment = AircraftContextPayload["crewAssignments"][number];

export type AircraftContextAlert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  flight: {
    flightNumber: string;
  } | null;
};

export type AircraftContextLeg = {
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  flightLegId: string;
  flightNumber: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  status: FlightLegStatus;
  departureStation: {
    code: string;
    city: string;
  };
  arrivalStation: {
    code: string;
    city: string;
  };
  controllingEntity: string | null;
  operatingAuthority: {
    displayName: string;
    operatingPart: OperatingPart;
  } | null;
  releaseStatus: ReleaseStatus | null;
  releasedAt: Date | null;
  evidence: {
    manifestStatus: ManifestStatus | null;
    manifestItemCount: number;
    weightBalanceStatus: WeightBalanceStatus | null;
    locatingStatus: FlightLocatingStatus | null;
    dispatchPackageReady: boolean;
    weatherSnapshotReady: boolean;
    notamSnapshotReady: boolean;
    flightPlanStatus: string | null;
  };
};

export type AircraftContextData = Omit<
  AircraftContextPayload,
  "crewAssignments" | "alerts"
> & {
  activeCrewAssignments: AircraftContextCrewAssignment[];
  alerts: AircraftContextAlert[];
  currentLeg: AircraftContextLeg | null;
  nextLeg: AircraftContextLeg | null;
  upcomingLegs: AircraftContextLeg[];
  summary: {
    activeCrewCount: number;
    activeAlertCount: number;
    activeDeferralCount: number;
    openDiscrepancyCount: number;
    hasCurrentAirworthinessRelease: boolean;
    missingCockpitRoles: SeatRole[];
  };
};

function missingCockpitRoles(assignments: Array<{ seatRole: SeatRole }>): SeatRole[] {
  const assignedRoles = new Set(assignments.map((assignment) => assignment.seatRole));

  return [SeatRole.CPT, SeatRole.FO].filter((role) => !assignedRoles.has(role));
}

function normalizeLegAssignment(assignment: AircraftLegAssignmentPayload): AircraftContextLeg {
  const latestWeightBalance = assignment.flightLeg.weightBalanceRuns[0] ?? null;
  const latestFlightPlan = assignment.flightLeg.flightPlanReferences[0] ?? null;

  return {
    assignmentId: assignment.id,
    assignmentStatus: assignment.status,
    flightLegId: assignment.flightLeg.id,
    flightNumber: assignment.flightLeg.flightNumber ?? "Unnumbered",
    scheduledDeparture: assignment.flightLeg.scheduledDeparture,
    scheduledArrival: assignment.flightLeg.scheduledArrival,
    status: assignment.flightLeg.status,
    departureStation: assignment.flightLeg.departureStation,
    arrivalStation: assignment.flightLeg.arrivalStation,
    controllingEntity: assignment.flightLeg.operationalControlRecord?.controllingEntity ?? null,
    operatingAuthority:
      assignment.flightLeg.operationalControlRecord?.operatingAuthority ?? null,
    releaseStatus: assignment.flightLeg.operationalControlRecord?.release?.status ?? null,
    releasedAt: assignment.flightLeg.operationalControlRecord?.release?.releasedAt ?? null,
    evidence: {
      manifestStatus: assignment.flightLeg.manifest?.status ?? null,
      manifestItemCount: assignment.flightLeg.manifest?.items.length ?? 0,
      weightBalanceStatus: latestWeightBalance?.status ?? null,
      locatingStatus: assignment.flightLeg.flightLocatingRecord?.status ?? null,
      dispatchPackageReady: Boolean(assignment.flightLeg.dispatchPackage),
      weatherSnapshotReady: Boolean(assignment.flightLeg.dispatchPackage?.weatherBriefingId),
      notamSnapshotReady: Boolean(assignment.flightLeg.dispatchPackage?.notamSnapshotId),
      flightPlanStatus: latestFlightPlan?.status ?? null,
    },
  };
}

function isCurrentAirworthinessRelease(
  release: {
    status: AirworthinessReleaseStatus;
    expiresAt: Date | null;
  },
  now: Date,
): boolean {
  return (
    release.status === AirworthinessReleaseStatus.RELEASED &&
    (!release.expiresAt || release.expiresAt > now)
  );
}

export async function getAircraftContextData(
  aircraftId: string,
): Promise<AircraftContextData | null> {
  const now = new Date();
  const [aircraft, legAssignments] = await Promise.all([
    prisma.aircraft.findUnique({
      where: { id: aircraftId },
      select: aircraftContextSelect,
    }),
    prisma.aircraftAssignment.findMany({
      where: {
        aircraftId,
        status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        flightLeg: {
          scheduledArrival: { gte: now },
          status: { not: FlightLegStatus.CANCELLED },
        },
      },
      select: aircraftLegAssignmentSelect,
    }),
  ]);

  if (!aircraft) {
    return null;
  }

  const activeCrewAssignments = aircraft.crewAssignments.filter(
    (assignment) =>
      assignment.startsAt <= now && (assignment.endsAt === null || assignment.endsAt > now),
  );
  const upcomingLegs = legAssignments
    .map(normalizeLegAssignment)
    .sort((first, second) => {
      const firstTime = first.scheduledDeparture.getTime();
      const secondTime = second.scheduledDeparture.getTime();

      if (firstTime !== secondTime) {
        return firstTime - secondTime;
      }

      return first.flightNumber.localeCompare(second.flightNumber);
    });
  const currentLeg =
    upcomingLegs.find(
      (leg) =>
        leg.status === FlightLegStatus.ENROUTE ||
        (leg.scheduledDeparture <= now && leg.scheduledArrival >= now),
    ) ?? null;
  const nextLeg = upcomingLegs.find((leg) => leg.scheduledDeparture > now) ?? null;

  return {
    ...aircraft,
    activeCrewAssignments,
    alerts: aircraft.alerts,
    currentLeg,
    nextLeg,
    upcomingLegs: upcomingLegs.slice(0, 8),
    summary: {
      activeCrewCount: activeCrewAssignments.length,
      activeAlertCount: aircraft.alerts.length,
      activeDeferralCount: aircraft.deferrals.length,
      openDiscrepancyCount: aircraft.discrepancies.length,
      hasCurrentAirworthinessRelease: aircraft.airworthinessReleases.some((release) =>
        isCurrentAirworthinessRelease(release, now),
      ),
      missingCockpitRoles: missingCockpitRoles(activeCrewAssignments),
    },
  };
}
