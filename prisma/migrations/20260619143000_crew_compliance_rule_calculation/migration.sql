-- CreateEnum
CREATE TYPE "CrewComplianceRequirementType" AS ENUM ('MEDICAL', 'FLIGHT_REVIEW', 'RECURRENT_TRAINING', 'PROFICIENCY_CHECK', 'COMPETENCY_CHECK', 'INSTRUMENT_CHECK', 'LINE_CHECK', 'RECENCY');

-- CreateEnum
CREATE TYPE "CrewComplianceCalculationKind" AS ENUM ('MEDICAL_61_23', 'FIXED_INTERVAL_MONTHS', 'RECENCY_90_DAYS', 'IPC_61_57', 'MANUAL_ONLY');

-- AlterTable
ALTER TABLE "CrewMember" ADD COLUMN "dateOfBirth" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CrewComplianceRule" (
    "id" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "operatingPart" "OperatingPart",
    "requirementType" "CrewComplianceRequirementType" NOT NULL,
    "calculationKind" "CrewComplianceCalculationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "regulationPart" TEXT NOT NULL,
    "sourceCitation" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "applicabilitySummary" TEXT,
    "warningLeadDays" INTEGER NOT NULL DEFAULT 30,
    "intervalMonths" INTEGER,
    "graceMonthsBefore" INTEGER NOT NULL DEFAULT 0,
    "graceMonthsAfter" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrewComplianceRule_ruleKey_key" ON "CrewComplianceRule"("ruleKey");

-- CreateIndex
CREATE INDEX "CrewComplianceRule_operatingPart_active_idx" ON "CrewComplianceRule"("operatingPart", "active");

-- CreateIndex
CREATE INDEX "CrewComplianceRule_requirementType_active_idx" ON "CrewComplianceRule"("requirementType", "active");

-- CreateIndex
CREATE INDEX "CrewComplianceRule_calculationKind_active_idx" ON "CrewComplianceRule"("calculationKind", "active");
