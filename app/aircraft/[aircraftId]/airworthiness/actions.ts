"use server";

import { createHash } from "node:crypto";

import {
  AircraftLogbookAuditEventType,
  AircraftLogbookEntrySource,
  AircraftLogbookEntryStatus,
  AircraftLogbookEntryType,
  AircraftLogbookSignaturePurpose,
  AirworthinessReleaseStatus,
  DeferralMethod,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceComplianceStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
  Prisma,
  ReturnToServiceRecordStatus,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

class AirworthinessWorkflowError extends Error {}

type DiscrepancyInput = {
  discrepancyNumber: string | null;
  title: string;
  description: string | null;
  severity: string | null;
  correctiveSummary: string | null;
};

type DeferralInput = {
  discrepancyId: string | null;
  deferralNumber: string | null;
  deferralMethod: DeferralMethod;
  category: string | null;
  status: DeferralStatus;
  dueAt: Date | null;
  clearedAt: Date | null;
  melItemNumber: string | null;
  repairInterval: string | null;
  authorityType: string | null;
  placardRequired: boolean;
  operatingLimitations: string | null;
  requiredProcedures: string | null;
  notes: string | null;
};

type MaintenanceEventInput = {
  maintenanceNumber: string | null;
  discrepancyId: string | null;
  eventType: MaintenanceEventType;
  status: MaintenanceEventStatus;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  providerName: string | null;
  description: string | null;
  returnToServiceAt: Date | null;
  notes: string | null;
};

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(value: Date, months: number) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type ReturnToServiceInput = {
  discrepancyId: string;
  maintenanceEventId: string | null;
  workSummary: string;
  approvalBasis: string | null;
  returnToServiceAt: Date;
  signerName: string;
  certificateNumber: string | null;
  certificateType: string | null;
  authorizationBasis: string | null;
  intentText: string;
};

type AirworthinessReleaseInput = {
  releaseNumber: string | null;
  status: AirworthinessReleaseStatus;
  releasedAt: Date | null;
  expiresAt: Date | null;
  releaseNotes: string | null;
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
    throw new AirworthinessWorkflowError(`${label} is required.`);
  }

  return value;
}

function parseDeferralStatus(formData: FormData): DeferralStatus {
  const value = getOptionalText(formData, "status") ?? DeferralStatus.ACTIVE;

  if (
    value === DeferralStatus.ACTIVE ||
    value === DeferralStatus.CLEARED ||
    value === DeferralStatus.EXPIRED ||
    value === DeferralStatus.CANCELLED
  ) {
    return value;
  }

  throw new AirworthinessWorkflowError("Deferral status is not valid.");
}

function parseDeferralMethod(formData: FormData): DeferralMethod {
  const value = getOptionalText(formData, "deferralMethod") ?? DeferralMethod.MEL;

  if (
    value === DeferralMethod.MEL ||
    value === DeferralMethod.CDL ||
    value === DeferralMethod.NEF ||
    value === DeferralMethod.COMPANY_APPROVED ||
    value === DeferralMethod.OTHER_APPROVED
  ) {
    return value;
  }

  throw new AirworthinessWorkflowError("Deferral method is not valid.");
}

function parseMaintenanceEventType(formData: FormData): MaintenanceEventType {
  const value = getRequiredText(formData, "eventType", "Event type");

  if (
    value === MaintenanceEventType.INSPECTION ||
    value === MaintenanceEventType.SCHEDULED_MAINTENANCE ||
    value === MaintenanceEventType.UNSCHEDULED_MAINTENANCE ||
    value === MaintenanceEventType.REPAIR ||
    value === MaintenanceEventType.RETURN_TO_SERVICE ||
    value === MaintenanceEventType.OTHER
  ) {
    return value;
  }

  throw new AirworthinessWorkflowError("Maintenance event type is not valid.");
}

function parseMaintenanceEventStatus(formData: FormData): MaintenanceEventStatus {
  const value = getOptionalText(formData, "status") ?? MaintenanceEventStatus.PLANNED;

  if (
    value === MaintenanceEventStatus.PLANNED ||
    value === MaintenanceEventStatus.IN_PROGRESS ||
    value === MaintenanceEventStatus.COMPLETED ||
    value === MaintenanceEventStatus.CANCELLED
  ) {
    return value;
  }

  throw new AirworthinessWorkflowError("Maintenance event status is not valid.");
}

