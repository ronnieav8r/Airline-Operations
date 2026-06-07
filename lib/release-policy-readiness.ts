import { OperatingPart, ReleaseAuthorityClass, ReleaseRuleSeverity } from "@prisma/client";

import {
  buildDefaultReleasePolicyProfileKey,
  getDefaultReleasePolicyRules,
  mapOperatingPartToReleaseAuthorityClass,
} from "@/lib/release-policy-defaults";
import { prisma } from "@/lib/prisma";

export type ReleasePolicyAuthorityRow = {
  authorityId: string;
  operatorCode: string;
  authorityName: string;
  operatingPart: OperatingPart;
  expectedAuthorityClass: ReleaseAuthorityClass;
  profileKey: string;
  profileId: string | null;
  profileAuthorityClass: ReleaseAuthorityClass | null;
  ruleCount: number;
  expectedRuleCount: number;
  blockRuleCount: number;
  warnRuleCount: number;
  missingRuleKeys: string[];
  issueCount: number;
};

export type ReleasePolicyReadinessReport = {
  generatedAt: Date;
  summary: {
    operators: number;
    operatingAuthorities: number;
    policyProfiles: number;
    policyRules: number;
    missingProfiles: number;
    authoritiesWithIssues: number;
    totalIssues: number;
  };
  rows: ReleasePolicyAuthorityRow[];
};

export async function getReleasePolicyReadinessReport(): Promise<ReleasePolicyReadinessReport> {
  const [operatorCount, policyProfileCount, policyRuleCount, authorities] = await Promise.all([
    prisma.operator.count(),
    prisma.releasePolicyProfile.count(),
    prisma.releasePolicyRule.count(),
    prisma.operatingAuthority.findMany({
      include: {
        operator: true,
        releasePolicyProfiles: {
          where: { isDefault: true },
          include: {
            rules: true,
          },
        },
      },
      orderBy: [
        { operator: { code: "asc" } },
        { operatingPart: "asc" },
      ],
    }),
  ]);

  const rows = authorities.map((authority): ReleasePolicyAuthorityRow => {
    const expectedAuthorityClass = mapOperatingPartToReleaseAuthorityClass(authority.operatingPart);
    const profileKey = buildDefaultReleasePolicyProfileKey(
      authority.operator.code,
      authority.operatingPart,
    );
    const profile =
      authority.releasePolicyProfiles.find((item) => item.profileKey === profileKey) ??
      authority.releasePolicyProfiles[0] ??
      null;
    const expectedRules = getDefaultReleasePolicyRules(expectedAuthorityClass);
    const actualRuleKeys = new Set(profile?.rules.map((rule) => rule.ruleKey) ?? []);
    const missingRuleKeys = expectedRules
      .map((rule) => rule.ruleKey)
      .filter((ruleKey) => !actualRuleKeys.has(ruleKey));
    const ruleCount = profile?.rules.length ?? 0;
    const blockRuleCount =
      profile?.rules.filter((rule) => rule.severity === ReleaseRuleSeverity.BLOCK).length ?? 0;
    const warnRuleCount =
      profile?.rules.filter((rule) => rule.severity === ReleaseRuleSeverity.WARN).length ?? 0;
    const issueCount =
      (profile === null ? 1 : 0) +
      (profile?.authorityClass !== expectedAuthorityClass ? 1 : 0) +
      missingRuleKeys.length;

    return {
      authorityId: authority.id,
      operatorCode: authority.operator.code,
      authorityName: authority.displayName,
      operatingPart: authority.operatingPart,
      expectedAuthorityClass,
      profileKey,
      profileId: profile?.id ?? null,
      profileAuthorityClass: profile?.authorityClass ?? null,
      ruleCount,
      expectedRuleCount: expectedRules.length,
      blockRuleCount,
      warnRuleCount,
      missingRuleKeys,
      issueCount,
    };
  });

  const missingProfiles = rows.filter((row) => row.profileId === null).length;
  const authoritiesWithIssues = rows.filter((row) => row.issueCount > 0).length;
  const totalIssues = rows.reduce((total, row) => total + row.issueCount, 0);

  return {
    generatedAt: new Date(),
    summary: {
      operators: operatorCount,
      operatingAuthorities: authorities.length,
      policyProfiles: policyProfileCount,
      policyRules: policyRuleCount,
      missingProfiles,
      authoritiesWithIssues,
      totalIssues,
    },
    rows,
  };
}
