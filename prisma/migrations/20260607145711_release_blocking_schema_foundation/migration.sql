-- CreateEnum
CREATE TYPE "ReleaseAuthorityClass" AS ENUM ('PART_91_BASELINE', 'PART_91K_FRACTIONAL', 'PART_135_ON_DEMAND');

-- CreateEnum
CREATE TYPE "ReleaseRuleSeverity" AS ENUM ('BLOCK', 'WARN', 'INFO');

-- CreateEnum
CREATE TYPE "ReleaseSnapshotStatus" AS ENUM ('PASS', 'BLOCKED', 'WARNING_ONLY');

-- CreateEnum
CREATE TYPE "ReleaseFindingStatus" AS ENUM ('PASS', 'FAIL', 'WARNING', 'OVERRIDDEN', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ReleaseOverrideDecision" AS ENUM ('APPROVED', 'DENIED', 'VOIDED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ReleaseAuditEventType" AS ENUM ('READINESS_EVALUATED', 'BLOCKER_FOUND', 'OVERRIDE_APPROVED', 'OVERRIDE_VOIDED', 'RELEASE_BLOCKED', 'RELEASE_COMPLETED', 'RELEASE_CANCELLED', 'RELEASE_VOIDED');

-- CreateTable
CREATE TABLE "ReleasePolicyProfile" (
    "id" TEXT NOT NULL,
    "profileKey" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "operatingAuthorityId" TEXT,
    "name" TEXT NOT NULL,
    "authorityClass" "ReleaseAuthorityClass" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleasePolicyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleasePolicyRule" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "readinessCategory" TEXT NOT NULL,
    "severity" "ReleaseRuleSeverity" NOT NULL,
    "isOverridable" BOOLEAN NOT NULL DEFAULT false,
    "requiresSecondApproval" BOOLEAN NOT NULL DEFAULT false,
    "manualEvidenceAllowed" BOOLEAN NOT NULL DEFAULT false,
    "providerEvidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleasePolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseReadinessSnapshot" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "flightReleaseId" TEXT NOT NULL,
    "policyProfileId" TEXT NOT NULL,
    "snapshotStatus" "ReleaseSnapshotStatus" NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedById" TEXT,
    "authorityClass" "ReleaseAuthorityClass" NOT NULL,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseReadinessSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseReadinessFinding" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleKey" TEXT NOT NULL,
    "readinessCategory" TEXT NOT NULL,
    "severity" "ReleaseRuleSeverity" NOT NULL,
    "status" "ReleaseFindingStatus" NOT NULL,
    "isOverridable" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "evidenceRefType" TEXT,
    "evidenceRefId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseReadinessFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseOverride" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "flightReleaseId" TEXT NOT NULL,
    "policyProfileId" TEXT NOT NULL,
    "decision" "ReleaseOverrideDecision" NOT NULL DEFAULT 'APPROVED',
    "reason" TEXT NOT NULL,
    "supportingReference" TEXT,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "approvedById" TEXT,
    "approvedRole" TEXT,
    "attestationText" TEXT,
    "signatureRef" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "ReleaseOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseAuditEvent" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "flightReleaseId" TEXT,
    "snapshotId" TEXT,
    "overrideId" TEXT,
    "eventType" "ReleaseAuditEventType" NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReleasePolicyProfile_profileKey_key" ON "ReleasePolicyProfile"("profileKey");

-- CreateIndex
CREATE INDEX "ReleasePolicyProfile_operatorId_isDefault_idx" ON "ReleasePolicyProfile"("operatorId", "isDefault");

-- CreateIndex
CREATE INDEX "ReleasePolicyProfile_operatingAuthorityId_isDefault_idx" ON "ReleasePolicyProfile"("operatingAuthorityId", "isDefault");

-- CreateIndex
CREATE INDEX "ReleasePolicyProfile_authorityClass_idx" ON "ReleasePolicyProfile"("authorityClass");

-- CreateIndex
CREATE INDEX "ReleasePolicyProfile_effectiveFrom_effectiveTo_idx" ON "ReleasePolicyProfile"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ReleasePolicyRule_ruleKey_idx" ON "ReleasePolicyRule"("ruleKey");

-- CreateIndex
CREATE INDEX "ReleasePolicyRule_readinessCategory_severity_idx" ON "ReleasePolicyRule"("readinessCategory", "severity");

-- CreateIndex
CREATE INDEX "ReleasePolicyRule_effectiveFrom_effectiveTo_idx" ON "ReleasePolicyRule"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "ReleasePolicyRule_profileId_ruleKey_key" ON "ReleasePolicyRule"("profileId", "ruleKey");

-- CreateIndex
CREATE INDEX "ReleaseReadinessSnapshot_flightLegId_evaluatedAt_idx" ON "ReleaseReadinessSnapshot"("flightLegId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "ReleaseReadinessSnapshot_flightReleaseId_evaluatedAt_idx" ON "ReleaseReadinessSnapshot"("flightReleaseId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "ReleaseReadinessSnapshot_policyProfileId_idx" ON "ReleaseReadinessSnapshot"("policyProfileId");

-- CreateIndex
CREATE INDEX "ReleaseReadinessSnapshot_snapshotStatus_idx" ON "ReleaseReadinessSnapshot"("snapshotStatus");

-- CreateIndex
CREATE INDEX "ReleaseReadinessSnapshot_evaluatedById_idx" ON "ReleaseReadinessSnapshot"("evaluatedById");

-- CreateIndex
CREATE INDEX "ReleaseReadinessFinding_snapshotId_severity_idx" ON "ReleaseReadinessFinding"("snapshotId", "severity");

-- CreateIndex
CREATE INDEX "ReleaseReadinessFinding_ruleId_idx" ON "ReleaseReadinessFinding"("ruleId");

-- CreateIndex
CREATE INDEX "ReleaseReadinessFinding_ruleKey_idx" ON "ReleaseReadinessFinding"("ruleKey");

-- CreateIndex
CREATE INDEX "ReleaseReadinessFinding_readinessCategory_status_idx" ON "ReleaseReadinessFinding"("readinessCategory", "status");

-- CreateIndex
CREATE INDEX "ReleaseOverride_findingId_idx" ON "ReleaseOverride"("findingId");

-- CreateIndex
CREATE INDEX "ReleaseOverride_flightLegId_createdAt_idx" ON "ReleaseOverride"("flightLegId", "createdAt");

-- CreateIndex
CREATE INDEX "ReleaseOverride_flightReleaseId_idx" ON "ReleaseOverride"("flightReleaseId");

-- CreateIndex
CREATE INDEX "ReleaseOverride_policyProfileId_idx" ON "ReleaseOverride"("policyProfileId");

-- CreateIndex
CREATE INDEX "ReleaseOverride_decision_idx" ON "ReleaseOverride"("decision");

-- CreateIndex
CREATE INDEX "ReleaseOverride_actorUserId_idx" ON "ReleaseOverride"("actorUserId");

-- CreateIndex
CREATE INDEX "ReleaseOverride_approvedById_idx" ON "ReleaseOverride"("approvedById");

-- CreateIndex
CREATE INDEX "ReleaseAuditEvent_flightLegId_createdAt_idx" ON "ReleaseAuditEvent"("flightLegId", "createdAt");

-- CreateIndex
CREATE INDEX "ReleaseAuditEvent_flightReleaseId_idx" ON "ReleaseAuditEvent"("flightReleaseId");

-- CreateIndex
CREATE INDEX "ReleaseAuditEvent_snapshotId_idx" ON "ReleaseAuditEvent"("snapshotId");

-- CreateIndex
CREATE INDEX "ReleaseAuditEvent_overrideId_idx" ON "ReleaseAuditEvent"("overrideId");

-- CreateIndex
CREATE INDEX "ReleaseAuditEvent_eventType_idx" ON "ReleaseAuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "ReleaseAuditEvent_actorUserId_idx" ON "ReleaseAuditEvent"("actorUserId");

-- AddForeignKey
ALTER TABLE "ReleasePolicyProfile" ADD CONSTRAINT "ReleasePolicyProfile_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleasePolicyProfile" ADD CONSTRAINT "ReleasePolicyProfile_operatingAuthorityId_fkey" FOREIGN KEY ("operatingAuthorityId") REFERENCES "OperatingAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleasePolicyRule" ADD CONSTRAINT "ReleasePolicyRule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ReleasePolicyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseReadinessSnapshot" ADD CONSTRAINT "ReleaseReadinessSnapshot_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseReadinessSnapshot" ADD CONSTRAINT "ReleaseReadinessSnapshot_flightReleaseId_fkey" FOREIGN KEY ("flightReleaseId") REFERENCES "FlightRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseReadinessSnapshot" ADD CONSTRAINT "ReleaseReadinessSnapshot_policyProfileId_fkey" FOREIGN KEY ("policyProfileId") REFERENCES "ReleasePolicyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseReadinessSnapshot" ADD CONSTRAINT "ReleaseReadinessSnapshot_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseReadinessFinding" ADD CONSTRAINT "ReleaseReadinessFinding_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ReleaseReadinessSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseReadinessFinding" ADD CONSTRAINT "ReleaseReadinessFinding_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ReleasePolicyRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseOverride" ADD CONSTRAINT "ReleaseOverride_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "ReleaseReadinessFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseOverride" ADD CONSTRAINT "ReleaseOverride_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseOverride" ADD CONSTRAINT "ReleaseOverride_flightReleaseId_fkey" FOREIGN KEY ("flightReleaseId") REFERENCES "FlightRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseOverride" ADD CONSTRAINT "ReleaseOverride_policyProfileId_fkey" FOREIGN KEY ("policyProfileId") REFERENCES "ReleasePolicyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseOverride" ADD CONSTRAINT "ReleaseOverride_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseOverride" ADD CONSTRAINT "ReleaseOverride_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseAuditEvent" ADD CONSTRAINT "ReleaseAuditEvent_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseAuditEvent" ADD CONSTRAINT "ReleaseAuditEvent_flightReleaseId_fkey" FOREIGN KEY ("flightReleaseId") REFERENCES "FlightRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseAuditEvent" ADD CONSTRAINT "ReleaseAuditEvent_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ReleaseReadinessSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseAuditEvent" ADD CONSTRAINT "ReleaseAuditEvent_overrideId_fkey" FOREIGN KEY ("overrideId") REFERENCES "ReleaseOverride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseAuditEvent" ADD CONSTRAINT "ReleaseAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
