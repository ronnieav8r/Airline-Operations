-- Expand operational roles for local app auth.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DISPATCH';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MAINTENANCE';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SAFETY';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VIEWER';

-- Local password credential. Password hashes only; no plaintext credentials.
CREATE TABLE "UserPasswordCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordHashAlgorithm" TEXT NOT NULL DEFAULT 'scrypt',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPasswordCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPasswordCredential_userId_key" ON "UserPasswordCredential"("userId");
CREATE INDEX "UserPasswordCredential_lastChangedAt_idx" ON "UserPasswordCredential"("lastChangedAt");

ALTER TABLE "UserPasswordCredential"
ADD CONSTRAINT "UserPasswordCredential_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DB-backed sessions. The cookie stores an opaque token; the DB stores only a hash.
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSession_sessionTokenHash_key" ON "UserSession"("sessionTokenHash");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
CREATE INDEX "UserSession_revokedAt_idx" ON "UserSession"("revokedAt");

ALTER TABLE "UserSession"
ADD CONSTRAINT "UserSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
