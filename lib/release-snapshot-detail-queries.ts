import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const releaseSnapshotDetailSelect = {
  id: true,
  snapshotStatus: true,
  evaluatedAt: true,
  authorityClass: true,
  summary: true,
  flightLeg: {
    select: {
      id: true,
      flightNumber: true,
      scheduledDeparture: true,
      departureStation: {
        select: {
          code: true,
          name: true,
        },
      },
      arrivalStation: {
        select: {
          code: true,
          name: true,
        },
      },
      operatingAuthority: {
        select: {
          displayName: true,
          operatingPart: true,
        },
      },
    },
  },
  flightRelease: {
    select: {
      id: true,
      status: true,
      releasedAt: true,
    },
  },
  policyProfile: {
    select: {
      id: true,
      profileKey: true,
      name: true,
      authorityClass: true,
      isDefault: true,
    },
  },
  findings: {
    orderBy: [{ readinessCategory: "asc" }, { ruleKey: "asc" }],
    select: {
      id: true,
      ruleKey: true,
      readinessCategory: true,
      severity: true,
      status: true,
      isOverridable: true,
      summary: true,
      evidenceRefType: true,
      evidenceRefId: true,
      details: true,
      rule: {
        select: {
          readinessCategory: true,
          severity: true,
          isOverridable: true,
          requiresSecondApproval: true,
          manualEvidenceAllowed: true,
          providerEvidenceRequired: true,
        },
      },
    },
  },
} satisfies Prisma.ReleaseReadinessSnapshotSelect;

export type ReleaseSnapshotDetail = Prisma.ReleaseReadinessSnapshotGetPayload<{
  select: typeof releaseSnapshotDetailSelect;
}>;

export async function getReleaseSnapshotDetail(
  flightLegId: string,
  snapshotId: string,
): Promise<ReleaseSnapshotDetail | null> {
  return prisma.releaseReadinessSnapshot.findFirst({
    where: {
      id: snapshotId,
      flightLegId,
    },
    select: releaseSnapshotDetailSelect,
  });
}
