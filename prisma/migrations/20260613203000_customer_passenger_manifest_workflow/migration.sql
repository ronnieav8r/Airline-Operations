ALTER TABLE "Passenger" ADD COLUMN "middleName" TEXT;
ALTER TABLE "Passenger" ADD COLUMN "idIssuingCountry" TEXT;
ALTER TABLE "Passenger" ADD COLUMN "idIssuingState" TEXT;
ALTER TABLE "Passenger" ADD COLUMN "idDocumentExpiresAt" TIMESTAMP(3);
ALTER TABLE "Passenger" ADD COLUMN "notes" TEXT;

CREATE TABLE "CustomerPassenger" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "relationship" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPassenger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerPassenger_customerId_passengerId_key" ON "CustomerPassenger"("customerId", "passengerId");
CREATE INDEX "CustomerPassenger_passengerId_idx" ON "CustomerPassenger"("passengerId");

ALTER TABLE "CustomerPassenger" ADD CONSTRAINT "CustomerPassenger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPassenger" ADD CONSTRAINT "CustomerPassenger_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
