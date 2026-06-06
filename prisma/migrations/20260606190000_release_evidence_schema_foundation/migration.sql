-- CreateEnum
CREATE TYPE "ManifestStatus" AS ENUM ('DRAFT', 'READY', 'LOCKED', 'AMENDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "WeightBalanceStatus" AS ENUM ('DRAFT', 'CALCULATED', 'APPROVED', 'VOIDED');

-- CreateEnum
CREATE TYPE "FlightLocatingStatus" AS ENUM ('NOT_STARTED', 'FILED', 'ACTIVE', 'CLOSED', 'OVERDUE');

-- CreateTable
CREATE TABLE "Manifest" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "status" "ManifestStatus" NOT NULL DEFAULT 'DRAFT',
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManifestItem" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "passengerId" TEXT,
    "personName" TEXT,
    "seatNumber" TEXT,
    "weight" DECIMAL(8,2),
    "baggageWeight" DECIMAL(8,2),
    "checkedInAt" TIMESTAMP(3),
    "boardedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManifestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightBalanceRun" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "manifestId" TEXT,
    "runLabel" TEXT NOT NULL,
    "status" "WeightBalanceStatus" NOT NULL DEFAULT 'DRAFT',
    "takeoffWeight" DECIMAL(10,2),
    "landingWeight" DECIMAL(10,2),
    "centerOfGravity" TEXT,
    "calculatedById" TEXT,
    "calculatedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "calculationSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightBalanceRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightLocatingRecord" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "status" "FlightLocatingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "responsibleParty" TEXT,
    "plannedRoute" TEXT,
    "lastKnownPosition" TEXT,
    "activatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "overdueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightLocatingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherBriefingSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotKey" TEXT NOT NULL,
    "provider" TEXT,
    "briefingAt" TIMESTAMP(3) NOT NULL,
    "routeSummary" TEXT,
    "rawSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherBriefingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotamSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotKey" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "affectedStationCodes" TEXT,
    "rawSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotamSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightPlanReference" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "provider" TEXT,
    "externalReference" TEXT,
    "filedAt" TIMESTAMP(3),
    "status" TEXT,
    "routeText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightPlanReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchPackage" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "weatherBriefingId" TEXT,
    "notamSnapshotId" TEXT,
    "flightPlanReferenceId" TEXT,
    "performanceData" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manifest_flightLegId_key" ON "Manifest"("flightLegId");

-- CreateIndex
CREATE INDEX "Manifest_status_idx" ON "Manifest"("status");

-- CreateIndex
CREATE INDEX "Manifest_lockedById_idx" ON "Manifest"("lockedById");

-- CreateIndex
CREATE INDEX "ManifestItem_manifestId_idx" ON "ManifestItem"("manifestId");

-- CreateIndex
CREATE INDEX "ManifestItem_passengerId_idx" ON "ManifestItem"("passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "WeightBalanceRun_flightLegId_runLabel_key" ON "WeightBalanceRun"("flightLegId", "runLabel");

-- CreateIndex
CREATE INDEX "WeightBalanceRun_flightLegId_status_idx" ON "WeightBalanceRun"("flightLegId", "status");

-- CreateIndex
CREATE INDEX "WeightBalanceRun_manifestId_idx" ON "WeightBalanceRun"("manifestId");

-- CreateIndex
CREATE INDEX "WeightBalanceRun_calculatedById_idx" ON "WeightBalanceRun"("calculatedById");

-- CreateIndex
CREATE INDEX "WeightBalanceRun_approvedById_idx" ON "WeightBalanceRun"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "FlightLocatingRecord_flightLegId_key" ON "FlightLocatingRecord"("flightLegId");

-- CreateIndex
CREATE INDEX "FlightLocatingRecord_status_idx" ON "FlightLocatingRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherBriefingSnapshot_snapshotKey_key" ON "WeatherBriefingSnapshot"("snapshotKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotamSnapshot_snapshotKey_key" ON "NotamSnapshot"("snapshotKey");

-- CreateIndex
CREATE UNIQUE INDEX "FlightPlanReference_flightLegId_externalReference_key" ON "FlightPlanReference"("flightLegId", "externalReference");

-- CreateIndex
CREATE INDEX "FlightPlanReference_flightLegId_idx" ON "FlightPlanReference"("flightLegId");

-- CreateIndex
CREATE INDEX "FlightPlanReference_status_idx" ON "FlightPlanReference"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchPackage_flightLegId_key" ON "DispatchPackage"("flightLegId");

-- CreateIndex
CREATE INDEX "DispatchPackage_weatherBriefingId_idx" ON "DispatchPackage"("weatherBriefingId");

-- CreateIndex
CREATE INDEX "DispatchPackage_notamSnapshotId_idx" ON "DispatchPackage"("notamSnapshotId");

-- CreateIndex
CREATE INDEX "DispatchPackage_flightPlanReferenceId_idx" ON "DispatchPackage"("flightPlanReferenceId");

-- CreateIndex
CREATE INDEX "DispatchPackage_createdById_idx" ON "DispatchPackage"("createdById");

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestItem" ADD CONSTRAINT "ManifestItem_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestItem" ADD CONSTRAINT "ManifestItem_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightBalanceRun" ADD CONSTRAINT "WeightBalanceRun_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightBalanceRun" ADD CONSTRAINT "WeightBalanceRun_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightBalanceRun" ADD CONSTRAINT "WeightBalanceRun_calculatedById_fkey" FOREIGN KEY ("calculatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightBalanceRun" ADD CONSTRAINT "WeightBalanceRun_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLocatingRecord" ADD CONSTRAINT "FlightLocatingRecord_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightPlanReference" ADD CONSTRAINT "FlightPlanReference_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPackage" ADD CONSTRAINT "DispatchPackage_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPackage" ADD CONSTRAINT "DispatchPackage_weatherBriefingId_fkey" FOREIGN KEY ("weatherBriefingId") REFERENCES "WeatherBriefingSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPackage" ADD CONSTRAINT "DispatchPackage_notamSnapshotId_fkey" FOREIGN KEY ("notamSnapshotId") REFERENCES "NotamSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPackage" ADD CONSTRAINT "DispatchPackage_flightPlanReferenceId_fkey" FOREIGN KEY ("flightPlanReferenceId") REFERENCES "FlightPlanReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchPackage" ADD CONSTRAINT "DispatchPackage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
