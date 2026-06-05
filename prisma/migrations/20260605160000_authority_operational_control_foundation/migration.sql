-- CreateEnum
CREATE TYPE "OperatingPart" AS ENUM ('PART_91', 'PART_91K', 'PART_135');

-- CreateEnum
CREATE TYPE "AuthorityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('PLANNED', 'RELEASED', 'CANCELLED', 'VOIDED');

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingAuthority" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "operatingPart" "OperatingPart" NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "AuthorityStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingAuthority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorityRevision" (
    "id" TEXT NOT NULL,
    "operatingAuthorityId" TEXT NOT NULL,
    "revisionLabel" TEXT NOT NULL,
    "effectiveStart" TIMESTAMP(3) NOT NULL,
    "effectiveEnd" TIMESTAMP(3),
    "status" "AuthorityStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorityRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manual" (
    "id" TEXT NOT NULL,
    "operatingAuthorityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentIdentifier" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualRevision" (
    "id" TEXT NOT NULL,
    "manualId" TEXT NOT NULL,
    "revisionLabel" TEXT NOT NULL,
    "revisionDate" TIMESTAMP(3) NOT NULL,
    "effectiveStart" TIMESTAMP(3),
    "effectiveEnd" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalControlRecord" (
    "id" TEXT NOT NULL,
    "flightId" TEXT,
    "operatorId" TEXT NOT NULL,
    "operatingAuthorityId" TEXT NOT NULL,
    "authorityRevisionId" TEXT NOT NULL,
    "controllingEntity" TEXT NOT NULL,
    "controlNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalControlRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightRelease" (
    "id" TEXT NOT NULL,
    "operationalControlRecordId" TEXT NOT NULL,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'PLANNED',
    "releasedById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releaseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_code_key" ON "Operator"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingAuthority_operatorId_operatingPart_key" ON "OperatingAuthority"("operatorId", "operatingPart");

-- CreateIndex
CREATE INDEX "OperatingAuthority_operatorId_status_idx" ON "OperatingAuthority"("operatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorityRevision_operatingAuthorityId_revisionLabel_key" ON "AuthorityRevision"("operatingAuthorityId", "revisionLabel");

-- CreateIndex
CREATE INDEX "AuthorityRevision_operatingAuthorityId_status_idx" ON "AuthorityRevision"("operatingAuthorityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Manual_operatingAuthorityId_name_key" ON "Manual"("operatingAuthorityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ManualRevision_manualId_revisionLabel_key" ON "ManualRevision"("manualId", "revisionLabel");

-- CreateIndex
CREATE INDEX "ManualRevision_manualId_effectiveStart_idx" ON "ManualRevision"("manualId", "effectiveStart");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalControlRecord_flightId_key" ON "OperationalControlRecord"("flightId");

-- CreateIndex
CREATE INDEX "OperationalControlRecord_operatorId_idx" ON "OperationalControlRecord"("operatorId");

-- CreateIndex
CREATE INDEX "OperationalControlRecord_operatingAuthorityId_idx" ON "OperationalControlRecord"("operatingAuthorityId");

-- CreateIndex
CREATE INDEX "OperationalControlRecord_authorityRevisionId_idx" ON "OperationalControlRecord"("authorityRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "FlightRelease_operationalControlRecordId_key" ON "FlightRelease"("operationalControlRecordId");

-- CreateIndex
CREATE INDEX "FlightRelease_status_idx" ON "FlightRelease"("status");

-- AddForeignKey
ALTER TABLE "OperatingAuthority" ADD CONSTRAINT "OperatingAuthority_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorityRevision" ADD CONSTRAINT "AuthorityRevision_operatingAuthorityId_fkey" FOREIGN KEY ("operatingAuthorityId") REFERENCES "OperatingAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manual" ADD CONSTRAINT "Manual_operatingAuthorityId_fkey" FOREIGN KEY ("operatingAuthorityId") REFERENCES "OperatingAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualRevision" ADD CONSTRAINT "ManualRevision_manualId_fkey" FOREIGN KEY ("manualId") REFERENCES "Manual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalControlRecord" ADD CONSTRAINT "OperationalControlRecord_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalControlRecord" ADD CONSTRAINT "OperationalControlRecord_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalControlRecord" ADD CONSTRAINT "OperationalControlRecord_operatingAuthorityId_fkey" FOREIGN KEY ("operatingAuthorityId") REFERENCES "OperatingAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalControlRecord" ADD CONSTRAINT "OperationalControlRecord_authorityRevisionId_fkey" FOREIGN KEY ("authorityRevisionId") REFERENCES "AuthorityRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalControlRecord" ADD CONSTRAINT "OperationalControlRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightRelease" ADD CONSTRAINT "FlightRelease_operationalControlRecordId_fkey" FOREIGN KEY ("operationalControlRecordId") REFERENCES "OperationalControlRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightRelease" ADD CONSTRAINT "FlightRelease_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
