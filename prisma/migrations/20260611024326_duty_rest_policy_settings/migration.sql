-- CreateEnum
CREATE TYPE "DutyRestOperationKind" AS ENUM ('ORDINARY_PART_91', 'PART_91K_FRACTIONAL', 'PART_91K_AUGMENTED', 'PART_91K_FLIGHT_ATTENDANT', 'PART_135_SCHEDULED', 'PART_135_UNSCHEDULED', 'PART_135_AUGMENTED', 'PART_135_HEMES', 'PART_135_FLIGHT_ATTENDANT');

-- CreateEnum
CREATE TYPE "DutyRestCalculationBasis" AS ENUM ('UTC', 'LOCAL_STATION', 'HOME_BASE', 'OPERATOR_POLICY');

-- CreateEnum
CREATE TYPE "DutyRestEnforcementMode" AS ENUM ('WARNING_ONLY', 'ACKNOWLEDGMENT_REQUIRED', 'HARD_BLOCK_DEFERRED');

-- CreateEnum
CREATE TYPE "DutyRestRuleSeverity" AS ENUM ('WARN', 'INFO');

-- CreateTable
CREATE TABLE "DutyRestPolicyProfile" (
    "id" TEXT NOT NULL,
    "profileKey" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "operatingAuthorityId" TEXT,
    "authorityRevisionId" TEXT,
    "name" TEXT NOT NULL,
    "operationKind" "DutyRestOperationKind" NOT NULL,
    "calculationBasis" "DutyRestCalculationBasis" NOT NULL DEFAULT 'UTC',
    "enforcementMode" "DutyRestEnforcementMode" NOT NULL DEFAULT 'WARNING_ONLY',
    "ordinaryPart91PolicyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "outsideCommercialFlyingRequired" BOOLEAN NOT NULL DEFAULT false,
    "reserveCountsAsRest" BOOLEAN NOT NULL DEFAULT false,
    "standbyCountsAsDuty" BOOLEAN NOT NULL DEFAULT true,
    "requiredTransportationCountsAsRest" BOOLEAN NOT NULL DEFAULT false,
    "reducedRestRequiresReview" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "sourceSummary" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyRestPolicyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyRestRuleSetting" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "regulationPart" TEXT NOT NULL,
    "crewRoleScope" TEXT NOT NULL,
    "triggerCondition" TEXT,
    "requiredInputs" JSONB,
    "calculationNotes" TEXT,
    "passCondition" TEXT,
    "warningMessage" TEXT NOT NULL,
    "severity" "DutyRestRuleSeverity" NOT NULL DEFAULT 'WARN',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "requiresExternalFlying" BOOLEAN NOT NULL DEFAULT false,
    "requiresOperatorReview" BOOLEAN NOT NULL DEFAULT true,
    "implementationPhase" INTEGER NOT NULL DEFAULT 1,
    "sourceCitation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyRestRuleSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DutyRestPolicyProfile_profileKey_key" ON "DutyRestPolicyProfile"("profileKey");

-- CreateIndex
CREATE INDEX "DutyRestPolicyProfile_operatorId_isDefault_idx" ON "DutyRestPolicyProfile"("operatorId", "isDefault");

-- CreateIndex
CREATE INDEX "DutyRestPolicyProfile_operatingAuthorityId_isDefault_idx" ON "DutyRestPolicyProfile"("operatingAuthorityId", "isDefault");

-- CreateIndex
CREATE INDEX "DutyRestPolicyProfile_authorityRevisionId_idx" ON "DutyRestPolicyProfile"("authorityRevisionId");

-- CreateIndex
CREATE INDEX "DutyRestPolicyProfile_operationKind_idx" ON "DutyRestPolicyProfile"("operationKind");

-- CreateIndex
CREATE INDEX "DutyRestPolicyProfile_effectiveFrom_effectiveTo_idx" ON "DutyRestPolicyProfile"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "DutyRestRuleSetting_ruleKey_idx" ON "DutyRestRuleSetting"("ruleKey");

-- CreateIndex
CREATE INDEX "DutyRestRuleSetting_regulationPart_idx" ON "DutyRestRuleSetting"("regulationPart");

-- CreateIndex
CREATE INDEX "DutyRestRuleSetting_enabled_severity_idx" ON "DutyRestRuleSetting"("enabled", "severity");

-- CreateIndex
CREATE INDEX "DutyRestRuleSetting_requiresOperatorReview_idx" ON "DutyRestRuleSetting"("requiresOperatorReview");

-- CreateIndex
CREATE UNIQUE INDEX "DutyRestRuleSetting_profileId_ruleKey_key" ON "DutyRestRuleSetting"("profileId", "ruleKey");

-- AddForeignKey
ALTER TABLE "DutyRestPolicyProfile" ADD CONSTRAINT "DutyRestPolicyProfile_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyRestPolicyProfile" ADD CONSTRAINT "DutyRestPolicyProfile_operatingAuthorityId_fkey" FOREIGN KEY ("operatingAuthorityId") REFERENCES "OperatingAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyRestPolicyProfile" ADD CONSTRAINT "DutyRestPolicyProfile_authorityRevisionId_fkey" FOREIGN KEY ("authorityRevisionId") REFERENCES "AuthorityRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyRestRuleSetting" ADD CONSTRAINT "DutyRestRuleSetting_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "DutyRestPolicyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
