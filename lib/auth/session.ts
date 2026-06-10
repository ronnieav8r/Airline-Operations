import { createHash, randomBytes } from "node:crypto";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "aeroops_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
};

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function formatName(user: {
  email: string;
  profile: { firstName: string | null; lastName: string | null } | null;
}) {
  const fullName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ");

  return fullName || user.email;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.userSession.create({
    data: {
      userId,
      sessionTokenHash: tokenHash,
      expiresAt,
      userAgent: requestHeaders.get("user-agent"),
      ipAddress:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        requestHeaders.get("x-real-ip"),
    },
  });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: { sessionTokenHash: hashSessionToken(token) },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt !== null ||
    session.expiresAt <= new Date() ||
    !session.user.isActive
  ) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    name: formatName(session.user),
  };
}

export async function logoutCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.userSession.updateMany({
      where: {
        sessionTokenHash: hashSessionToken(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return currentUser;
}
