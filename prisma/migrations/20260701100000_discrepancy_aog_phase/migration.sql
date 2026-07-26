CREATE TYPE "AogResolutionPhase" AS ENUM (
  'NEEDS_ASSESSMENT',
  'TROUBLESHOOTING',
  'AWAITING_PARTS',
  'REPAIR_IN_PROGRESS',
  'RTS_PENDING'
);

ALTER TABLE "Discrepancy"
ADD COLUMN "aogPhase" "AogResolutionPhase",
ADD COLUMN "aogEtaAt" TIMESTAMP(3),
ADD COLUMN "aogMaintenanceNote" TEXT,
ADD COLUMN "aogPhaseUpdatedAt" TIMESTAMP(3),
ADD COLUMN "aogPhaseUpdatedById" TEXT;

CREATE INDEX "Discrepancy_aogPhase_idx" ON "Discrepancy"("aogPhase");
CREATE INDEX "Discrepancy_aogEtaAt_idx" ON "Discrepancy"("aogEtaAt");
CREATE INDEX "Discrepancy_aogPhaseUpdatedById_idx" ON "Discrepancy"("aogPhaseUpdatedById");

ALTER TABLE "Discrepancy" ADD CONSTRAINT "Discrepancy_aogPhaseUpdatedById_fkey" FOREIGN KEY ("aogPhaseUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
