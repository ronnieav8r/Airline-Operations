"use server";

import { ReleaseStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { runReleaseAction } from "@/app/operations-control/actions";
import { verifyPassword } from "@/lib/auth/password";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const RELEASE_ROLES = [UserRole.ADMIN, UserRole.OPS] as const;

function isReleaseAuthorized(user: CurrentUser | null): user is CurrentUser {
  return !!user && RELEASE_ROLES.includes(user.role as (typeof RELEASE_ROLES)[number]);
}

function textField(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function safeReturnTo(formData: FormData): string {
  const returnTo = textField(formData, "returnTo");

  return returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
}

function errorRedirect(returnTo: string, message: string): never {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}releaseError=${encodeURIComponent(message)}`);
}

async function verifyCredentialAuthorizer(
  formData: FormData,
  returnTo: string,
): Promise<CurrentUser> {
  const email = textField(formData, "authorizerEmail").toLowerCase();
  const password = String(formData.get("authorizerPassword") ?? "");

  if (!email || !password) {
    errorRedirect(returnTo, "Authorized username and password are required.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      passwordCredential: true,
      profile: true,
    },
  });

  if (!user || !user.isActive || !user.passwordCredential) {
    errorRedirect(returnTo, "Invalid release authorizer credentials.");
  }

  if (!RELEASE_ROLES.includes(user.role as (typeof RELEASE_ROLES)[number])) {
    errorRedirect(returnTo, "That user is not authorized to release flights.");
  }

  const passwordOk = await verifyPassword(password, user.passwordCredential.passwordHash);

  if (!passwordOk) {
    errorRedirect(returnTo, "Invalid release authorizer credentials.");
  }

  const name = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ");

  return {
    email: user.email,
    id: user.id,
    name: name || user.email,
    role: user.role,
  };
}

async function resolveReleaseActor(formData: FormData, returnTo: string) {
  const currentUser = await getCurrentUser();

  if (isReleaseAuthorized(currentUser)) {
    return { actor: currentUser, workstationUser: null };
  }

  const actor = await verifyCredentialAuthorizer(formData, returnTo);

  return { actor, workstationUser: currentUser };
}

export async function dashboardReleaseFlightAction(flightLegId: string, formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const { actor, workstationUser } = await resolveReleaseActor(formData, returnTo);

  await runReleaseAction(flightLegId, ReleaseStatus.RELEASED, actor, {
    redirectTo: returnTo,
    workstationUser,
  });
}

export async function dashboardVoidReleaseAction(flightLegId: string, formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const reason = textField(formData, "reason");

  if (!reason) {
    errorRedirect(returnTo, "A void reason is required.");
  }

  const { actor, workstationUser } = await resolveReleaseActor(formData, returnTo);

  await runReleaseAction(flightLegId, ReleaseStatus.VOIDED, actor, {
    reason,
    redirectTo: returnTo,
    workstationUser,
  });
}
