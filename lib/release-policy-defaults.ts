import {
  OperatingPart,
  PrismaClient,
  ReleaseAuthorityClass,
  ReleaseRuleSeverity,
} from "@prisma/client";

const DEFAULT_EFFECTIVE_FROM = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));

type ReleaseRuleDefault = {
  ruleKey: string;
  readinessCategory: string;
  severity: ReleaseRuleSeverity;
  isOverridable: boolean;
  requiresSecondApproval: boolean;
  manualEvidenceAllowed: boolean;
  providerEvidenceRequired: boolean;
};

const SHARED_BLOCK_RULES: ReleaseRuleDefault[] = [
  rule("flightLeg.assignedAircraft.missing", "aircraft", "BLOCK", false),
  rule("aircraftConfiguration.active.missing", "airworthiness", "BLOCK", false),
  rule("discrepancy.open.exists", "airworthiness", "BLOCK", false),
  rule("discrepancy.returnToService.required", "airworthiness", "BLOCK", false),
  rule("deferral.active.expired", "airworthiness", "BLOCK", false),
  rule("operationalControl.record.missing", "operational-control", "BLOCK", false),
  rule("operationalControl.controllingEntity.missing", "operational-control", "BLOCK", false),
  rule("operatingAuthority.missing", "authority", "BLOCK", false),
  rule("authorityRevision.missing", "authority", "BLOCK", false),
  rule("flightRelease.planned.missing", "release", "BLOCK", false),
  rule("weightBalance.current.missing", "weight-balance", "BLOCK", false),
  rule("weightBalance.current.notCalculated", "weight-balance", "BLOCK", false),
];

const PART_91_CONFIGURABLE_WARNING_RULES: ReleaseRuleDefault[] = [
  rule("manifest.current.missing", "manifest", "WARN", true, true),
  rule("manifest.current.empty", "manifest", "WARN", true, true),
  rule("flightLocating.record.missing", "locating", "WARN", true, true),
  rule("dispatchPackage.current.missing", "dispatch", "WARN", true, true),
  rule("weatherBriefing.current.missing", "weather", "WARN", true, true),
  rule("notamSnapshot.current.missing", "notam", "WARN", true, true),
  rule("flightPlanReference.current.missing", "flight-plan", "WARN", true, true),
];

const STRICT_EVIDENCE_BLOCK_RULES: ReleaseRuleDefault[] = [
  rule("manifest.current.missing", "manifest", "BLOCK", true, true, true),
  rule("manifest.current.empty", "manifest", "BLOCK", true, true, true),
  rule("flightLocating.record.missing", "locating", "BLOCK", true, true, true),
  rule("dispatchPackage.current.missing", "dispatch", "BLOCK", true, true, true),
  rule("weatherBriefing.current.missing", "weather", "BLOCK", true, true, true),
  rule("notamSnapshot.current.missing", "notam", "BLOCK", true, true, true),
  rule("flightPlanReference.current.missing", "flight-plan", "BLOCK", true, true, true),
];

const WARNING_ONLY_RULES: ReleaseRuleDefault[] = [
  rule("deferral.active.exists", "airworthiness", "WARN", false),
  rule("crewCompliance.checks.deferred", "crew-compliance", "WARN", false),
];

function rule(
  ruleKey: string,
  readinessCategory: string,
  severity: keyof typeof ReleaseRuleSeverity,
  isOverridable: boolean,
  manualEvidenceAllowed = false,
  requiresSecondApproval = false,
  providerEvidenceRequired = false,
): ReleaseRuleDefault {
  return {
    ruleKey,
    readinessCategory,
    severity: ReleaseRuleSeverity[severity],
    isOverridable,
    requiresSecondApproval,
    manualEvidenceAllowed,
    providerEvidenceRequired,
  };
}

