ALTER TYPE "DiscrepancyStatus" ADD VALUE IF NOT EXISTS 'CORRECTED_PENDING_RTS';

CREATE TYPE "DeferralMethod" AS ENUM ('MEL', 'CDL', 'NEF', 'COMPANY_APPROVED', 'OTHER_APPROVED');

CREATE TYPE "ReturnToServiceRecordStatus" AS ENUM ('DRAFT', 'READY_FOR_SIGNATURE', 'SIGNED', 'VOIDED', 'SUPERSEDED');

ALTER TYPE "AircraftLogbookSignaturePurpose" ADD VALUE IF NOT EXISTS 'RETURN_TO_SERVICE';

ALTER TABLE "Discrepancy" ADD COLUMN "activeDeferralId" TEXT,
ADD COLUMN "correctiveMaintenanceEventId" TEXT,
ADD COLUMN "clearingReturnToServiceRecordId" TEXT,
ADD COLUMN "voidedById" TEXT,
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidReason" TEXT;

ALTER TABLE "Deferral" ADD COLUMN "deferralMethod" "DeferralMethod";

UPDATE "Deferral"
SET "deferralMethod" = CASE
  WHEN UPPER(COALESCE("deferralType", "category", '')) LIKE '%MEL%' THEN 'MEL'::"DeferralMethod"
  WHEN UPPER(COALESCE("deferralType", "category", '')) LIKE '%CDL%' THEN 'CDL'::"DeferralMethod"
  WHEN UPPER(COALESCE("deferralType", "category", '')) LIKE '%NEF%' THEN 'NEF'::"DeferralMethod"
  WHEN COALESCE("deferralType", "category") IS NOT NULL THEN 'OTHER_APPROVED'::"DeferralMethod"
  ELSE NULL
END;

CREATE TABLE "ReturnToServiceRecord" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "discrepancyId" TEXT,
    "maintenanceEventId" TEXT,
    "logbookEntryId" TEXT,
    "signerUserId" TEXT,
    "authorityProfileId" TEXT,
    "createdById" TEXT,
    "voidedById" TEXT,
    "rtsNumber" TEXT NOT NULL,
    "status" "ReturnToServiceRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "workSummary" TEXT,
    "approvalBasis" TEXT,
    "returnToServiceAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signedContentHash" TEXT,
    "signedSnapshot" JSONB,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnToServiceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReturnToServiceRecord_aircraftId_rtsNumber_key" ON "ReturnToServiceRecord"("aircraftId", "rtsNumber");
CREATE INDEX "ReturnToServiceRecord_aircraftId_status_idx" ON "ReturnToServiceRecord"("aircraftId", "status");
CREATE INDEX "ReturnToServiceRecord_discrepancyId_idx" ON "ReturnToServiceRecord"("discrepancyId");
CREATE INDEX "ReturnToServiceRecord_maintenanceEventId_idx" ON "ReturnToServiceRecord"("maintenanceEventId");
CREATE INDEX "ReturnToServiceRecord_logbookEntryId_idx" ON "ReturnToServiceRecord"("logbookEntryId");
CREATE INDEX "ReturnToServiceRecord_signerUserId_idx" ON "ReturnToServiceRecord"("signerUserId");
CREATE INDEX "ReturnToServiceRecord_authorityProfileId_idx" ON "ReturnToServiceRecord"("authorityProfileId");
CREATE INDEX "ReturnToServiceRecord_createdById_idx" ON "ReturnToServiceRecord"("createdById");
CREATE INDEX "ReturnToServiceRecord_voidedById_idx" ON "ReturnToServiceRecord"("voidedById");
CREATE INDEX "ReturnToServiceRecord_returnToServiceAt_idx" ON "ReturnToServiceRecord"("returnToServiceAt");
CREATE INDEX "Discrepancy_activeDeferralId_idx" ON "Discrepancy"("activeDeferralId");
CREATE INDEX "Discrepancy_correctiveMaintenanceEventId_idx" ON "Discrepancy"("correctiveMaintenanceEventId");
CREATE INDEX "Discrepancy_clearingReturnToServiceRecordId_idx" ON "Discrepancy"("clearingReturnToServiceRecordId");
CREATE INDEX "Discrepancy_voidedById_idx" ON "Discrepancy"("voidedById");
CREATE INDEX "Deferral_deferralMethod_idx" ON "Deferral"("deferralMethod");

