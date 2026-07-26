import {
  AircraftType,
  CrewCertificateType,
  CrewComplianceRecordStatus,
  CrewComplianceRequirementType,
  CrewComplianceResult,
  CrewPlannedComplianceEventStatus,
  CrewPlannedComplianceEventType,
  CrewCheckEventType,
  CrewRecencyEventType,
  CrewTrainingEventType,
  MedicalCertificateClass,
  OperatingPart,
  SeatRole,
} from "@prisma/client";

import { evaluateCrewCompliance } from "../lib/crew-compliance-evaluator";
import { DEFAULT_CREW_COMPLIANCE_RULES } from "../lib/crew-compliance-rule-defaults";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function rule(ruleKey: string) {
  const match = DEFAULT_CREW_COMPLIANCE_RULES.find((item) => item.ruleKey === ruleKey);

  if (!match) {
    throw new Error(`Missing rule fixture ${ruleKey}.`);
  }

  return match;
}

function emptyCrew(overrides = {}) {
  return {
    checkEvents: [],
    dateOfBirth: null,
    medicals: [],
    plannedComplianceEvents: [],
    recencyEvents: [],
    trainingEvents: [],
    ...overrides,
  };
}

const now = new Date("2026-06-15T12:00:00Z");
const medicalRule = rule("crew.medical.61-23");

