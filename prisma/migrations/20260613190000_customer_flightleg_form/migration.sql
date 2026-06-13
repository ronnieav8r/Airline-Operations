-- Add a first-class customer record for flight setup while keeping the legacy
-- controllingEntity label populated for existing screens.
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerCode" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OperationalControlRecord" ADD COLUMN "customerId" TEXT;

CREATE UNIQUE INDEX "Customer_operatorId_name_key" ON "Customer"("operatorId", "name");
CREATE INDEX "Customer_operatorId_isActive_idx" ON "Customer"("operatorId", "isActive");
CREATE INDEX "OperationalControlRecord_customerId_idx" ON "OperationalControlRecord"("customerId");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalControlRecord" ADD CONSTRAINT "OperationalControlRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
