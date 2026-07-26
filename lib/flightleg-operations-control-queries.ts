import {
  AssignmentStatus,
  AircraftFuelEventType,
  DeferralStatus,
  FlightLocatingStatus,
  FlightPhaseStatus,
  ManifestStatus,
  OperatingPart,
  Prisma,
  ReleaseStatus,
  WeightBalanceStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const operationsControlSelect = {
  id: true,
  controllingEntity: true,
  controlNotes: true,
  createdAt: true,
  operator: {
    select: {
      name: true,
      code: true,
    },
  },
  operatingAuthority: {
    select: {
      displayName: true,
      operatingPart: true,
      status: true,
    },
  },
  authorityRevision: {
    select: {
      revisionLabel: true,
      effectiveStart: true,
      effectiveEnd: true,
      status: true,
    },
  },
  release: {
    select: {
      status: true,
      releasedAt: true,
    },
  },
  customer: {
    select: {
      name: true,
      customerCode: true,
    },
  },
  flightLeg: {
    select: {
      id: true,
      flightNumber: true,
      legNumber: true,
      scheduledDeparture: true,
      scheduledArrival: true,
      actualDeparture: true,
      actualArrival: true,
      status: true,
      tripOrMission: {
        select: {
          tripNumber: true,
          customerName: true,
          missionType: true,
        },
      },
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
              type: true,
              status: true,
              discrepancies: {
                where: {
                  status: { in: ["OPEN", "DEFERRED"] },
                },
                select: {
                  id: true,
                  status: true,
                },
              },
              deferrals: {
                where: {
                  status: DeferralStatus.ACTIVE,
                },
                select: {
                  id: true,
                },
              },
              maintenanceEvents: {
                where: {
                  status: { in: ["PLANNED", "IN_PROGRESS"] },
                },
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
        take: 1,
      },
      crewAssignments: {
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
        select: {
          id: true,
          seatRole: true,
          status: true,
          crewMember: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          seatRole: "asc",
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
        orderBy: { createdAt: "desc" },
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
          status: true,
          weatherBriefingId: true,
          notamSnapshotId: true,
          flightPlanReferenceId: true,
        },
      },
      fuelEvents: {
        where: {
          eventType: {
            in: [AircraftFuelEventType.RELEASE_ONBOARD, AircraftFuelEventType.POSTFLIGHT_ONBOARD],
          },
        },
        select: {
          eventType: true,
          fuelOnboardLbs: true,
          fuelOnboardGallons: true,
          fueledReady: true,
          recordedAt: true,
        },
        orderBy: {
          recordedAt: "desc",
        },
      },
      preflightRecord: {
        select: {
          status: true,
          completedAt: true,
        },
      },
      postflightRecord: {
        select: {
          status: true,
          outTime: true,
          offTime: true,
          onTime: true,
          inTime: true,
          completedAt: true,
        },
      },
      flightPlanReferences: {
        select: {
          status: true,
          filedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  },
  flight: {
    select: {
      id: true,
      flightNumber: true,
      scheduledDeparture: true,
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
          type: true,
          status: true,
          discrepancies: {
            where: {
              status: { in: ["OPEN", "DEFERRED"] },
            },
            select: {
              id: true,
              status: true,
            },
          },
          deferrals: {
            where: {
              status: DeferralStatus.ACTIVE,
            },
            select: {
              id: true,
            },
          },
          maintenanceEvents: {
            where: {
              status: { in: ["PLANNED", "IN_PROGRESS"] },
            },
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OperationalControlRecordSelect;

type OperationsControlRecordPayload = Prisma.OperationalControlRecordGetPayload<{
  select: typeof operationsControlSelect;
}>;

const OPERATING_PARTS = [
  OperatingPart.PART_91,
  OperatingPart.PART_91K,
  OperatingPart.PART_135,
];

export type OperationsControlReadSource =
  | "FLIGHT_LEG"
  | "LEG_MISSING_FALLBACK_FLIGHT"
  | "UNASSIGNED";

export type OperationsControlLegRead = {
  id: string | null;
  flightNumber: string;
  legNumber: number | null;
  scheduledDeparture: Date | null;
  scheduledArrival: Date | null;
  actualDeparture: Date | null;
  actualArrival: Date | null;
  status: string;
  trip: {
    tripNumber: string;
    customerName: string | null;
    missionType: string | null;
  } | null;
  departureStation: {
    code: string;
  } | null;
  arrivalStation: {
    code: string;
  } | null;
  aircraft: {
    id: string;
    tailNumber: string;
    type: string;
    status: string;
    openDiscrepancyCount: number;
    activeDeferralCount: number;
    openMaintenanceEventCount: number;
  } | null;
  crewAssignments: Array<{
    id: string;
    seatRole: string;
    status: AssignmentStatus;
    crewName: string;
  }>;
  releaseEvidence: ReleaseEvidenceRead | null;
  releaseFuel: FuelEventRead | null;
  postflightFuel: FuelEventRead | null;
  preflightStatus: FlightPhaseStatus | null;
  postflightStatus: FlightPhaseStatus | null;
};

export type ReleaseEvidenceRead = {
  manifestStatus: ManifestStatus | null;
  manifestItemCount: number;
  weightBalanceStatus: WeightBalanceStatus | null;
  locatingStatus: FlightLocatingStatus | null;
  dispatchStatus: string | null;
  dispatchPackageReady: boolean;
  weatherSnapshotReady: boolean;
  notamSnapshotReady: boolean;
  flightPlanStatus: string | null;
  flightPlanFiledAt: Date | null;
};

export type FuelEventRead = {
  eventType: AircraftFuelEventType;
  fuelOnboardLbs: Prisma.Decimal;
  fuelOnboardGallons: Prisma.Decimal;
  fueledReady: boolean | null;
  recordedAt: Date;
};

export type OperationsControlRecordRead = Omit<
  OperationsControlRecordPayload,
  "flight" | "flightLeg"
> & {
  leg: OperationsControlLegRead | null;
  readSource: OperationsControlReadSource;
};

export type OperationsControlData = {
  records: OperationsControlRecordRead[];
  summary: {
    totalControlRecords: number;
    released: number;
    planned: number;
    otherReleaseStates: number;
    flightLegReads: number;
    fallbackFlightReads: number;
    unassignedRecords: number;
    manifestReadyOrLocked: number;
    weightBalanceCalculatedOrApproved: number;
    locatingFiledOrActiveOrClosed: number;
    dispatchPackagesReady: number;
    authorityMix: Array<{
      part: OperatingPart;
      count: number;
    }>;
  };
};

function buildReleaseEvidenceRead(
  flightLeg: NonNullable<OperationsControlRecordPayload["flightLeg"]>,
): ReleaseEvidenceRead {
  const weightBalance = flightLeg.weightBalanceRuns[0] ?? null;
  const flightPlan = flightLeg.flightPlanReferences[0] ?? null;

  return {
    manifestStatus: flightLeg.manifest?.status ?? null,
    manifestItemCount: flightLeg.manifest?.items.length ?? 0,
    weightBalanceStatus: weightBalance?.status ?? null,
    locatingStatus: flightLeg.flightLocatingRecord?.status ?? null,
    dispatchPackageReady: Boolean(flightLeg.dispatchPackage),
    weatherSnapshotReady: Boolean(flightLeg.dispatchPackage?.weatherBriefingId),
    notamSnapshotReady: Boolean(flightLeg.dispatchPackage?.notamSnapshotId),
    flightPlanStatus: flightPlan?.status ?? null,
    flightPlanFiledAt: flightPlan?.filedAt ?? null,
    dispatchStatus: flightLeg.dispatchPackage?.status ?? null,
  };
}

function normalizeRecord(record: OperationsControlRecordPayload): OperationsControlRecordRead {
  const { flight, flightLeg, ...controlRecord } = record;

  if (flightLeg) {
    const aircraft = flightLeg.aircraftAssignments[0]?.aircraft ?? null;
    const releaseFuel =
      flightLeg.fuelEvents.find((event) => event.eventType === AircraftFuelEventType.RELEASE_ONBOARD) ??
      null;
    const postflightFuel =
      flightLeg.fuelEvents.find((event) => event.eventType === AircraftFuelEventType.POSTFLIGHT_ONBOARD) ??
      null;

    return {
      ...controlRecord,
      readSource: "FLIGHT_LEG",
      leg: {
        id: flightLeg.id,
        flightNumber: flightLeg.flightNumber ?? "Unnumbered",
        legNumber: flightLeg.legNumber,
        scheduledDeparture: flightLeg.scheduledDeparture,
        scheduledArrival: flightLeg.scheduledArrival,
        actualDeparture: flightLeg.actualDeparture,
        actualArrival: flightLeg.actualArrival,
        status: flightLeg.status,
        trip: flightLeg.tripOrMission,
        departureStation: flightLeg.departureStation,
        arrivalStation: flightLeg.arrivalStation,
        aircraft: aircraft
          ? {
              id: aircraft.id,
              tailNumber: aircraft.tailNumber,
              type: aircraft.type,
              status: aircraft.status,
              openDiscrepancyCount: aircraft.discrepancies.length,
              activeDeferralCount: aircraft.deferrals.length,
              openMaintenanceEventCount: aircraft.maintenanceEvents.length,
            }
          : null,
        crewAssignments: flightLeg.crewAssignments.map((assignment) => ({
          id: assignment.id,
          seatRole: assignment.seatRole,
          status: assignment.status,
          crewName: `${assignment.crewMember.firstName} ${assignment.crewMember.lastName}`,
        })),
        releaseEvidence: buildReleaseEvidenceRead(flightLeg),
        releaseFuel,
        postflightFuel,
        preflightStatus: flightLeg.preflightRecord?.status ?? null,
        postflightStatus: flightLeg.postflightRecord?.status ?? null,
      },
    };
  }

  if (flight) {
    return {
      ...controlRecord,
      readSource: "LEG_MISSING_FALLBACK_FLIGHT",
      leg: {
        id: flight.id,
        flightNumber: flight.flightNumber,
        legNumber: null,
        scheduledDeparture: flight.scheduledDeparture,
        scheduledArrival: null,
        actualDeparture: null,
        actualArrival: null,
        status: flight.status,
        trip: null,
        departureStation: flight.departureStation,
        arrivalStation: flight.arrivalStation,
        aircraft: flight.aircraft
          ? {
              id: flight.aircraft.id,
              tailNumber: flight.aircraft.tailNumber,
              type: flight.aircraft.type,
              status: flight.aircraft.status,
              openDiscrepancyCount: flight.aircraft.discrepancies.length,
              activeDeferralCount: flight.aircraft.deferrals.length,
              openMaintenanceEventCount: flight.aircraft.maintenanceEvents.length,
            }
          : null,
        crewAssignments: [],
        releaseEvidence: null,
        releaseFuel: null,
        postflightFuel: null,
        preflightStatus: null,
        postflightStatus: null,
      },
    };
  }

  return {
    ...controlRecord,
    readSource: "UNASSIGNED",
    leg: null,
  };
}

function buildAuthorityMix(records: Array<{ operatingAuthority: { operatingPart: OperatingPart } }>) {
  return OPERATING_PARTS.map((part) => ({
    part,
    count: records.filter((record) => record.operatingAuthority.operatingPart === part).length,
  }));
}

function sortRecords(first: OperationsControlRecordRead, second: OperationsControlRecordRead) {
  const firstTime = first.leg?.scheduledDeparture?.getTime() ?? first.createdAt.getTime();
  const secondTime = second.leg?.scheduledDeparture?.getTime() ?? second.createdAt.getTime();

  if (firstTime !== secondTime) {
    return firstTime - secondTime;
  }

  return first.createdAt.getTime() - second.createdAt.getTime();
}

function hasReadyManifest(record: OperationsControlRecordRead) {
  return (
    record.leg?.releaseEvidence?.manifestStatus === ManifestStatus.READY ||
    record.leg?.releaseEvidence?.manifestStatus === ManifestStatus.LOCKED
  );
}

function hasCalculatedWeightBalance(record: OperationsControlRecordRead) {
  return (
    record.leg?.releaseEvidence?.weightBalanceStatus === WeightBalanceStatus.CALCULATED ||
    record.leg?.releaseEvidence?.weightBalanceStatus === WeightBalanceStatus.APPROVED
  );
}

function hasFiledLocating(record: OperationsControlRecordRead) {
  return (
    record.leg?.releaseEvidence?.locatingStatus === FlightLocatingStatus.FILED ||
    record.leg?.releaseEvidence?.locatingStatus === FlightLocatingStatus.ACTIVE ||
    record.leg?.releaseEvidence?.locatingStatus === FlightLocatingStatus.CLOSED
  );
}

export async function getFlightLegOperationsControlData(): Promise<OperationsControlData> {
  const rawRecords = await prisma.operationalControlRecord.findMany({
    select: operationsControlSelect,
  });
  const records = rawRecords.map(normalizeRecord).sort(sortRecords);
  const released = records.filter((record) => record.release?.status === ReleaseStatus.RELEASED).length;
  const planned = records.filter((record) => record.release?.status === ReleaseStatus.PLANNED).length;

  return {
    records,
    summary: {
      totalControlRecords: records.length,
      released,
      planned,
      otherReleaseStates: records.length - released - planned,
      flightLegReads: records.filter((record) => record.readSource === "FLIGHT_LEG").length,
      fallbackFlightReads: records.filter(
        (record) => record.readSource === "LEG_MISSING_FALLBACK_FLIGHT",
      ).length,
      unassignedRecords: records.filter((record) => record.readSource === "UNASSIGNED").length,
      manifestReadyOrLocked: records.filter(hasReadyManifest).length,
      weightBalanceCalculatedOrApproved: records.filter(hasCalculatedWeightBalance).length,
      locatingFiledOrActiveOrClosed: records.filter(hasFiledLocating).length,
      dispatchPackagesReady: records.filter(
        (record) => record.leg?.releaseEvidence?.dispatchPackageReady,
      ).length,
      authorityMix: buildAuthorityMix(records),
    },
  };
}
