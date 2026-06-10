-- CreateEnum
CREATE TYPE "CrewComplianceRecordStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUPERSEDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "CrewCertificateType" AS ENUM ('ATP', 'COMMERCIAL', 'PRIVATE', 'FLIGHT_INSTRUCTOR', 'TYPE_RATING', 'AIRCRAFT_RATING', 'ENDORSEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicalCertificateClass" AS ENUM ('FIRST_CLASS', 'SECOND_CLASS', 'THIRD_CLASS', 'BASICMED', 'OTHER');

-- CreateEnum
CREATE TYPE "CrewTrainingEventType" AS ENUM ('INITIAL', 'RECURRENT', 'TRANSITION', 'UPGRADE', 'DIFFERENCES', 'INDOCTRINATION', 'HAZMAT', 'CRM', 'EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "CrewCheckEventType" AS ENUM ('PROFICIENCY', 'COMPETENCY', 'LINE_CHECK', 'ROUTE_CHECK', 'INSTRUMENT_CHECK', 'CHECKRIDE', 'OTHER');

-- CreateEnum
CREATE TYPE "CrewComplianceResult" AS ENUM ('SATISFACTORY', 'UNSATISFACTORY', 'INCOMPLETE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "CrewRecencyEventType" AS ENUM ('TAKEOFF_LANDING', 'INSTRUMENT_APPROACH', 'HOLDING', 'ROUTE_EXPERIENCE', 'AREA_QUALIFICATION', 'FLIGHT_TIME', 'OTHER');

-- CreateEnum
CREATE TYPE "CrewDutyPeriodStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrewRestPeriodStatus" AS ENUM ('PLANNED', 'COMPLETED', 'INTERRUPTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CrewCertificate" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "certificateType" "CrewCertificateType" NOT NULL,
    "certificateNumber" TEXT,
    "ratingOrEndorsement" TEXT,
    "aircraftType" "AircraftType",
    "seatRole" "SeatRole",
    "issuingAuthority" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "CrewComplianceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewMedical" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "medicalClass" "MedicalCertificateClass" NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "limitations" TEXT,
    "status" "CrewComplianceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewMedical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewTrainingEvent" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "trainingType" "CrewTrainingEventType" NOT NULL,
    "programName" TEXT NOT NULL,
    "moduleName" TEXT,
    "aircraftType" "AircraftType",
    "completedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "result" "CrewComplianceResult" NOT NULL DEFAULT 'SATISFACTORY',
    "instructorName" TEXT,
    "providerName" TEXT,
    "status" "CrewComplianceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewTrainingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewCheckEvent" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "checkType" "CrewCheckEventType" NOT NULL,
    "aircraftType" "AircraftType",
    "seatRole" "SeatRole",
    "completedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "result" "CrewComplianceResult" NOT NULL DEFAULT 'SATISFACTORY',
    "evaluatorName" TEXT,
    "providerName" TEXT,
    "status" "CrewComplianceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewCheckEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewRecencyEvent" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "recencyType" "CrewRecencyEventType" NOT NULL,
    "aircraftType" "AircraftType",
    "seatRole" "SeatRole",
    "eventAt" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "result" "CrewComplianceResult" NOT NULL DEFAULT 'SATISFACTORY',
    "status" "CrewComplianceRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewRecencyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewDutyPeriod" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "CrewDutyPeriodStatus" NOT NULL DEFAULT 'PLANNED',
    "dutyStatus" "DutyStatus",
    "source" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewDutyPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewRestPeriod" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "CrewRestPeriodStatus" NOT NULL DEFAULT 'PLANNED',
    "source" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewRestPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrewCertificate_crewMemberId_status_idx" ON "CrewCertificate"("crewMemberId", "status");

-- CreateIndex
CREATE INDEX "CrewCertificate_crewMemberId_expiresAt_idx" ON "CrewCertificate"("crewMemberId", "expiresAt");

-- CreateIndex
CREATE INDEX "CrewCertificate_certificateType_idx" ON "CrewCertificate"("certificateType");

-- CreateIndex
CREATE INDEX "CrewCertificate_aircraftType_seatRole_idx" ON "CrewCertificate"("aircraftType", "seatRole");

-- CreateIndex
CREATE INDEX "CrewCertificate_createdById_idx" ON "CrewCertificate"("createdById");

-- CreateIndex
CREATE INDEX "CrewCertificate_verifiedById_idx" ON "CrewCertificate"("verifiedById");

-- CreateIndex
CREATE INDEX "CrewMedical_crewMemberId_status_idx" ON "CrewMedical"("crewMemberId", "status");

-- CreateIndex
CREATE INDEX "CrewMedical_crewMemberId_expiresAt_idx" ON "CrewMedical"("crewMemberId", "expiresAt");

-- CreateIndex
CREATE INDEX "CrewMedical_medicalClass_idx" ON "CrewMedical"("medicalClass");

-- CreateIndex
CREATE INDEX "CrewMedical_createdById_idx" ON "CrewMedical"("createdById");

-- CreateIndex
CREATE INDEX "CrewMedical_verifiedById_idx" ON "CrewMedical"("verifiedById");

-- CreateIndex
CREATE INDEX "CrewTrainingEvent_crewMemberId_status_idx" ON "CrewTrainingEvent"("crewMemberId", "status");

-- CreateIndex
CREATE INDEX "CrewTrainingEvent_crewMemberId_completedAt_idx" ON "CrewTrainingEvent"("crewMemberId", "completedAt");

-- CreateIndex
CREATE INDEX "CrewTrainingEvent_crewMemberId_expiresAt_idx" ON "CrewTrainingEvent"("crewMemberId", "expiresAt");

-- CreateIndex
CREATE INDEX "CrewTrainingEvent_trainingType_idx" ON "CrewTrainingEvent"("trainingType");

-- CreateIndex
CREATE INDEX "CrewTrainingEvent_aircraftType_idx" ON "CrewTrainingEvent"("aircraftType");

-- CreateIndex
CREATE INDEX "CrewTrainingEvent_createdById_idx" ON "CrewTrainingEvent"("createdById");

-- CreateIndex
CREATE INDEX "CrewTrainingEvent_verifiedById_idx" ON "CrewTrainingEvent"("verifiedById");

-- CreateIndex
CREATE INDEX "CrewCheckEvent_crewMemberId_status_idx" ON "CrewCheckEvent"("crewMemberId", "status");

-- CreateIndex
CREATE INDEX "CrewCheckEvent_crewMemberId_completedAt_idx" ON "CrewCheckEvent"("crewMemberId", "completedAt");

-- CreateIndex
CREATE INDEX "CrewCheckEvent_crewMemberId_expiresAt_idx" ON "CrewCheckEvent"("crewMemberId", "expiresAt");

-- CreateIndex
CREATE INDEX "CrewCheckEvent_checkType_idx" ON "CrewCheckEvent"("checkType");

-- CreateIndex
CREATE INDEX "CrewCheckEvent_aircraftType_seatRole_idx" ON "CrewCheckEvent"("aircraftType", "seatRole");

-- CreateIndex
CREATE INDEX "CrewCheckEvent_createdById_idx" ON "CrewCheckEvent"("createdById");

-- CreateIndex
CREATE INDEX "CrewCheckEvent_verifiedById_idx" ON "CrewCheckEvent"("verifiedById");

-- CreateIndex
CREATE INDEX "CrewRecencyEvent_crewMemberId_status_idx" ON "CrewRecencyEvent"("crewMemberId", "status");

-- CreateIndex
CREATE INDEX "CrewRecencyEvent_crewMemberId_eventAt_idx" ON "CrewRecencyEvent"("crewMemberId", "eventAt");

-- CreateIndex
CREATE INDEX "CrewRecencyEvent_crewMemberId_windowStart_windowEnd_idx" ON "CrewRecencyEvent"("crewMemberId", "windowStart", "windowEnd");

-- CreateIndex
CREATE INDEX "CrewRecencyEvent_recencyType_idx" ON "CrewRecencyEvent"("recencyType");

-- CreateIndex
CREATE INDEX "CrewRecencyEvent_aircraftType_seatRole_idx" ON "CrewRecencyEvent"("aircraftType", "seatRole");

-- CreateIndex
CREATE INDEX "CrewRecencyEvent_createdById_idx" ON "CrewRecencyEvent"("createdById");

-- CreateIndex
CREATE INDEX "CrewRecencyEvent_verifiedById_idx" ON "CrewRecencyEvent"("verifiedById");

-- CreateIndex
CREATE INDEX "CrewDutyPeriod_crewMemberId_status_idx" ON "CrewDutyPeriod"("crewMemberId", "status");

-- CreateIndex
CREATE INDEX "CrewDutyPeriod_crewMemberId_startsAt_endsAt_idx" ON "CrewDutyPeriod"("crewMemberId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CrewDutyPeriod_dutyStatus_idx" ON "CrewDutyPeriod"("dutyStatus");

-- CreateIndex
CREATE INDEX "CrewDutyPeriod_createdById_idx" ON "CrewDutyPeriod"("createdById");

-- CreateIndex
CREATE INDEX "CrewDutyPeriod_verifiedById_idx" ON "CrewDutyPeriod"("verifiedById");

-- CreateIndex
CREATE INDEX "CrewRestPeriod_crewMemberId_status_idx" ON "CrewRestPeriod"("crewMemberId", "status");

-- CreateIndex
CREATE INDEX "CrewRestPeriod_crewMemberId_startsAt_endsAt_idx" ON "CrewRestPeriod"("crewMemberId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CrewRestPeriod_createdById_idx" ON "CrewRestPeriod"("createdById");

-- CreateIndex
CREATE INDEX "CrewRestPeriod_verifiedById_idx" ON "CrewRestPeriod"("verifiedById");

-- AddForeignKey
ALTER TABLE "CrewCertificate" ADD CONSTRAINT "CrewCertificate_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewCertificate" ADD CONSTRAINT "CrewCertificate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewCertificate" ADD CONSTRAINT "CrewCertificate_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMedical" ADD CONSTRAINT "CrewMedical_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMedical" ADD CONSTRAINT "CrewMedical_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMedical" ADD CONSTRAINT "CrewMedical_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewTrainingEvent" ADD CONSTRAINT "CrewTrainingEvent_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewTrainingEvent" ADD CONSTRAINT "CrewTrainingEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewTrainingEvent" ADD CONSTRAINT "CrewTrainingEvent_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewCheckEvent" ADD CONSTRAINT "CrewCheckEvent_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewCheckEvent" ADD CONSTRAINT "CrewCheckEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewCheckEvent" ADD CONSTRAINT "CrewCheckEvent_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewRecencyEvent" ADD CONSTRAINT "CrewRecencyEvent_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewRecencyEvent" ADD CONSTRAINT "CrewRecencyEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewRecencyEvent" ADD CONSTRAINT "CrewRecencyEvent_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewDutyPeriod" ADD CONSTRAINT "CrewDutyPeriod_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewDutyPeriod" ADD CONSTRAINT "CrewDutyPeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewDutyPeriod" ADD CONSTRAINT "CrewDutyPeriod_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewRestPeriod" ADD CONSTRAINT "CrewRestPeriod_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewRestPeriod" ADD CONSTRAINT "CrewRestPeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewRestPeriod" ADD CONSTRAINT "CrewRestPeriod_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

