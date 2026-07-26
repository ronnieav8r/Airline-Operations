CREATE TYPE "PassengerIdentityDocumentStorageProvider" AS ENUM ('LOCAL', 'S3_COMPATIBLE');

CREATE TYPE "PassengerIdentityDocumentAccessEvent" AS ENUM ('UPLOADED', 'VIEWED', 'REPLACED', 'DELETED');

CREATE TABLE "PassengerIdentityDocument" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "documentType" "IdDocumentType",
    "storageProvider" "PassengerIdentityDocumentStorageProvider" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "uploadedById" TEXT,
    "replacedById" TEXT,
    "deletedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassengerIdentityDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PassengerIdentityDocumentAccessLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "actorId" TEXT,
    "event" "PassengerIdentityDocumentAccessEvent" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassengerIdentityDocumentAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PassengerIdentityDocument_storageKey_key" ON "PassengerIdentityDocument"("storageKey");
CREATE INDEX "PassengerIdentityDocument_passengerId_deletedAt_idx" ON "PassengerIdentityDocument"("passengerId", "deletedAt");
CREATE INDEX "PassengerIdentityDocument_uploadedById_idx" ON "PassengerIdentityDocument"("uploadedById");
CREATE INDEX "PassengerIdentityDocument_replacedById_idx" ON "PassengerIdentityDocument"("replacedById");
CREATE INDEX "PassengerIdentityDocument_deletedById_idx" ON "PassengerIdentityDocument"("deletedById");
CREATE INDEX "PassengerIdentityDocumentAccessLog_documentId_createdAt_idx" ON "PassengerIdentityDocumentAccessLog"("documentId", "createdAt");
CREATE INDEX "PassengerIdentityDocumentAccessLog_passengerId_createdAt_idx" ON "PassengerIdentityDocumentAccessLog"("passengerId", "createdAt");
CREATE INDEX "PassengerIdentityDocumentAccessLog_actorId_createdAt_idx" ON "PassengerIdentityDocumentAccessLog"("actorId", "createdAt");

ALTER TABLE "PassengerIdentityDocument" ADD CONSTRAINT "PassengerIdentityDocument_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassengerIdentityDocument" ADD CONSTRAINT "PassengerIdentityDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PassengerIdentityDocument" ADD CONSTRAINT "PassengerIdentityDocument_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PassengerIdentityDocument" ADD CONSTRAINT "PassengerIdentityDocument_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PassengerIdentityDocumentAccessLog" ADD CONSTRAINT "PassengerIdentityDocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PassengerIdentityDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassengerIdentityDocumentAccessLog" ADD CONSTRAINT "PassengerIdentityDocumentAccessLog_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassengerIdentityDocumentAccessLog" ADD CONSTRAINT "PassengerIdentityDocumentAccessLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
