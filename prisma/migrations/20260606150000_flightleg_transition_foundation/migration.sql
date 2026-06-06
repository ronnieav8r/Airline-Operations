-- CreateEnum
CREATE TYPE "FlightLegStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'READY_FOR_RELEASE', 'RELEASED', 'ENROUTE', 'COMPLETE', 'CANCELLED', 'DELAYED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PLANNED', 'ACTIVE', 'RELIEVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "OperationalControlRecord" ADD COLUMN "flightLegId" TEXT;

-- CreateTable
CREATE TABLE "TripOrMission" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "missionType" TEXT,
    "requestedStart" TIMESTAMP(3),
    "requestedEnd" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripOrMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightLeg" (
    "id" TEXT NOT NULL,
    "legacyFlightId" TEXT,
    "tripOrMissionId" TEXT,
    "operatorId" TEXT NOT NULL,
    "operatingAuthorityId" TEXT NOT NULL,
    "authorityRevisionId" TEXT NOT NULL,
    "legNumber" INTEGER,
    "flightNumber" TEXT,
    "departureStationId" TEXT NOT NULL,
    "arrivalStationId" TEXT NOT NULL,
    "scheduledDeparture" TIMESTAMP(3) NOT NULL,
    "scheduledArrival" TIMESTAMP(3) NOT NULL,
    "actualDeparture" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "status" "FlightLegStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftAssignment" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PLANNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "assignedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AircraftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewLegAssignment" (
    "id" TEXT NOT NULL,
    "flightLegId" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "seatRole" "SeatRole" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PLANNED',
    "reportTime" TIMESTAMP(3),
    "releaseTime" TIMESTAMP(3),
    "assignedById" TEXT,
    "sourceAircraftCrewAssignmentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewLegAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnaroundLink" (
    "id" TEXT NOT NULL,
    "inboundFlightLegId" TEXT NOT NULL,
    "outboundFlightLegId" TEXT NOT NULL,
    "minimumTurnMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TurnaroundLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationalControlRecord_flightLegId_key" ON "OperationalControlRecord"("flightLegId");

-- CreateIndex
CREATE UNIQUE INDEX "TripOrMission_operatorId_tripNumber_key" ON "TripOrMission"("operatorId", "tripNumber");

-- CreateIndex
CREATE INDEX "TripOrMission_operatorId_requestedStart_idx" ON "TripOrMission"("operatorId", "requestedStart");

-- CreateIndex
CREATE UNIQUE INDEX "FlightLeg_legacyFlightId_key" ON "FlightLeg"("legacyFlightId");

-- CreateIndex
CREATE INDEX "FlightLeg_scheduledDeparture_idx" ON "FlightLeg"("scheduledDeparture");

-- CreateIndex
CREATE INDEX "FlightLeg_status_scheduledDeparture_idx" ON "FlightLeg"("status", "scheduledDeparture");

-- CreateIndex
CREATE INDEX "FlightLeg_operatorId_scheduledDeparture_idx" ON "FlightLeg"("operatorId", "scheduledDeparture");

-- CreateIndex
CREATE INDEX "FlightLeg_operatingAuthorityId_scheduledDeparture_idx" ON "FlightLeg"("operatingAuthorityId", "scheduledDeparture");

-- CreateIndex
CREATE INDEX "FlightLeg_departureStationId_scheduledDeparture_idx" ON "FlightLeg"("departureStationId", "scheduledDeparture");

-- CreateIndex
CREATE INDEX "FlightLeg_arrivalStationId_scheduledArrival_idx" ON "FlightLeg"("arrivalStationId", "scheduledArrival");

-- CreateIndex
CREATE UNIQUE INDEX "AircraftAssignment_flightLegId_aircraftId_key" ON "AircraftAssignment"("flightLegId", "aircraftId");

-- CreateIndex
CREATE INDEX "AircraftAssignment_aircraftId_assignedAt_idx" ON "AircraftAssignment"("aircraftId", "assignedAt");

-- CreateIndex
CREATE INDEX "AircraftAssignment_status_idx" ON "AircraftAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CrewLegAssignment_flightLegId_crewMemberId_seatRole_key" ON "CrewLegAssignment"("flightLegId", "crewMemberId", "seatRole");

-- CreateIndex
CREATE INDEX "CrewLegAssignment_flightLegId_seatRole_idx" ON "CrewLegAssignment"("flightLegId", "seatRole");

-- CreateIndex
CREATE INDEX "CrewLegAssignment_crewMemberId_reportTime_idx" ON "CrewLegAssignment"("crewMemberId", "reportTime");

-- CreateIndex
CREATE INDEX "CrewLegAssignment_sourceAircraftCrewAssignmentId_idx" ON "CrewLegAssignment"("sourceAircraftCrewAssignmentId");

-- CreateIndex
CREATE INDEX "CrewLegAssignment_status_idx" ON "CrewLegAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TurnaroundLink_inboundFlightLegId_outboundFlightLegId_key" ON "TurnaroundLink"("inboundFlightLegId", "outboundFlightLegId");

-- CreateIndex
CREATE INDEX "TurnaroundLink_outboundFlightLegId_idx" ON "TurnaroundLink"("outboundFlightLegId");

-- AddForeignKey
ALTER TABLE "OperationalControlRecord" ADD CONSTRAINT "OperationalControlRecord_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripOrMission" ADD CONSTRAINT "TripOrMission_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLeg" ADD CONSTRAINT "FlightLeg_legacyFlightId_fkey" FOREIGN KEY ("legacyFlightId") REFERENCES "Flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLeg" ADD CONSTRAINT "FlightLeg_tripOrMissionId_fkey" FOREIGN KEY ("tripOrMissionId") REFERENCES "TripOrMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLeg" ADD CONSTRAINT "FlightLeg_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLeg" ADD CONSTRAINT "FlightLeg_operatingAuthorityId_fkey" FOREIGN KEY ("operatingAuthorityId") REFERENCES "OperatingAuthority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLeg" ADD CONSTRAINT "FlightLeg_authorityRevisionId_fkey" FOREIGN KEY ("authorityRevisionId") REFERENCES "AuthorityRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLeg" ADD CONSTRAINT "FlightLeg_departureStationId_fkey" FOREIGN KEY ("departureStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLeg" ADD CONSTRAINT "FlightLeg_arrivalStationId_fkey" FOREIGN KEY ("arrivalStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftAssignment" ADD CONSTRAINT "AircraftAssignment_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftAssignment" ADD CONSTRAINT "AircraftAssignment_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftAssignment" ADD CONSTRAINT "AircraftAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLegAssignment" ADD CONSTRAINT "CrewLegAssignment_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLegAssignment" ADD CONSTRAINT "CrewLegAssignment_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLegAssignment" ADD CONSTRAINT "CrewLegAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewLegAssignment" ADD CONSTRAINT "CrewLegAssignment_sourceAircraftCrewAssignmentId_fkey" FOREIGN KEY ("sourceAircraftCrewAssignmentId") REFERENCES "AircraftCrewAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnaroundLink" ADD CONSTRAINT "TurnaroundLink_inboundFlightLegId_fkey" FOREIGN KEY ("inboundFlightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnaroundLink" ADD CONSTRAINT "TurnaroundLink_outboundFlightLegId_fkey" FOREIGN KEY ("outboundFlightLegId") REFERENCES "FlightLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