function parseAirworthinessReleaseStatus(formData: FormData): AirworthinessReleaseStatus {
  const value = getOptionalText(formData, "status") ?? AirworthinessReleaseStatus.DRAFT;

  if (
    value === AirworthinessReleaseStatus.DRAFT ||
    value === AirworthinessReleaseStatus.RELEASED ||
    value === AirworthinessReleaseStatus.VOIDED ||
    value === AirworthinessReleaseStatus.SUPERSEDED
  ) {
    return value;
  }

  throw new AirworthinessWorkflowError("Airworthiness release status is not valid.");
}

function parseOptionalDateTime(formData: FormData, key: string, label: string): Date | null {
  const value = getOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AirworthinessWorkflowError(`${label} must be a valid date and time.`);
  }

  return parsed;
}

function parseDiscrepancyInput(formData: FormData): DiscrepancyInput {
  return {
    discrepancyNumber: getOptionalText(formData, "discrepancyNumber")?.toUpperCase() ?? null,
    title: getRequiredText(formData, "title", "Title"),
    description: getOptionalText(formData, "description"),
    severity: getOptionalText(formData, "severity")?.toUpperCase() ?? null,
    correctiveSummary: getOptionalText(formData, "correctiveSummary"),
  };
}

function parseDeferralInput(formData: FormData, requireDiscrepancy: boolean): DeferralInput {
  const status = parseDeferralStatus(formData);
  const discrepancyId = getOptionalText(formData, "discrepancyId");

  if (requireDiscrepancy && !discrepancyId) {
    throw new AirworthinessWorkflowError("Discrepancy is required.");
  }

  return {
    discrepancyId,
    deferralNumber: getOptionalText(formData, "deferralNumber")?.toUpperCase() ?? null,
    deferralMethod: parseDeferralMethod(formData),
    category: getOptionalText(formData, "category")?.toUpperCase() ?? null,
    status,
    dueAt: parseOptionalDateTime(formData, "dueAt", "Due at"),
    clearedAt:
      status === DeferralStatus.CLEARED
        ? parseOptionalDateTime(formData, "clearedAt", "Cleared at") ?? new Date()
        : null,
    melItemNumber: getOptionalText(formData, "melItemNumber")?.toUpperCase() ?? null,
    repairInterval: getOptionalText(formData, "repairInterval"),
    authorityType: getOptionalText(formData, "authorityType"),
    placardRequired: formData.get("placardRequired") === "on",
    operatingLimitations: getOptionalText(formData, "operatingLimitations"),
    requiredProcedures: getOptionalText(formData, "requiredProcedures"),
    notes: getOptionalText(formData, "notes"),
  };
}

function parseMaintenanceEventInput(formData: FormData): MaintenanceEventInput {
  const status = parseMaintenanceEventStatus(formData);
  const enteredCompletedAt = parseOptionalDateTime(formData, "completedAt", "Completed at");

  return {
    maintenanceNumber: getOptionalText(formData, "maintenanceNumber")?.toUpperCase() ?? null,
    discrepancyId: getOptionalText(formData, "discrepancyId"),
    eventType: parseMaintenanceEventType(formData),
    status,
    scheduledAt: parseOptionalDateTime(formData, "scheduledAt", "Scheduled at"),
    startedAt: parseOptionalDateTime(formData, "startedAt", "Started at"),
    completedAt:
      status === MaintenanceEventStatus.COMPLETED
        ? enteredCompletedAt ?? new Date()
        : enteredCompletedAt,
    providerName: getOptionalText(formData, "providerName"),
    description: getOptionalText(formData, "description"),
    returnToServiceAt: parseOptionalDateTime(
      formData,
      "returnToServiceAt",
      "Return to service at",
    ),
    notes: getOptionalText(formData, "notes"),
  };
}

