import {
  AssignmentStatus,
  FlightLocatingStatus,
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
  flightLeg: {
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
      aircraftAssignments: {
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
        select: {
          aircraft: {
            select: {
              tailNumber: true,
              type: true,
            },
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
          tailNumber: true,
          type: true,
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
  scheduledDeparture: Date | null;
  status: string;
  departureStation: {
    code: string;
  } | null;
  arrivalStation: {
    code: string;
  } | null;
  aircraft: {
    tailNumber: string;
    type: string;
  } | null;
  releaseEvidence: ReleaseEvidenceRead | null;
};

export type ReleaseEvidenceRead = {
  manifestStatus: ManifestStatus | null;
  manifestItemCount: number;
  weightBalanceStatus: WeightBalanceStatus | null;
  locatingStatus: FlightLocatingStatus | null;
  dispatchPackageReady: boolean;
  weatherSnapshotReady: boolean;
  notamSnapshotReady: boolean;
  flightPlanStatus: string | null;
  flightPlanFiledAt: Date | null;
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
  };
}

function normalizeRecord(record: OperationsControlRecordPayload): OperationsControlRecordRead {
  const { flight, flightLeg, ...controlRecord } = record;

  if (flightLeg) {
    const aircraft = flightLeg.aircraftAssignments[0]?.aircraft ?? null;

    return {
      ...controlRecord,
      readSource: "FLIGHT_LEG",
      leg: {
        id: flightLeg.id,
        flightNumber: flightLeg.flightNumber ?? "Unnumbered",
        scheduledDeparture: flightLeg.scheduledDeparture,
        status: flightLeg.status,
        departureStation: flightLeg.departureStation,
        arrivalStation: flightLeg.arrivalStation,
        aircraft,
        releaseEvidence: buildReleaseEvidenceRead(flightLeg),
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
        scheduledDeparture: flight.scheduledDeparture,
        status: flight.status,
        departureStation: flight.departureStation,
        arrivalStation: flight.arrivalStation,
        aircraft: flight.aircraft,
        releaseEvidence: null,
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
