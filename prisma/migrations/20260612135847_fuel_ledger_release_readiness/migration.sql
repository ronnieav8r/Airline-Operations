-- CreateEnum
CREATE TYPE "AircraftFuelEventType" AS ENUM ('UPLIFT', 'DEFUEL', 'RELEASE_ONBOARD', 'POSTFLIGHT_ONBOARD', 'CORRECTION');

-- CreateTable
CREATE TABLE "OperatorFuelSetting" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "defaultJetAFuelDensityLbsPerGallon" DECIMAL(6,3) NOT NULL DEFAULT 6.700,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorFuelSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AircraftFuelEvent" (
    "id" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "flightLegId" TEXT,
    "eventType" "AircraftFuelEventType" NOT NULL,
    "fuelChangeLbs" DECIMAL(10,2),
    "fuelChangeGallons" DECIMAL(10,2),
    "fuelOnboardLbs" DECIMAL(10,2) NOT NULL,
    "fuelOnboardGallons" DECIMAL(10,2) NOT NULL,
    "fuelDensityLbsPerGallon" DECIMAL(6,3) NOT NULL,
    "fueledReady" BOOLEAN,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AircraftFuelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorFuelSetting_operatorId_key" ON "OperatorFuelSetting"("operatorId");

-- CreateIndex
CREATE INDEX "OperatorFuelSetting_updatedById_idx" ON "OperatorFuelSetting"("updatedById");

-- CreateIndex
CREATE INDEX "AircraftFuelEvent_aircraftId_recordedAt_idx" ON "AircraftFuelEvent"("aircraftId", "recordedAt");

-- CreateIndex
CREATE INDEX "AircraftFuelEvent_flightLegId_eventType_idx" ON "AircraftFuelEvent"("flightLegId", "eventType");

-- CreateIndex
CREATE INDEX "AircraftFuelEvent_eventType_recordedAt_idx" ON "AircraftFuelEvent"("eventType", "recordedAt");

-- CreateIndex
CREATE INDEX "AircraftFuelEvent_recordedById_idx" ON "AircraftFuelEvent"("recordedById");

-- AddForeignKey
ALTER TABLE "OperatorFuelSetting" ADD CONSTRAINT "OperatorFuelSetting_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorFuelSetting" ADD CONSTRAINT "OperatorFuelSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftFuelEvent" ADD CONSTRAINT "AircraftFuelEvent_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftFuelEvent" ADD CONSTRAINT "AircraftFuelEvent_flightLegId_fkey" FOREIGN KEY ("flightLegId") REFERENCES "FlightLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AircraftFuelEvent" ADD CONSTRAINT "AircraftFuelEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
