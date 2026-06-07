import { ReleaseFindingStatus, ReleaseRuleSeverity } from "@prisma/client";

import { getReleaseEvidenceDetail } from "@/lib/release-evidence-detail-queries";
import { prisma } from "@/lib/prisma";
import {
  getReleaseReadinessItems,
  mapReadinessClassificationToSeverity,
  mapReleaseReadinessFindingStatus,
} from "@/lib/release-readiness";

type FindingSnapshot = {
  readinessCategory: string;
  ruleKey: string;
  severity: ReleaseRuleSeverity;
  status: ReleaseFindingStatus;
  summary: string;
};

export type ReleaseSnapshotDiagnosticMismatch = {
  category: string;
  ruleKey: string;
  reason: string;
};

export type ReleaseSnapshotDiagnosticRow = {
  arrival: string;
  authorityName: string;
  departure: string;
  flightLegId: string;
  flightNumber: string | null;
  latestSnapshotAt: Date | null;
  latestSnapshotId: string | null;
  latestSnapshotStatus: string | null;
  liveCounts: {
    fail: number;
    pass: number;
    warning: number;
  };
  mismatchCount: number;
  mismatches: ReleaseSnapshotDiagnosticMismatch[];
  releaseStatus: string | null;
  routeLabel: string;
  snapshotCounts: {
    fail: number;
    pass: number;
    warning: number;
    notApplicable: number;
  };
  status: "CURRENT" | "DRIFT" | "NO_SNAPSHOT";
};

export type ReleaseSnapshotDiagnosticReport = {
  generatedAt: Date;
  rows: ReleaseSnapshotDiagnosticRow[];
  summary: {
    currentSnapshots: number;
    driftedSnapshots: number;
    flightLegs: number;
    missingSnapshots: number;
  };
};

function findingKey(finding: Pick<FindingSnapshot, "readinessCategory" | "ruleKey">): string {
  return `${finding.readinessCategory}:${finding.ruleKey}`;
}

function countFindings(findings: FindingSnapshot[]) {
  return {
    pass: findings.filter((finding) => finding.status === ReleaseFindingStatus.PASS).length,
    fail: findings.filter((finding) => finding.status === ReleaseFindingStatus.FAIL).length,
    warning: findings.filter((finding) => finding.status === ReleaseFindingStatus.WARNING).length,
    notApplicable: findings.filter(
      (finding) => finding.status === ReleaseFindingStatus.NOT_APPLICABLE,
    ).length,
  };
}

function compareFindings(liveFindings: FindingSnapshot[], snapshotFindings: FindingSnapshot[]) {
  const mismatches: ReleaseSnapshotDiagnosticMismatch[] = [];
  const snapshotByKey = new Map(snapshotFindings.map((finding) => [findingKey(finding), finding]));
  const liveByKey = new Map(liveFindings.map((finding) => [findingKey(finding), finding]));

  for (const liveFinding of liveFindings) {
    const snapshotFinding = snapshotByKey.get(findingKey(liveFinding));

    if (!snapshotFinding) {
      mismatches.push({
        category: liveFinding.readinessCategory,
        ruleKey: liveFinding.ruleKey,
        reason: "Live readiness item is missing from latest snapshot.",
      });
      continue;
    }

    if (snapshotFinding.status !== liveFinding.status) {
      mismatches.push({
        category: liveFinding.readinessCategory,
        ruleKey: liveFinding.ruleKey,
        reason: `Status changed from ${snapshotFinding.status} to ${liveFinding.status}.`,
      });
    }

    if (snapshotFinding.severity !== liveFinding.severity) {
      mismatches.push({
        category: liveFinding.readinessCategory,
        ruleKey: liveFinding.ruleKey,
        reason: `Severity changed from ${snapshotFinding.severity} to ${liveFinding.severity}.`,
      });
    }

    if (snapshotFinding.summary !== liveFinding.summary) {
      mismatches.push({
        category: liveFinding.readinessCategory,
        ruleKey: liveFinding.ruleKey,
        reason: "Summary message changed.",
      });
    }
  }

  for (const snapshotFinding of snapshotFindings) {
    if (!liveByKey.has(findingKey(snapshotFinding))) {
      mismatches.push({
        category: snapshotFinding.readinessCategory,
        ruleKey: snapshotFinding.ruleKey,
        reason: "Latest snapshot finding no longer exists in live readiness.",
      });
    }
  }

  return mismatches;
}

