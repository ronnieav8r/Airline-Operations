import {
  DutyRestCalculationBasis,
  DutyRestEnforcementMode,
  DutyRestOperationKind,
  DutyRestRuleSeverity,
  OperatingPart,
  Prisma,
  PrismaClient,
} from "@prisma/client";

const DEFAULT_EFFECTIVE_FROM = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
const SOURCE_SUMMARY =
  "Derived from docs/DUTY_REST_REGULATORY_RESEARCH.md. Warning-only until operator/legal review.";

type DutyRestRuleDefault = {
  calculationNotes?: string;
  crewRoleScope: string;
  implementationPhase?: number;
  passCondition?: string;
  regulationPart: string;
  requiredInputs?: string[];
  requiresExternalFlying?: boolean;
  ruleKey: string;
  severity?: DutyRestRuleSeverity;
  sourceCitation: string;
  title: string;
  triggerCondition?: string;
  warningMessage: string;
};

function rule(defaultRule: DutyRestRuleDefault): DutyRestRuleDefault {
  return {
    implementationPhase: 1,
    severity: DutyRestRuleSeverity.WARN,
    ...defaultRule,
  };
}

const PART_91_POLICY_GUARDRAILS: DutyRestRuleDefault[] = [
  rule({
    ruleKey: "FAA-91-GUARD-001",
    title: "Ordinary Part 91 regulatory guardrail",
    regulationPart: "PART_91",
    crewRoleScope: "All crewmembers",
    triggerCondition: "FlightLeg authority is ordinary Part 91",
    requiredInputs: ["operatingAuthority.operatingPart"],
    calculationNotes:
      "Ordinary Part 91 does not supply a broad Part 135-style duty/rest table for private operations.",
    passCondition: "Do not apply Part 91K, Part 135, or Part 117 regulatory duty/rest warnings to ordinary Part 91.",
    warningMessage:
      "Treat ordinary Part 91 fatigue limits as operator policy unless a specific FAA rule or approved policy applies.",
    severity: DutyRestRuleSeverity.INFO,
    sourceCitation: "DUTY_REST_REGULATORY_RESEARCH.md sections 1, 3, and 7",
  }),
  rule({
    ruleKey: "FAA-117-NOTAPPLY-001",
    title: "Part 117 non-applicability guardrail",
    regulationPart: "PART_117",
    crewRoleScope: "Flightcrew",
    triggerCondition: "AeroOps authority is Part 91, Part 91K, or Part 135",
    requiredInputs: ["operatingAuthority.operatingPart"],
    calculationNotes:
      "Part 117 generally governs Part 121 passenger operations, not AeroOps Part 91K or Part 135 contexts.",
    passCondition: "Part 117 warnings are suppressed unless a future Part 121-directed authority context exists.",
    warningMessage:
      "Do not apply Part 117 duty/rest warnings to this authority without a separate Part 121-directed context.",
    severity: DutyRestRuleSeverity.INFO,
    sourceCitation: "14 CFR Part 117; DUTY_REST_REGULATORY_RESEARCH.md sections 1 and 3",
  }),
];

