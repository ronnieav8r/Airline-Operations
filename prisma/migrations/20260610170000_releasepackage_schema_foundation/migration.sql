CREATE TYPE "ReleasePackageStatus" AS ENUM ('DRAFT', 'PREVIEW', 'FINALIZED', 'VOIDED');

CREATE TYPE "ReleasePackageEvidenceType" AS ENUM (
  'OPERATIONAL_CONTROL_RECORD',
  'FLIGHT_RELEASE',
  'RELEASE_READINESS_SNAPSHOT',
  'RELEASE_AUDIT_EVENT',
  'MANIFEST',
  'MANIFEST_ITEM',
  'WEIGHT_BALANCE_RUN',
  'FLIGHT_LOCATING_RECORD',
  'POSITION_REPORT',
  'DISPATCH_PACKAGE',
  'WEATHER_BRIEFING',
  'NOTAM_SNAPSHOT',
  'FLIGHT_PLAN_REFERENCE',
  'AIRWORTHINESS_RELEASE',
  'AIRCRAFT_CONFIGURATION',
  'AIRCRAFT_CAPABILITY',
  'DISCREPANCY',
  'DEFERRAL',
  'MAINTENANCE_EVENT',
  'OTHER'
);

CREATE TABLE "ReleasePackage" (
  "id" TEXT NOT NULL,
  "flightLegId" TEXT NOT NULL,
  "operationalControlRecordId" TEXT NOT NULL,
  "flightReleaseId" TEXT NOT NULL,
  "readinessSnapshotId" TEXT,
  "packageNumber" TEXT NOT NULL,
  "status" "ReleasePackageStatus" NOT NULL DEFAULT 'PREVIEW',
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "capturedById" TEXT,
  "summary" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReleasePackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReleasePackageEvidenceLink" (
  "id" TEXT NOT NULL,
  "releasePackageId" TEXT NOT NULL,
  "evidenceType" "ReleasePackageEvidenceType" NOT NULL,
  "evidenceId" TEXT,
  "evidenceLabel" TEXT NOT NULL,
  "statusLabel" TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "summary" JSONB,
  "capturedMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReleasePackageEvidenceLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReleasePackage_packageNumber_key" ON "ReleasePackage"("packageNumber");
CREATE INDEX "ReleasePackage_flightLegId_capturedAt_idx" ON "ReleasePackage"("flightLegId", "capturedAt");
CREATE INDEX "ReleasePackage_operationalControlRecordId_idx" ON "ReleasePackage"("operationalControlRecordId");
CREATE INDEX "ReleasePackage_flightReleaseId_idx" ON "ReleasePackage"("flightReleaseId");
CREATE INDEX "ReleasePackage_readinessSnapshotId_idx" ON "ReleasePackage"("readinessSnapshotId");
CREATE INDEX "ReleasePackage_status_idx" ON "ReleasePackage"("status");
CREATE INDEX "ReleasePackage_capturedById_idx" ON "ReleasePackage"("capturedById");
CREATE INDEX "ReleasePackageEvidenceLink_releasePackageId_idx" ON "ReleasePackageEvidenceLink"("releasePackageId");
CREATE INDEX "ReleasePackageEvidenceLink_evidenceType_evidenceId_idx" ON "ReleasePackageEvidenceLink"("evidenceType", "evidenceId");
CREATE INDEX "ReleasePackageEvidenceLink_isRequired_idx" ON "ReleasePackageEvidenceLink"("isRequired");

ALTER TABLE "ReleasePackage"
ADD CONSTRAINT "ReleasePackage_flightLegId_fkey"
FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReleasePackage"
ADD CONSTRAINT "ReleasePackage_operationalControlRecordId_fkey"
FOREIGN KEY ("operationalControlRecordId") REFERENCES "OperationalControlRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReleasePackage"
ADD CONSTRAINT "ReleasePackage_flightReleaseId_fkey"
FOREIGN KEY ("flightReleaseId") REFERENCES "FlightRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReleasePackage"
ADD CONSTRAINT "ReleasePackage_readinessSnapshotId_fkey"
FOREIGN KEY ("readinessSnapshotId") REFERENCES "ReleaseReadinessSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReleasePackage"
ADD CONSTRAINT "ReleasePackage_capturedById_fkey"
FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReleasePackageEvidenceLink"
ADD CONSTRAINT "ReleasePackageEvidenceLink_releasePackageId_fkey"
FOREIGN KEY ("releasePackageId") REFERENCES "ReleasePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
