CREATE TYPE "AircraftLogbookEntryType" AS ENUM ('CREW_SQUAWK', 'MAINTENANCE_ENTRY', 'INSPECTION_ENTRY', 'CORRECTIVE_ACTION', 'DEFERRAL', 'AIRWORTHINESS_RELEASE', 'COMPONENT_EVENT', 'AD_COMPLIANCE', 'FORM_337', 'ADMIN_CORRECTION');

CREATE TYPE "AircraftLogbookEntryStatus" AS ENUM ('DRAFT', 'OPEN', 'DEFERRED', 'CORRECTED', 'READY_FOR_SIGNATURE', 'SIGNED', 'RELEASED', 'VOIDED', 'SUPERSEDED');

CREATE TYPE "AircraftLogbookEntrySource" AS ENUM ('CREW', 'MAINTENANCE', 'OPS', 'INSPECTION', 'IMPORT', 'SYSTEM');

CREATE TYPE "AircraftLogbookSignaturePurpose" AS ENUM ('MAINTENANCE_APPROVAL', 'INSPECTION_APPROVAL', 'INSPECTION_DISAPPROVAL', 'DEFERRAL_AUTHORIZATION', 'AIRWORTHINESS_RELEASE', 'AMENDMENT', 'VOID');

CREATE TYPE "AircraftLogbookAuditEventType" AS ENUM ('CREATED', 'UPDATED', 'VIEWED', 'SIGNED', 'AMENDED', 'SUPERSEDED', 'VOIDED', 'ATTACHMENT_UPLOADED', 'ATTACHMENT_VIEWED', 'ATTACHMENT_DELETED', 'EXPORTED');

CREATE TYPE "AircraftLogbookAttachmentStorageProvider" AS ENUM ('LOCAL', 'S3_COMPATIBLE');

CREATE TYPE "AircraftLogbookAttachmentAccessEvent" AS ENUM ('UPLOADED', 'VIEWED', 'DOWNLOADED', 'DELETED');

ALTER TABLE "Deferral" ADD COLUMN "deferralType" TEXT,
ADD COLUMN "authorityType" TEXT,
ADD COLUMN "melItemNumber" TEXT,
ADD COLUMN "repairInterval" TEXT,
ADD COLUMN "placardRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "operatingLimitations" TEXT,
ADD COLUMN "requiredProcedures" TEXT,
ADD COLUMN "extensionApprovedAt" TIMESTAMP(3),
ADD COLUMN "extensionNotes" TEXT;

ALTER TABLE "MaintenanceEvent" ADD COLUMN "workPerformed" TEXT,
ADD COLUMN "manualReference" TEXT,
ADD COLUMN "taskReference" TEXT,
ADD COLUMN "performedByName" TEXT,
ADD COLUMN "performedByCertificateNumber" TEXT,
ADD COLUMN "approvedByCertificateNumber" TEXT,
ADD COLUMN "approvedByCertificateType" TEXT;

