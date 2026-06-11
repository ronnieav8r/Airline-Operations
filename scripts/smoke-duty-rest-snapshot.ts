import {
  PrismaClient,
  ReleaseFindingStatus,
  ReleaseRuleSeverity,
} from "@prisma/client";

import { getReleaseEvidenceDetail } from "../lib/release-evidence-detail-queries";
import {
  getReleaseReadinessItems,
  getReleaseSnapshotStatus,
  mapReadinessClassificationToSeverity,
  mapReleaseReadinessFindingStatus,
} from "../lib/release-readiness";

const prisma = new PrismaClient();
const SCENARIO_PREFIX = "DUTY_REST_SCENARIO:";

async function main() {
  const scenario = await prisma.flightLeg.findFirst({
    where: {
      notes: {
        startsWith: SCENARIO_PREFIX,
      },
    },
    orderBy: [{ flightNumber: "asc" }],
    select: {
      id: true,
      flightNumber: true,
      notes: true,
    },
  });

  if (!scenario) {
    throw new Error(
      "No duty/rest scenario FlightLeg was found. Run RUN_DUTY_REST_SCENARIOS=1 npm run seed:duty-rest-scenarios first.",
    );
  }

  const detail = await getReleaseEvidenceDetail(scenario.id);

  if (!detail) {
    throw new Error(`Release evidence detail was not found for ${scenario.id}.`);
  }

  const flightRelease = detail.operationalControlRecord?.release;

  if (!flightRelease) {
    throw new Error(`FlightRelease was not found for ${scenario.id}.`);
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

  if (!policyProfile) {
    throw new Error(`Default release policy profile was not found for ${detail.operatingAuthority.id}.`);
  }

  const admin = await prisma.user.findUnique({
    where: {
      email: "admin@aeroops.local",
    },
    select: {
      id: true,
    },
  });
  const policyRulesByKey = new Map(policyProfile.rules.map((rule) => [rule.ruleKey, rule]));
  const readinessItems = getReleaseReadinessItems(detail);
  const dutyRestItem = readinessItems.find((item) => item.readinessCategory === "duty-rest");

  if (!dutyRestItem) {
    throw new Error("Live readiness did not include a duty/rest item.");
  }

  const findings = readinessItems.map((item) => {
    const policyRule = policyRulesByKey.get(item.ruleKey) ?? null;
    const severity = policyRule?.severity ?? mapReadinessClassificationToSeverity(item.classification);

    return {
      item,
      policyRule,
      severity,
      status: mapReleaseReadinessFindingStatus(item.ready, severity),
    };
  });
  const passCount = findings.filter((finding) => finding.status === ReleaseFindingStatus.PASS).length;
  const failCount = findings.filter((finding) => finding.status === ReleaseFindingStatus.FAIL).length;
  const warningCount = findings.filter((finding) => finding.status === ReleaseFindingStatus.WARNING).length;
  const notApplicableCount = findings.filter(
    (finding) => finding.status === ReleaseFindingStatus.NOT_APPLICABLE,
  ).length;
  const snapshot = await prisma.releaseReadinessSnapshot.create({
    data: {
      authorityClass: policyProfile.authorityClass,
      evaluatedById: admin?.id ?? null,
      findings: {
        create: findings.map((finding) => ({
          details: finding.item.details ?? {},
          evidenceRefId: finding.item.evidenceRefId ?? null,
          evidenceRefType: finding.item.evidenceRefType ?? null,
          isOverridable: finding.policyRule?.isOverridable ?? false,
          readinessCategory: finding.item.readinessCategory,
          ruleId: finding.policyRule?.id ?? null,
          ruleKey: finding.item.ruleKey,
          severity: finding.severity,
          status: finding.status,
          summary: finding.item.message,
        })),
      },
      flightLegId: detail.id,
      flightReleaseId: flightRelease.id,
      policyProfileId: policyProfile.id,
      snapshotStatus: getReleaseSnapshotStatus(failCount, warningCount),
      summary: {
        fail: failCount,
        notApplicable: notApplicableCount,
        pass: passCount,
        source: "duty-rest-snapshot-smoke",
        total: findings.length,
        warning: warningCount,
      },
    },
    select: {
      id: true,
    },
  });

  const persistedDutyRestFinding = await prisma.releaseReadinessFinding.findFirst({
    where: {
      readinessCategory: "duty-rest",
      snapshotId: snapshot.id,
    },
    select: {
      details: true,
      ruleKey: true,
      severity: true,
      status: true,
    },
  });

  if (!persistedDutyRestFinding) {
    throw new Error(`Snapshot ${snapshot.id} did not persist a duty/rest finding.`);
  }

  const details = persistedDutyRestFinding.details as { findings?: unknown };

  if (!Array.isArray(details.findings) || details.findings.length === 0) {
    throw new Error(`Snapshot ${snapshot.id} duty/rest finding did not persist evaluator subfindings.`);
  }

  if (
    persistedDutyRestFinding.status !== ReleaseFindingStatus.WARNING ||
    persistedDutyRestFinding.severity !== ReleaseRuleSeverity.WARN
  ) {
    throw new Error(
      `Snapshot ${snapshot.id} persisted unexpected duty/rest status ${persistedDutyRestFinding.status}/${persistedDutyRestFinding.severity}.`,
    );
  }

  console.log(
    `duty/rest snapshot smoke: captured ${snapshot.id} for ${scenario.flightNumber ?? scenario.id} with ${details.findings.length} subfinding(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