ALTER TABLE "ReturnToServiceRecord" ADD CONSTRAINT "ReturnToServiceRecord_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnToServiceRecord" ADD CONSTRAINT "ReturnToServiceRecord_discrepancyId_fkey" FOREIGN KEY ("discrepancyId") REFERENCES "Discrepancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnToServiceRecord" ADD CONSTRAINT "ReturnToServiceRecord_maintenanceEventId_fkey" FOREIGN KEY ("maintenanceEventId") REFERENCES "MaintenanceEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnToServiceRecord" ADD CONSTRAINT "ReturnToServiceRecord_logbookEntryId_fkey" FOREIGN KEY ("logbookEntryId") REFERENCES "AircraftLogbookEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnToServiceRecord" ADD CONSTRAINT "ReturnToServiceRecord_signerUserId_fkey" FOREIGN KEY ("signerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnToServiceRecord" ADD CONSTRAINT "ReturnToServiceRecord_authorityProfileId_fkey" FOREIGN KEY ("authorityProfileId") REFERENCES "MaintenanceAuthorityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnToServiceRecord" ADD CONSTRAINT "ReturnToServiceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnToServiceRecord" ADD CONSTRAINT "ReturnToServiceRecord_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Discrepancy" ADD CONSTRAINT "Discrepancy_activeDeferralId_fkey" FOREIGN KEY ("activeDeferralId") REFERENCES "Deferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Discrepancy" ADD CONSTRAINT "Discrepancy_correctiveMaintenanceEventId_fkey" FOREIGN KEY ("correctiveMaintenanceEventId") REFERENCES "MaintenanceEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Discrepancy" ADD CONSTRAINT "Discrepancy_clearingReturnToServiceRecordId_fkey" FOREIGN KEY ("clearingReturnToServiceRecordId") REFERENCES "ReturnToServiceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Discrepancy" ADD CONSTRAINT "Discrepancy_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Discrepancy" AS d
SET "activeDeferralId" = active_deferral.id
FROM (
  SELECT DISTINCT ON ("discrepancyId") id, "discrepancyId"
  FROM "Deferral"
  WHERE status = 'ACTIVE'
  ORDER BY "discrepancyId", "deferredAt" DESC
) AS active_deferral
WHERE d.id = active_deferral."discrepancyId"
  AND d.status = 'DEFERRED';

INSERT INTO "ReturnToServiceRecord" (
  "id",
  "aircraftId",
  "discrepancyId",
  "maintenanceEventId",
  "rtsNumber",
  "status",
  "workSummary",
  "returnToServiceAt",
  "signedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('rts_', m.id),
  m."aircraftId",
  m."discrepancyId",
  m.id,
  CONCAT('RTS-', m."maintenanceNumber"),
  'SIGNED'::"ReturnToServiceRecordStatus",
  COALESCE(m."workPerformed", m.description, m.notes),
  m."returnToServiceAt",
  m."returnToServiceAt",
  m."createdAt",
  m."updatedAt"
FROM "MaintenanceEvent" m
JOIN "Discrepancy" d ON d.id = m."discrepancyId"
WHERE d.status = 'CLEARED'
  AND m.status = 'COMPLETED'
  AND m."returnToServiceAt" IS NOT NULL
ON CONFLICT ("aircraftId", "rtsNumber") DO NOTHING;

UPDATE "Discrepancy" AS d
SET
  "clearingReturnToServiceRecordId" = r.id,
  "correctiveMaintenanceEventId" = r."maintenanceEventId"
FROM "ReturnToServiceRecord" r
WHERE d.id = r."discrepancyId"
  AND d.status = 'CLEARED'
  AND r.status = 'SIGNED';