function parseReturnToServiceInput(formData: FormData): ReturnToServiceInput {
  const returnToServiceAt =
    parseOptionalDateTime(formData, "returnToServiceAt", "Return to service at") ?? new Date();

  return {
    discrepancyId: getRequiredText(formData, "discrepancyId", "Discrepancy"),
    maintenanceEventId: getOptionalText(formData, "maintenanceEventId"),
    workSummary: getRequiredText(formData, "workSummary", "Work summary"),
    approvalBasis: getOptionalText(formData, "approvalBasis"),
    returnToServiceAt,
    signerName: getRequiredText(formData, "signerName", "Signer name"),
    certificateNumber: getOptionalText(formData, "certificateNumber"),
    certificateType: getOptionalText(formData, "certificateType"),
    authorizationBasis: getOptionalText(formData, "authorizationBasis"),
    intentText:
      getOptionalText(formData, "intentText") ??
      "I certify this aircraft or item has been approved for return to service.",
  };
}

function parseAirworthinessReleaseInput(formData: FormData): AirworthinessReleaseInput {
  const status = parseAirworthinessReleaseStatus(formData);
  const enteredReleasedAt = parseOptionalDateTime(formData, "releasedAt", "Released at");

  return {
    releaseNumber: getOptionalText(formData, "releaseNumber")?.toUpperCase() ?? null,
    status,
    releasedAt:
      status === AirworthinessReleaseStatus.RELEASED
        ? enteredReleasedAt ?? new Date()
        : enteredReleasedAt,
    expiresAt: parseOptionalDateTime(formData, "expiresAt", "Expires at"),
    releaseNotes: getOptionalText(formData, "releaseNotes"),
  };
}

function encodeError(error: unknown): string {
  if (error instanceof AirworthinessWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("Number must be unique for this aircraft.");
  }

  throw error;
}

async function ensureAircraftExists(tx: Prisma.TransactionClient, aircraftId: string) {
  const aircraft = await tx.aircraft.findUnique({
    where: { id: aircraftId },
    select: {
      id: true,
      tailNumber: true,
    },
  });

  if (!aircraft) {
    throw new AirworthinessWorkflowError("Aircraft was not found.");
  }

  return aircraft;
}

