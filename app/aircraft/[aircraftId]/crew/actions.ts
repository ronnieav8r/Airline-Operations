"use server";

import {
  AssignmentStatus,
  EmploymentStatus,
  FlightLegStatus,
  Prisma,
  SeatRole,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

class AircraftCrewWorkflowError extends Error {}

type AircraftCrewAssignmentInput = {
  crewMemberId: string;
  endsAt: Date | null;
  notes: string | null;
  seatRole: SeatRole;
  startsAt: Date;
};

type AircraftCrewAssignmentEditInput = Omit<AircraftCrewAssignmentInput, "crewMemberId">;

function getOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getRequiredText(formData: FormData, key: string, label: string): string {
  const value = getOptionalText(formData, key);

  if (!value) {
    throw new AircraftCrewWorkflowError(`${label} is required.`);
  }

  return value;
}

function parseOptionalDateTime(formData: FormData, key: string, label: string): Date | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AircraftCrewWorkflowError(`${label} must be a valid date and time.`);
  }

  return parsed;
}

function parseRequiredDateTime(formData: FormData, key: string, label: string): Date {
  const parsed = parseOptionalDateTime(formData, key, label);

  if (!parsed) {
    throw new AircraftCrewWorkflowError(`${label} is required.`);
  }

  return parsed;
}

function parseSeatRole(formData: FormData): SeatRole {
  const value = getRequiredText(formData, "seatRole", "Seat role");

  if (
    value === SeatRole.CPT ||
    value === SeatRole.FO ||
    value === SeatRole.FA ||
    value === SeatRole.CA
  ) {
    return value;
  }

  throw new AircraftCrewWorkflowError("Seat role is not valid.");
}

function parseAssignmentInput(formData: FormData): AircraftCrewAssignmentInput {
  return {
    ...parseAssignmentEditInput(formData),
    crewMemberId: getRequiredText(formData, "crewMemberId", "Crew member"),
  };
}

function parseAssignmentEditInput(formData: FormData): AircraftCrewAssignmentEditInput {
  const startsAt = parseRequiredDateTime(formData, "startsAt", "Start time");
  const endsAt = parseOptionalDateTime(formData, "endsAt", "End time");

  if (endsAt && endsAt <= startsAt) {
    throw new AircraftCrewWorkflowError("End time must be after start time.");
  }

  return {
    endsAt,
    notes: getOptionalText(formData, "notes"),
    seatRole: parseSeatRole(formData),
    startsAt,
  };
}

function encodeError(error: unknown): string {
  if (error instanceof AircraftCrewWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Crew assignment already exists for this exact block.");
  }

  return encodeURIComponent("Crew assignment workflow failed.");
}

async function ensureAircraftExists(tx: Prisma.TransactionClient, aircraftId: string) {
  const aircraft = await tx.aircraft.findUnique({
    where: { id: aircraftId },
    select: { id: true },
  });

  if (!aircraft) {
    throw new AircraftCrewWorkflowError("Aircraft was not found.");
  }
}

async function ensureActiveCrewMember(tx: Prisma.TransactionClient, crewMemberId: string) {
  const crewMember = await tx.crewMember.findUnique({
    where: { id: crewMemberId },
    select: {
      employmentStatus: true,
    },
  });

  if (!crewMember) {
    throw new AircraftCrewWorkflowError("Crew member was not found.");
  }

  if (crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new AircraftCrewWorkflowError("Crew member must have active employment.");
  }
}

async function ensureAssignmentBelongsToAircraft(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  assignmentId: string,
) {
  const assignment = await tx.aircraftCrewAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      aircraftId: true,
      crewMemberId: true,
    },
  });

  if (!assignment || assignment.aircraftId !== aircraftId) {
    throw new AircraftCrewWorkflowError("Crew assignment was not found for this aircraft.");
  }

  return assignment;
}

