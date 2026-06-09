-- CreateEnum
CREATE TYPE "CrewSchedulePeriodStatus" AS ENUM ('BID_OPEN', 'DRAFTING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CrewScheduleRequestType" AS ENUM ('TIME_OFF', 'PREFERRED_WORK_DAYS', 'PREFERRED_OFF_DAYS', 'PATTERN_REQUEST', 'SWAP_REQUEST', 'GENERAL_NOTE');

-- CreateEnum
CREATE TYPE "CrewScheduleRequestStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CrewScheduleEntryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CrewSchedulePeriod" (
    "id" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CrewSchedulePeriodStatus" NOT NULL DEFAULT 'BID_OPEN',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "bidOpenAt" TIMESTAMP(3),
    "bidCloseAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "publishedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewSchedulePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewScheduleRequest" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "requestType" "CrewScheduleRequestType" NOT NULL,
    "status" "CrewScheduleRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "preferredDutyStatus" "DutyStatus",
    "requestedPatternId" TEXT,
    "requestedSwapCrewMemberId" TEXT,
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "requestNotes" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewScheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewRotationPattern" (
    "id" TEXT NOT NULL,
    "patternKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cycleLengthDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewRotationPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewRotationPatternDay" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "dutyStatus" "DutyStatus" NOT NULL,
    "stationId" TEXT,
    "startsAtMinutes" INTEGER,
    "endsAtMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewRotationPatternDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewScheduleEntry" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "stationId" TEXT,
    "sourceRequestId" TEXT,
    "rotationPatternId" TEXT,
    "generatedCrewScheduleId" TEXT,
    "status" "CrewScheduleEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL,
    "dutyStatus" "DutyStatus" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "publishedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrewSchedulePeriod_periodKey_key" ON "CrewSchedulePeriod"("periodKey");

-- CreateIndex
CREATE INDEX "CrewSchedulePeriod_status_startsAt_idx" ON "CrewSchedulePeriod"("status", "startsAt");

-- CreateIndex
CREATE INDEX "CrewSchedulePeriod_startsAt_endsAt_idx" ON "CrewSchedulePeriod"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CrewSchedulePeriod_createdById_idx" ON "CrewSchedulePeriod"("createdById");

-- CreateIndex
CREATE INDEX "CrewSchedulePeriod_publishedById_idx" ON "CrewSchedulePeriod"("publishedById");

-- CreateIndex
CREATE INDEX "CrewScheduleRequest_periodId_status_idx" ON "CrewScheduleRequest"("periodId", "status");

-- CreateIndex
CREATE INDEX "CrewScheduleRequest_crewMemberId_createdAt_idx" ON "CrewScheduleRequest"("crewMemberId", "createdAt");

-- CreateIndex
CREATE INDEX "CrewScheduleRequest_requestType_status_idx" ON "CrewScheduleRequest"("requestType", "status");

-- CreateIndex
CREATE INDEX "CrewScheduleRequest_startDate_endDate_idx" ON "CrewScheduleRequest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "CrewScheduleRequest_requestedPatternId_idx" ON "CrewScheduleRequest"("requestedPatternId");

-- CreateIndex
CREATE INDEX "CrewScheduleRequest_requestedSwapCrewMemberId_idx" ON "CrewScheduleRequest"("requestedSwapCrewMemberId");

-- CreateIndex
CREATE INDEX "CrewScheduleRequest_submittedById_idx" ON "CrewScheduleRequest"("submittedById");

-- CreateIndex
CREATE INDEX "CrewScheduleRequest_reviewedById_idx" ON "CrewScheduleRequest"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "CrewRotationPattern_patternKey_key" ON "CrewRotationPattern"("patternKey");

-- CreateIndex
CREATE INDEX "CrewRotationPattern_isActive_idx" ON "CrewRotationPattern"("isActive");

-- CreateIndex
CREATE INDEX "CrewRotationPattern_createdById_idx" ON "CrewRotationPattern"("createdById");

-- CreateIndex
CREATE INDEX "CrewRotationPatternDay_patternId_idx" ON "CrewRotationPatternDay"("patternId");

-- CreateIndex
CREATE INDEX "CrewRotationPatternDay_stationId_idx" ON "CrewRotationPatternDay"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "CrewRotationPatternDay_patternId_dayNumber_key" ON "CrewRotationPatternDay"("patternId", "dayNumber");

-- CreateIndex
CREATE INDEX "CrewScheduleEntry_periodId_status_idx" ON "CrewScheduleEntry"("periodId", "status");

-- CreateIndex
CREATE INDEX "CrewScheduleEntry_crewMemberId_date_idx" ON "CrewScheduleEntry"("crewMemberId", "date");

-- CreateIndex
CREATE INDEX "CrewScheduleEntry_date_status_idx" ON "CrewScheduleEntry"("date", "status");

-- CreateIndex
CREATE INDEX "CrewScheduleEntry_stationId_idx" ON "CrewScheduleEntry"("stationId");

-- CreateIndex
CREATE INDEX "CrewScheduleEntry_sourceRequestId_idx" ON "CrewScheduleEntry"("sourceRequestId");

-- CreateIndex
CREATE INDEX "CrewScheduleEntry_rotationPatternId_idx" ON "CrewScheduleEntry"("rotationPatternId");

-- CreateIndex
CREATE INDEX "CrewScheduleEntry_generatedCrewScheduleId_idx" ON "CrewScheduleEntry"("generatedCrewScheduleId");

-- CreateIndex
CREATE INDEX "CrewScheduleEntry_createdById_idx" ON "CrewScheduleEntry"("createdById");

-- CreateIndex
CREATE INDEX "CrewScheduleEntry_publishedById_idx" ON "CrewScheduleEntry"("publishedById");

-- CreateIndex
CREATE UNIQUE INDEX "CrewScheduleEntry_periodId_crewMemberId_date_dutyStatus_key" ON "CrewScheduleEntry"("periodId", "crewMemberId", "date", "dutyStatus");

-- AddForeignKey
ALTER TABLE "CrewSchedulePeriod" ADD CONSTRAINT "CrewSchedulePeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewSchedulePeriod" ADD CONSTRAINT "CrewSchedulePeriod_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleRequest" ADD CONSTRAINT "CrewScheduleRequest_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CrewSchedulePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleRequest" ADD CONSTRAINT "CrewScheduleRequest_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleRequest" ADD CONSTRAINT "CrewScheduleRequest_requestedPatternId_fkey" FOREIGN KEY ("requestedPatternId") REFERENCES "CrewRotationPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleRequest" ADD CONSTRAINT "CrewScheduleRequest_requestedSwapCrewMemberId_fkey" FOREIGN KEY ("requestedSwapCrewMemberId") REFERENCES "CrewMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleRequest" ADD CONSTRAINT "CrewScheduleRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleRequest" ADD CONSTRAINT "CrewScheduleRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewRotationPattern" ADD CONSTRAINT "CrewRotationPattern_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewRotationPatternDay" ADD CONSTRAINT "CrewRotationPatternDay_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "CrewRotationPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewRotationPatternDay" ADD CONSTRAINT "CrewRotationPatternDay_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleEntry" ADD CONSTRAINT "CrewScheduleEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CrewSchedulePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleEntry" ADD CONSTRAINT "CrewScheduleEntry_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleEntry" ADD CONSTRAINT "CrewScheduleEntry_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleEntry" ADD CONSTRAINT "CrewScheduleEntry_sourceRequestId_fkey" FOREIGN KEY ("sourceRequestId") REFERENCES "CrewScheduleRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleEntry" ADD CONSTRAINT "CrewScheduleEntry_rotationPatternId_fkey" FOREIGN KEY ("rotationPatternId") REFERENCES "CrewRotationPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleEntry" ADD CONSTRAINT "CrewScheduleEntry_generatedCrewScheduleId_fkey" FOREIGN KEY ("generatedCrewScheduleId") REFERENCES "CrewSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleEntry" ADD CONSTRAINT "CrewScheduleEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewScheduleEntry" ADD CONSTRAINT "CrewScheduleEntry_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
