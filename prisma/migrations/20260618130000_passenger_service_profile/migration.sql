-- CreateEnum
CREATE TYPE "PassengerTemperaturePreference" AS ENUM ('UNKNOWN', 'COOL', 'NEUTRAL', 'WARM');

-- CreateEnum
CREATE TYPE "PassengerConversationPreference" AS ENUM ('UNKNOWN', 'ENGAGED', 'LIMITED', 'QUIET');

-- CreateEnum
CREATE TYPE "PassengerAviationInterest" AS ENUM ('UNKNOWN', 'ENTHUSIAST', 'CASUAL', 'NOT_INTERESTED');

-- CreateTable
CREATE TABLE "PassengerServiceProfile" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "cateringPreferences" TEXT,
    "cateringAvoidances" TEXT,
    "beveragePreferences" TEXT,
    "temperaturePreference" "PassengerTemperaturePreference" NOT NULL DEFAULT 'UNKNOWN',
    "conversationPreference" "PassengerConversationPreference" NOT NULL DEFAULT 'UNKNOWN',
    "aviationInterest" "PassengerAviationInterest" NOT NULL DEFAULT 'UNKNOWN',
    "cabinComfortNotes" TEXT,
    "flightDeckInteractionNotes" TEXT,
    "serviceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassengerServiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PassengerServiceProfile_passengerId_key" ON "PassengerServiceProfile"("passengerId");

-- AddForeignKey
ALTER TABLE "PassengerServiceProfile" ADD CONSTRAINT "PassengerServiceProfile_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