async function assertNoExactDuplicate(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  input: AircraftCrewAssignmentInput,
  exceptAssignmentId?: string,
) {
  const duplicate = await tx.aircraftCrewAssignment.findFirst({
    where: {
      aircraftId,
      crewMemberId: input.crewMemberId,
      seatRole: input.seatRole,
      startsAt: input.startsAt,
      id: exceptAssignmentId ? { not: exceptAssignmentId } : undefined,
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    throw new AircraftCrewWorkflowError("Crew assignment already exists for this exact block.");
  }
}

async function resyncCrewSnapshotsForFlightLeg(
  tx: Prisma.TransactionClient,
  flightLegId: string,
  aircraftId: string,
  scheduledDeparture: Date,
) {
  const sourceAssignments = await tx.aircraftCrewAssignment.findMany({
    where: {
      aircraftId,
      isActive: true,
      startsAt: { lte: scheduledDeparture },
      OR: [{ endsAt: null }, { endsAt: { gt: scheduledDeparture } }],
    },
    orderBy: [{ seatRole: "asc" }, { startsAt: "asc" }],
    select: {
      id: true,
      crewMemberId: true,
      seatRole: true,
    },
  });
  const expectedKeys = new Set(
    sourceAssignments.map((assignment) => `${assignment.crewMemberId}:${assignment.seatRole}`),
  );
  const existingSnapshots = await tx.crewLegAssignment.findMany({
    where: { flightLegId },
    select: {
      id: true,
      crewMemberId: true,
      seatRole: true,
    },
  });

  for (const snapshot of existingSnapshots) {
    const key = `${snapshot.crewMemberId}:${snapshot.seatRole}`;

    if (!expectedKeys.has(key)) {
      await tx.crewLegAssignment.update({
        where: { id: snapshot.id },
        data: {
          status: AssignmentStatus.RELIEVED,
          releaseTime: new Date(),
        },
      });
    }
  }

  for (const assignment of sourceAssignments) {
    await tx.crewLegAssignment.upsert({
      where: {
        flightLegId_crewMemberId_seatRole: {
          flightLegId,
          crewMemberId: assignment.crewMemberId,
          seatRole: assignment.seatRole,
        },
      },
      update: {
        reportTime: scheduledDeparture,
        releaseTime: null,
        sourceAircraftCrewAssignmentId: assignment.id,
        status: AssignmentStatus.PLANNED,
      },
      create: {
        flightLegId,
        crewMemberId: assignment.crewMemberId,
        reportTime: scheduledDeparture,
        seatRole: assignment.seatRole,
        sourceAircraftCrewAssignmentId: assignment.id,
        status: AssignmentStatus.PLANNED,
      },
    });
  }
}

async function resyncFutureCrewLegSnapshotsForAircraft(
  tx: Prisma.TransactionClient,
  aircraftId: string,
) {
  const now = new Date();
  const assignments = await tx.aircraftAssignment.findMany({
    where: {
      aircraftId,
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
      flightLeg: {
        scheduledArrival: { gte: now },
        status: { not: FlightLegStatus.CANCELLED },
      },
    },
    select: {
      flightLeg: {
        select: {
          id: true,
          scheduledDeparture: true,
        },
      },
    },
  });

  for (const assignment of assignments) {
    await resyncCrewSnapshotsForFlightLeg(
      tx,
      assignment.flightLeg.id,
      aircraftId,
      assignment.flightLeg.scheduledDeparture,
    );
  }
}

function revalidateAircraftCrewWorkflowPaths(aircraftId: string) {
  revalidatePath("/");
  revalidatePath("/aircraft");
  revalidatePath(`/aircraft/${aircraftId}`);
  revalidatePath(`/aircraft/${aircraftId}/crew`);
  revalidatePath("/crew");
  revalidatePath("/flights");
  revalidatePath("/scheduling");
  revalidatePath("/operations-control");
  revalidatePath("/api/health");
  revalidatePath("/internal/flightleg-parity");
  revalidatePath("/internal/flightleg-write-readiness");
}

export async function createAircraftCrewAssignmentAction(
  aircraftId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parseAssignmentInput(formData);

    await prisma.$transaction(async (tx) => {
      await ensureAircraftExists(tx, aircraftId);
      await ensureActiveCrewMember(tx, input.crewMemberId);
      await assertNoExactDuplicate(tx, aircraftId, input);
      await tx.aircraftCrewAssignment.create({
        data: {
          aircraftId,
          crewMemberId: input.crewMemberId,
          endsAt: input.endsAt,
          isActive: !input.endsAt || input.endsAt > new Date(),
          notes: input.notes,
          seatRole: input.seatRole,
          startsAt: input.startsAt,
          assignedById: currentUser.id,
        },
      });
      await resyncFutureCrewLegSnapshotsForAircraft(tx, aircraftId);
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/crew?error=${encodeError(error)}`);
  }

  revalidateAircraftCrewWorkflowPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/crew`);
}

export async function updateAircraftCrewAssignmentAction(
  aircraftId: string,
  assignmentId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const input = parseAssignmentEditInput(formData);

    await prisma.$transaction(async (tx) => {
      const assignment = await ensureAssignmentBelongsToAircraft(tx, aircraftId, assignmentId);
      const assignmentInput = {
        ...input,
        crewMemberId: assignment.crewMemberId,
      };
      await assertNoExactDuplicate(
        tx,
        aircraftId,
        assignmentInput,
        assignmentId,
      );
      await tx.aircraftCrewAssignment.update({
        where: { id: assignmentId },
        data: {
          endsAt: input.endsAt,
          isActive: !input.endsAt || input.endsAt > new Date(),
          notes: input.notes,
          seatRole: input.seatRole,
          startsAt: input.startsAt,
        },
      });
      await resyncFutureCrewLegSnapshotsForAircraft(tx, aircraftId);
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/crew?error=${encodeError(error)}`);
  }

  revalidateAircraftCrewWorkflowPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/crew`);
}

export async function relieveAircraftCrewAssignmentAction(
  aircraftId: string,
  assignmentId: string,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    await prisma.$transaction(async (tx) => {
      await ensureAssignmentBelongsToAircraft(tx, aircraftId, assignmentId);
      await tx.aircraftCrewAssignment.update({
        where: { id: assignmentId },
        data: {
          endsAt: new Date(),
          isActive: false,
        },
      });
      await resyncFutureCrewLegSnapshotsForAircraft(tx, aircraftId);
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/crew?error=${encodeError(error)}`);
  }

  revalidateAircraftCrewWorkflowPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/crew`);
}
