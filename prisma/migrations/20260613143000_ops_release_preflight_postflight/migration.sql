-- CreateEnum
CREATE TYPE "OperatorManifestMode" AS ENUM ('OPS_REQUIRED', 'PREFLIGHT_VERIFY', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "FaaFlightPlanStatus" AS ENUM ('UNKNOWN', 'FILED', 'NOT_FILED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "FlightPhaseStatus" AS ENUM ('NOT_STARTED', 'COMPLETE');

-- AlterTable
ALTER TABLE "FlightLeg" ADD COLUMN "faaFlightPlanStatus" "FaaFlightPlanStatus" NOT NULL DEFAULT 'UNKNOWN';

-- CreateTable
CREATE TABLE "OperatorReleaseSetting" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "dispatcherEnabled" BOOLEAN NOT NULL DEFAULT false,
    "manifestMode" "OperatorManifestMode" NOT NULL DEFAULT 'PREFLIGHT_VERIFY',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorReleaseSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightPreflightRecord" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "status" "FlightPhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "manifestVerified" BOOLEAN NOT NULL DEFAULT false,
    "manifestNotes" TEXT,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightPreflightRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightPostflightRecord" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "status" "FlightPhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "outTime" TIMESTAMP(3),
    "offTime" TIMESTAMP(3),
    "onTime" TIMESTAMP(3),
    "inTime" TIMESTAMP(3),
    "delayNotes" TEXT,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightPostflightRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorReleaseSetting_operatorId_key" ON "OperatorReleaseSetting"("operatorId");

-- CreateIndex
CREATE INDEX "OperatorReleaseSetting_updatedById_idx" ON "OperatorReleaseSetting"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "FlightPreflightRecord_flightLegId_key" ON "FlightPreflightRecord"("flightLegId");

-- CreateIndex
CREATE INDEX "FlightPreflightRecord_status_idx" ON "FlightPreflightRecord"("status");

-- CreateIndex
CREATE INDEX "FlightPreflightRecord_completedById_idx" ON "FlightPreflightRecord"("completedById");

-- CreateIndex
CREATE UNIQUE INDEX "FlightPostflightRecord_flightLegId_key" ON "FlightPostflightRecord"("flightLegId");

-- CreateIndex
CREATE INDEX "FlightPostflightRecord_status_idx" ON "FlightPostflightRecord"("status");

-- CreateIndex
CREATE INDEX "FlightPostflightRecord_completedById_idx" ON "FlightPostflightRecord"("completedById");

-- CreateIndex
CREATE INDEX "FlightPostflightRecord_outTime_idx" ON "FlightPostflightRecord"("outTime");

-- CreateIndex
CREATE INDEX "FlightPostflightRecord_offTime_idx" ON "FlightPostflightRecord"("offTime");

-- CreateIndex
CREATE INDEX "FlightPostflightRecord_onTime_idx" ON "FlightPostflightRecord"("onTime");

-- CreateIndex
CREATE INDEX "FlightPostflightRecord_inTime_idx" ON "FlightPostflightRecord"("inTime");

-- CreateIndex
CREATE INDEX "FlightLeg_faaFlightPlanStatus_idx" ON "FlightLeg"("faaFlightPlanStatus");

-- AddForeignKey
ALTER TABLE "OperatorReleaseSetting" ADD CONSTRAINT "OperatorReleaseSetting_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorReleaseSetting" ADD CONSTRAINT "OperatorReleaseSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightPreflightRecord" ADD CONSTRAINT "FlightPreflightRecord_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightPreflightRecord" ADD CONSTRAINT "FlightPreflightRecord_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightPostflightRecord" ADD CONSTRAINT "FlightPostflightRecord_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightPostflightRecord" ADD CONSTRAINT "FlightPostflightRecord_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
