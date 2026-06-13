-- CreateEnum
CREATE TYPE "CrewPlannedComplianceEventType" AS ENUM ('MEDICAL_RENEWAL', 'RECURRENT_TRAINING', 'PROFICIENCY_CHECK', 'COMPETENCY_CHECK', 'LINE_CHECK', 'RECENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "CrewPlannedComplianceEventStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED');

-- CreateTable
CREATE TABLE "CrewPlannedComplianceEvent" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "eventType" "CrewPlannedComplianceEventType" NOT NULL,
    "status" "CrewPlannedComplianceEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "dueBy" TIMESTAMP(3),
    "aircraftType" "AircraftType",
    "seatRole" "SeatRole",
    "providerName" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewPlannedComplianceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrewPlannedComplianceEvent_crewMemberId_status_idx" ON "CrewPlannedComplianceEvent"("crewMemberId", "status");

-- CreateIndex
CREATE INDEX "CrewPlannedComplianceEvent_crewMemberId_scheduledFor_idx" ON "CrewPlannedComplianceEvent"("crewMemberId", "scheduledFor");

-- CreateIndex
CREATE INDEX "CrewPlannedComplianceEvent_eventType_status_idx" ON "CrewPlannedComplianceEvent"("eventType", "status");

-- CreateIndex
CREATE INDEX "CrewPlannedComplianceEvent_aircraftType_seatRole_idx" ON "CrewPlannedComplianceEvent"("aircraftType", "seatRole");

-- CreateIndex
CREATE INDEX "CrewPlannedComplianceEvent_createdById_idx" ON "CrewPlannedComplianceEvent"("createdById");

-- AddForeignKey
ALTER TABLE "CrewPlannedComplianceEvent" ADD CONSTRAINT "CrewPlannedComplianceEvent_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewPlannedComplianceEvent" ADD CONSTRAINT "CrewPlannedComplianceEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