const PART_91K_RULES: DutyRestRuleDefault[] = [
  rule({
    ruleKey: "FAA-91K-REST-002",
    title: "Part 91K 10-hour rest in preceding 24 hours",
    regulationPart: "PART_91K",
    crewRoleScope: "All crewmembers",
    triggerCondition: "Flight assignment planned",
    requiredInputs: ["CrewRestPeriod", "planned assignment completion time"],
    calculationNotes:
      "Find at least one 10-consecutive-hour rest period in the 24 hours preceding assignment completion.",
    passCondition: "A qualifying 10-hour rest block exists.",
    warningMessage:
      "Missing qualifying 10 consecutive hours of rest in the 24 hours before planned completion.",
    sourceCitation: "14 CFR Sec. 91.1057(f)",
  }),
  rule({
    ruleKey: "FAA-91K-RESERVE-001",
    title: "Part 91K reserve is not rest",
    regulationPart: "PART_91K",
    crewRoleScope: "Flight crewmembers",
    triggerCondition: "Crew marked reserve",
    requiredInputs: ["reserve interval", "rest interval classification"],
    calculationNotes: "Reserve status is neither duty nor rest under the research report summary.",
    passCondition: "Reserve is not counted as rest.",
    warningMessage: "Reserve time cannot satisfy required rest.",
    sourceCitation: "14 CFR Sec. 91.1057(a)",
  }),
  rule({
    ruleKey: "FAA-91K-STANDBY-001",
    title: "Part 91K standby is duty",
    regulationPart: "PART_91K",
    crewRoleScope: "Flight crewmembers",
    triggerCondition: "Crew marked standby",
    requiredInputs: ["standby interval", "duty interval classification"],
    calculationNotes: "Standby is part of duty and is not rest.",
    passCondition: "Standby is counted as duty and excluded from rest.",
    warningMessage: "Standby was counted as rest or omitted from duty context.",
    sourceCitation: "14 CFR Sec. 91.1057(a)",
  }),
  rule({
    ruleKey: "FAA-91K-FLT-001",
    title: "Part 91K cumulative commercial flying",
    regulationPart: "PART_91K",
    crewRoleScope: "One- or two-pilot flightcrew",
    triggerCondition: "Assignment accepted",
    requiredInputs: ["AeroOps flight time", "outside commercial flying ledger"],
    requiresExternalFlying: true,
    calculationNotes:
      "Check 500 hours per calendar quarter, 800 hours in two consecutive quarters, and 1400 hours per calendar year.",
    passCondition: "Projected all-commercial-flying totals remain within limits.",
    warningMessage:
      "Cannot fully validate Part 91K cumulative flight limits without outside commercial flying data.",
    sourceCitation: "14 CFR Sec. 91.1059(a)",
  }),
];

const PART_135_UNSCHEDULED_RULES: DutyRestRuleDefault[] = [
  rule({
    ruleKey: "FAA-135-GEN-001",
    title: "Part 135 no duty during required rest",
    regulationPart: "PART_135",
    crewRoleScope: "Flight crewmembers",
    triggerCondition: "Any Part 135 assignment",
    requiredInputs: ["CrewDutyPeriod", "CrewRestPeriod"],
    calculationNotes: "Check that assigned duty does not overlap required rest periods.",
    passCondition: "No duty overlaps required rest.",
    warningMessage: "Duty appears to overlap a required rest period.",
    sourceCitation: "14 CFR Sec. 135.263(b)",
  }),
  rule({
    ruleKey: "FAA-135-GEN-002",
    title: "Part 135 non-local transportation is not rest",
    regulationPart: "PART_135",
    crewRoleScope: "Flight crewmembers",
    triggerCondition: "Required non-local transportation is present",
    requiredInputs: ["transportation event", "rest interval classification"],
    calculationNotes: "Required non-local transportation must be excluded from rest.",
    passCondition: "Transportation is not counted as rest.",
    warningMessage: "Required non-local transportation may have been counted as rest.",
    sourceCitation: "14 CFR Sec. 135.263(c)",
  }),
  rule({
    ruleKey: "FAA-135-UNSCH-001",
    title: "Part 135 unscheduled cumulative commercial flying",
    regulationPart: "PART_135_UNSCHEDULED",
    crewRoleScope: "One- or two-pilot flightcrew",
    triggerCondition: "Assignment accepted",
    requiredInputs: ["AeroOps flight time", "outside commercial flying ledger"],
    requiresExternalFlying: true,
    calculationNotes:
      "Check 500 hours per calendar quarter, 800 hours in two consecutive quarters, and 1400 hours per calendar year.",
    passCondition: "Projected all-commercial-flying totals remain within limits.",
    warningMessage:
      "Cannot fully validate Part 135 cumulative flight limits without outside commercial flying data.",
    sourceCitation: "14 CFR Sec. 135.267(a)",
  }),
  rule({
    ruleKey: "FAA-135-UNSCH-002",
    title: "Part 135 unscheduled one-pilot daily flight time",
    regulationPart: "PART_135_UNSCHEDULED",
    crewRoleScope: "One-pilot flightcrew",
    triggerCondition: "Unscheduled one-pilot assignment accepted",
    requiredInputs: ["crew size", "flight time in rolling 24 hours", "extension reason"],
    calculationNotes: "Warn when projected one-pilot commercial flight time exceeds 8 hours in 24 hours.",
    passCondition: "Projected flight time is 8 hours or less, or extension review is documented.",
    warningMessage:
      "Projected one-pilot Part 135 unscheduled flight time exceeds 8 hours in a rolling 24-hour window.",
    sourceCitation: "14 CFR Sec. 135.267(b)-(c)",
  }),
  rule({
    ruleKey: "FAA-135-UNSCH-003",
    title: "Part 135 unscheduled two-pilot daily flight time",
    regulationPart: "PART_135_UNSCHEDULED",
    crewRoleScope: "Two-pilot flightcrew",
    triggerCondition: "Unscheduled two-pilot assignment accepted",
    requiredInputs: ["crew size", "pilot qualifications", "flight time in rolling 24 hours", "extension reason"],
    calculationNotes: "Warn when projected two-pilot commercial flight time exceeds 10 hours in 24 hours.",
    passCondition: "Projected flight time is 10 hours or less, or extension review is documented.",
    warningMessage:
      "Projected two-pilot Part 135 unscheduled flight time exceeds 10 hours in a rolling 24-hour window.",
    sourceCitation: "14 CFR Sec. 135.267(b)-(c)",
  }),
  rule({
    ruleKey: "FAA-135-UNSCH-004",
    title: "Part 135 unscheduled 10-hour rest in preceding 24 hours",
    regulationPart: "PART_135_UNSCHEDULED",
    crewRoleScope: "One- or two-pilot flightcrew",
    triggerCondition: "Assignment under Sec. 135.267(b)",
    requiredInputs: ["CrewRestPeriod", "planned assignment completion time"],
    calculationNotes:
      "Find at least one 10-consecutive-hour rest period in the 24 hours preceding planned completion.",
    passCondition: "A qualifying 10-hour rest block exists.",
    warningMessage:
      "Missing qualifying 10 consecutive hours of rest in the 24 hours before planned completion.",
    sourceCitation: "14 CFR Sec. 135.267(d)",
  }),
  rule({
    ruleKey: "FAA-135-UNSCH-006",
    title: "Part 135 unscheduled quarterly 24-hour rest periods",
    regulationPart: "PART_135_UNSCHEDULED",
    crewRoleScope: "One- or two-pilot flightcrew",
    triggerCondition: "Quarterly schedule review",
    requiredInputs: ["CrewRestPeriod quarter coverage"],
    calculationNotes: "Count 24-consecutive-hour rest periods in the calendar quarter.",
    passCondition: "At least 13 qualifying 24-hour rest periods exist in the quarter.",
    warningMessage: "Fewer than 13 qualifying 24-hour rest periods are visible for the quarter.",
    sourceCitation: "14 CFR Sec. 135.267(f)",
  }),
];

