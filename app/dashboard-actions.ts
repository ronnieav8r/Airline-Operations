"use server";

import {
  AssignmentStatus,
  EmploymentStatus,
  FaaFlightPlanStatus,
  ReleaseStatus,
  SeatRole,
  UserRole,
} from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

async function requireDashboardOpsUser(returnTo: string): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.OPS)) {
    errorRedirect(returnTo, "An ADMIN or OPS user is required for this action.");
  }

  return currentUser;
}

function revalidateDashboardWorkflowPaths(flightLegId: string) {
  revalidatePath("/");
  revalidatePath("/flights");
  revalidatePath("/operations-control");
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath("/api/health");
}

function parseCockpitSeatRole(formData: FormData): SeatRole {
  const value = formData.get("seatRole");

  if (value === SeatRole.CPT || value === SeatRole.FO) {
    return value;
  }

  throw new Error("Seat role must be CPT or FO.");
}

function parseCrewMemberId(formData: FormData): string {
  const crewMemberId = textField(formData, "crewMemberId");

  if (!crewMemberId) {
    throw new Error("Select a crew member.");
  }

  return crewMemberId;
}

function parseFaaFlightPlanStatus(formData: FormData): FaaFlightPlanStatus {
  const value = formData.get("faaFlightPlanStatus");

  if (
    value === FaaFlightPlanStatus.UNKNOWN ||
    value === FaaFlightPlanStatus.FILED ||
    value === FaaFlightPlanStatus.NOT_FILED ||
    value === FaaFlightPlanStatus.NOT_APPLICABLE
  ) {
    return value;
  }

  throw new Error("Flight-plan status is invalid.");
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

export async function dashboardAssignCrewLegAction(flightLegId: string, formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const currentUser = await requireDashboardOpsUser(returnTo);

  try {
    const seatRole = parseCockpitSeatRole(formData);
    const crewMemberId = parseCrewMemberId(formData);

    await prisma.$transaction(async (tx) => {
      const flightLeg = await tx.flightLeg.findUnique({
        where: { id: flightLegId },
        select: {
          id: true,
          scheduledDeparture: true,
          aircraftAssignments: {
            where: { status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] } },
            orderBy: { assignedAt: "desc" },
            take: 1,
            select: {
              aircraft: {
                select: {
                  type: true,
                },
              },
            },
          },
        },
      });

      if (!flightLeg) {
        throw new Error("FlightLeg was not found.");
      }

      const aircraftType = flightLeg.aircraftAssignments[0]?.aircraft.type;

      if (!aircraftType) {
        throw new Error("Assign an aircraft before assigning cockpit crew.");
      }

      const crewMember = await tx.crewMember.findUnique({
        where: { id: crewMemberId },
        select: {
          employmentStatus: true,
          qualifications: {
            where: {
              aircraftType,
              seatRole,
            },
            select: {
              expiresAt: true,
            },
            take: 1,
          },
        },
      });

      if (!crewMember || crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
        throw new Error("Selected crew member is not active.");
      }

      const qualification = crewMember.qualifications[0] ?? null;

      if (!qualification) {
        throw new Error("Selected crew member does not have the required aircraft/seat qualification.");
      }

      if (
        qualification.expiresAt &&
        qualification.expiresAt.getTime() <= flightLeg.scheduledDeparture.getTime()
      ) {
        throw new Error("Selected crew member is not qualified through the scheduled departure.");
      }

      await tx.crewLegAssignment.updateMany({
        where: {
          flightLegId,
          seatRole,
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
          crewMemberId: { not: crewMemberId },
        },
        data: {
          releaseTime: new Date(),
          status: AssignmentStatus.RELIEVED,
        },
      });

      await tx.crewLegAssignment.upsert({
        where: {
          flightLegId_crewMemberId_seatRole: {
            flightLegId,
            crewMemberId,
            seatRole,
          },
        },
        update: {
          assignedById: currentUser.id,
          releaseTime: null,
          reportTime: flightLeg.scheduledDeparture,
          status: AssignmentStatus.PLANNED,
        },
        create: {
          assignedById: currentUser.id,
          crewMemberId,
          flightLegId,
          reportTime: flightLeg.scheduledDeparture,
          seatRole,
          status: AssignmentStatus.PLANNED,
        },
      });
    });
  } catch (error) {
    errorRedirect(returnTo, error instanceof Error ? error.message : "Unable to assign crew.");
  }

  revalidateDashboardWorkflowPaths(flightLegId);
  redirect(returnTo);
}

export async function dashboardUpdateFlightPlanStatusAction(
  flightLegId: string,
  formData: FormData,
) {
  const returnTo = safeReturnTo(formData);
  await requireDashboardOpsUser(returnTo);

  try {
    const faaFlightPlanStatus = parseFaaFlightPlanStatus(formData);

    await prisma.flightLeg.update({
      where: { id: flightLegId },
      data: { faaFlightPlanStatus },
    });
  } catch (error) {
    errorRedirect(
      returnTo,
      error instanceof Error ? error.message : "Unable to update flight-plan status.",
    );
  }

  revalidateDashboardWorkflowPaths(flightLegId);
  redirect(returnTo);
}
