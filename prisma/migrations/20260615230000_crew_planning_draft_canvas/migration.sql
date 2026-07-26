-- CreateEnum
CREATE TYPE "CrewPlanningDraftStatus" AS ENUM ('ACTIVE', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CrewPlanningDraftChangeType" AS ENUM ('ADD', 'UPDATE', 'SWAP', 'REMOVE');

-- CreateEnum
CREATE TYPE "CrewPlanningDraftChangeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "CrewPlanningDraft" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "draftKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CrewPlanningDraftStatus" NOT NULL DEFAULT 'ACTIVE',
    "baselineAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autosavedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewPlanningDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewPlanningDraftChange" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "stationId" TEXT,
    "sourcePublishedEntryId" TEXT,
    "changeType" "CrewPlanningDraftChangeType" NOT NULL,
    "status" "CrewPlanningDraftChangeStatus" NOT NULL DEFAULT 'DRAFT',
    "selectedForPublish" BOOLEAN NOT NULL DEFAULT true,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dutyStatus" "DutyStatus",
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "baselineUpdatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "publishedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewPlanningDraftChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrewPlanningDraft_draftKey_key" ON "CrewPlanningDraft"("draftKey");

-- CreateIndex
CREATE INDEX "CrewPlanningDraft_periodId_status_idx" ON "CrewPlanningDraft"("periodId", "status");

-- CreateIndex
CREATE INDEX "CrewPlanningDraft_createdById_idx" ON "CrewPlanningDraft"("createdById");

-- CreateIndex
CREATE INDEX "CrewPlanningDraft_updatedById_idx" ON "CrewPlanningDraft"("updatedById");

-- CreateIndex
CREATE INDEX "CrewPlanningDraftChange_draftId_status_idx" ON "CrewPlanningDraftChange"("draftId", "status");

-- CreateIndex
CREATE INDEX "CrewPlanningDraftChange_crewMemberId_date_idx" ON "CrewPlanningDraftChange"("crewMemberId", "date");

-- CreateIndex
CREATE INDEX "CrewPlanningDraftChange_sourcePublishedEntryId_idx" ON "CrewPlanningDraftChange"("sourcePublishedEntryId");

-- CreateIndex
CREATE INDEX "CrewPlanningDraftChange_selectedForPublish_idx" ON "CrewPlanningDraftChange"("selectedForPublish");

-- CreateIndex
CREATE INDEX "CrewPlanningDraftChange_createdById_idx" ON "CrewPlanningDraftChange"("createdById");

-- CreateIndex
CREATE INDEX "CrewPlanningDraftChange_updatedById_idx" ON "CrewPlanningDraftChange"("updatedById");

-- CreateIndex
CREATE INDEX "CrewPlanningDraftChange_publishedById_idx" ON "CrewPlanningDraftChange"("publishedById");

-- AddForeignKey
ALTER TABLE "CrewPlanningDraft" ADD CONSTRAINT "CrewPlanningDraft_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CrewSchedulePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlanningDraft" ADD CONSTRAINT "CrewPlanningDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlanningDraft" ADD CONSTRAINT "CrewPlanningDraft_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlanningDraftChange" ADD CONSTRAINT "CrewPlanningDraftChange_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "CrewPlanningDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlanningDraftChange" ADD CONSTRAINT "CrewPlanningDraftChange_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlanningDraftChange" ADD CONSTRAINT "CrewPlanningDraftChange_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlanningDraftChange" ADD CONSTRAINT "CrewPlanningDraftChange_sourcePublishedEntryId_fkey" FOREIGN KEY ("sourcePublishedEntryId") REFERENCES "CrewScheduleEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlanningDraftChange" ADD CONSTRAINT "CrewPlanningDraftChange_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlanningDraftChange" ADD CONSTRAINT "CrewPlanningDraftChange_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlanningDraftChange" ADD CONSTRAINT "CrewPlanningDraftChange_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
