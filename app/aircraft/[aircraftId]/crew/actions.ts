"use server";

import {
  AssignmentStatus,
  CrewScheduleEntryStatus,
  EmploymentStatus,
  FlightLegStatus,
  DutyStatus,
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

type AircraftCrewAssignmentRewriteRow = {
  aircraftId: string;
  assignedById: string | null;
  crewMemberId: string;
  endsAt: Date | null;
  id: string;
  notes: string | null;
  seatRole: SeatRole;
  startsAt: Date;
};

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

function getSafeReturnTo(formData: FormData): string | null {
  const value = getOptionalText(formData, "returnTo");

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function appendErrorToReturnTo(returnTo: string, error: unknown): string {
  const [path, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);

  params.set("error", encodeError(error));
  params.delete("success");

  return `${path}?${params.toString()}`;
}

function appendSuccessToReturnTo(returnTo: string, message: string): string {
  const [path, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);

  params.set("success", encodeURIComponent(message));
  params.delete("error");

  return `${path}?${params.toString()}`;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function scheduleDaysForRange(startsAt: Date, endsAt: Date): Date[] {
  const days: Date[] = [];
  const endDay = startOfDay(addDays(endsAt, endsAt.getHours() === 0 && endsAt.getMinutes() === 0 ? -1 : 0));

  for (let day = startOfDay(startsAt); day <= endDay; day = addDays(day, 1)) {
    days.push(new Date(day));
  }

  return days;
}

function appendRewriteNote(notes: string | null, message: string): string {
  return notes ? `${notes}\n${message}` : message;
}

function assignmentOverlapsRange(
  assignment: Pick<AircraftCrewAssignmentRewriteRow, "endsAt" | "startsAt">,
  startsAt: Date,
  endsAt: Date,
): boolean {
  return assignment.startsAt < endsAt && (!assignment.endsAt || assignment.endsAt > startsAt);
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

async function rewriteOverlappingCrewAircraftAssignments(
  tx: Prisma.TransactionClient,
  input: AircraftCrewAssignmentInput,
): Promise<string[]> {
  if (!input.endsAt) {
    throw new AircraftCrewWorkflowError("Published coverage assignments require an end time.");
  }

  const affectedAircraftIds = new Set<string>();
  const overlappingAssignments = await tx.aircraftCrewAssignment.findMany({
    where: {
      crewMemberId: input.crewMemberId,
      isActive: true,
      seatRole: input.seatRole,
      startsAt: { lt: input.endsAt },
      OR: [{ endsAt: null }, { endsAt: { gt: input.startsAt } }],
    },
    orderBy: [{ startsAt: "asc" }],
    select: {
      aircraftId: true,
      assignedById: true,
      crewMemberId: true,
      endsAt: true,
      id: true,
      notes: true,
      seatRole: true,
      startsAt: true,
    },
  });

  for (const assignment of overlappingAssignments) {
    if (!assignmentOverlapsRange(assignment, input.startsAt, input.endsAt)) {
      continue;
    }

    affectedAircraftIds.add(assignment.aircraftId);

    const originalEnd = assignment.endsAt;
    const hasLeftRemainder = assignment.startsAt < input.startsAt;
    const hasRightRemainder = !originalEnd || originalEnd > input.endsAt;

    if (hasLeftRemainder && hasRightRemainder) {
      await tx.aircraftCrewAssignment.update({
        where: { id: assignment.id },
        data: {
          endsAt: input.startsAt,
          isActive: input.startsAt > new Date(),
          notes: appendRewriteNote(assignment.notes, "Trimmed by aircraft coverage drawer save."),
        },
      });
      await tx.aircraftCrewAssignment.create({
        data: {
          aircraftId: assignment.aircraftId,
          assignedById: assignment.assignedById,
          crewMemberId: assignment.crewMemberId,
          endsAt: originalEnd,
          isActive: !originalEnd || originalEnd > new Date(),
          notes: appendRewriteNote(assignment.notes, "Split by aircraft coverage drawer save."),
          seatRole: assignment.seatRole,
          startsAt: input.endsAt,
        },
      });
      continue;
    }

    if (hasLeftRemainder) {
      await tx.aircraftCrewAssignment.update({
        where: { id: assignment.id },
        data: {
          endsAt: input.startsAt,
          isActive: input.startsAt > new Date(),
          notes: appendRewriteNote(assignment.notes, "Trimmed by aircraft coverage drawer save."),
        },
      });
      continue;
    }

    if (hasRightRemainder) {
      await tx.aircraftCrewAssignment.update({
        where: { id: assignment.id },
        data: {
          startsAt: input.endsAt,
          isActive: true,
          notes: appendRewriteNote(assignment.notes, "Trimmed by aircraft coverage drawer save."),
        },
      });
      continue;
    }

    await tx.aircraftCrewAssignment.update({
      where: { id: assignment.id },
      data: {
        endsAt: assignment.startsAt > new Date() ? assignment.startsAt : new Date(),
        isActive: false,
        notes: appendRewriteNote(assignment.notes, "Superseded by aircraft coverage drawer save."),
      },
    });
  }

  return Array.from(affectedAircraftIds);
}

async function publishCrewScheduleForCoverageAssignment(
  tx: Prisma.TransactionClient,
  input: AircraftCrewAssignmentInput,
  userId: string,
) {
  if (!input.endsAt) {
    return;
  }

  const days = scheduleDaysForRange(input.startsAt, input.endsAt);

  if (days.length === 0) {
    return;
  }

  const periods = await tx.crewSchedulePeriod.findMany({
    where: {
      endsAt: { gte: days[0] },
      startsAt: { lte: days[days.length - 1] },
    },
    orderBy: [{ startsAt: "asc" }],
    select: {
      id: true,
      endsAt: true,
      startsAt: true,
    },
  });
  const now = new Date();

  for (const day of days) {
    const period = periods.find((candidate) => candidate.startsAt <= day && candidate.endsAt >= day);

    if (!period) {
      continue;
    }

    const conflictingEntries = await tx.crewScheduleEntry.findMany({
      where: {
        crewMemberId: input.crewMemberId,
        date: day,
        periodId: period.id,
        status: { in: [CrewScheduleEntryStatus.DRAFT, CrewScheduleEntryStatus.PUBLISHED] },
      },
      select: {
        generatedCrewScheduleId: true,
        id: true,
      },
    });
    const generatedCrewScheduleIds = conflictingEntries
      .map((entry) => entry.generatedCrewScheduleId)
      .filter((id): id is string => Boolean(id));

    if (conflictingEntries.length > 0) {
      await tx.crewScheduleEntry.updateMany({
        where: { id: { in: conflictingEntries.map((entry) => entry.id) } },
        data: {
          generatedCrewScheduleId: null,
          status: CrewScheduleEntryStatus.SUPERSEDED,
        },
      });
    }

    if (generatedCrewScheduleIds.length > 0) {
      await tx.crewSchedule.deleteMany({
        where: { id: { in: generatedCrewScheduleIds } },
      });
    }

    const bridge = await tx.crewSchedule.create({
      data: {
        crewMemberId: input.crewMemberId,
        date: day,
        dutyStatus: DutyStatus.ON_DUTY,
        endsAt: input.endsAt,
        notes: `Published from aircraft coverage drawer for ${input.seatRole}.`,
        startsAt: input.startsAt,
      },
      select: { id: true },
    });

    await tx.crewScheduleEntry.upsert({
      where: {
        periodId_crewMemberId_date_dutyStatus: {
          crewMemberId: input.crewMemberId,
          date: day,
          dutyStatus: DutyStatus.ON_DUTY,
          periodId: period.id,
        },
      },
      create: {
        crewMemberId: input.crewMemberId,
        date: day,
        dutyStatus: DutyStatus.ON_DUTY,
        generatedCrewScheduleId: bridge.id,
        periodId: period.id,
        publishedAt: now,
        publishedById: userId,
        status: CrewScheduleEntryStatus.PUBLISHED,
      },
      update: {
        generatedCrewScheduleId: bridge.id,
        publishedAt: now,
        publishedById: userId,
        status: CrewScheduleEntryStatus.PUBLISHED,
      },
    });
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
  revalidatePath("/crew/scheduling");
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
  const returnTo = getSafeReturnTo(formData);

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
    if (returnTo) {
      redirect(appendErrorToReturnTo(returnTo, error));
    }

    redirect(`/aircraft/${aircraftId}/crew?error=${encodeError(error)}`);
  }

  revalidateAircraftCrewWorkflowPaths(aircraftId);
  if (returnTo) {
    redirect(returnTo);
  }

  redirect(`/aircraft/${aircraftId}/crew`);
}

export async function saveAircraftCoveragePublishedAssignmentAction(
  aircraftId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const returnTo = getSafeReturnTo(formData);
  const affectedAircraftIds = new Set<string>([aircraftId]);

  try {
    const input = parseAssignmentInput(formData);

    if (!input.endsAt) {
      throw new AircraftCrewWorkflowError("End time is required for published coverage saves.");
    }
    const assignmentEndsAt = input.endsAt;

    await prisma.$transaction(async (tx) => {
      await ensureAircraftExists(tx, aircraftId);
      await ensureActiveCrewMember(tx, input.crewMemberId);

      const rewrittenAircraftIds = await rewriteOverlappingCrewAircraftAssignments(tx, input);
      for (const affectedAircraftId of rewrittenAircraftIds) {
        affectedAircraftIds.add(affectedAircraftId);
      }

      await tx.aircraftCrewAssignment.upsert({
        where: {
          aircraftId_crewMemberId_seatRole_startsAt: {
            aircraftId,
            crewMemberId: input.crewMemberId,
            seatRole: input.seatRole,
            startsAt: input.startsAt,
          },
        },
        create: {
          aircraftId,
          assignedById: currentUser.id,
          crewMemberId: input.crewMemberId,
          endsAt: assignmentEndsAt,
          isActive: assignmentEndsAt > new Date(),
          notes: input.notes,
          seatRole: input.seatRole,
          startsAt: input.startsAt,
        },
        update: {
          assignedById: currentUser.id,
          endsAt: assignmentEndsAt,
          isActive: assignmentEndsAt > new Date(),
          notes: input.notes,
        },
      });

      await publishCrewScheduleForCoverageAssignment(tx, input, currentUser.id);

      for (const affectedAircraftId of affectedAircraftIds) {
        await resyncFutureCrewLegSnapshotsForAircraft(tx, affectedAircraftId);
      }
    });
  } catch (error) {
    if (returnTo) {
      redirect(appendErrorToReturnTo(returnTo, error));
    }

    redirect(`/aircraft/${aircraftId}/crew?error=${encodeError(error)}`);
  }

  for (const affectedAircraftId of affectedAircraftIds) {
    revalidateAircraftCrewWorkflowPaths(affectedAircraftId);
  }

  if (returnTo) {
    redirect(appendSuccessToReturnTo(returnTo, "Published coverage assignment saved."));
  }

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
