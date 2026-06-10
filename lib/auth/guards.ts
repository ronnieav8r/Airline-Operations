import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";

export async function requireRole(allowedRoles: readonly UserRole[]): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?error=Please%20sign%20in%20to%20continue.");
  }

  if (!allowedRoles.includes(currentUser.role)) {
    redirect("/?authError=You%20do%20not%20have%20access%20to%20that%20workflow.");
  }

  return currentUser;
}