async function ensureDiscrepancyBelongsToAircraft(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  discrepancyId: string,
) {
  const discrepancy = await tx.discrepancy.findFirst({
    where: {
      id: discrepancyId,
      aircraftId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!discrepancy) {
    throw new AirworthinessWorkflowError("Discrepancy was not found for this aircraft.");
  }
  return discrepancy;
}

async function ensureDeferralBelongsToAircraft(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  deferralId: string,
) {
  const deferral = await tx.deferral.findFirst({
    where: {
      id: deferralId,
      aircraftId,
    },
    select: {
      id: true,
      discrepancyId: true,
    },
  });

  if (!deferral) {
    throw new AirworthinessWorkflowError("Deferral was not found for this aircraft.");
  }

  return deferral;
}

async function ensureMaintenanceEventBelongsToAircraft(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  maintenanceEventId: string,
) {
  const maintenanceEvent = await tx.maintenanceEvent.findFirst({
    where: {
      id: maintenanceEventId,
      aircraftId,
    },
    select: {
      id: true,
    },
  });

  if (!maintenanceEvent) {
    throw new AirworthinessWorkflowError(
      "Maintenance event was not found for this aircraft.",
    );
  }
}

async function ensureAirworthinessReleaseBelongsToAircraft(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  airworthinessReleaseId: string,
) {
  const release = await tx.airworthinessRelease.findFirst({
    where: {
      id: airworthinessReleaseId,
      aircraftId,
    },
    select: {
      id: true,
    },
  });

  if (!release) {
    throw new AirworthinessWorkflowError(
      "Airworthiness release was not found for this aircraft.",
    );
  }
}

async function generateDiscrepancyNumber(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `DISC-${tailNumber.replace(/\s+/g, "").toUpperCase()}-${dateKey}`;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(2, "0")}`;
    const existing = await tx.discrepancy.findFirst({
      where: {
        aircraftId,
        discrepancyNumber: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new AirworthinessWorkflowError("Could not generate a discrepancy number.");
}

async function generateDeferralNumber(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `DEF-${tailNumber.replace(/\s+/g, "").toUpperCase()}-${dateKey}`;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(2, "0")}`;
    const existing = await tx.deferral.findFirst({
      where: {
        aircraftId,
        deferralNumber: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new AirworthinessWorkflowError("Could not generate a deferral number.");
}

async function generateMaintenanceNumber(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `MX-${tailNumber.replace(/\s+/g, "").toUpperCase()}-${dateKey}`;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(2, "0")}`;
    const existing = await tx.maintenanceEvent.findFirst({
      where: {
        aircraftId,
        maintenanceNumber: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new AirworthinessWorkflowError("Could not generate a maintenance event number.");
}

async function generateAirworthinessReleaseNumber(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `AWR-${tailNumber.replace(/\s+/g, "").toUpperCase()}-${dateKey}`;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(2, "0")}`;
    const existing = await tx.airworthinessRelease.findFirst({
      where: {
        aircraftId,
        releaseNumber: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new AirworthinessWorkflowError("Could not generate an airworthiness release number.");
}

async function generateReturnToServiceNumber(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `RTS-${tailNumber.replace(/\s+/g, "").toUpperCase()}-${dateKey}`;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(2, "0")}`;
    const existing = await tx.returnToServiceRecord.findFirst({
      where: {
        aircraftId,
        rtsNumber: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new AirworthinessWorkflowError("Could not generate a return-to-service number.");
}

async function generateLogbookEntryNumber(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `LB-${tailNumber.replace(/\s+/g, "").toUpperCase()}-${dateKey}`;

  for (let index = 1; index <= 999; index += 1) {
    const candidate = `${prefix}-${String(index).padStart(3, "0")}`;
    const existing = await tx.aircraftLogbookEntry.findFirst({
      where: {
        aircraftId,
        entryNumber: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new AirworthinessWorkflowError("Could not generate a logbook entry number.");
}

function signedHash(snapshot: unknown) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

async function supersedePriorReleasedAirworthinessReleases(
  tx: Prisma.TransactionClient,
  aircraftId: string,
  currentReleaseId: string,
) {
  await tx.airworthinessRelease.updateMany({
    where: {
      aircraftId,
      status: AirworthinessReleaseStatus.RELEASED,
      id: {
        not: currentReleaseId,
      },
    },
    data: {
      status: AirworthinessReleaseStatus.SUPERSEDED,
    },
  });
}

async function applyMaintenanceDiscrepancyResolution(
  tx: Prisma.TransactionClient,
  input: MaintenanceEventInput,
  maintenanceEventId: string,
) {
  if (
    !input.discrepancyId ||
    input.status !== MaintenanceEventStatus.COMPLETED
  ) {
    return;
  }

  await tx.discrepancy.update({
    where: { id: input.discrepancyId },
    data: {
      activeDeferralId: null,
      correctiveMaintenanceEventId: maintenanceEventId,
      correctiveSummary: input.description,
      status: DiscrepancyStatus.CORRECTED_PENDING_RTS,
    },
  });
}

async function advanceLinkedMaintenanceCompliance(
  tx: Prisma.TransactionClient,
  input: MaintenanceEventInput,
  maintenanceEventId: string,
  updatedById: string,
) {
  if (input.status !== MaintenanceEventStatus.COMPLETED) {
    return;
  }

  const maintenanceEvent = await tx.maintenanceEvent.findUnique({
    where: { id: maintenanceEventId },
    select: {
      maintenanceComplianceStateId: true,
      maintenanceProgramTaskId: true,
    },
  });

  if (!maintenanceEvent?.maintenanceComplianceStateId || !maintenanceEvent.maintenanceProgramTaskId) {
    return;
  }

  const [task, currentState] = await Promise.all([
    tx.maintenanceProgramTask.findUnique({
      where: { id: maintenanceEvent.maintenanceProgramTaskId },
      select: {
        intervalAirframeHours: true,
        intervalCycles: true,
        intervalDays: true,
        intervalMonths: true,
      },
    }),
    tx.maintenanceComplianceState.findUnique({
      where: { id: maintenanceEvent.maintenanceComplianceStateId },
      select: {
        lastCompletedAirframeHours: true,
        lastCompletedCycles: true,
      },
    }),
  ]);

  if (!task) {
    return;
  }

  const completedAt = input.completedAt ?? new Date();
  let nextDueAt: Date | null = null;

  if (task.intervalMonths || task.intervalDays) {
    nextDueAt = new Date(completedAt);

    if (task.intervalMonths) {
      nextDueAt = addMonths(nextDueAt, task.intervalMonths);
    }

    if (task.intervalDays) {
      nextDueAt = addDays(nextDueAt, task.intervalDays);
    }
  }

  const lastCompletedAirframeHours = decimalToNumber(currentState?.lastCompletedAirframeHours);
  const intervalAirframeHours = decimalToNumber(task.intervalAirframeHours);
  const nextDueAirframeHours =
    lastCompletedAirframeHours !== null && intervalAirframeHours !== null
      ? lastCompletedAirframeHours + intervalAirframeHours
      : null;
  const nextDueCycles =
    currentState?.lastCompletedCycles !== null &&
    currentState?.lastCompletedCycles !== undefined &&
    task.intervalCycles
      ? currentState.lastCompletedCycles + task.intervalCycles
      : null;

  await tx.maintenanceComplianceState.update({
    where: { id: maintenanceEvent.maintenanceComplianceStateId },
    data: {
      lastCompletedAt: completedAt,
      nextDueAt,
      nextDueAirframeHours,
      nextDueCycles,
      status: MaintenanceComplianceStatus.CURRENT,
      updatedById,
    },
  });
}

function revalidateAirworthinessPaths(aircraftId: string) {
  revalidatePath("/aircraft");
  revalidatePath(`/aircraft/${aircraftId}/airworthiness`);
  revalidatePath("/operations-control");
  revalidatePath("/api/health");
}

export async function createDiscrepancyAction(aircraftId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  try {
    const input = parseDiscrepancyInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      const discrepancyNumber =
        input.discrepancyNumber ??
        (await generateDiscrepancyNumber(tx, aircraft.id, aircraft.tailNumber));

      await tx.discrepancy.create({
        data: {
          aircraftId,
          discrepancyNumber,
          title: input.title,
          description: input.description,
          severity: input.severity,
          status: DiscrepancyStatus.OPEN,
          correctiveSummary: input.correctiveSummary,
          clearedAt: null,
          reportedById: currentUser.id,
        },
      });
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function updateDiscrepancyAction(
  aircraftId: string,
  discrepancyId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  try {
    const input = parseDiscrepancyInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      await ensureDiscrepancyBelongsToAircraft(tx, aircraftId, discrepancyId);

      await tx.discrepancy.update({
        where: { id: discrepancyId },
        data: {
          discrepancyNumber:
            input.discrepancyNumber ??
            (await generateDiscrepancyNumber(tx, aircraftId, aircraft.tailNumber)),
          title: input.title,
          description: input.description,
          severity: input.severity,
          correctiveSummary: input.correctiveSummary,
        },
      });
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function createDeferralAction(aircraftId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  try {
    const input = parseDeferralInput(formData, true);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      const discrepancy = await ensureDiscrepancyBelongsToAircraft(
        tx,
        aircraftId,
        input.discrepancyId!,
      );

      if (
        discrepancy.status !== DiscrepancyStatus.OPEN &&
        discrepancy.status !== DiscrepancyStatus.DEFERRED
      ) {
        throw new AirworthinessWorkflowError(
          "Deferrals can only be created from OPEN or DEFERRED discrepancies.",
        );
      }

      const deferralNumber =
        input.deferralNumber ??
        (await generateDeferralNumber(tx, aircraft.id, aircraft.tailNumber));

      const deferral = await tx.deferral.create({
        data: {
          aircraftId,
          discrepancyId: discrepancy.id,
          deferralNumber,
          category: input.category,
          deferralMethod: input.deferralMethod,
          deferralType: input.deferralMethod,
          authorityType: input.authorityType,
          melItemNumber: input.melItemNumber,
          repairInterval: input.repairInterval,
          placardRequired: input.placardRequired,
          operatingLimitations: input.operatingLimitations,
          requiredProcedures: input.requiredProcedures,
          status: input.status,
          dueAt: input.dueAt,
          clearedAt: input.clearedAt,
          notes: input.notes,
          authorizedById: currentUser.id,
        },
        select: {
          id: true,
        },
      });

      if (input.status === DeferralStatus.ACTIVE) {
        await tx.discrepancy.update({
          where: { id: discrepancy.id },
          data: {
            activeDeferralId: deferral.id,
            status: DiscrepancyStatus.DEFERRED,
            clearedAt: null,
          },
        });
      }
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function updateDeferralAction(
  aircraftId: string,
  deferralId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  try {
    const input = parseDeferralInput(formData, false);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      const deferral = await ensureDeferralBelongsToAircraft(tx, aircraftId, deferralId);
      const deferralNumber =
        input.deferralNumber ??
        (await generateDeferralNumber(tx, aircraft.id, aircraft.tailNumber));

      await tx.deferral.update({
        where: { id: deferral.id },
        data: {
          deferralNumber,
          category: input.category,
          deferralMethod: input.deferralMethod,
          deferralType: input.deferralMethod,
          authorityType: input.authorityType,
          melItemNumber: input.melItemNumber,
          repairInterval: input.repairInterval,
          placardRequired: input.placardRequired,
          operatingLimitations: input.operatingLimitations,
          requiredProcedures: input.requiredProcedures,
          status: input.status,
          dueAt: input.dueAt,
          clearedAt: input.clearedAt,
          notes: input.notes,
        },
      });

      if (input.status === DeferralStatus.ACTIVE) {
        await tx.discrepancy.update({
          where: { id: deferral.discrepancyId },
          data: {
            activeDeferralId: deferral.id,
            status: DiscrepancyStatus.DEFERRED,
            clearedAt: null,
          },
        });
      }

      if (input.status !== DeferralStatus.ACTIVE) {
        await tx.discrepancy.updateMany({
          where: {
            id: deferral.discrepancyId,
            status: DiscrepancyStatus.DEFERRED,
          },
          data: {
            activeDeferralId: null,
            status: DiscrepancyStatus.OPEN,
          },
        });
      }
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function createMaintenanceEventAction(aircraftId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  try {
    const input = parseMaintenanceEventInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);

      if (input.discrepancyId) {
        await ensureDiscrepancyBelongsToAircraft(tx, aircraftId, input.discrepancyId);
      }

      const maintenanceNumber =
        input.maintenanceNumber ??
        (await generateMaintenanceNumber(tx, aircraft.id, aircraft.tailNumber));

      const maintenanceEvent = await tx.maintenanceEvent.create({
        data: {
          aircraftId,
          discrepancyId: input.discrepancyId,
          maintenanceNumber,
          eventType: input.eventType,
          status: input.status,
          scheduledAt: input.scheduledAt,
          startedAt: input.startedAt,
          completedAt: input.completedAt,
          providerName: input.providerName,
          description: input.description,
          returnToServiceAt: input.returnToServiceAt,
          notes: input.notes,
          approvedById:
            input.status === MaintenanceEventStatus.COMPLETED ? currentUser.id : null,
        },
        select: {
          id: true,
        },
      });

      await applyMaintenanceDiscrepancyResolution(tx, input, maintenanceEvent.id);
      await advanceLinkedMaintenanceCompliance(tx, input, maintenanceEvent.id, currentUser.id);
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function updateMaintenanceEventAction(
  aircraftId: string,
  maintenanceEventId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  try {
    const input = parseMaintenanceEventInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      await ensureMaintenanceEventBelongsToAircraft(tx, aircraftId, maintenanceEventId);

      if (input.discrepancyId) {
        await ensureDiscrepancyBelongsToAircraft(tx, aircraftId, input.discrepancyId);
      }

      const maintenanceNumber =
        input.maintenanceNumber ??
        (await generateMaintenanceNumber(tx, aircraft.id, aircraft.tailNumber));

      await tx.maintenanceEvent.update({
        where: { id: maintenanceEventId },
        data: {
          discrepancyId: input.discrepancyId,
          maintenanceNumber,
          eventType: input.eventType,
          status: input.status,
          scheduledAt: input.scheduledAt,
          startedAt: input.startedAt,
          completedAt: input.completedAt,
          providerName: input.providerName,
          description: input.description,
          returnToServiceAt: input.returnToServiceAt,
          notes: input.notes,
          approvedById:
            input.status === MaintenanceEventStatus.COMPLETED ? currentUser.id : null,
        },
      });

      await applyMaintenanceDiscrepancyResolution(tx, input, maintenanceEventId);
      await advanceLinkedMaintenanceCompliance(tx, input, maintenanceEventId, currentUser.id);
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function voidDiscrepancyAction(
  aircraftId: string,
  discrepancyId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);

  try {
    const voidReason = getRequiredText(formData, "voidReason", "Void reason");

    await prisma.$transaction(async (tx) => {
      await ensureAircraftExists(tx, aircraftId);
      await ensureDiscrepancyBelongsToAircraft(tx, aircraftId, discrepancyId);

      await tx.discrepancy.update({
        where: { id: discrepancyId },
        data: {
          activeDeferralId: null,
          status: DiscrepancyStatus.CANCELLED,
          voidReason,
          voidedAt: new Date(),
          voidedById: currentUser.id,
        },
      });
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function signReturnToServiceAction(aircraftId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  try {
    const input = parseReturnToServiceInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      const discrepancy = await tx.discrepancy.findFirst({
        where: {
          aircraftId,
          id: input.discrepancyId,
        },
        select: {
          id: true,
          discrepancyNumber: true,
          status: true,
          title: true,
        },
      });

      if (!discrepancy) {
        throw new AirworthinessWorkflowError("Discrepancy was not found for this aircraft.");
      }

      if (discrepancy.status !== DiscrepancyStatus.CORRECTED_PENDING_RTS) {
        throw new AirworthinessWorkflowError(
          "Return to service can only be signed after a corrective action is completed.",
        );
      }

      if (input.maintenanceEventId) {
        await ensureMaintenanceEventBelongsToAircraft(tx, aircraftId, input.maintenanceEventId);
      }

      const authorityProfile = await tx.maintenanceAuthorityProfile.create({
        data: {
          authorizationBasis: input.authorizationBasis,
          certificateNumber: input.certificateNumber,
          certificateType: input.certificateType,
          createdById: currentUser.id,
          legalName: input.signerName,
          userId: currentUser.id,
        },
      });
      const entry = await tx.aircraftLogbookEntry.create({
        data: {
          aircraftId,
          approvedByCertificateNumber: input.certificateNumber,
          approvedByCertificateType: input.certificateType,
          approvedByName: input.signerName,
          category: "RETURN_TO_SERVICE",
          createdById: currentUser.id,
          discrepancyId: discrepancy.id,
          entryNumber: await generateLogbookEntryNumber(tx, aircraftId, aircraft.tailNumber),
          entryType: AircraftLogbookEntryType.CORRECTIVE_ACTION,
          maintenanceEventId: input.maintenanceEventId,
          narrative: input.workSummary,
          returnToServiceAt: input.returnToServiceAt,
          source: AircraftLogbookEntrySource.MAINTENANCE,
          status: AircraftLogbookEntryStatus.READY_FOR_SIGNATURE,
          title: `Return to service: ${discrepancy.title}`,
          updatedById: currentUser.id,
        },
      });
      const snapshot = {
        aircraftId,
        aircraftTailNumber: aircraft.tailNumber,
        discrepancyId: discrepancy.id,
        discrepancyNumber: discrepancy.discrepancyNumber,
        entryId: entry.id,
        entryNumber: entry.entryNumber,
        maintenanceEventId: input.maintenanceEventId,
        returnToServiceAt: input.returnToServiceAt.toISOString(),
        signerName: input.signerName,
        workSummary: input.workSummary,
      };
      const signedContentHash = signedHash(snapshot);
      const signedAt = new Date();

      await tx.aircraftLogbookSignature.create({
        data: {
          authorityProfileId: authorityProfile.id,
          authorizationBasis: authorityProfile.authorizationBasis,
          certificateNumber: authorityProfile.certificateNumber,
          certificateType: authorityProfile.certificateType,
          entryId: entry.id,
          intentText: input.intentText,
          purpose: AircraftLogbookSignaturePurpose.RETURN_TO_SERVICE,
          signedAt,
          signedContentHash,
          signedSnapshot: snapshot,
          signerName: input.signerName,
          signerUserId: currentUser.id,
        },
      });

      await tx.aircraftLogbookEntry.update({
        where: { id: entry.id },
        data: {
          lockedAt: signedAt,
          signedContentHash,
          signedSnapshot: snapshot,
          status: AircraftLogbookEntryStatus.SIGNED,
        },
      });

      const rts = await tx.returnToServiceRecord.create({
        data: {
          aircraftId,
          approvalBasis: input.approvalBasis,
          authorityProfileId: authorityProfile.id,
          createdById: currentUser.id,
          discrepancyId: discrepancy.id,
          logbookEntryId: entry.id,
          maintenanceEventId: input.maintenanceEventId,
          returnToServiceAt: input.returnToServiceAt,
          rtsNumber: await generateReturnToServiceNumber(tx, aircraftId, aircraft.tailNumber),
          signedAt,
          signedContentHash,
          signedSnapshot: snapshot,
          signerUserId: currentUser.id,
          status: ReturnToServiceRecordStatus.SIGNED,
          workSummary: input.workSummary,
        },
        select: {
          id: true,
          rtsNumber: true,
        },
      });

      await tx.discrepancy.update({
        where: { id: discrepancy.id },
        data: {
          activeDeferralId: null,
          clearedAt: input.returnToServiceAt,
          clearingReturnToServiceRecordId: rts.id,
          correctiveSummary: input.workSummary,
          status: DiscrepancyStatus.CLEARED,
        },
      });

      if (input.maintenanceEventId) {
        await tx.maintenanceEvent.update({
          where: { id: input.maintenanceEventId },
          data: {
            returnToServiceAt: input.returnToServiceAt,
          },
        });
      }

      await tx.aircraftLogbookAuditEvent.create({
        data: {
          actorId: currentUser.id,
          aircraftId,
          entryId: entry.id,
          eventType: AircraftLogbookAuditEventType.SIGNED,
          message: `Return to service signed as ${rts.rtsNumber}.`,
          metadata: { returnToServiceRecordId: rts.id, signedContentHash },
        },
      });
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function createAirworthinessReleaseAction(
  aircraftId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.MAINTENANCE]);

  try {
    const input = parseAirworthinessReleaseInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      const releaseNumber =
        input.releaseNumber ??
        (await generateAirworthinessReleaseNumber(tx, aircraft.id, aircraft.tailNumber));

      const release = await tx.airworthinessRelease.create({
        data: {
          aircraftId,
          releaseNumber,
          status: input.status,
          releasedAt: input.releasedAt,
          expiresAt: input.expiresAt,
          releaseNotes: input.releaseNotes,
          releasedById:
            input.status === AirworthinessReleaseStatus.RELEASED ? currentUser.id : null,
        },
        select: {
          id: true,
        },
      });

      if (input.status === AirworthinessReleaseStatus.RELEASED) {
        await supersedePriorReleasedAirworthinessReleases(tx, aircraftId, release.id);
      }
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}

export async function updateAirworthinessReleaseAction(
  aircraftId: string,
  airworthinessReleaseId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.MAINTENANCE]);

  try {
    const input = parseAirworthinessReleaseInput(formData);

    await prisma.$transaction(async (tx) => {
      const aircraft = await ensureAircraftExists(tx, aircraftId);
      await ensureAirworthinessReleaseBelongsToAircraft(
        tx,
        aircraftId,
        airworthinessReleaseId,
      );
      const releaseNumber =
        input.releaseNumber ??
        (await generateAirworthinessReleaseNumber(tx, aircraft.id, aircraft.tailNumber));

      await tx.airworthinessRelease.update({
        where: { id: airworthinessReleaseId },
        data: {
          releaseNumber,
          status: input.status,
          releasedAt: input.releasedAt,
          expiresAt: input.expiresAt,
          releaseNotes: input.releaseNotes,
          releasedById:
            input.status === AirworthinessReleaseStatus.RELEASED ? currentUser.id : null,
        },
      });

      if (input.status === AirworthinessReleaseStatus.RELEASED) {
        await supersedePriorReleasedAirworthinessReleases(
          tx,
          aircraftId,
          airworthinessReleaseId,
        );
      }
    });
  } catch (error) {
    redirect(`/aircraft/${aircraftId}/airworthiness?error=${encodeError(error)}`);
  }

  revalidateAirworthinessPaths(aircraftId);
  redirect(`/aircraft/${aircraftId}/airworthiness`);
}
