-- CreateEnum
CREATE TYPE "SeatRole" AS ENUM ('CPT', 'FO', 'FA', 'CA');

-- CreateEnum
CREATE TYPE "FlightStatus" AS ENUM ('SCHEDULED', 'ENROUTE', 'COMPLETE', 'CANCELLED', 'DELAYED');

-- CreateEnum
CREATE TYPE "AircraftType" AS ENUM ('CL_65', 'EMB_135_145');

-- CreateEnum
CREATE TYPE "AircraftStatus" AS ENUM ('AVAILABLE', 'IN_MAINTENANCE', 'RESERVED', 'IN_FLIGHT', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "DutyStatus" AS ENUM ('ON_DUTY', 'RESERVE', 'OFF_DUTY', 'VACATION', 'SICK', 'TRAINING', 'DEADHEADING');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('CREW_SHORTAGE', 'MAINTENANCE', 'WEATHER', 'SCHEDULE_CONFLICT', 'DUTY_VIOLATION', 'GENERAL');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TimeOffRequestType" AS ENUM ('VACATION', 'SICK', 'PERSONAL', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "TimeOffRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IdDocumentType" AS ENUM ('PASSPORT', 'DRIVERS_LICENSE', 'STATE_ID', 'MILITARY_ID', 'OTHER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPS', 'CREW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "idDocumentType" "IdDocumentType",
    "idDocumentNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aircraft" (
    "id" TEXT NOT NULL,
    "tailNumber" TEXT NOT NULL,
    "name" TEXT,
    "type" "AircraftType" NOT NULL,
    "status" "AircraftStatus" NOT NULL DEFAULT 'AVAILABLE',
    "homeStationId" TEXT,
    "seats" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "departureStationId" TEXT NOT NULL,
    "arrivalStationId" TEXT NOT NULL,
    "scheduledDeparture" TIMESTAMP(3) NOT NULL,
    "scheduledArrival" TIMESTAMP(3) NOT NULL,
    "actualDeparture" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "status" "FlightStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "baseStationId" TEXT NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "dutyStatus" "DutyStatus" NOT NULL DEFAULT 'OFF_DUTY',
    "hireDate" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewQualification" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "aircraftType" "AircraftType" NOT NULL,
    "seatRole" "SeatRole" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftCrewAssignment" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "seatRole" "SeatRole" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AircraftCrewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewSchedule" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "stationId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "dutyStatus" "DutyStatus" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewFlightLog" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "seatRole" "SeatRole" NOT NULL,
    "reportTime" TIMESTAMP(3),
    "releaseTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewFlightLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "idDocumentType" "IdDocumentType",
    "idDocumentNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightPassenger" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "seatNumber" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "boardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightPassenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOffRequest" (
    "id" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "requestType" "TimeOffRequestType" NOT NULL,
    "status" "TimeOffRequestStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "requestedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "flightId" TEXT,
    "aircraftId" TEXT,
    "crewMemberId" TEXT,
    "createdById" TEXT,
    "acknowledgedById" TEXT,
    "resolvedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxDutyHours" INTEGER,
    "minRestHours" INTEGER,
    "maxFlightHoursPerDay" INTEGER,
    "maxConsecutiveDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Station_code_key" ON "Station"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_tailNumber_key" ON "Aircraft"("tailNumber");

-- CreateIndex
CREATE INDEX "Aircraft_status_idx" ON "Aircraft"("status");

-- CreateIndex
CREATE INDEX "Aircraft_type_idx" ON "Aircraft"("type");

-- CreateIndex
CREATE INDEX "Aircraft_homeStationId_idx" ON "Aircraft"("homeStationId");

-- CreateIndex
CREATE INDEX "Flight_scheduledDeparture_idx" ON "Flight"("scheduledDeparture");

-- CreateIndex
CREATE INDEX "Flight_status_scheduledDeparture_idx" ON "Flight"("status", "scheduledDeparture");

-- CreateIndex
CREATE INDEX "Flight_aircraftId_scheduledDeparture_idx" ON "Flight"("aircraftId", "scheduledDeparture");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_flightNumber_scheduledDeparture_key" ON "Flight"("flightNumber", "scheduledDeparture");

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_userId_key" ON "CrewMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_employeeNumber_key" ON "CrewMember"("employeeNumber");

-- CreateIndex
CREATE INDEX "CrewMember_baseStationId_idx" ON "CrewMember"("baseStationId");

-- CreateIndex
CREATE INDEX "CrewMember_employmentStatus_idx" ON "CrewMember"("employmentStatus");

-- CreateIndex
CREATE INDEX "CrewMember_dutyStatus_idx" ON "CrewMember"("dutyStatus");

-- CreateIndex
CREATE INDEX "CrewQualification_crewMemberId_expiresAt_idx" ON "CrewQualification"("crewMemberId", "expiresAt");

-- CreateIndex
CREATE INDEX "CrewQualification_aircraftType_seatRole_idx" ON "CrewQualification"("aircraftType", "seatRole");

-- CreateIndex
CREATE UNIQUE INDEX "CrewQualification_crewMemberId_aircraftType_seatRole_key" ON "CrewQualification"("crewMemberId", "aircraftType", "seatRole");

-- CreateIndex
CREATE INDEX "AircraftCrewAssignment_aircraftId_startsAt_endsAt_idx" ON "AircraftCrewAssignment"("aircraftId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AircraftCrewAssignment_aircraftId_seatRole_startsAt_idx" ON "AircraftCrewAssignment"("aircraftId", "seatRole", "startsAt");

-- CreateIndex
CREATE INDEX "AircraftCrewAssignment_crewMemberId_startsAt_idx" ON "AircraftCrewAssignment"("crewMemberId", "startsAt");

-- CreateIndex
CREATE INDEX "AircraftCrewAssignment_isActive_idx" ON "AircraftCrewAssignment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftCrewAssignment_aircraftId_crewMemberId_seatRole_sta_key" ON "AircraftCrewAssignment"("aircraftId", "crewMemberId", "seatRole", "startsAt");

-- CreateIndex
CREATE INDEX "CrewSchedule_crewMemberId_date_idx" ON "CrewSchedule"("crewMemberId", "date");

-- CreateIndex
CREATE INDEX "CrewSchedule_date_idx" ON "CrewSchedule"("date");

-- CreateIndex
CREATE INDEX "CrewFlightLog_flightId_idx" ON "CrewFlightLog"("flightId");

-- CreateIndex
CREATE UNIQUE INDEX "CrewFlightLog_crewMemberId_flightId_seatRole_key" ON "CrewFlightLog"("crewMemberId", "flightId", "seatRole");

-- CreateIndex
CREATE INDEX "Passenger_lastName_firstName_idx" ON "Passenger"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "FlightPassenger_flightId_seatNumber_idx" ON "FlightPassenger"("flightId", "seatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FlightPassenger_flightId_passengerId_key" ON "FlightPassenger"("flightId", "passengerId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_crewMemberId_startDate_idx" ON "TimeOffRequest"("crewMemberId", "startDate");

-- CreateIndex
CREATE INDEX "TimeOffRequest_status_createdAt_idx" ON "TimeOffRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_status_type_createdAt_idx" ON "Alert"("status", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DutyRule_name_key" ON "DutyRule"("name");

-- CreateIndex
CREATE INDEX "DutyRule_isActive_idx" ON "DutyRule"("isActive");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_homeStationId_fkey" FOREIGN KEY ("homeStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_departureStationId_fkey" FOREIGN KEY ("departureStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_arrivalStationId_fkey" FOREIGN KEY ("arrivalStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_baseStationId_fkey" FOREIGN KEY ("baseStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewQualification" ADD CONSTRAINT "CrewQualification_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftCrewAssignment" ADD CONSTRAINT "AircraftCrewAssignment_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftCrewAssignment" ADD CONSTRAINT "AircraftCrewAssignment_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftCrewAssignment" ADD CONSTRAINT "AircraftCrewAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewSchedule" ADD CONSTRAINT "CrewSchedule_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewSchedule" ADD CONSTRAINT "CrewSchedule_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewFlightLog" ADD CONSTRAINT "CrewFlightLog_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewFlightLog" ADD CONSTRAINT "CrewFlightLog_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightPassenger" ADD CONSTRAINT "FlightPassenger_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightPassenger" ADD CONSTRAINT "FlightPassenger_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
