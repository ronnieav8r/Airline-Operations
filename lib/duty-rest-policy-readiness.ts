import {
  DutyRestEnforcementMode,
  DutyRestOperationKind,
  DutyRestRuleSeverity,
} from "@prisma/client";

import {
  buildDefaultDutyRestPolicyProfileKey,
  getDefaultDutyRestRuleSettings,
  mapOperatingPartToDutyRestOperationKind,
} from "@/lib/duty-rest-policy-defaults";
import { prisma } from "@/lib/prisma";

export type DutyRestPolicyAuthorityRow = {
  authorityId: string;
  authorityName: string;
  enabledRuleCount: number;
  enforcementMode: DutyRestEnforcementMode | null;
  expectedRuleCount: number;
  externalFlyingRuleCount: number;
  infoRuleCount: number;
  issueCount: number;
  missingRuleKeys: string[];
  operatingPart: string;
  operationKind: DutyRestOperationKind;
  operatorCode: string;
  profileKey: string;
  profileName: string | null;
  requiresOperatorReviewCount: number;
  warningRuleCount: number;
};

export async function getDutyRestPolicyReadinessReport() {
  const authorities = await prisma.operatingAuthority.findMany({
    include: {
      operator: true,
      dutyRestPolicyProfiles: {
        where: { isDefault: true },
        include: {
          ruleSettings: true,
        },
        orderBy: [{ effectiveFrom: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ operator: { code: "asc" } }, { operatingPart: "asc" }],
  });

  const rows: DutyRestPolicyAuthorityRow[] = authorities.map((authority) => {
    const operationKind = mapOperatingPartToDutyRestOperationKind(authority.operatingPart);
    const expectedRules = getDefaultDutyRestRuleSettings(operationKind);
    const expectedRuleKeys = new Set(expectedRules.map((rule) => rule.ruleKey));
    const profile = authority.dutyRestPolicyProfiles[0] ?? null;
    const actualRules = profile?.ruleSettings ?? [];
    const actualRuleKeys = new Set(actualRules.map((rule) => rule.ruleKey));
    const missingRuleKeys = Array.from(expectedRuleKeys).filter((ruleKey) => !actualRuleKeys.has(ruleKey));
    const issueCount =
      (profile ? 0 : 1) +
      missingRuleKeys.length +
      (profile?.enforcementMode === DutyRestEnforcementMode.WARNING_ONLY ? 0 : 1);

    return {
      authorityId: authority.id,
      authorityName: authority.displayName,
      enabledRuleCount: actualRules.filter((rule) => rule.enabled).length,
      enforcementMode: profile?.enforcementMode ?? null,
      expectedRuleCount: expectedRules.length,
      externalFlyingRuleCount: actualRules.filter((rule) => rule.requiresExternalFlying).length,
      infoRuleCount: actualRules.filter((rule) => rule.severity === DutyRestRuleSeverity.INFO).length,
      issueCount,
      missingRuleKeys,
      operatingPart: authority.operatingPart,
      operationKind,
      operatorCode: authority.operator.code,
      profileKey:
        profile?.profileKey ??
        buildDefaultDutyRestPolicyProfileKey(authority.operator.code, authority.operatingPart),
      profileName: profile?.name ?? null,
      requiresOperatorReviewCount: actualRules.filter((rule) => rule.requiresOperatorReview).length,
      warningRuleCount: actualRules.filter((rule) => rule.severity === DutyRestRuleSeverity.WARN).length,
    };
  });

  return {
    generatedAt: new Date(),
    rows,
    summary: {
      authorities: authorities.length,
      authoritiesWithIssues: rows.filter((row) => row.issueCount > 0).length,
      missingProfiles: rows.filter((row) => !row.profileName).length,
      policyProfiles: rows.filter((row) => row.profileName).length,
      policyRules: rows.reduce((sum, row) => sum + row.enabledRuleCount, 0),
      totalIssues: rows.reduce((sum, row) => sum + row.issueCount, 0),
    },
  };
}