export function mapOperatingPartToReleaseAuthorityClass(
  operatingPart: OperatingPart,
): ReleaseAuthorityClass {
  if (operatingPart === OperatingPart.PART_91K) {
    return ReleaseAuthorityClass.PART_91K_FRACTIONAL;
  }

  if (operatingPart === OperatingPart.PART_135) {
    return ReleaseAuthorityClass.PART_135_ON_DEMAND;
  }

  return ReleaseAuthorityClass.PART_91_BASELINE;
}

export function buildDefaultReleasePolicyProfileKey(
  operatorCode: string,
  operatingPart: OperatingPart,
): string {
  return `default:${operatorCode}:${operatingPart}`;
}

export function getDefaultReleasePolicyRules(
  authorityClass: ReleaseAuthorityClass,
): ReleaseRuleDefault[] {
  const authorityEvidenceRules =
    authorityClass === ReleaseAuthorityClass.PART_91_BASELINE
      ? PART_91_CONFIGURABLE_WARNING_RULES
      : STRICT_EVIDENCE_BLOCK_RULES;

  return [...SHARED_BLOCK_RULES, ...authorityEvidenceRules, ...WARNING_ONLY_RULES];
}

export async function seedDefaultReleasePolicies(prisma: PrismaClient): Promise<{
  profiles: number;
  rules: number;
}> {
  const authorities = await prisma.operatingAuthority.findMany({
    include: {
      operator: true,
    },
    orderBy: [
      { operator: { code: "asc" } },
      { operatingPart: "asc" },
    ],
  });

  let profileCount = 0;
  let ruleCount = 0;

  for (const authority of authorities) {
    const authorityClass = mapOperatingPartToReleaseAuthorityClass(authority.operatingPart);
    const profileKey = buildDefaultReleasePolicyProfileKey(
      authority.operator.code,
      authority.operatingPart,
    );
    const profile = await prisma.releasePolicyProfile.upsert({
      where: { profileKey },
      create: {
        profileKey,
        operatorId: authority.operatorId,
        operatingAuthorityId: authority.id,
        name: `${authority.displayName} default release policy`,
        authorityClass,
        isDefault: true,
        effectiveFrom: DEFAULT_EFFECTIVE_FROM,
      },
      update: {
        operatorId: authority.operatorId,
        operatingAuthorityId: authority.id,
        name: `${authority.displayName} default release policy`,
        authorityClass,
        isDefault: true,
        effectiveFrom: DEFAULT_EFFECTIVE_FROM,
        effectiveTo: null,
      },
    });

    profileCount += 1;

    const defaultRules = getDefaultReleasePolicyRules(authorityClass);
    for (const defaultRule of defaultRules) {
      await prisma.releasePolicyRule.upsert({
        where: {
          profileId_ruleKey: {
            profileId: profile.id,
            ruleKey: defaultRule.ruleKey,
          },
        },
        create: {
          profileId: profile.id,
          ruleKey: defaultRule.ruleKey,
          readinessCategory: defaultRule.readinessCategory,
          severity: defaultRule.severity,
          isOverridable: defaultRule.isOverridable,
          requiresSecondApproval: defaultRule.requiresSecondApproval,
          manualEvidenceAllowed: defaultRule.manualEvidenceAllowed,
          providerEvidenceRequired: defaultRule.providerEvidenceRequired,
          effectiveFrom: DEFAULT_EFFECTIVE_FROM,
        },
        update: {
          readinessCategory: defaultRule.readinessCategory,
          severity: defaultRule.severity,
          isOverridable: defaultRule.isOverridable,
          requiresSecondApproval: defaultRule.requiresSecondApproval,
          manualEvidenceAllowed: defaultRule.manualEvidenceAllowed,
          providerEvidenceRequired: defaultRule.providerEvidenceRequired,
          effectiveFrom: DEFAULT_EFFECTIVE_FROM,
          effectiveTo: null,
        },
      });
      ruleCount += 1;
    }
  }

  return {
    profiles: profileCount,
    rules: ruleCount,
  };
}