export function mapOperatingPartToDutyRestOperationKind(
  operatingPart: OperatingPart,
): DutyRestOperationKind {
  if (operatingPart === OperatingPart.PART_91K) {
    return DutyRestOperationKind.PART_91K_FRACTIONAL;
  }

  if (operatingPart === OperatingPart.PART_135) {
    return DutyRestOperationKind.PART_135_UNSCHEDULED;
  }

  return DutyRestOperationKind.ORDINARY_PART_91;
}

export function buildDefaultDutyRestPolicyProfileKey(
  operatorCode: string,
  operatingPart: OperatingPart,
): string {
  return `duty-rest:default:${operatorCode}:${operatingPart}`;
}

export function getDefaultDutyRestRuleSettings(
  operationKind: DutyRestOperationKind,
): DutyRestRuleDefault[] {
  if (operationKind === DutyRestOperationKind.PART_91K_FRACTIONAL) {
    return [...PART_91K_RULES, ...PART_91_POLICY_GUARDRAILS.filter((item) => item.ruleKey === "FAA-117-NOTAPPLY-001")];
  }

  if (operationKind === DutyRestOperationKind.PART_135_UNSCHEDULED) {
    return [...PART_135_UNSCHEDULED_RULES, ...PART_91_POLICY_GUARDRAILS.filter((item) => item.ruleKey === "FAA-117-NOTAPPLY-001")];
  }

  return PART_91_POLICY_GUARDRAILS;
}

function profileSettingsForOperationKind(operationKind: DutyRestOperationKind) {
  if (operationKind === DutyRestOperationKind.ORDINARY_PART_91) {
    return {
      ordinaryPart91PolicyEnabled: false,
      outsideCommercialFlyingRequired: false,
      notes:
        "Ordinary Part 91 has no broad FAA Part 135-style duty/rest table; regulatory engine should not invent one.",
    };
  }

  return {
    ordinaryPart91PolicyEnabled: false,
    outsideCommercialFlyingRequired: true,
    notes:
      "Warning-only regulatory settings. Outside commercial flying is required for complete cumulative-limit validation.",
  };
}

