CREATE TYPE "MaintenanceControlHoldStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONVERTED');

ALTER TABLE "MaintenanceProgramTask"
ADD COLUMN "requiresIndependentInspection" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MaintenanceEvent"
ADD COLUMN "plannedStationId" TEXT,
ADD COLUMN "planNote" TEXT,
ADD COLUMN "requiresIndependentInspection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "maintenanceApprovedAt" TIMESTAMP(3),
ADD COLUMN "inspectedById" TEXT,
ADD COLUMN "inspectionApprovedAt" TIMESTAMP(3),
ADD COLUMN "mxControlReleasedById" TEXT,
ADD COLUMN "mxControlReleasedAt" TIMESTAMP(3),
ADD COLUMN "mxControlReleaseNote" TEXT;

ALTER TABLE "AircraftLogbookEntry"
ADD COLUMN "requiresIndependentInspection" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ReturnToServiceRecord"
ADD COLUMN "mxControlReleasedById" TEXT,
ADD COLUMN "mxControlReleasedAt" TIMESTAMP(3),
ADD COLUMN "mxControlReleaseNote" TEXT;

CREATE TABLE "MaintenanceControlHold" (
  "id" TEXT NOT NULL,
  "aircraftId" TEXT NOT NULL,
  "status" "MaintenanceControlHoldStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "expectedReturnAt" TIMESTAMP(3),
  "placedById" TEXT NOT NULL,
  "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedById" TEXT,
  "releasedAt" TIMESTAMP(3),
  "releaseExplanation" TEXT,
  "convertedById" TEXT,
  "convertedAt" TIMESTAMP(3),
  "convertedDiscrepancyId" TEXT,
  "convertedMaintenanceEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceControlHold_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceControlHold_one_active_per_aircraft"
ON "MaintenanceControlHold"("aircraftId")
WHERE "status" = 'ACTIVE';

CREATE INDEX "MaintenanceControlHold_aircraftId_status_idx" ON "MaintenanceControlHold"("aircraftId", "status");
CREATE INDEX "MaintenanceControlHold_placedById_idx" ON "MaintenanceControlHold"("placedById");
CREATE INDEX "MaintenanceControlHold_releasedById_idx" ON "MaintenanceControlHold"("releasedById");
CREATE INDEX "MaintenanceControlHold_convertedById_idx" ON "MaintenanceControlHold"("convertedById");
CREATE INDEX "MaintenanceControlHold_convertedDiscrepancyId_idx" ON "MaintenanceControlHold"("convertedDiscrepancyId");
CREATE INDEX "MaintenanceControlHold_convertedMaintenanceEventId_idx" ON "MaintenanceControlHold"("convertedMaintenanceEventId");
CREATE INDEX "MaintenanceEvent_plannedStationId_idx" ON "MaintenanceEvent"("plannedStationId");
CREATE INDEX "MaintenanceEvent_inspectedById_idx" ON "MaintenanceEvent"("inspectedById");
CREATE INDEX "MaintenanceEvent_mxControlReleasedById_idx" ON "MaintenanceEvent"("mxControlReleasedById");
CREATE INDEX "ReturnToServiceRecord_mxControlReleasedById_idx" ON "ReturnToServiceRecord"("mxControlReleasedById");

ALTER TABLE "MaintenanceEvent"
ADD CONSTRAINT "MaintenanceEvent_plannedStationId_fkey"
FOREIGN KEY ("plannedStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceEvent"
ADD CONSTRAINT "MaintenanceEvent_inspectedById_fkey"
FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceEvent"
ADD CONSTRAINT "MaintenanceEvent_mxControlReleasedById_fkey"
FOREIGN KEY ("mxControlReleasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnToServiceRecord"
ADD CONSTRAINT "ReturnToServiceRecord_mxControlReleasedById_fkey"
FOREIGN KEY ("mxControlReleasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceControlHold"
ADD CONSTRAINT "MaintenanceControlHold_aircraftId_fkey"
FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaintenanceControlHold"
ADD CONSTRAINT "MaintenanceControlHold_placedById_fkey"
FOREIGN KEY ("placedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaintenanceControlHold"
ADD CONSTRAINT "MaintenanceControlHold_releasedById_fkey"
FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceControlHold"
ADD CONSTRAINT "MaintenanceControlHold_convertedById_fkey"
FOREIGN KEY ("convertedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceControlHold"
ADD CONSTRAINT "MaintenanceControlHold_convertedDiscrepancyId_fkey"
FOREIGN KEY ("convertedDiscrepancyId") REFERENCES "Discrepancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaintenanceControlHold"
ADD CONSTRAINT "MaintenanceControlHold_convertedMaintenanceEventId_fkey"
FOREIGN KEY ("convertedMaintenanceEventId") REFERENCES "MaintenanceEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
