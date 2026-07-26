-- CreateEnum
CREATE TYPE "MaintenanceProgramTaskCategory" AS ENUM ('INSPECTION', 'AD', 'SERVICE_BULLETIN', 'COMPONENT', 'STC_MODIFICATION', 'SERVICE_CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceProgramApplicabilityScope" AS ENUM ('ALL_AIRCRAFT', 'AIRCRAFT_TYPE', 'AIRCRAFT');

-- CreateEnum
CREATE TYPE "MaintenanceProgramOverrideAction" AS ENUM ('INCLUDE', 'EXCLUDE', 'DEACTIVATE');

-- CreateEnum
CREATE TYPE "MaintenanceComplianceStatus" AS ENUM ('NEEDS_BASELINE', 'CURRENT', 'DUE_SOON', 'DUE', 'OVERDUE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "AircraftMeterSnapshotSource" AS ENUM ('MANUAL', 'IMPORT', 'SYSTEM');

-- AlterTable
ALTER TABLE "AircraftLogbookEntry" ADD COLUMN     "maintenanceComplianceStateId" TEXT,
ADD COLUMN     "maintenanceProgramTaskId" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceEvent" ADD COLUMN     "maintenanceComplianceStateId" TEXT,
ADD COLUMN     "maintenanceProgramTaskId" TEXT;

-- CreateTable
CREATE TABLE "MaintenanceProgramTask" (
    "id" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "MaintenanceProgramTaskCategory" NOT NULL,
    "sourceReference" TEXT,
    "description" TEXT,
    "requiredForServiceability" BOOLEAN NOT NULL DEFAULT true,
    "intervalMonths" INTEGER,
    "intervalDays" INTEGER,
    "intervalAirframeHours" DECIMAL(10,2),
    "intervalCycles" INTEGER,
    "warningDays" INTEGER NOT NULL DEFAULT 30,
    "warningAirframeHours" DECIMAL(10,2),
    "warningCycles" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceProgramTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceProgramApplicability" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "scope" "MaintenanceProgramApplicabilityScope" NOT NULL,
    "aircraftType" "AircraftType",
    "aircraftId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceProgramApplicability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceProgramOverride" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "action" "MaintenanceProgramOverrideAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceProgramOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceComplianceState" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "status" "MaintenanceComplianceStatus" NOT NULL DEFAULT 'NEEDS_BASELINE',
    "lastCompletedAt" TIMESTAMP(3),
    "lastCompletedAirframeHours" DECIMAL(10,2),
    "lastCompletedCycles" INTEGER,
    "nextDueAt" TIMESTAMP(3),
    "nextDueAirframeHours" DECIMAL(10,2),
    "nextDueCycles" INTEGER,
    "manualNextDueAt" TIMESTAMP(3),
    "manualNextDueAirframeHours" DECIMAL(10,2),
    "manualNextDueCycles" INTEGER,
    "baselineNotes" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceComplianceState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftMeterSnapshot" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "airframeHours" DECIMAL(10,2),
    "airframeCycles" INTEGER,
    "source" "AircraftMeterSnapshotSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AircraftMeterSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceProgramTask_taskKey_key" ON "MaintenanceProgramTask"("taskKey");

-- CreateIndex
CREATE INDEX "MaintenanceProgramTask_category_active_idx" ON "MaintenanceProgramTask"("category", "active");

-- CreateIndex
CREATE INDEX "MaintenanceProgramTask_requiredForServiceability_idx" ON "MaintenanceProgramTask"("requiredForServiceability");

-- CreateIndex
CREATE INDEX "MaintenanceProgramTask_effectiveFrom_effectiveTo_idx" ON "MaintenanceProgramTask"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "MaintenanceProgramTask_createdById_idx" ON "MaintenanceProgramTask"("createdById");

-- CreateIndex
CREATE INDEX "MaintenanceProgramApplicability_taskId_active_idx" ON "MaintenanceProgramApplicability"("taskId", "active");

-- CreateIndex
CREATE INDEX "MaintenanceProgramApplicability_scope_idx" ON "MaintenanceProgramApplicability"("scope");

-- CreateIndex
CREATE INDEX "MaintenanceProgramApplicability_aircraftType_idx" ON "MaintenanceProgramApplicability"("aircraftType");

-- CreateIndex
CREATE INDEX "MaintenanceProgramApplicability_aircraftId_idx" ON "MaintenanceProgramApplicability"("aircraftId");

-- CreateIndex
CREATE INDEX "MaintenanceProgramApplicability_effectiveFrom_effectiveTo_idx" ON "MaintenanceProgramApplicability"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "MaintenanceProgramApplicability_createdById_idx" ON "MaintenanceProgramApplicability"("createdById");

-- CreateIndex
CREATE INDEX "MaintenanceProgramOverride_taskId_aircraftId_idx" ON "MaintenanceProgramOverride"("taskId", "aircraftId");

-- CreateIndex
CREATE INDEX "MaintenanceProgramOverride_aircraftId_action_idx" ON "MaintenanceProgramOverride"("aircraftId", "action");

-- CreateIndex
CREATE INDEX "MaintenanceProgramOverride_effectiveFrom_effectiveTo_idx" ON "MaintenanceProgramOverride"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "MaintenanceProgramOverride_createdById_idx" ON "MaintenanceProgramOverride"("createdById");

-- CreateIndex
CREATE INDEX "MaintenanceComplianceState_taskId_status_idx" ON "MaintenanceComplianceState"("taskId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceComplianceState_aircraftId_status_idx" ON "MaintenanceComplianceState"("aircraftId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceComplianceState_nextDueAt_idx" ON "MaintenanceComplianceState"("nextDueAt");

-- CreateIndex
CREATE INDEX "MaintenanceComplianceState_nextDueAirframeHours_idx" ON "MaintenanceComplianceState"("nextDueAirframeHours");

-- CreateIndex
CREATE INDEX "MaintenanceComplianceState_nextDueCycles_idx" ON "MaintenanceComplianceState"("nextDueCycles");

-- CreateIndex
CREATE INDEX "MaintenanceComplianceState_updatedById_idx" ON "MaintenanceComplianceState"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceComplianceState_aircraftId_taskId_key" ON "MaintenanceComplianceState"("aircraftId", "taskId");

-- CreateIndex
CREATE INDEX "AircraftMeterSnapshot_aircraftId_recordedAt_idx" ON "AircraftMeterSnapshot"("aircraftId", "recordedAt");

-- CreateIndex
CREATE INDEX "AircraftMeterSnapshot_recordedById_idx" ON "AircraftMeterSnapshot"("recordedById");

-- CreateIndex
CREATE INDEX "AircraftLogbookEntry_maintenanceProgramTaskId_idx" ON "AircraftLogbookEntry"("maintenanceProgramTaskId");

-- CreateIndex
CREATE INDEX "AircraftLogbookEntry_maintenanceComplianceStateId_idx" ON "AircraftLogbookEntry"("maintenanceComplianceStateId");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_maintenanceProgramTaskId_idx" ON "MaintenanceEvent"("maintenanceProgramTaskId");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_maintenanceComplianceStateId_idx" ON "MaintenanceEvent"("maintenanceComplianceStateId");

-- AddForeignKey
ALTER TABLE "MaintenanceProgramTask" ADD CONSTRAINT "MaintenanceProgramTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceProgramApplicability" ADD CONSTRAINT "MaintenanceProgramApplicability_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceProgramTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceProgramApplicability" ADD CONSTRAINT "MaintenanceProgramApplicability_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceProgramApplicability" ADD CONSTRAINT "MaintenanceProgramApplicability_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceProgramOverride" ADD CONSTRAINT "MaintenanceProgramOverride_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceProgramTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceProgramOverride" ADD CONSTRAINT "MaintenanceProgramOverride_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceProgramOverride" ADD CONSTRAINT "MaintenanceProgramOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceComplianceState" ADD CONSTRAINT "MaintenanceComplianceState_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceProgramTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceComplianceState" ADD CONSTRAINT "MaintenanceComplianceState_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceComplianceState" ADD CONSTRAINT "MaintenanceComplianceState_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftMeterSnapshot" ADD CONSTRAINT "AircraftMeterSnapshot_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftMeterSnapshot" ADD CONSTRAINT "AircraftMeterSnapshot_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_maintenanceProgramTaskId_fkey" FOREIGN KEY ("maintenanceProgramTaskId") REFERENCES "MaintenanceProgramTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_maintenanceComplianceStateId_fkey" FOREIGN KEY ("maintenanceComplianceStateId") REFERENCES "MaintenanceComplianceState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_maintenanceProgramTaskId_fkey" FOREIGN KEY ("maintenanceProgramTaskId") REFERENCES "MaintenanceProgramTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_maintenanceComplianceStateId_fkey" FOREIGN KEY ("maintenanceComplianceStateId") REFERENCES "MaintenanceComplianceState"("id") ON DELETE SET NULL ON UPDATE CASCADE;
