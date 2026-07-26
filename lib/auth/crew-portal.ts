import { EmploymentStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const DEFAULT_DEV_CREW_EMAIL = "crew@aeroops.local";

function isLocalCrewPortalBypassEnabled() {
  return process.env.NODE_ENV !== "production";
}

function formatName(user: {
  email: string;
  profile: { firstName: string | null; lastName: string | null } | null;
}) {
  const fullName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ");

  return fullName || user.email;
}

async function findDevCrewUser() {
  const preferredEmail = process.env.AEROOPS_DEV_CREW_EMAIL ?? DEFAULT_DEV_CREW_EMAIL;
  const preferredUser = await prisma.user.findFirst({
    where: {
      email: preferredEmail,
      isActive: true,
      role: UserRole.CREW,
      crewMember: {
        is: {
          employmentStatus: EmploymentStatus.ACTIVE,
        },
      },
    },
    include: {
      profile: true,
    },
  });

  if (preferredUser) {
    return preferredUser;
  }

  return prisma.user.findFirst({
    where: {
      isActive: true,
      role: UserRole.CREW,
      crewMember: {
        is: {
          employmentStatus: EmploymentStatus.ACTIVE,
        },
      },
    },
    include: {
      profile: true,
    },
    orderBy: {
      email: "asc",
    },
  });
}

export async function requireCrewPortalUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (currentUser?.role === UserRole.CREW) {
    return currentUser;
  }

  if (isLocalCrewPortalBypassEnabled()) {
    const devUser = await findDevCrewUser();

    if (devUser) {
      return {
        email: devUser.email,
        id: devUser.id,
        name: formatName(devUser),
        role: devUser.role,
      };
    }
  }

  if (!currentUser) {
    redirect("/login?error=Please%20sign%20in%20to%20continue.");
  }

  redirect("/?authError=You%20do%20not%20have%20access%20to%20that%20workflow.");
}
