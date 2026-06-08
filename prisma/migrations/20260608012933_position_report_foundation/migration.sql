-- CreateTable
CREATE TABLE "PositionReport" (
    "id" TEXT NOT NULL,
    "flightLocatingRecordId" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "positionSummary" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "altitude" INTEGER,
    "groundspeed" INTEGER,
    "heading" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PositionReport_flightLocatingRecordId_reportedAt_idx" ON "PositionReport"("flightLocatingRecordId", "reportedAt");

-- CreateIndex
CREATE INDEX "PositionReport_source_idx" ON "PositionReport"("source");

-- AddForeignKey
ALTER TABLE "PositionReport" ADD CONSTRAINT "PositionReport_flightLocatingRecordId_fkey" FOREIGN KEY ("flightLocatingRecordId") REFERENCES "FlightLocatingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
