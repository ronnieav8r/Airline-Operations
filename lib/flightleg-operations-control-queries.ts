import { OperatingPart, Prisma, ReleaseStatus } from "@prisma/client";

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
    authorityMix: Array<{
      part: OperatingPart;
      count: number;
    }>;
  };
};

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
      authorityMix: buildAuthorityMix(records),
    },
  };
}
