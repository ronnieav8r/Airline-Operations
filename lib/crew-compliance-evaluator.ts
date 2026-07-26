import {
  AircraftType,
  CrewCheckEventType,
  CrewComplianceCalculationKind,
  CrewCertificateType,
  CrewComplianceRecordStatus,
  CrewComplianceRequirementType,
  CrewComplianceResult,
  CrewPlannedComplianceEventStatus,
  CrewPlannedComplianceEventType,
  CrewRecencyEventType,
  CrewTrainingEventType,
  MedicalCertificateClass,
  OperatingPart,
  SeatRole,
} from "@prisma/client";

import { CrewComplianceRuleDefinition } from "@/lib/crew-compliance-rule-defaults";

export type CrewComplianceEvaluationStatus =
  | "CURRENT"
  | "DUE_SOON"
  | "EXPIRED"
  | "MISSING"
  | "NOT_ENOUGH_DATA";

export type CrewComplianceEvidenceRef = {
  id: string;
  type: "CrewCertificate" | "CrewMedical" | "CrewTrainingEvent" | "CrewCheckEvent" | "CrewRecencyEvent";
};

export type CrewComplianceFinding = {
  dueAt: Date | null;
  evidenceRef: CrewComplianceEvidenceRef | null;
  lastSatisfiedAt: Date | null;
  message: string;
  operatingPart: OperatingPart | null;
  plannedEvent:
    | {
        id: string;
        scheduledFor: Date;
      }
    | null;
  requirementType: CrewComplianceRequirementType;
  ruleKey: string;
  sourceCitation: string;
  sourceUrl: string | null;
  status: CrewComplianceEvaluationStatus;
  title: string;
  warningLeadDays: number;
};

export type CrewComplianceEvaluationSummary = {
  findings: CrewComplianceFinding[];
  strongestStatus: CrewComplianceEvaluationStatus;
  warningCount: number;
  warnings: string[];
};

