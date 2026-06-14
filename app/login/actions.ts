"use server";

import { redirect } from "next/navigation";

import { createSession, logoutCurrentSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

function loginUrl(params: Record<string, string>) {
  const query = new URLSearchParams(params);

  return `/login?${query.toString()}`;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(loginUrl({ error: "Email and password are required.", email }));
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      passwordCredential: true,
    },
  });

  if (!user || !user.isActive || !user.passwordCredential) {
    redirect(loginUrl({ error: "Invalid email or password.", email }));
  }

  const passwordMatches = await verifyPassword(password, user.passwordCredential.passwordHash);

  if (!passwordMatches) {
    redirect(loginUrl({ error: "Invalid email or password.", email }));
  }

  await createSession(user.id);
  redirect("/");
}

export async function localAdminLoginAction() {
  if (process.env.AEROOPS_ENABLE_TEST_AUTH !== "1" || process.env.NODE_ENV === "production") {
    redirect(loginUrl({ error: "Local admin shortcut is disabled." }));
  }

  const user = await prisma.user.findUnique({
    where: { email: "admin@aeroops.local" },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!user?.isActive) {
    redirect(loginUrl({ error: "Local admin user was not found. Run local seed first." }));
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await logoutCurrentSession();
  redirect("/login?loggedOut=1");
}
