import {
  CrewComplianceCalculationKind,
  CrewComplianceRequirementType,
  OperatingPart,
  Prisma,
  PrismaClient,
} from "@prisma/client";

const DEFAULT_EFFECTIVE_FROM = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));

export type CrewComplianceRuleDefinition = {
  active: boolean;
  applicabilitySummary: string | null;
  calculationKind: CrewComplianceCalculationKind;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  graceMonthsAfter: number;
  graceMonthsBefore: number;
  intervalMonths: number | null;
  operatingPart: OperatingPart | null;
  regulationPart: string;
  requirementType: CrewComplianceRequirementType;
  ruleKey: string;
  sourceCitation: string;
  sourceUrl: string | null;
  title: string;
  warningLeadDays: number;
};

type RuleInput = Omit<
  CrewComplianceRuleDefinition,
  "active" | "effectiveFrom" | "effectiveTo" | "graceMonthsAfter" | "graceMonthsBefore" | "warningLeadDays"
> &
  Partial<
    Pick<
      CrewComplianceRuleDefinition,
      "active" | "effectiveFrom" | "effectiveTo" | "graceMonthsAfter" | "graceMonthsBefore" | "warningLeadDays"
    >
  >;

function rule(input: RuleInput): CrewComplianceRuleDefinition {
  return {
    active: true,
    effectiveFrom: DEFAULT_EFFECTIVE_FROM,
    effectiveTo: null,
    graceMonthsAfter: 0,
    graceMonthsBefore: 0,
    warningLeadDays: 30,
    ...input,
  };
}