export type CrewComplianceEvaluationInput = {
  certificates?: Array<{
    aircraftType?: AircraftType | null;
    certificateType?: CrewCertificateType;
    coveredOperatingParts?: OperatingPart[];
    expiresAt: Date | null;
    id?: string;
    issuedAt?: Date | null;
    satisfiesRequirements?: CrewComplianceRequirementType[];
    seatRole?: SeatRole | null;
    status: CrewComplianceRecordStatus;
  }>;
  checkEvents: Array<{
    checkType: CrewCheckEventType;
    completedAt: Date;
    coveredOperatingParts?: OperatingPart[];
    expiresAt: Date | null;
    id: string;
    result: CrewComplianceResult;
    satisfiesRequirements?: CrewComplianceRequirementType[];
    seatRole?: SeatRole | null;
    status: CrewComplianceRecordStatus;
  }>;
  dateOfBirth: Date | null;
  firstName?: string;
  lastName?: string;
  medicals: Array<{
    expiresAt: Date | null;
    coveredOperatingParts?: OperatingPart[];
    id: string;
    issuedAt: Date | null;
    medicalClass: MedicalCertificateClass;
    satisfiesRequirements?: CrewComplianceRequirementType[];
    status: CrewComplianceRecordStatus;
  }>;
  plannedComplianceEvents?: Array<{
    eventType: CrewPlannedComplianceEventType;
    id: string;
    scheduledFor: Date;
    status: CrewPlannedComplianceEventStatus;
  }>;
  qualifications?: Array<{
    aircraftType: AircraftType;
    seatRole: SeatRole;
  }>;
  recencyEvents: Array<{
    eventAt: Date;
    coveredOperatingParts?: OperatingPart[];
    id: string;
    quantity?: number | null;
    recencyType: CrewRecencyEventType;
    result: CrewComplianceResult;
    satisfiesRequirements?: CrewComplianceRequirementType[];
    seatRole?: SeatRole | null;
    status: CrewComplianceRecordStatus;
  }>;
  trainingEvents: Array<{
    completedAt: Date;
    coveredOperatingParts?: OperatingPart[];
    expiresAt: Date | null;
    id: string;
    result: CrewComplianceResult;
    satisfiesRequirements?: CrewComplianceRequirementType[];
    status: CrewComplianceRecordStatus;
    trainingType: CrewTrainingEventType;
  }>;
};

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(value: Date, months: number): Date {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function ageAt(dateOfBirth: Date, at: Date): number {
  let age = at.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = at.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return age;
}

function byNewestDate<T>(items: T[], getDate: (item: T) => Date | null): T | null {
  return (
    items
      .filter((item) => getDate(item))
      .sort((left, right) => {
        const leftTime = getDate(left)?.getTime() ?? 0;
        const rightTime = getDate(right)?.getTime() ?? 0;
        return rightTime - leftTime;
      })[0] ?? null
  );
}

function isActiveSatisfactory(status: CrewComplianceRecordStatus, result?: CrewComplianceResult): boolean {
  return status === CrewComplianceRecordStatus.ACTIVE && (!result || result === CrewComplianceResult.SATISFACTORY);
}

function evidenceCoversRule(
  evidence: {
    coveredOperatingParts?: OperatingPart[];
    satisfiesRequirements?: CrewComplianceRequirementType[];
  },
  rule: CrewComplianceRuleDefinition,
): boolean {
  if (
    rule.operatingPart &&
    evidence.coveredOperatingParts &&
    evidence.coveredOperatingParts.length > 0 &&
    !evidence.coveredOperatingParts.includes(rule.operatingPart)
  ) {
    return false;
  }

  if (
    evidence.satisfiesRequirements &&
    evidence.satisfiesRequirements.length > 0 &&
    !evidence.satisfiesRequirements.includes(rule.requirementType)
  ) {
    return false;
  }

  return true;
}

function operatingPartLabel(value: OperatingPart | null): string {
  if (!value) {
    return "shared";
  }

  return value.replace("PART_", "Part ").replace("91K", "91K").replace("135", "135");
}

function dateLabel(value: Date | null): string {
  if (!value) {
    return "not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function statusFromDueDate(dueAt: Date | null, warningLeadDays: number, now: Date): CrewComplianceEvaluationStatus {
  if (!dueAt) {
    return "NOT_ENOUGH_DATA";
  }

  if (dueAt < now) {
    return "EXPIRED";
  }

  if (dueAt <= addDays(now, warningLeadDays)) {
    return "DUE_SOON";
  }

  return "CURRENT";
}

function strongestStatus(findings: CrewComplianceFinding[]): CrewComplianceEvaluationStatus {
  const order: CrewComplianceEvaluationStatus[] = [
    "EXPIRED",
    "MISSING",
    "NOT_ENOUGH_DATA",
    "DUE_SOON",
    "CURRENT",
  ];

  return order.find((status) => findings.some((finding) => finding.status === status)) ?? "CURRENT";
}

function plannedEventTypesForRule(rule: CrewComplianceRuleDefinition): CrewPlannedComplianceEventType[] {
  if (rule.requirementType === CrewComplianceRequirementType.MEDICAL) {
    return [CrewPlannedComplianceEventType.MEDICAL_RENEWAL];
  }
  if (rule.requirementType === CrewComplianceRequirementType.RECURRENT_TRAINING) {
    return [CrewPlannedComplianceEventType.RECURRENT_TRAINING];
  }
  if (rule.requirementType === CrewComplianceRequirementType.PROFICIENCY_CHECK) {
    return [CrewPlannedComplianceEventType.PROFICIENCY_CHECK];
  }
  if (rule.requirementType === CrewComplianceRequirementType.COMPETENCY_CHECK) {
    return [CrewPlannedComplianceEventType.COMPETENCY_CHECK];
  }
  if (rule.requirementType === CrewComplianceRequirementType.LINE_CHECK) {
    return [CrewPlannedComplianceEventType.LINE_CHECK];
  }
  return [CrewPlannedComplianceEventType.RECENCY];
}

function findPlannedEvent(
  crewMember: CrewComplianceEvaluationInput,
  rule: CrewComplianceRuleDefinition,
  dueAt: Date | null,
  now: Date,
): CrewComplianceFinding["plannedEvent"] {
  const matchingTypes = plannedEventTypesForRule(rule);
  const planned = (crewMember.plannedComplianceEvents ?? [])
    .filter((event) => event.status === CrewPlannedComplianceEventStatus.SCHEDULED)
    .filter((event) => event.scheduledFor >= now)
    .filter((event) => matchingTypes.includes(event.eventType))
    .filter((event) => !dueAt || event.scheduledFor <= dueAt)
    .sort((left, right) => left.scheduledFor.getTime() - right.scheduledFor.getTime())[0];

  return planned ? { id: planned.id, scheduledFor: planned.scheduledFor } : null;
}

function calculateMedicalDueAt(
  medical: CrewComplianceEvaluationInput["medicals"][number],
  dateOfBirth: Date | null,
): {
  dueAt: Date | null;
  message: string | null;
} {
  if (medical.expiresAt) {
    return { dueAt: medical.expiresAt, message: null };
  }

  if (!medical.issuedAt) {
    return {
      dueAt: null,
      message: "Medical issue date is missing, so the medical due date cannot be calculated.",
    };
  }

  if (
    medical.medicalClass === MedicalCertificateClass.BASICMED ||
    medical.medicalClass === MedicalCertificateClass.OTHER
  ) {
    return {
      dueAt: null,
      message: "Medical expiration should be entered manually for this medical class.",
    };
  }

  if (
    (medical.medicalClass === MedicalCertificateClass.FIRST_CLASS ||
      medical.medicalClass === MedicalCertificateClass.THIRD_CLASS) &&
    !dateOfBirth
  ) {
    return {
      dueAt: null,
      message: "Date of birth is missing, so age-based medical duration cannot be calculated.",
    };
  }

  const age = dateOfBirth ? ageAt(dateOfBirth, medical.issuedAt) : 0;

  if (medical.medicalClass === MedicalCertificateClass.FIRST_CLASS) {
    return { dueAt: addMonths(medical.issuedAt, age >= 40 ? 6 : 12), message: null };
  }

  if (medical.medicalClass === MedicalCertificateClass.SECOND_CLASS) {
    return { dueAt: addMonths(medical.issuedAt, 12), message: null };
  }

  return { dueAt: addMonths(medical.issuedAt, age >= 40 ? 24 : 60), message: null };
}

function latestMedicalFinding(
  crewMember: CrewComplianceEvaluationInput,
  rule: CrewComplianceRuleDefinition,
  now: Date,
): CrewComplianceFinding {
  const medical = byNewestDate(
    crewMember.medicals.filter((item) => isActiveSatisfactory(item.status) && evidenceCoversRule(item, rule)),
    (item) => item.expiresAt ?? item.issuedAt,
  );

  if (!medical) {
    return buildFinding(crewMember, rule, "MISSING", null, null, null, "No active medical certificate evidence is recorded.", now);
  }

  const calculated = calculateMedicalDueAt(medical, crewMember.dateOfBirth);
  const status = calculated.message
    ? "NOT_ENOUGH_DATA"
    : statusFromDueDate(calculated.dueAt, rule.warningLeadDays, now);
  const message =
    calculated.message ??
    `${rule.title} is ${status.toLowerCase().replaceAll("_", " ")}; due ${dateLabel(calculated.dueAt)}.`;

  return buildFinding(
    crewMember,
    rule,
    status,
    calculated.dueAt,
    medical.issuedAt,
    { id: medical.id, type: "CrewMedical" },
    message,
    now,
  );
}

function latestTrainingForRule(
  crewMember: CrewComplianceEvaluationInput,
  rule: CrewComplianceRuleDefinition,
) {
  const trainingTypes =
    rule.requirementType === CrewComplianceRequirementType.RECURRENT_TRAINING
      ? [CrewTrainingEventType.RECURRENT]
      : Object.values(CrewTrainingEventType);

  return byNewestDate(
    crewMember.trainingEvents.filter(
      (item) =>
        isActiveSatisfactory(item.status, item.result) &&
        trainingTypes.includes(item.trainingType) &&
        evidenceCoversRule(item, rule),
    ),
    (item) => item.completedAt,
  );
}

function latestCheckForRule(crewMember: CrewComplianceEvaluationInput, rule: CrewComplianceRuleDefinition) {
  const checkTypes: CrewCheckEventType[] =
    rule.requirementType === CrewComplianceRequirementType.PROFICIENCY_CHECK
      ? [CrewCheckEventType.PROFICIENCY]
      : rule.requirementType === CrewComplianceRequirementType.COMPETENCY_CHECK
        ? [CrewCheckEventType.COMPETENCY]
        : rule.requirementType === CrewComplianceRequirementType.LINE_CHECK
          ? [CrewCheckEventType.LINE_CHECK, CrewCheckEventType.ROUTE_CHECK]
          : rule.requirementType === CrewComplianceRequirementType.INSTRUMENT_CHECK
            ? [CrewCheckEventType.INSTRUMENT_CHECK]
            : Object.values(CrewCheckEventType);

  return byNewestDate(
    crewMember.checkEvents.filter(
      (item) =>
        isActiveSatisfactory(item.status, item.result) &&
        checkTypes.includes(item.checkType) &&
        evidenceCoversRule(item, rule),
    ),
    (item) => item.completedAt,
  );
}

function latestRecencyForRule(crewMember: CrewComplianceEvaluationInput, rule: CrewComplianceRuleDefinition) {
  const recencyTypes =
    rule.requirementType === CrewComplianceRequirementType.INSTRUMENT_CHECK
      ? [CrewRecencyEventType.INSTRUMENT_APPROACH, CrewRecencyEventType.HOLDING]
      : rule.requirementType === CrewComplianceRequirementType.RECENCY
        ? [CrewRecencyEventType.TAKEOFF_LANDING]
        : Object.values(CrewRecencyEventType);

  return byNewestDate(
    crewMember.recencyEvents.filter(
      (item) =>
        isActiveSatisfactory(item.status, item.result) &&
        recencyTypes.includes(item.recencyType) &&
        evidenceCoversRule(item, rule),
    ),
    (item) => item.eventAt,
  );
}

function qualificationAircraftTypes(
  crewMember: CrewComplianceEvaluationInput,
  seatRole: SeatRole,
): AircraftType[] {
  const qualifications =
    "qualifications" in crewMember && Array.isArray(crewMember.qualifications)
      ? (crewMember.qualifications as Array<{ aircraftType: AircraftType; seatRole: SeatRole }>)
      : [];

  return Array.from(
    new Set(
      qualifications
        .filter((qualification) => qualification.seatRole === seatRole)
        .map((qualification) => qualification.aircraftType),
    ),
  );
}

function certificateMatchesAircraftAndSeat(
  certificate: NonNullable<CrewComplianceEvaluationInput["certificates"]>[number],
  aircraftType: AircraftType,
  seatRole: SeatRole,
): boolean {
  return (
    certificate.aircraftType === aircraftType &&
    (!certificate.seatRole || certificate.seatRole === seatRole)
  );
}

function certificateFinding(
  crewMember: CrewComplianceEvaluationInput,
  rule: CrewComplianceRuleDefinition,
  now: Date,
): CrewComplianceFinding {
  const seatRole =
    rule.requirementType === CrewComplianceRequirementType.SIC_QUALIFICATION ? SeatRole.FO : SeatRole.CPT;
  const requiredAircraftTypes = qualificationAircraftTypes(crewMember, seatRole);

  if (requiredAircraftTypes.length === 0) {
    return buildFinding(
      crewMember,
      rule,
      "CURRENT",
      null,
      null,
      null,
      `${rule.title} is not applicable to the current ${seatRole === SeatRole.CPT ? "CPT" : "FO"} qualification set.`,
      now,
    );
  }

  const certificates = (crewMember.certificates ?? []).filter(
    (certificate) =>
      certificate.status === CrewComplianceRecordStatus.ACTIVE &&
      evidenceCoversRule(certificate, rule),
  );
  const acceptableCertificateTypes: CrewCertificateType[] =
    rule.requirementType === CrewComplianceRequirementType.TYPE_RATING
      ? [CrewCertificateType.TYPE_RATING]
      : [CrewCertificateType.TYPE_RATING, CrewCertificateType.AIRCRAFT_RATING, CrewCertificateType.ENDORSEMENT];
  const missingAircraftTypes = requiredAircraftTypes.filter(
    (aircraftType) =>
      !certificates.some(
        (certificate) =>
          certificate.certificateType !== undefined &&
          acceptableCertificateTypes.includes(certificate.certificateType) &&
          certificateMatchesAircraftAndSeat(certificate, aircraftType, seatRole),
      ),
  );

  if (missingAircraftTypes.length > 0) {
    return buildFinding(
      crewMember,
      rule,
      "MISSING",
      null,
      null,
      null,
      `${rule.title} evidence is missing for ${missingAircraftTypes.join(", ")} ${seatRole === SeatRole.CPT ? "CPT/PIC" : "FO/SIC"} qualification.`,
      now,
    );
  }

  const evidence = certificates.find((certificate) =>
    requiredAircraftTypes.some((aircraftType) =>
      certificate.certificateType !== undefined &&
      acceptableCertificateTypes.includes(certificate.certificateType) &&
      certificateMatchesAircraftAndSeat(certificate, aircraftType, seatRole),
    ),
  );

  return buildFinding(
    crewMember,
    rule,
    "CURRENT",
    evidence?.expiresAt ?? null,
    evidence?.issuedAt ?? null,
    evidence?.id ? { id: evidence.id, type: "CrewCertificate" } : null,
    `${rule.title} evidence is recorded for ${requiredAircraftTypes.join(", ")}.`,
    now,
  );
}

function fixedIntervalFinding(
  crewMember: CrewComplianceEvaluationInput,
  rule: CrewComplianceRuleDefinition,
  now: Date,
): CrewComplianceFinding {
  const training = latestTrainingForRule(crewMember, rule);
  const check = latestCheckForRule(crewMember, rule);
  const recency = rule.calculationKind === CrewComplianceCalculationKind.IPC_61_57 ? latestRecencyForRule(crewMember, rule) : null;
  const candidates = [
    training
      ? {
          dueAt: training.expiresAt ?? (rule.intervalMonths ? addMonths(training.completedAt, rule.intervalMonths) : null),
          evidenceRef: { id: training.id, type: "CrewTrainingEvent" as const },
          lastSatisfiedAt: training.completedAt,
        }
      : null,
    check
      ? {
          dueAt: check.expiresAt ?? (rule.intervalMonths ? addMonths(check.completedAt, rule.intervalMonths) : null),
          evidenceRef: { id: check.id, type: "CrewCheckEvent" as const },
          lastSatisfiedAt: check.completedAt,
        }
      : null,
    recency
      ? {
          dueAt: rule.intervalMonths ? addMonths(recency.eventAt, rule.intervalMonths) : null,
          evidenceRef: { id: recency.id, type: "CrewRecencyEvent" as const },
          lastSatisfiedAt: recency.eventAt,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  const latest = candidates.sort(
    (left, right) => right.lastSatisfiedAt.getTime() - left.lastSatisfiedAt.getTime(),
  )[0];

  if (!latest) {
    return buildFinding(
      crewMember,
      rule,
      "MISSING",
      null,
      null,
      null,
      `No active satisfactory ${rule.title.toLowerCase()} evidence is recorded.`,
      now,
    );
  }

  const status = statusFromDueDate(latest.dueAt, rule.warningLeadDays, now);
  return buildFinding(
    crewMember,
    rule,
    status,
    latest.dueAt,
    latest.lastSatisfiedAt,
    latest.evidenceRef,
    `${rule.title} is ${status.toLowerCase().replaceAll("_", " ")}; due ${dateLabel(latest.dueAt)}.`,
    now,
  );
}

function recency90Finding(
  crewMember: CrewComplianceEvaluationInput,
  rule: CrewComplianceRuleDefinition,
  now: Date,
): CrewComplianceFinding {
  const recency = latestRecencyForRule(crewMember, rule);

  if (!recency) {
    return buildFinding(
      crewMember,
      rule,
      "MISSING",
      null,
      null,
      null,
      `No active satisfactory ${rule.title.toLowerCase()} evidence is recorded.`,
      now,
    );
  }

  const dueAt = addDays(recency.eventAt, 90);
  const status = statusFromDueDate(dueAt, rule.warningLeadDays, now);

  return buildFinding(
    crewMember,
    rule,
    status,
    dueAt,
    recency.eventAt,
    { id: recency.id, type: "CrewRecencyEvent" },
    `${rule.title} is ${status.toLowerCase().replaceAll("_", " ")}; due ${dateLabel(dueAt)}.`,
    now,
  );
}

function buildFinding(
  crewMember: CrewComplianceEvaluationInput,
  rule: CrewComplianceRuleDefinition,
  status: CrewComplianceEvaluationStatus,
  dueAt: Date | null,
  lastSatisfiedAt: Date | null,
  evidenceRef: CrewComplianceEvidenceRef | null,
  message: string,
  now: Date,
): CrewComplianceFinding {
  const plannedEvent = findPlannedEvent(crewMember, rule, dueAt, now);
  const plannedMessage = plannedEvent ? ` Planned ${dateLabel(plannedEvent.scheduledFor)}; planned items do not satisfy the rule until completed.` : "";
  const context = operatingPartLabel(rule.operatingPart);

  return {
    dueAt,
    evidenceRef,
    lastSatisfiedAt,
    message: `${context}: ${message}${plannedMessage}`,
    operatingPart: rule.operatingPart,
    plannedEvent,
    requirementType: rule.requirementType,
    ruleKey: rule.ruleKey,
    sourceCitation: rule.sourceCitation,
    sourceUrl: rule.sourceUrl,
    status,
    title: rule.title,
    warningLeadDays: rule.warningLeadDays,
  };
}

function evaluateRule(
  crewMember: CrewComplianceEvaluationInput,
  rule: CrewComplianceRuleDefinition,
  now: Date,
): CrewComplianceFinding {
  if (
    rule.requirementType === CrewComplianceRequirementType.TYPE_RATING ||
    rule.requirementType === CrewComplianceRequirementType.SIC_QUALIFICATION
  ) {
    return certificateFinding(crewMember, rule, now);
  }

  if (rule.calculationKind === CrewComplianceCalculationKind.MEDICAL_61_23) {
    return latestMedicalFinding(crewMember, rule, now);
  }

  if (rule.calculationKind === CrewComplianceCalculationKind.RECENCY_90_DAYS) {
    return recency90Finding(crewMember, rule, now);
  }

  if (
    rule.calculationKind === CrewComplianceCalculationKind.FIXED_INTERVAL_MONTHS ||
    rule.calculationKind === CrewComplianceCalculationKind.IPC_61_57
  ) {
    return fixedIntervalFinding(crewMember, rule, now);
  }

  return buildFinding(
    crewMember,
    rule,
    "NOT_ENOUGH_DATA",
    null,
    null,
    null,
    "This requirement is manual-only in the current compliance rule catalog.",
    now,
  );
}

export function evaluateCrewCompliance(
  crewMember: CrewComplianceEvaluationInput,
  rules: CrewComplianceRuleDefinition[],
  now = new Date(),
): CrewComplianceEvaluationSummary {
  const findings = rules.filter((rule) => rule.active).map((rule) => evaluateRule(crewMember, rule, now));
  const warnings = findings
    .filter((finding) => finding.status !== "CURRENT")
    .map((finding) => `${finding.title}: ${finding.message}`);

  return {
    findings,
    strongestStatus: strongestStatus(findings),
    warningCount: warnings.length,
    warnings,
  };
}