CREATE TABLE "MaintenanceAuthorityProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "certificateType" TEXT,
    "authorizationBasis" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceAuthorityProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AircraftLogbookEntry" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "flightLegId" TEXT,
    "discrepancyId" TEXT,
    "deferralId" TEXT,
    "maintenanceEventId" TEXT,
    "airworthinessReleaseId" TEXT,
    "parentEntryId" TEXT,
    "supersededById" TEXT,
    "entryNumber" TEXT NOT NULL,
    "entryType" "AircraftLogbookEntryType" NOT NULL,
    "status" "AircraftLogbookEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "AircraftLogbookEntrySource" NOT NULL DEFAULT 'MAINTENANCE',
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "category" TEXT,
    "severity" TEXT,
    "phaseOfFlight" TEXT,
    "manualReference" TEXT,
    "taskReference" TEXT,
    "melItemNumber" TEXT,
    "melCategory" TEXT,
    "deferralAuthority" TEXT,
    "dueAt" TIMESTAMP(3),
    "placardRequired" BOOLEAN NOT NULL DEFAULT false,
    "operatingLimitations" TEXT,
    "requiredProcedures" TEXT,
    "performedByName" TEXT,
    "performedByCertificateNumber" TEXT,
    "approvedByName" TEXT,
    "approvedByCertificateNumber" TEXT,
    "approvedByCertificateType" TEXT,
    "returnToServiceAt" TIMESTAMP(3),
    "signedContentHash" TEXT,
    "signedSnapshot" JSONB,
    "lockedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AircraftLogbookEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AircraftLogbookSignature" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "signerUserId" TEXT,
    "authorityProfileId" TEXT,
    "purpose" "AircraftLogbookSignaturePurpose" NOT NULL,
    "signerName" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "certificateType" TEXT,
    "authorizationBasis" TEXT,
    "intentText" TEXT NOT NULL,
    "signedContentHash" TEXT NOT NULL,
    "signedSnapshot" JSONB NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AircraftLogbookSignature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AircraftLogbookAttachment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "storageProvider" "AircraftLogbookAttachmentStorageProvider" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "uploadedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AircraftLogbookAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AircraftLogbookAttachmentAccessLog" (
    "id" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "actorId" TEXT,
    "event" "AircraftLogbookAttachmentAccessEvent" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AircraftLogbookAttachmentAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AircraftLogbookAuditEvent" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "entryId" TEXT,
    "actorId" TEXT,
    "eventType" "AircraftLogbookAuditEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AircraftLogbookAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceEntryTemplate" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "entryType" "AircraftLogbookEntryType" NOT NULL,
    "category" TEXT,
    "starterNarrative" TEXT NOT NULL,
    "requiredVariables" JSONB,
    "defaultSeverity" TEXT,
    "defaultReferences" TEXT,
    "appliesToAircraftType" "AircraftType",
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "retiredAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceEntryTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AircraftLogbookEntry_aircraftId_entryNumber_key" ON "AircraftLogbookEntry"("aircraftId", "entryNumber");
CREATE UNIQUE INDEX "AircraftLogbookAttachment_storageKey_key" ON "AircraftLogbookAttachment"("storageKey");
CREATE UNIQUE INDEX "MaintenanceEntryTemplate_templateKey_key" ON "MaintenanceEntryTemplate"("templateKey");

CREATE INDEX "Deferral_melItemNumber_idx" ON "Deferral"("melItemNumber");
CREATE INDEX "MaintenanceAuthorityProfile_userId_isActive_idx" ON "MaintenanceAuthorityProfile"("userId", "isActive");
CREATE INDEX "MaintenanceAuthorityProfile_certificateNumber_idx" ON "MaintenanceAuthorityProfile"("certificateNumber");
CREATE INDEX "MaintenanceAuthorityProfile_createdById_idx" ON "MaintenanceAuthorityProfile"("createdById");
CREATE INDEX "AircraftLogbookEntry_aircraftId_status_idx" ON "AircraftLogbookEntry"("aircraftId", "status");
CREATE INDEX "AircraftLogbookEntry_entryType_status_idx" ON "AircraftLogbookEntry"("entryType", "status");
CREATE INDEX "AircraftLogbookEntry_flightLegId_idx" ON "AircraftLogbookEntry"("flightLegId");
CREATE INDEX "AircraftLogbookEntry_discrepancyId_idx" ON "AircraftLogbookEntry"("discrepancyId");
CREATE INDEX "AircraftLogbookEntry_deferralId_idx" ON "AircraftLogbookEntry"("deferralId");
CREATE INDEX "AircraftLogbookEntry_maintenanceEventId_idx" ON "AircraftLogbookEntry"("maintenanceEventId");
CREATE INDEX "AircraftLogbookEntry_airworthinessReleaseId_idx" ON "AircraftLogbookEntry"("airworthinessReleaseId");
CREATE INDEX "AircraftLogbookEntry_parentEntryId_idx" ON "AircraftLogbookEntry"("parentEntryId");
CREATE INDEX "AircraftLogbookEntry_supersededById_idx" ON "AircraftLogbookEntry"("supersededById");
CREATE INDEX "AircraftLogbookEntry_reportedAt_idx" ON "AircraftLogbookEntry"("reportedAt");
CREATE INDEX "AircraftLogbookEntry_createdById_idx" ON "AircraftLogbookEntry"("createdById");
CREATE INDEX "AircraftLogbookEntry_updatedById_idx" ON "AircraftLogbookEntry"("updatedById");
CREATE INDEX "AircraftLogbookSignature_entryId_signedAt_idx" ON "AircraftLogbookSignature"("entryId", "signedAt");
CREATE INDEX "AircraftLogbookSignature_signerUserId_idx" ON "AircraftLogbookSignature"("signerUserId");
CREATE INDEX "AircraftLogbookSignature_authorityProfileId_idx" ON "AircraftLogbookSignature"("authorityProfileId");
CREATE INDEX "AircraftLogbookSignature_purpose_idx" ON "AircraftLogbookSignature"("purpose");
CREATE INDEX "AircraftLogbookAttachment_entryId_deletedAt_idx" ON "AircraftLogbookAttachment"("entryId", "deletedAt");
CREATE INDEX "AircraftLogbookAttachment_aircraftId_createdAt_idx" ON "AircraftLogbookAttachment"("aircraftId", "createdAt");
CREATE INDEX "AircraftLogbookAttachment_uploadedById_idx" ON "AircraftLogbookAttachment"("uploadedById");
CREATE INDEX "AircraftLogbookAttachmentAccessLog_attachmentId_createdAt_idx" ON "AircraftLogbookAttachmentAccessLog"("attachmentId", "createdAt");
CREATE INDEX "AircraftLogbookAttachmentAccessLog_actorId_createdAt_idx" ON "AircraftLogbookAttachmentAccessLog"("actorId", "createdAt");
CREATE INDEX "AircraftLogbookAuditEvent_aircraftId_createdAt_idx" ON "AircraftLogbookAuditEvent"("aircraftId", "createdAt");
CREATE INDEX "AircraftLogbookAuditEvent_entryId_createdAt_idx" ON "AircraftLogbookAuditEvent"("entryId", "createdAt");
CREATE INDEX "AircraftLogbookAuditEvent_actorId_createdAt_idx" ON "AircraftLogbookAuditEvent"("actorId", "createdAt");
CREATE INDEX "AircraftLogbookAuditEvent_eventType_idx" ON "AircraftLogbookAuditEvent"("eventType");
CREATE INDEX "MaintenanceEntryTemplate_entryType_isActive_idx" ON "MaintenanceEntryTemplate"("entryType", "isActive");
CREATE INDEX "MaintenanceEntryTemplate_category_idx" ON "MaintenanceEntryTemplate"("category");
CREATE INDEX "MaintenanceEntryTemplate_appliesToAircraftType_idx" ON "MaintenanceEntryTemplate"("appliesToAircraftType");
CREATE INDEX "MaintenanceEntryTemplate_createdById_idx" ON "MaintenanceEntryTemplate"("createdById");
CREATE INDEX "MaintenanceEntryTemplate_approvedById_idx" ON "MaintenanceEntryTemplate"("approvedById");

ALTER TABLE "MaintenanceAuthorityProfile" ADD CONSTRAINT "MaintenanceAuthorityProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceAuthorityProfile" ADD CONSTRAINT "MaintenanceAuthorityProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_discrepancyId_fkey" FOREIGN KEY ("discrepancyId") REFERENCES "Discrepancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_deferralId_fkey" FOREIGN KEY ("deferralId") REFERENCES "Deferral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_maintenanceEventId_fkey" FOREIGN KEY ("maintenanceEventId") REFERENCES "MaintenanceEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_airworthinessReleaseId_fkey" FOREIGN KEY ("airworthinessReleaseId") REFERENCES "AirworthinessRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_parentEntryId_fkey" FOREIGN KEY ("parentEntryId") REFERENCES "AircraftLogbookEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "AircraftLogbookEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookEntry" ADD CONSTRAINT "AircraftLogbookEntry_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookSignature" ADD CONSTRAINT "AircraftLogbookSignature_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "AircraftLogbookEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookSignature" ADD CONSTRAINT "AircraftLogbookSignature_signerUserId_fkey" FOREIGN KEY ("signerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookSignature" ADD CONSTRAINT "AircraftLogbookSignature_authorityProfileId_fkey" FOREIGN KEY ("authorityProfileId") REFERENCES "MaintenanceAuthorityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookAttachment" ADD CONSTRAINT "AircraftLogbookAttachment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "AircraftLogbookEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookAttachment" ADD CONSTRAINT "AircraftLogbookAttachment_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookAttachment" ADD CONSTRAINT "AircraftLogbookAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookAttachmentAccessLog" ADD CONSTRAINT "AircraftLogbookAttachmentAccessLog_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "AircraftLogbookAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookAttachmentAccessLog" ADD CONSTRAINT "AircraftLogbookAttachmentAccessLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookAuditEvent" ADD CONSTRAINT "AircraftLogbookAuditEvent_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookAuditEvent" ADD CONSTRAINT "AircraftLogbookAuditEvent_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "AircraftLogbookEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AircraftLogbookAuditEvent" ADD CONSTRAINT "AircraftLogbookAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceEntryTemplate" ADD CONSTRAINT "MaintenanceEntryTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceEntryTemplate" ADD CONSTRAINT "MaintenanceEntryTemplate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