export const DEFAULT_CREW_COMPLIANCE_RULES: CrewComplianceRuleDefinition[] = [
  rule({
    ruleKey: "crew.medical.61-23",
    operatingPart: null,
    requirementType: CrewComplianceRequirementType.MEDICAL,
    calculationKind: CrewComplianceCalculationKind.MEDICAL_61_23,
    title: "Medical certificate duration",
    regulationPart: "14 CFR 61.23",
    sourceCitation: "14 CFR Sec. 61.23",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.23",
    applicabilitySummary:
      "Age, certificate class, issue date, and manually entered expiration are used for warning-only medical review.",
    intervalMonths: null,
  }),
  rule({
    ruleKey: "crew.pic.type-rating.61-31",
    operatingPart: null,
    requirementType: CrewComplianceRequirementType.TYPE_RATING,
    calculationKind: CrewComplianceCalculationKind.MANUAL_ONLY,
    title: "PIC aircraft type rating",
    regulationPart: "14 CFR 61.31",
    sourceCitation: "14 CFR Sec. 61.31",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.31",
    applicabilitySummary:
      "For CPT/PIC qualification on large or turbojet aircraft, verify aircraft-specific PIC type-rating evidence.",
    intervalMonths: null,
  }),
  rule({
    ruleKey: "crew.sic.qualification.61-55",
    operatingPart: null,
    requirementType: CrewComplianceRequirementType.SIC_QUALIFICATION,
    calculationKind: CrewComplianceCalculationKind.MANUAL_ONLY,
    title: "SIC qualification / SIC type privileges",
    regulationPart: "14 CFR 61.55",
    sourceCitation: "14 CFR Sec. 61.55",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.55",
    applicabilitySummary:
      "For FO/SIC qualification on multi-crew or SIC-required aircraft, verify SIC familiarization, training, or SIC type privileges evidence.",
    intervalMonths: null,
  }),
  rule({
    ruleKey: "crew.part91.pic-proficiency.61-58",
    operatingPart: OperatingPart.PART_91,
    requirementType: CrewComplianceRequirementType.PROFICIENCY_CHECK,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 91 PIC proficiency check",
    regulationPart: "14 CFR 61.58",
    sourceCitation: "14 CFR Sec. 61.58",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.58",
    applicabilitySummary:
      "For CPT/PIC on multi-crew or turbojet aircraft outside 91K/135, use PIC proficiency or type-rating practical-test evidence.",
    intervalMonths: 12,
  }),
  rule({
    ruleKey: "crew.part91.flight-review.61-56",
    operatingPart: OperatingPart.PART_91,
    requirementType: CrewComplianceRequirementType.FLIGHT_REVIEW,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 91 flight review",
    regulationPart: "14 CFR 61.56",
    sourceCitation: "14 CFR Sec. 61.56",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.56",
    applicabilitySummary: "Uses satisfactory checkride/check evidence as the starter v1 proxy.",
    intervalMonths: 24,
  }),
  rule({
    ruleKey: "crew.part91.instrument-currency.61-57",
    operatingPart: OperatingPart.PART_91,
    requirementType: CrewComplianceRequirementType.INSTRUMENT_CHECK,
    calculationKind: CrewComplianceCalculationKind.IPC_61_57,
    title: "Part 91 instrument proficiency review",
    regulationPart: "14 CFR 61.57",
    sourceCitation: "14 CFR Sec. 61.57",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.57",
    applicabilitySummary: "Uses instrument check or instrument approach recency evidence for warning-only review.",
    intervalMonths: 6,
  }),
  rule({
    ruleKey: "crew.part91.takeoff-landing-recency.61-57",
    operatingPart: OperatingPart.PART_91,
    requirementType: CrewComplianceRequirementType.RECENCY,
    calculationKind: CrewComplianceCalculationKind.RECENCY_90_DAYS,
    title: "Part 91 takeoff and landing recency",
    regulationPart: "14 CFR 61.57",
    sourceCitation: "14 CFR Sec. 61.57",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61/subpart-A/section-61.57",
    applicabilitySummary: "Uses takeoff/landing recency evidence for passenger-carrying warning review.",
    intervalMonths: null,
  }),
  rule({
    ruleKey: "crew.part135.recurrent.135-293",
    operatingPart: OperatingPart.PART_135,
    requirementType: CrewComplianceRequirementType.RECURRENT_TRAINING,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 135 recurrent pilot testing",
    regulationPart: "14 CFR 135.293",
    sourceCitation: "14 CFR Sec. 135.293",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-G/section-135.293",
    applicabilitySummary: "Uses recurrent training evidence as the starter v1 proxy.",
    intervalMonths: 12,
    graceMonthsBefore: 1,
    graceMonthsAfter: 1,
  }),
  rule({
    ruleKey: "crew.part135.competency.135-293",
    operatingPart: OperatingPart.PART_135,
    requirementType: CrewComplianceRequirementType.COMPETENCY_CHECK,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 135 competency check",
    regulationPart: "14 CFR 135.293",
    sourceCitation: "14 CFR Sec. 135.293; grace context Sec. 135.301",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-G/section-135.293",
    applicabilitySummary: "Uses satisfactory competency check evidence.",
    intervalMonths: 12,
    graceMonthsBefore: 1,
    graceMonthsAfter: 1,
  }),
  rule({
    ruleKey: "crew.part135.pic-ifr.135-297",
    operatingPart: OperatingPart.PART_135,
    requirementType: CrewComplianceRequirementType.INSTRUMENT_CHECK,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 135 PIC IFR proficiency check",
    regulationPart: "14 CFR 135.297",
    sourceCitation: "14 CFR Sec. 135.297",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-G/section-135.297",
    applicabilitySummary: "Uses satisfactory proficiency check evidence.",
    intervalMonths: 6,
    graceMonthsBefore: 1,
    graceMonthsAfter: 1,
  }),
  rule({
    ruleKey: "crew.part135.line-check.135-299",
    operatingPart: OperatingPart.PART_135,
    requirementType: CrewComplianceRequirementType.LINE_CHECK,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 135 PIC line check",
    regulationPart: "14 CFR 135.299",
    sourceCitation: "14 CFR Sec. 135.299; grace context Sec. 135.301",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-G/section-135.299",
    applicabilitySummary: "Uses satisfactory line-check evidence.",
    intervalMonths: 12,
    graceMonthsBefore: 1,
    graceMonthsAfter: 1,
  }),
  rule({
    ruleKey: "crew.part91k.recurrent.91-1065",
    operatingPart: OperatingPart.PART_91K,
    requirementType: CrewComplianceRequirementType.RECURRENT_TRAINING,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 91K pilot checks and tests",
    regulationPart: "14 CFR 91.1065",
    sourceCitation: "14 CFR Sec. 91.1065",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-K/subject-group-ECFRc17623c0e0be17e/section-91.1065",
    applicabilitySummary: "Uses recurrent training evidence as the starter v1 proxy.",
    intervalMonths: 12,
    graceMonthsBefore: 1,
    graceMonthsAfter: 1,
  }),
  rule({
    ruleKey: "crew.part91k.competency.91-1065",
    operatingPart: OperatingPart.PART_91K,
    requirementType: CrewComplianceRequirementType.COMPETENCY_CHECK,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 91K competency check",
    regulationPart: "14 CFR 91.1065",
    sourceCitation: "14 CFR Sec. 91.1065; grace context Sec. 91.1071",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-K/subject-group-ECFRc17623c0e0be17e/section-91.1065",
    applicabilitySummary: "Uses satisfactory competency check evidence for aircraft class/type practical skills.",
    intervalMonths: 12,
    graceMonthsBefore: 1,
    graceMonthsAfter: 1,
  }),
  rule({
    ruleKey: "crew.part91k.pic-ipc.91-1069",
    operatingPart: OperatingPart.PART_91K,
    requirementType: CrewComplianceRequirementType.INSTRUMENT_CHECK,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 91K PIC instrument proficiency check",
    regulationPart: "14 CFR 91.1069",
    sourceCitation: "14 CFR Sec. 91.1069; grace context Sec. 91.1071",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-K/subject-group-ECFRc17623c0e0be17e/section-91.1069",
    applicabilitySummary: "Uses satisfactory instrument check evidence as the starter v1 proxy.",
    intervalMonths: 6,
    graceMonthsBefore: 1,
    graceMonthsAfter: 1,
  }),
  rule({
    ruleKey: "crew.part91k.sic-ipc.91-1069",
    operatingPart: OperatingPart.PART_91K,
    requirementType: CrewComplianceRequirementType.INSTRUMENT_CHECK,
    calculationKind: CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS,
    title: "Part 91K SIC instrument proficiency check",
    regulationPart: "14 CFR 91.1069",
    sourceCitation: "14 CFR Sec. 91.1069; grace context Sec. 91.1071",
    sourceUrl:
      "https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-K/subject-group-ECFRc17623c0e0be17e/section-91.1069",
    applicabilitySummary: "Uses satisfactory instrument check evidence as the starter v1 proxy.",
    intervalMonths: 12,
    graceMonthsBefore: 1,
    graceMonthsAfter: 1,
  }),
];