export async function getReleaseSnapshotDiagnosticReport(): Promise<ReleaseSnapshotDiagnosticReport> {
  const flightLegs = await prisma.flightLeg.findMany({
    orderBy: [{ scheduledDeparture: "desc" }, { flightNumber: "asc" }],
    select: {
      id: true,
    },
  });

  const rows = (
    await Promise.all(
      flightLegs.map(async (flightLeg): Promise<ReleaseSnapshotDiagnosticRow | null> => {
        const detail = await getReleaseEvidenceDetail(flightLeg.id);

        if (!detail) {
          return null;
        }

        const policyProfile = await prisma.releasePolicyProfile.findFirst({
          where: {
            operatingAuthorityId: detail.operatingAuthority.id,
            isDefault: true,
            effectiveTo: null,
          },
          include: {
            rules: true,
          },
          orderBy: {
            effectiveFrom: "desc",
          },
        });
        const policyRulesByKey = new Map(policyProfile?.rules.map((rule) => [rule.ruleKey, rule]) ?? []);
        const liveFindings = getReleaseReadinessItems(detail).map((item): FindingSnapshot => {
          const policyRule = policyRulesByKey.get(item.ruleKey);
          const severity =
            policyRule?.severity ?? mapReadinessClassificationToSeverity(item.classification);

          return {
            readinessCategory: item.readinessCategory,
            ruleKey: item.ruleKey,
            severity,
            status: mapReleaseReadinessFindingStatus(item.ready, severity),
            summary: item.message,
          };
        });
        const latestSnapshot = detail.readinessSnapshots[0] ?? null;
        const snapshotFindings =
          latestSnapshot?.findings.map((finding): FindingSnapshot => ({
            readinessCategory: finding.readinessCategory,
            ruleKey: finding.ruleKey,
            severity: finding.severity,
            status: finding.status,
            summary: finding.summary,
          })) ?? [];
        const mismatches = latestSnapshot
          ? compareFindings(liveFindings, snapshotFindings)
          : liveFindings.map((finding) => ({
              category: finding.readinessCategory,
              ruleKey: finding.ruleKey,
              reason: "No preview snapshot has been captured for this FlightLeg.",
            }));

        return {
          arrival: detail.arrivalStation.code,
          authorityName: detail.operatingAuthority.displayName,
          departure: detail.departureStation.code,
          flightLegId: detail.id,
          flightNumber: detail.flightNumber,
          latestSnapshotAt: latestSnapshot?.evaluatedAt ?? null,
          latestSnapshotId: latestSnapshot?.id ?? null,
          latestSnapshotStatus: latestSnapshot?.snapshotStatus ?? null,
          liveCounts: countFindings(liveFindings),
          mismatchCount: mismatches.length,
          mismatches,
          releaseStatus: detail.operationalControlRecord?.release?.status ?? null,
          routeLabel: `${detail.departureStation.code} -> ${detail.arrivalStation.code}`,
          snapshotCounts: countFindings(snapshotFindings),
          status: !latestSnapshot ? "NO_SNAPSHOT" : mismatches.length === 0 ? "CURRENT" : "DRIFT",
        };
      }),
    )
  ).filter((row): row is ReleaseSnapshotDiagnosticRow => row !== null);

  return {
    generatedAt: new Date(),
    rows,
    summary: {
      currentSnapshots: rows.filter((row) => row.status === "CURRENT").length,
      driftedSnapshots: rows.filter((row) => row.status === "DRIFT").length,
      flightLegs: rows.length,
      missingSnapshots: rows.filter((row) => row.status === "NO_SNAPSHOT").length,
    },
  };
}