const missingDob = evaluateCrewCompliance(
  emptyCrew({
    medicals: [
      {
        expiresAt: null,
        id: "medical-missing-dob",
        issuedAt: new Date("2026-06-01T00:00:00Z"),
        medicalClass: MedicalCertificateClass.FIRST_CLASS,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    ],
  }),
  [medicalRule],
  now,
);
assert(missingDob.findings[0]?.status === "NOT_ENOUGH_DATA", "Missing DOB should block age-based medical calculation.");

const underForty = evaluateCrewCompliance(
  emptyCrew({
    dateOfBirth: new Date("1987-07-01T00:00:00Z"),
    medicals: [
      {
        expiresAt: null,
        id: "medical-under-40",
        issuedAt: new Date("2026-06-01T00:00:00Z"),
        medicalClass: MedicalCertificateClass.FIRST_CLASS,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    ],
  }),
  [medicalRule],
  now,
);
assert(
  underForty.findings[0]?.dueAt?.toISOString().startsWith("2027-06-01") === true,
  "First-class medical under 40 should calculate a 12-month due date.",
);

const overForty = evaluateCrewCompliance(
  emptyCrew({
    dateOfBirth: new Date("1980-01-01T00:00:00Z"),
    medicals: [
      {
        expiresAt: null,
        id: "medical-over-40",
        issuedAt: new Date("2026-06-01T00:00:00Z"),
        medicalClass: MedicalCertificateClass.FIRST_CLASS,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    ],
  }),
  [medicalRule],
  now,
);
assert(
  overForty.findings[0]?.dueAt?.toISOString().startsWith("2026-12-01") === true,
  "First-class medical 40 or older should calculate a 6-month due date.",
);

const ignoredExpiredRecord = evaluateCrewCompliance(
  emptyCrew({
    medicals: [
      {
        expiresAt: new Date("2027-06-01T00:00:00Z"),
        id: "expired-status-medical",
        issuedAt: new Date("2026-06-01T00:00:00Z"),
        medicalClass: MedicalCertificateClass.SECOND_CLASS,
        status: CrewComplianceRecordStatus.EXPIRED,
      },
    ],
  }),
  [medicalRule],
  now,
);
assert(ignoredExpiredRecord.findings[0]?.status === "MISSING", "Expired-status evidence should not satisfy rules.");

const plannedRecurrent = evaluateCrewCompliance(
  emptyCrew({
    plannedComplianceEvents: [
      {
        eventType: CrewPlannedComplianceEventType.RECURRENT_TRAINING,
        id: "planned-recurrent",
        scheduledFor: new Date("2026-06-25T00:00:00Z"),
        status: CrewPlannedComplianceEventStatus.SCHEDULED,
      },
    ],
  }),
  [rule("crew.part135.recurrent.135-293")],
  now,
);
assert(plannedRecurrent.findings[0]?.status === "MISSING", "Planned events should not satisfy recurrent rules.");
assert(plannedRecurrent.findings[0]?.plannedEvent?.id === "planned-recurrent", "Planned events should be annotated.");

const part135DueSoon = evaluateCrewCompliance(
  emptyCrew({
    trainingEvents: [
      {
        completedAt: new Date("2025-07-01T00:00:00Z"),
        expiresAt: null,
        id: "recurrent-training",
        result: CrewComplianceResult.SATISFACTORY,
        status: CrewComplianceRecordStatus.ACTIVE,
        trainingType: CrewTrainingEventType.RECURRENT,
      },
    ],
  }),
  [rule("crew.part135.recurrent.135-293")],
  now,
);
assert(part135DueSoon.findings[0]?.status === "DUE_SOON", "Part 135 recurrent training should warn inside lead window.");

const part91kRoleIntervals = evaluateCrewCompliance(
  emptyCrew({
    checkEvents: [
      {
        checkType: CrewCheckEventType.INSTRUMENT_CHECK,
        completedAt: new Date("2025-12-15T00:00:00Z"),
        expiresAt: null,
        id: "instrument-check",
        result: CrewComplianceResult.SATISFACTORY,
        seatRole: null,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    ],
    recencyEvents: [
      {
        eventAt: new Date("2025-12-15T00:00:00Z"),
        id: "instrument-approach",
        quantity: 6,
        recencyType: CrewRecencyEventType.INSTRUMENT_APPROACH,
        result: CrewComplianceResult.SATISFACTORY,
        seatRole: null,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    ],
  }),
  [rule("crew.part91k.pic-ipc.91-1069"), rule("crew.part91k.sic-ipc.91-1069")],
  now,
);
assert(part91kRoleIntervals.findings[0]?.status === "EXPIRED", "Part 91K PIC IPC should use the 6-month interval.");
assert(part91kRoleIntervals.findings[1]?.status === "CURRENT", "Part 91K SIC IPC should use the 12-month interval.");

const picTypeRatingMissing = evaluateCrewCompliance(
  emptyCrew({
    certificates: [],
    qualifications: [{ aircraftType: AircraftType.CL_65, seatRole: SeatRole.CPT }],
  }),
  [rule("crew.pic.type-rating.61-31")],
  now,
);
assert(
  picTypeRatingMissing.findings[0]?.status === "MISSING",
  "CPT/PIC CL-65 qualification should require type-rating certificate evidence.",
);

const picTypeRatingCurrent = evaluateCrewCompliance(
  emptyCrew({
    certificates: [
      {
        aircraftType: AircraftType.CL_65,
        certificateType: CrewCertificateType.TYPE_RATING,
        coveredOperatingParts: [],
        expiresAt: null,
        id: "cl65-pic-type",
        issuedAt: new Date("2025-12-01T00:00:00Z"),
        satisfiesRequirements: [CrewComplianceRequirementType.TYPE_RATING],
        seatRole: SeatRole.CPT,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    ],
    qualifications: [{ aircraftType: AircraftType.CL_65, seatRole: SeatRole.CPT }],
  }),
  [rule("crew.pic.type-rating.61-31")],
  now,
);
assert(
  picTypeRatingCurrent.findings[0]?.status === "CURRENT",
  "CPT/PIC type-rating certificate should satisfy PIC type-rating rule.",
);

const sicQualificationCurrent = evaluateCrewCompliance(
  emptyCrew({
    certificates: [
      {
        aircraftType: AircraftType.CL_65,
        certificateType: CrewCertificateType.AIRCRAFT_RATING,
        coveredOperatingParts: [],
        expiresAt: null,
        id: "cl65-sic-qualification",
        issuedAt: new Date("2025-12-01T00:00:00Z"),
        satisfiesRequirements: [CrewComplianceRequirementType.SIC_QUALIFICATION],
        seatRole: SeatRole.FO,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    ],
    qualifications: [{ aircraftType: AircraftType.CL_65, seatRole: SeatRole.FO }],
  }),
  [rule("crew.sic.qualification.61-55")],
  now,
);
assert(
  sicQualificationCurrent.findings[0]?.status === "CURRENT",
  "FO/SIC qualification evidence should satisfy SIC qualification rule.",
);

const scopedInstrumentCheck = evaluateCrewCompliance(
  emptyCrew({
    checkEvents: [
      {
        checkType: CrewCheckEventType.INSTRUMENT_CHECK,
        completedAt: new Date("2026-03-01T00:00:00Z"),
        coveredOperatingParts: [OperatingPart.PART_135],
        expiresAt: null,
        id: "part135-ifr-check",
        result: CrewComplianceResult.SATISFACTORY,
        satisfiesRequirements: [CrewComplianceRequirementType.INSTRUMENT_CHECK],
        seatRole: SeatRole.CPT,
        status: CrewComplianceRecordStatus.ACTIVE,
      },
    ],
  }),
  [rule("crew.part135.pic-ifr.135-297"), rule("crew.part91k.pic-ipc.91-1069")],
  now,
);
assert(
  scopedInstrumentCheck.findings[0]?.status === "CURRENT",
  "Part 135 covered instrument check should satisfy Part 135 PIC IFR rule.",
);
assert(
  scopedInstrumentCheck.findings[1]?.status === "MISSING",
  "Part 135 scoped check should not satisfy Part 91K IPC rule.",
);

console.log("Crew compliance evaluator smoke passed.");