export async function getActiveCrewComplianceRuleDefinitions(
  prisma: PrismaClient | Prisma.TransactionClient,
  operatingParts?: OperatingPart | OperatingPart[] | null,
): Promise<CrewComplianceRuleDefinition[]> {
  const selectedOperatingParts =
    Array.isArray(operatingParts)
      ? operatingParts
      : operatingParts
        ? [operatingParts]
        : operatingParts === null
          ? []
          : (
              await prisma.operatingAuthority.findMany({
                where: {
                  operator: { isActive: true },
                  status: "ACTIVE",
                },
                select: { operatingPart: true },
              })
            ).map((authority) => authority.operatingPart);
  const uniqueOperatingParts = Array.from(new Set(selectedOperatingParts));
  const rules = await prisma.crewComplianceRule.findMany({
    where: {
      active: true,
      AND: [
        { effectiveFrom: { lte: new Date() } },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
        {
          OR: [
            { operatingPart: null },
            ...(uniqueOperatingParts.length > 0
              ? [{ operatingPart: { in: uniqueOperatingParts } }]
              : []),
          ],
        },
      ],
    },
    orderBy: [{ operatingPart: "asc" }, { requirementType: "asc" }, { ruleKey: "asc" }],
  });

  if (rules.length > 0) {
    return rules.map((item) => ({
      active: item.active,
      applicabilitySummary: item.applicabilitySummary,
      calculationKind: item.calculationKind,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      graceMonthsAfter: item.graceMonthsAfter,
      graceMonthsBefore: item.graceMonthsBefore,
      intervalMonths: item.intervalMonths,
      operatingPart: item.operatingPart,
      regulationPart: item.regulationPart,
      requirementType: item.requirementType,
      ruleKey: item.ruleKey,
      sourceCitation: item.sourceCitation,
      sourceUrl: item.sourceUrl,
      title: item.title,
      warningLeadDays: item.warningLeadDays,
    }));
  }

  return DEFAULT_CREW_COMPLIANCE_RULES.filter(
    (item) => item.operatingPart === null || uniqueOperatingParts.includes(item.operatingPart),
  );
}

export async function seedDefaultCrewComplianceRules(prisma: PrismaClient): Promise<{
  rules: number;
}> {
  for (const defaultRule of DEFAULT_CREW_COMPLIANCE_RULES) {
    await prisma.crewComplianceRule.upsert({
      where: { ruleKey: defaultRule.ruleKey },
      create: defaultRule,
      update: {
        active: defaultRule.active,
        applicabilitySummary: defaultRule.applicabilitySummary,
        calculationKind: defaultRule.calculationKind,
        effectiveFrom: defaultRule.effectiveFrom,
        effectiveTo: defaultRule.effectiveTo,
        graceMonthsAfter: defaultRule.graceMonthsAfter,
        graceMonthsBefore: defaultRule.graceMonthsBefore,
        intervalMonths: defaultRule.intervalMonths,
        operatingPart: defaultRule.operatingPart,
        regulationPart: defaultRule.regulationPart,
        requirementType: defaultRule.requirementType,
        sourceCitation: defaultRule.sourceCitation,
        sourceUrl: defaultRule.sourceUrl,
        title: defaultRule.title,
        warningLeadDays: defaultRule.warningLeadDays,
      },
    });
  }

  return { rules: DEFAULT_CREW_COMPLIANCE_RULES.length };
}
