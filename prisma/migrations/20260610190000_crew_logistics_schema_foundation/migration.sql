-- CreateEnum
CREATE TYPE "CrewLocationSource" AS ENUM ('MANUAL', 'CREW_REPORTED', 'ASSIGNMENT', 'SCHEDULE', 'IMPORT');

-- CreateEnum
CREATE TYPE "CrewLogisticsNeedType" AS ENUM ('POSITIONING', 'DEADHEAD', 'AIRLINE_TICKET', 'HOTEL', 'GROUND_TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "CrewLogisticsNeedStatus" AS ENUM ('PLANNED', 'REQUESTED', 'BOOKED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CrewLocationRecord" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "stationId" TEXT,
    "locationText" TEXT,
    "source" "CrewLocationSource" NOT NULL DEFAULT 'MANUAL',
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewLocationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewLogisticsNeed" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "flightLegId" TEXT,
    "aircraftId" TEXT,
    "fromStationId" TEXT,
    "toStationId" TEXT,
    "needType" "CrewLogisticsNeedType" NOT NULL,
    "status" "CrewLogisticsNeedStatus" NOT NULL DEFAULT 'PLANNED',
    "neededBy" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "providerName" TEXT,
    "confirmationNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewLogisticsNeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrewLocationRecord_crewMemberId_effectiveAt_idx" ON "CrewLocationRecord"("crewMemberId", "effectiveAt");

-- CreateIndex
CREATE INDEX "CrewLocationRecord_stationId_idx" ON "CrewLocationRecord"("stationId");

-- CreateIndex
CREATE INDEX "CrewLocationRecord_source_idx" ON "CrewLocationRecord"("source");

-- CreateIndex
CREATE INDEX "CrewLocationRecord_createdById_idx" ON "CrewLocationRecord"("createdById");

-- CreateIndex
CREATE INDEX "CrewLogisticsNeed_crewMemberId_status_idx" ON "CrewLogisticsNeed"("crewMemberId", "status");

-- CreateIndex
CREATE INDEX "CrewLogisticsNeed_flightLegId_idx" ON "CrewLogisticsNeed"("flightLegId");

-- CreateIndex
CREATE INDEX "CrewLogisticsNeed_aircraftId_idx" ON "CrewLogisticsNeed"("aircraftId");

-- CreateIndex
CREATE INDEX "CrewLogisticsNeed_fromStationId_idx" ON "CrewLogisticsNeed"("fromStationId");

-- CreateIndex
CREATE INDEX "CrewLogisticsNeed_toStationId_idx" ON "CrewLogisticsNeed"("toStationId");

-- CreateIndex
CREATE INDEX "CrewLogisticsNeed_needType_status_idx" ON "CrewLogisticsNeed"("needType", "status");

-- CreateIndex
CREATE INDEX "CrewLogisticsNeed_neededBy_idx" ON "CrewLogisticsNeed"("neededBy");

-- CreateIndex
CREATE INDEX "CrewLogisticsNeed_createdById_idx" ON "CrewLogisticsNeed"("createdById");

-- AddForeignKey
ALTER TABLE "CrewLocationRecord" ADD CONSTRAINT "CrewLocationRecord_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLocationRecord" ADD CONSTRAINT "CrewLocationRecord_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLocationRecord" ADD CONSTRAINT "CrewLocationRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLogisticsNeed" ADD CONSTRAINT "CrewLogisticsNeed_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLogisticsNeed" ADD CONSTRAINT "CrewLogisticsNeed_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLogisticsNeed" ADD CONSTRAINT "CrewLogisticsNeed_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLogisticsNeed" ADD CONSTRAINT "CrewLogisticsNeed_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLogisticsNeed" ADD CONSTRAINT "CrewLogisticsNeed_toStationId_fkey" FOREIGN KEY ("toStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLogisticsNeed" ADD CONSTRAINT "CrewLogisticsNeed_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
