-- CreateEnum
CREATE TYPE "AircraftConfigurationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AircraftCapabilityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DiscrepancyStatus" AS ENUM ('OPEN', 'DEFERRED', 'CLEARED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeferralStatus" AS ENUM ('ACTIVE', 'CLEARED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceEventType" AS ENUM ('INSPECTION', 'SCHEDULED_MAINTENANCE', 'UNSCHEDULED_MAINTENANCE', 'REPAIR', 'RETURN_TO_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceEventStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AirworthinessReleaseStatus" AS ENUM ('DRAFT', 'RELEASED', 'VOIDED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "AircraftConfiguration" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "configurationLabel" TEXT NOT NULL,
    "status" "AircraftConfigurationStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveEnd" TIMESTAMP(3),
    "passengerSeatCount" INTEGER,
    "emptyWeight" DECIMAL(10,2),
    "emptyWeightCg" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AircraftConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftCapability" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "capabilityCode" TEXT NOT NULL,
    "status" "AircraftCapabilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveEnd" TIMESTAMP(3),
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AircraftCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discrepancy" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "reportedById" TEXT,
    "discrepancyNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "DiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "severity" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "correctiveSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discrepancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deferral" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "discrepancyId" TEXT NOT NULL,
    "authorizedById" TEXT,
    "deferralNumber" TEXT NOT NULL,
    "status" "DeferralStatus" NOT NULL DEFAULT 'ACTIVE',
    "category" TEXT,
    "deferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceEvent" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "discrepancyId" TEXT,
    "approvedById" TEXT,
    "maintenanceNumber" TEXT NOT NULL,
    "eventType" "MaintenanceEventType" NOT NULL,
    "status" "MaintenanceEventStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "providerName" TEXT,
    "description" TEXT,
    "returnToServiceAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirworthinessRelease" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "flightLegId" TEXT,
    "releasedById" TEXT,
    "releaseNumber" TEXT NOT NULL,
    "status" "AirworthinessReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "releasedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "releaseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirworthinessRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AircraftConfiguration_aircraftId_status_idx" ON "AircraftConfiguration"("aircraftId", "status");

-- CreateIndex
CREATE INDEX "AircraftConfiguration_effectiveStart_effectiveEnd_idx" ON "AircraftConfiguration"("effectiveStart", "effectiveEnd");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftConfiguration_aircraftId_configurationLabel_effecti_key" ON "AircraftConfiguration"("aircraftId", "configurationLabel", "effectiveStart");

-- CreateIndex
CREATE INDEX "AircraftCapability_aircraftId_status_idx" ON "AircraftCapability"("aircraftId", "status");

-- CreateIndex
CREATE INDEX "AircraftCapability_capabilityCode_idx" ON "AircraftCapability"("capabilityCode");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftCapability_aircraftId_capabilityCode_effectiveStart_key" ON "AircraftCapability"("aircraftId", "capabilityCode", "effectiveStart");

-- CreateIndex
CREATE INDEX "Discrepancy_aircraftId_status_idx" ON "Discrepancy"("aircraftId", "status");

-- CreateIndex
CREATE INDEX "Discrepancy_reportedAt_idx" ON "Discrepancy"("reportedAt");

-- CreateIndex
CREATE INDEX "Discrepancy_reportedById_idx" ON "Discrepancy"("reportedById");

-- CreateIndex
CREATE UNIQUE INDEX "Discrepancy_aircraftId_discrepancyNumber_key" ON "Discrepancy"("aircraftId", "discrepancyNumber");

-- CreateIndex
CREATE INDEX "Deferral_aircraftId_status_idx" ON "Deferral"("aircraftId", "status");

-- CreateIndex
CREATE INDEX "Deferral_discrepancyId_idx" ON "Deferral"("discrepancyId");

-- CreateIndex
CREATE INDEX "Deferral_dueAt_idx" ON "Deferral"("dueAt");

-- CreateIndex
CREATE INDEX "Deferral_authorizedById_idx" ON "Deferral"("authorizedById");

-- CreateIndex
CREATE UNIQUE INDEX "Deferral_aircraftId_deferralNumber_key" ON "Deferral"("aircraftId", "deferralNumber");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_aircraftId_status_idx" ON "MaintenanceEvent"("aircraftId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_eventType_idx" ON "MaintenanceEvent"("eventType");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_scheduledAt_idx" ON "MaintenanceEvent"("scheduledAt");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_completedAt_idx" ON "MaintenanceEvent"("completedAt");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_discrepancyId_idx" ON "MaintenanceEvent"("discrepancyId");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_approvedById_idx" ON "MaintenanceEvent"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceEvent_aircraftId_maintenanceNumber_key" ON "MaintenanceEvent"("aircraftId", "maintenanceNumber");

-- CreateIndex
CREATE INDEX "AirworthinessRelease_aircraftId_status_idx" ON "AirworthinessRelease"("aircraftId", "status");

-- CreateIndex
CREATE INDEX "AirworthinessRelease_flightLegId_idx" ON "AirworthinessRelease"("flightLegId");

-- CreateIndex
CREATE INDEX "AirworthinessRelease_releasedAt_idx" ON "AirworthinessRelease"("releasedAt");

-- CreateIndex
CREATE INDEX "AirworthinessRelease_expiresAt_idx" ON "AirworthinessRelease"("expiresAt");

-- CreateIndex
CREATE INDEX "AirworthinessRelease_releasedById_idx" ON "AirworthinessRelease"("releasedById");

-- CreateIndex
CREATE UNIQUE INDEX "AirworthinessRelease_aircraftId_releaseNumber_key" ON "AirworthinessRelease"("aircraftId", "releaseNumber");

-- CreateIndex
CREATE INDEX "FlightRelease_operationalControlRecordId_idx" ON "FlightRelease"("operationalControlRecordId");

-- AddForeignKey
ALTER TABLE "AircraftConfiguration" ADD CONSTRAINT "AircraftConfiguration_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftCapability" ADD CONSTRAINT "AircraftCapability_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discrepancy" ADD CONSTRAINT "Discrepancy_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discrepancy" ADD CONSTRAINT "Discrepancy_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deferral" ADD CONSTRAINT "Deferral_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deferral" ADD CONSTRAINT "Deferral_discrepancyId_fkey" FOREIGN KEY ("discrepancyId") REFERENCES "Discrepancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deferral" ADD CONSTRAINT "Deferral_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_discrepancyId_fkey" FOREIGN KEY ("discrepancyId") REFERENCES "Discrepancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirworthinessRelease" ADD CONSTRAINT "AirworthinessRelease_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirworthinessRelease" ADD CONSTRAINT "AirworthinessRelease_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirworthinessRelease" ADD CONSTRAINT "AirworthinessRelease_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
