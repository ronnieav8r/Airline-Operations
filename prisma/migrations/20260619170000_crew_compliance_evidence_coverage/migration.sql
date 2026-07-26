-- Add explicit cross-authority coverage metadata for crew compliance evidence.
ALTER TYPE "CrewComplianceRequirementType" ADD VALUE IF NOT EXISTS 'TYPE_RATING';
ALTER TYPE "CrewComplianceRequirementType" ADD VALUE IF NOT EXISTS 'SIC_QUALIFICATION';

ALTER TABLE "CrewCertificate"
  ADD COLUMN "coveredOperatingParts" "OperatingPart"[] NOT NULL DEFAULT ARRAY[]::"OperatingPart"[],
  ADD COLUMN "satisfiesRequirements" "CrewComplianceRequirementType"[] NOT NULL DEFAULT ARRAY[]::"CrewComplianceRequirementType"[];

ALTER TABLE "CrewMedical"
  ADD COLUMN "coveredOperatingParts" "OperatingPart"[] NOT NULL DEFAULT ARRAY[]::"OperatingPart"[],
  ADD COLUMN "satisfiesRequirements" "CrewComplianceRequirementType"[] NOT NULL DEFAULT ARRAY[]::"CrewComplianceRequirementType"[];

ALTER TABLE "CrewTrainingEvent"
  ADD COLUMN "coveredOperatingParts" "OperatingPart"[] NOT NULL DEFAULT ARRAY[]::"OperatingPart"[],
  ADD COLUMN "satisfiesRequirements" "CrewComplianceRequirementType"[] NOT NULL DEFAULT ARRAY[]::"CrewComplianceRequirementType"[];

ALTER TABLE "CrewCheckEvent"
  ADD COLUMN "coveredOperatingParts" "OperatingPart"[] NOT NULL DEFAULT ARRAY[]::"OperatingPart"[],
  ADD COLUMN "satisfiesRequirements" "CrewComplianceRequirementType"[] NOT NULL DEFAULT ARRAY[]::"CrewComplianceRequirementType"[];

ALTER TABLE "CrewRecencyEvent"
  ADD COLUMN "coveredOperatingParts" "OperatingPart"[] NOT NULL DEFAULT ARRAY[]::"OperatingPart"[],
  ADD COLUMN "satisfiesRequirements" "CrewComplianceRequirementType"[] NOT NULL DEFAULT ARRAY[]::"CrewComplianceRequirementType"[];
