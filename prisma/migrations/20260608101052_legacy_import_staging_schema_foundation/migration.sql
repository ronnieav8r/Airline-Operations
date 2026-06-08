-- CreateEnum
CREATE TYPE "ImportDomain" AS ENUM ('AIRCRAFT_MAINTENANCE_AIRWORTHINESS', 'FLIGHTLEG_HISTORY', 'CREW_COMPLIANCE', 'MANIFEST_HISTORY', 'DISPATCH_RELEASE_EVIDENCE');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('DRAFT', 'STAGED', 'VALIDATED', 'REVIEW_READY', 'APPROVED', 'REJECTED', 'APPLIED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('CSV', 'XLSX', 'JSON', 'PDF_REFERENCE', 'MANUAL_REFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ImportValidationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'WARNING', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "ImportFindingSeverity" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "ImportMappingDecisionStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "importDomain" "ImportDomain" NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceSystem" TEXT,
    "batchKey" TEXT,
    "summary" JSONB,
    "notes" TEXT,
    "createdById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSource" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" "ImportSourceType" NOT NULL,
    "sourceHash" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportStagingRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceRowNumber" INTEGER,
    "sourceExternalId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "rawRow" JSONB NOT NULL,
    "mappedTargetType" TEXT,
    "mappedTargetKey" TEXT,
    "validationStatus" "ImportValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportStagingRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportValidationFinding" (
    "id" TEXT NOT NULL,
    "stagingRowId" TEXT NOT NULL,
    "severity" "ImportFindingSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "fieldName" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportValidationFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportMappingDecision" (
    "id" TEXT NOT NULL,
    "stagingRowId" TEXT NOT NULL,
    "decision" "ImportMappingDecisionStatus" NOT NULL DEFAULT 'PROPOSED',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "reason" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportMappingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_batchKey_key" ON "ImportBatch"("batchKey");

-- CreateIndex
CREATE INDEX "ImportBatch_importDomain_status_idx" ON "ImportBatch"("importDomain", "status");

-- CreateIndex
CREATE INDEX "ImportBatch_sourceSystem_idx" ON "ImportBatch"("sourceSystem");

-- CreateIndex
CREATE INDEX "ImportBatch_createdById_idx" ON "ImportBatch"("createdById");

-- CreateIndex
CREATE INDEX "ImportBatch_reviewedById_idx" ON "ImportBatch"("reviewedById");

-- CreateIndex
CREATE INDEX "ImportSource_batchId_idx" ON "ImportSource"("batchId");

-- CreateIndex
CREATE INDEX "ImportSource_sourceType_idx" ON "ImportSource"("sourceType");

-- CreateIndex
CREATE INDEX "ImportSource_sourceHash_idx" ON "ImportSource"("sourceHash");

-- CreateIndex
CREATE UNIQUE INDEX "ImportStagingRow_idempotencyKey_key" ON "ImportStagingRow"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ImportStagingRow_batchId_validationStatus_idx" ON "ImportStagingRow"("batchId", "validationStatus");

-- CreateIndex
CREATE INDEX "ImportStagingRow_sourceId_idx" ON "ImportStagingRow"("sourceId");

-- CreateIndex
CREATE INDEX "ImportStagingRow_sourceExternalId_idx" ON "ImportStagingRow"("sourceExternalId");

-- CreateIndex
CREATE INDEX "ImportStagingRow_mappedTargetType_mappedTargetKey_idx" ON "ImportStagingRow"("mappedTargetType", "mappedTargetKey");

-- CreateIndex
CREATE INDEX "ImportValidationFinding_stagingRowId_idx" ON "ImportValidationFinding"("stagingRowId");

-- CreateIndex
CREATE INDEX "ImportValidationFinding_severity_idx" ON "ImportValidationFinding"("severity");

-- CreateIndex
CREATE INDEX "ImportValidationFinding_code_idx" ON "ImportValidationFinding"("code");

-- CreateIndex
CREATE INDEX "ImportMappingDecision_stagingRowId_idx" ON "ImportMappingDecision"("stagingRowId");

-- CreateIndex
CREATE INDEX "ImportMappingDecision_decision_idx" ON "ImportMappingDecision"("decision");

-- CreateIndex
CREATE INDEX "ImportMappingDecision_targetType_targetId_idx" ON "ImportMappingDecision"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ImportMappingDecision_decidedById_idx" ON "ImportMappingDecision"("decidedById");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSource" ADD CONSTRAINT "ImportSource_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportStagingRow" ADD CONSTRAINT "ImportStagingRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportStagingRow" ADD CONSTRAINT "ImportStagingRow_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ImportSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportValidationFinding" ADD CONSTRAINT "ImportValidationFinding_stagingRowId_fkey" FOREIGN KEY ("stagingRowId") REFERENCES "ImportStagingRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMappingDecision" ADD CONSTRAINT "ImportMappingDecision_stagingRowId_fkey" FOREIGN KEY ("stagingRowId") REFERENCES "ImportStagingRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMappingDecision" ADD CONSTRAINT "ImportMappingDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
