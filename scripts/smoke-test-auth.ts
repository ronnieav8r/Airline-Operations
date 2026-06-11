import { createHash, randomBytes } from "node:crypto";

import { PrismaClient, UserRole } from "@prisma/client";

import { createPasswordHash } from "../lib/auth/password";

export const SMOKE_TEST_PASSWORD = process.env.AEROOPS_SMOKE_TEST_PASSWORD ?? "AeroOpsSmoke!2026";
export const SMOKE_TEST_EMAIL_DOMAIN = "aeroops.local";

export const SMOKE_TEST_USERS: Array<{
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}> = [
  { email: "admin@aeroops.local", firstName: "Alex", lastName: "Bennett", role: UserRole.ADMIN },
  { email: "ops@aeroops.local", firstName: "Morgan", lastName: "Keller", role: UserRole.OPS },
  { email: "dispatch@aeroops.local", firstName: "Dana", lastName: "Cross", role: UserRole.DISPATCH },
  { email: "maintenance@aeroops.local", firstName: "Mack", lastName: "Stone", role: UserRole.MAINTENANCE },
  { email: "crew@aeroops.local", firstName: "Jordan", lastName: "Miles", role: UserRole.CREW },
  { email: "safety@aeroops.local", firstName: "Sage", lastName: "Rivera", role: UserRole.SAFETY },
  { email: "viewer@aeroops.local", firstName: "Vivian", lastName: "Shaw", role: UserRole.VIEWER },
];

export function assertSmokeTestAuthEnabled() {
  if (process.env.AEROOPS_ENABLE_TEST_AUTH !== "1") {
    throw new Error("Set AEROOPS_ENABLE_TEST_AUTH=1 to create or use smoke-test users.");
  }

  if (process.env.NODE_ENV === "production" && process.env.AEROOPS_ALLOW_PRODUCTION_TEST_USERS !== "1") {
    throw new Error(
      "Smoke-test auth is disabled in NODE_ENV=production unless AEROOPS_ALLOW_PRODUCTION_TEST_USERS=1 is explicitly set.",
    );
  }
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureSmokeTestUsers(prisma: PrismaClient) {
  assertSmokeTestAuthEnabled();

  for (const testUser of SMOKE_TEST_USERS) {
    if (!testUser.email.endsWith(`@${SMOKE_TEST_EMAIL_DOMAIN}`)) {
      throw new Error(`Smoke-test user ${testUser.email} must use ${SMOKE_TEST_EMAIL_DOMAIN}.`);
    }

    const user = await prisma.user.upsert({
      where: { email: testUser.email },
      create: {
        email: testUser.email,
        role: testUser.role,
        isActive: true,
      },
      update: {
        role: testUser.role,
        isActive: true,
      },
    });

    await prisma.userPasswordCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        passwordHash: await createPasswordHash(SMOKE_TEST_PASSWORD),
        mustChangePassword: false,
      },
      update: {
        passwordHash: await createPasswordHash(SMOKE_TEST_PASSWORD),
        mustChangePassword: false,
      },
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      },
      update: {
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      },
    });
  }

  const crewUser = await prisma.user.findUnique({
    where: { email: "crew@aeroops.local" },
    select: { id: true },
  });
  const existingLinkedCrew = crewUser
    ? await prisma.crewMember.findUnique({ where: { userId: crewUser.id }, select: { id: true } })
    : null;

  if (crewUser && !existingLinkedCrew) {
    const crewMember =
      (await prisma.crewMember.findFirst({
        where: {
          email: "jordan.miles@aeroops.local",
        },
        select: { id: true },
      })) ??
      (await prisma.crewMember.findFirst({
        orderBy: [{ employmentStatus: "asc" }, { lastName: "asc" }],
        select: { id: true },
      }));

    if (crewMember) {
      await prisma.crewMember.update({
        where: { id: crewMember.id },
        data: { userId: crewUser.id },
      });
    }
  }
}

export async function createSmokeSession(prisma: PrismaClient, email: string) {
  assertSmokeTestAuthEnabled();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      isActive: true,
      role: true,
    },
  });

  if (!user?.isActive) {
    throw new Error(`Smoke-test user ${email} was not found or is inactive.`);
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      sessionTokenHash: hashSessionToken(token),
      expiresAt,
      userAgent: "aeroops-smoke-test",
      ipAddress: "127.0.0.1",
    },
  });

  return {
    cookie: `aeroops_session=${token}`,
    role: user.role,
    userId: user.id,
  };
}