export async function seedDefaultDutyRestPolicies(prisma: PrismaClient): Promise<{
  profiles: number;
  rules: number;
}> {
  const authorities = await prisma.operatingAuthority.findMany({
    include: {
      operator: true,
      revisions: {
        orderBy: [{ effectiveStart: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ operator: { code: "asc" } }, { operatingPart: "asc" }],
  });

  let profileCount = 0;
  let ruleCount = 0;

  for (const authority of authorities) {
    const operationKind = mapOperatingPartToDutyRestOperationKind(authority.operatingPart);
    const profileKey = buildDefaultDutyRestPolicyProfileKey(
      authority.operator.code,
      authority.operatingPart,
    );
    const profileSettings = profileSettingsForOperationKind(operationKind);
    const profile = await prisma.dutyRestPolicyProfile.upsert({
      where: { profileKey },
      create: {
        ...profileSettings,
        authorityRevisionId: authority.revisions[0]?.id,
        calculationBasis: DutyRestCalculationBasis.UTC,
        enforcementMode: DutyRestEnforcementMode.WARNING_ONLY,
        isDefault: true,
        name: `${authority.displayName} duty/rest policy`,
        operatingAuthorityId: authority.id,
        operationKind,
        operatorId: authority.operatorId,
        profileKey,
        requiredTransportationCountsAsRest: false,
        reserveCountsAsRest: false,
        reducedRestRequiresReview: true,
        sourceSummary: SOURCE_SUMMARY,
        standbyCountsAsDuty: true,
        effectiveFrom: DEFAULT_EFFECTIVE_FROM,
      },
      update: {
        ...profileSettings,
        authorityRevisionId: authority.revisions[0]?.id,
        calculationBasis: DutyRestCalculationBasis.UTC,
        enforcementMode: DutyRestEnforcementMode.WARNING_ONLY,
        effectiveFrom: DEFAULT_EFFECTIVE_FROM,
        effectiveTo: null,
        isDefault: true,
        name: `${authority.displayName} duty/rest policy`,
        operatingAuthorityId: authority.id,
        operationKind,
        operatorId: authority.operatorId,
        requiredTransportationCountsAsRest: false,
        reserveCountsAsRest: false,
        reducedRestRequiresReview: true,
        sourceSummary: SOURCE_SUMMARY,
        standbyCountsAsDuty: true,
      },
    });

    profileCount += 1;

    for (const defaultRule of getDefaultDutyRestRuleSettings(operationKind)) {
      const requiredInputs: Prisma.InputJsonValue | undefined = defaultRule.requiredInputs
        ? { items: defaultRule.requiredInputs }
        : undefined;

      await prisma.dutyRestRuleSetting.upsert({
        where: {
          profileId_ruleKey: {
            profileId: profile.id,
            ruleKey: defaultRule.ruleKey,
          },
        },
        create: {
          calculationNotes: defaultRule.calculationNotes,
          crewRoleScope: defaultRule.crewRoleScope,
          enabled: true,
          implementationPhase: defaultRule.implementationPhase ?? 1,
          passCondition: defaultRule.passCondition,
          profileId: profile.id,
          regulationPart: defaultRule.regulationPart,
          requiredInputs,
          requiresExternalFlying: defaultRule.requiresExternalFlying ?? false,
          requiresOperatorReview: true,
          ruleKey: defaultRule.ruleKey,
          severity: defaultRule.severity ?? DutyRestRuleSeverity.WARN,
          sourceCitation: defaultRule.sourceCitation,
          title: defaultRule.title,
          triggerCondition: defaultRule.triggerCondition,
          warningMessage: defaultRule.warningMessage,
        },
        update: {
          calculationNotes: defaultRule.calculationNotes,
          crewRoleScope: defaultRule.crewRoleScope,
          enabled: true,
          implementationPhase: defaultRule.implementationPhase ?? 1,
          passCondition: defaultRule.passCondition,
          regulationPart: defaultRule.regulationPart,
          requiredInputs,
          requiresExternalFlying: defaultRule.requiresExternalFlying ?? false,
          requiresOperatorReview: true,
          severity: defaultRule.severity ?? DutyRestRuleSeverity.WARN,
          sourceCitation: defaultRule.sourceCitation,
          title: defaultRule.title,
          triggerCondition: defaultRule.triggerCondition,
          warningMessage: defaultRule.warningMessage,
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
