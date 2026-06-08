-- CreateEnum
CREATE TYPE "DispatchPackageStatus" AS ENUM ('DRAFT', 'READY', 'REVIEWED', 'VOIDED');

-- AlterTable
ALTER TABLE "DispatchPackage" ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "DispatchPackageStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DispatchPackage_status_idx" ON "DispatchPackage"("status");

-- CreateIndex
CREATE INDEX "DispatchPackage_reviewedById_idx" ON "DispatchPackage"("reviewedById");

-- AddForeignKey
ALTER TABLE "DispatchPackage" ADD CONSTRAINT "DispatchPackage_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
