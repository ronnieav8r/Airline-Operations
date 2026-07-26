"use server";

import {
  AircraftType,
  MaintenanceProgramApplicabilityScope,
  MaintenanceProgramTaskCategory,
  MaintenanceComplianceStatus,
  MaintenanceProgramOverrideAction,
  AogResolutionPhase,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import {
  convertMaintenanceControlHoldToDiscrepancy,
  convertMaintenanceControlHoldToMaintenanceEvent,
  placeMaintenanceControlHold,
  planScheduledMaintenance,
  releaseMaintenanceControlHold,
  releaseMaintenanceOccurrence,
  startScheduledMaintenance,
} from "@/lib/maintenance-lifecycle";
import { prisma } from "@/lib/prisma";

class MaintenanceActionError extends Error {}

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseAogPhase(formData: FormData): AogResolutionPhase {
  const value = optionalText(formData, "aogPhase");

  if (value && Object.values(AogResolutionPhase).includes(value as AogResolutionPhase)) {
    return value as AogResolutionPhase;
  }

  throw new MaintenanceActionError("AOG phase is required.");
}

function parseTaskCategory(formData: FormData): MaintenanceProgramTaskCategory {
  const value = optionalText(formData, "category");

  if (value && Object.values(MaintenanceProgramTaskCategory).includes(value as MaintenanceProgramTaskCategory)) {
    return value as MaintenanceProgramTaskCategory;
  }

  throw new MaintenanceActionError("Task category is required.");
}

function parseApplicabilityScope(formData: FormData): MaintenanceProgramApplicabilityScope {
  const value = optionalText(formData, "scope");

  if (value && Object.values(MaintenanceProgramApplicabilityScope).includes(value as MaintenanceProgramApplicabilityScope)) {
    return value as MaintenanceProgramApplicabilityScope;
  }

  throw new MaintenanceActionError("Applicability scope is required.");
}

function parseAircraftType(formData: FormData): AircraftType | null {
  const value = optionalText(formData, "aircraftType");

  if (!value) {
    return null;
  }

  if (Object.values(AircraftType).includes(value as AircraftType)) {
    return value as AircraftType;
  }

  throw new MaintenanceActionError("Aircraft type is not valid.");
}

function parseOverrideAction(formData: FormData): MaintenanceProgramOverrideAction {
  const value = optionalText(formData, "action");

  if (value && Object.values(MaintenanceProgramOverrideAction).includes(value as MaintenanceProgramOverrideAction)) {
    return value as MaintenanceProgramOverrideAction;
  }

  throw new MaintenanceActionError("Tail override action is required.");
}

function parseOptionalDateTime(formData: FormData, key: string, label: string): Date | null {
  const value = optionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new MaintenanceActionError(`${label} must be a valid date/time.`);
  }

  return parsed;
}

function parseOptionalCheckbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function parseOptionalNumber(formData: FormData, key: string, label: string): number | null {
  const value = optionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new MaintenanceActionError(`${label} must be a number.`);
  }

  return parsed;
}

function parseOptionalInteger(formData: FormData, key: string, label: string): number | null {
  const value = parseOptionalNumber(formData, key, label);

  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value)) {
    throw new MaintenanceActionError(`${label} must be a whole number.`);
  }

  return value;
}

function requiredText(formData: FormData, key: string, label: string): string {
  const value = optionalText(formData, key);

  if (!value) {
    throw new MaintenanceActionError(`${label} is required.`);
  }

  return value;
}

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

function nextDueAtFromTask(
  lastCompletedAt: Date | null,
  manualNextDueAt: Date | null,
  task: { intervalDays: number | null; intervalMonths: number | null },
) {
  if (manualNextDueAt) {
    return manualNextDueAt;
  }

  if (!lastCompletedAt) {
    return null;
  }

  let nextDueAt = lastCompletedAt;

  if (task.intervalMonths) {
    nextDueAt = addMonths(nextDueAt, task.intervalMonths);
  }

  if (task.intervalDays) {
    nextDueAt = addDays(nextDueAt, task.intervalDays);
  }

  return nextDueAt === lastCompletedAt ? null : nextDueAt;
}

function nextDueNumberFromTask(
  lastCompleted: number | null,
  manualNextDue: number | null,
  interval: { toString(): string } | number | null,
) {
  if (manualNextDue !== null) {
    return manualNextDue;
  }

  if (lastCompleted === null || interval === null) {
    return null;
  }

  return lastCompleted + Number(interval);
}

function maintenanceReturnTo(formData: FormData): string {
  const value = optionalText(formData, "returnTo");

  if (value?.startsWith("/maintenance")) {
    return value;
  }

  return "/maintenance?view=queue";
}

function withMessage(path: string, key: "message" | "error", value: string) {
  const [pathname, hash = ""] = path.split("#", 2);
  const url = new URL(pathname, "http://local");

  url.searchParams.set(key, value);

  const nextPath = `${url.pathname}${url.search}`;
  return hash ? `${nextPath}#${hash}` : nextPath;
}

function safeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function revalidateMaintenanceProgramPaths(aircraftId?: string) {
  revalidatePath("/maintenance");
  revalidatePath("/aircraft");

  if (aircraftId) {
    revalidatePath(`/aircraft/${aircraftId}/airworthiness`);
    revalidatePath(`/aircraft/${aircraftId}/logbook`);
  }
}

export async function updateDiscrepancyAogPhaseAction(discrepancyId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    await prisma.discrepancy.update({
      data: {
        aogEtaAt: parseOptionalDateTime(formData, "aogEtaAt", "ETA"),
        aogMaintenanceNote: optionalText(formData, "aogMaintenanceNote"),
        aogPhase: parseAogPhase(formData),
        aogPhaseUpdatedAt: new Date(),
        aogPhaseUpdatedById: currentUser.id,
      },
      where: { id: discrepancyId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Maintenance status update failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidatePath("/maintenance");
  revalidatePath("/aircraft");
  revalidatePath("/operations-control");
  redirect(withMessage(returnTo, "message", "AOG phase updated."));
}

function programTaskData(formData: FormData) {
  const title = requiredText(formData, "title", "Task title");
  const intervalMonths = parseOptionalInteger(formData, "intervalMonths", "Interval months");
  const intervalDays = parseOptionalInteger(formData, "intervalDays", "Interval days");
  const intervalAirframeHours = parseOptionalNumber(formData, "intervalAirframeHours", "Interval hours");
  const intervalCycles = parseOptionalInteger(formData, "intervalCycles", "Interval cycles");
  const warningDays = parseOptionalInteger(formData, "warningDays", "Warning days") ?? 30;
  const warningAirframeHours = parseOptionalNumber(formData, "warningAirframeHours", "Warning hours");
  const warningCycles = parseOptionalInteger(formData, "warningCycles", "Warning cycles");

  return {
    active: parseOptionalCheckbox(formData, "active"),
    category: parseTaskCategory(formData),
    description: optionalText(formData, "description"),
    effectiveFrom: parseOptionalDateTime(formData, "effectiveFrom", "Effective from") ?? new Date(),
    effectiveTo: parseOptionalDateTime(formData, "effectiveTo", "Effective to"),
    intervalAirframeHours,
    intervalCycles,
    intervalDays,
    intervalMonths,
    requiredForServiceability: parseOptionalCheckbox(formData, "requiredForServiceability"),
    requiresIndependentInspection: parseOptionalCheckbox(formData, "requiresIndependentInspection"),
    sourceReference: optionalText(formData, "sourceReference"),
    title,
    warningAirframeHours,
    warningCycles,
    warningDays,
  };
}

export async function createMaintenanceProgramTaskAction(formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    const data = programTaskData(formData);
    const providedTaskKey = optionalText(formData, "taskKey");
    const taskKey = providedTaskKey ? safeKey(providedTaskKey) : `mx.program.${safeKey(data.title)}.${Date.now()}`;

    await prisma.maintenanceProgramTask.create({
      data: {
        ...data,
        createdById: currentUser.id,
        taskKey,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Maintenance program task creation failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "Maintenance program task created."));
}

export async function updateMaintenanceProgramTaskAction(taskId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    await prisma.maintenanceProgramTask.update({
      data: programTaskData(formData),
      where: { id: taskId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Maintenance program task update failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "Maintenance program task updated."));
}

export async function setMaintenanceProgramTaskActiveAction(taskId: string, active: boolean, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    await prisma.maintenanceProgramTask.update({
      data: {
        active,
        effectiveTo: active ? null : new Date(),
      },
      where: { id: taskId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Maintenance program task status update failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", active ? "Maintenance program task activated." : "Maintenance program task deactivated."));
}

export async function addMaintenanceProgramApplicabilityAction(taskId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    const scope = parseApplicabilityScope(formData);
    const aircraftType = parseAircraftType(formData);
    const aircraftId = optionalText(formData, "aircraftId");

    if (scope === MaintenanceProgramApplicabilityScope.AIRCRAFT_TYPE && !aircraftType) {
      throw new MaintenanceActionError("Choose an aircraft type for type applicability.");
    }

    if (scope === MaintenanceProgramApplicabilityScope.AIRCRAFT && !aircraftId) {
      throw new MaintenanceActionError("Choose a tail for tail applicability.");
    }

    await prisma.maintenanceProgramApplicability.create({
      data: {
        aircraftId: scope === MaintenanceProgramApplicabilityScope.AIRCRAFT ? aircraftId : null,
        aircraftType: scope === MaintenanceProgramApplicabilityScope.AIRCRAFT_TYPE ? aircraftType : null,
        createdById: currentUser.id,
        effectiveFrom: parseOptionalDateTime(formData, "effectiveFrom", "Effective from") ?? new Date(),
        notes: optionalText(formData, "notes"),
        scope,
        taskId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Applicability rule creation failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "Applicability rule added."));
}

export async function retireMaintenanceProgramApplicabilityAction(applicabilityId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    await prisma.maintenanceProgramApplicability.update({
      data: {
        active: false,
        effectiveTo: new Date(),
      },
      where: { id: applicabilityId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Applicability rule retirement failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "Applicability rule retired."));
}

export async function addMaintenanceProgramOverrideAction(taskId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    const aircraftId = requiredText(formData, "aircraftId", "Tail");
    await prisma.maintenanceProgramOverride.create({
      data: {
        action: parseOverrideAction(formData),
        aircraftId,
        createdById: currentUser.id,
        effectiveFrom: parseOptionalDateTime(formData, "effectiveFrom", "Effective from") ?? new Date(),
        reason: requiredText(formData, "reason", "Reason"),
        taskId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tail override creation failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "Tail override added."));
}

export async function upsertMaintenanceComplianceBaselineAction(
  aircraftId: string,
  taskId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    const task = await prisma.maintenanceProgramTask.findUniqueOrThrow({
      select: {
        intervalAirframeHours: true,
        intervalCycles: true,
        intervalDays: true,
        intervalMonths: true,
      },
      where: { id: taskId },
    });
    const lastCompletedAt = parseOptionalDateTime(formData, "lastCompletedAt", "Last completed");
    const lastCompletedAirframeHours = parseOptionalNumber(formData, "lastCompletedAirframeHours", "Last completed hours");
    const lastCompletedCycles = parseOptionalInteger(formData, "lastCompletedCycles", "Last completed cycles");
    const manualNextDueAt = parseOptionalDateTime(formData, "manualNextDueAt", "Manual next due date");
    const manualNextDueAirframeHours = parseOptionalNumber(formData, "manualNextDueAirframeHours", "Manual next due hours");
    const manualNextDueCycles = parseOptionalInteger(formData, "manualNextDueCycles", "Manual next due cycles");
    const hasBaseline = Boolean(
      lastCompletedAt ||
      lastCompletedAirframeHours !== null ||
      lastCompletedCycles !== null ||
      manualNextDueAt ||
      manualNextDueAirframeHours !== null ||
      manualNextDueCycles !== null,
    );

    await prisma.maintenanceComplianceState.upsert({
      create: {
        aircraftId,
        baselineNotes: optionalText(formData, "baselineNotes"),
        lastCompletedAirframeHours,
        lastCompletedAt,
        lastCompletedCycles,
        manualNextDueAirframeHours,
        manualNextDueAt,
        manualNextDueCycles,
        nextDueAirframeHours: nextDueNumberFromTask(lastCompletedAirframeHours, manualNextDueAirframeHours, task.intervalAirframeHours),
        nextDueAt: nextDueAtFromTask(lastCompletedAt, manualNextDueAt, task),
        nextDueCycles: nextDueNumberFromTask(lastCompletedCycles, manualNextDueCycles, task.intervalCycles),
        status: hasBaseline ? MaintenanceComplianceStatus.CURRENT : MaintenanceComplianceStatus.NEEDS_BASELINE,
        taskId,
        updatedById: currentUser.id,
      },
      update: {
        baselineNotes: optionalText(formData, "baselineNotes"),
        lastCompletedAirframeHours,
        lastCompletedAt,
        lastCompletedCycles,
        manualNextDueAirframeHours,
        manualNextDueAt,
        manualNextDueCycles,
        nextDueAirframeHours: nextDueNumberFromTask(lastCompletedAirframeHours, manualNextDueAirframeHours, task.intervalAirframeHours),
        nextDueAt: nextDueAtFromTask(lastCompletedAt, manualNextDueAt, task),
        nextDueCycles: nextDueNumberFromTask(lastCompletedCycles, manualNextDueCycles, task.intervalCycles),
        status: hasBaseline ? MaintenanceComplianceStatus.CURRENT : MaintenanceComplianceStatus.NEEDS_BASELINE,
        updatedById: currentUser.id,
      },
      where: {
        aircraftId_taskId: {
          aircraftId,
          taskId,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Baseline update failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidatePath("/maintenance");
  revalidatePath("/aircraft");
  revalidatePath(`/aircraft/${aircraftId}/airworthiness`);
  redirect(withMessage(returnTo, "message", "Maintenance baseline updated."));
}

export async function createAircraftMeterSnapshotAction(aircraftId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    await prisma.aircraftMeterSnapshot.create({
      data: {
        aircraftId,
        airframeCycles: parseOptionalInteger(formData, "airframeCycles", "Airframe cycles"),
        airframeHours: parseOptionalNumber(formData, "airframeHours", "Airframe hours"),
        notes: optionalText(formData, "notes"),
        recordedAt: parseOptionalDateTime(formData, "recordedAt", "Recorded at") ?? new Date(),
        recordedById: currentUser.id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meter snapshot failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidatePath("/maintenance");
  revalidatePath("/aircraft");
  redirect(withMessage(returnTo, "message", "Aircraft meter snapshot added."));
}

export async function planScheduledMaintenanceAction(
  aircraftId: string,
  taskId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    await planScheduledMaintenance({
      actorId: currentUser.id,
      aircraftId,
      note: optionalText(formData, "planNote"),
      plannedAt: parseOptionalDateTime(formData, "scheduledAt", "Scheduled at"),
      stationId: optionalText(formData, "stationId"),
      taskId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scheduled maintenance planning failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidateMaintenanceProgramPaths(aircraftId);
  redirect(withMessage(returnTo, "message", "Scheduled maintenance planned."));
}

export async function startScheduledMaintenanceAction(maintenanceEventId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);
  try {
    await startScheduledMaintenance({ actorId: currentUser.id, maintenanceEventId });
  } catch (error) {
    redirect(withMessage(returnTo, "error", error instanceof Error ? error.message : "Could not start maintenance."));
  }
  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "Scheduled maintenance started. Draft logbook entry created."));
}

export async function releaseMaintenanceOccurrenceAction(maintenanceEventId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);
  try {
    await releaseMaintenanceOccurrence({
      actorId: currentUser.id,
      maintenanceEventId,
      note: requiredText(formData, "mxControlReleaseNote", "MX Control release note"),
    });
  } catch (error) {
    redirect(withMessage(returnTo, "error", error instanceof Error ? error.message : "MX Control release failed."));
  }
  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "Aircraft released by Maintenance Control."));
}

export async function placeMaintenanceControlHoldAction(aircraftId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);
  try {
    await placeMaintenanceControlHold({
      actorId: currentUser.id,
      aircraftId,
      expectedReturnAt: parseOptionalDateTime(formData, "expectedReturnAt", "Expected return"),
      note: optionalText(formData, "note"),
      reason: requiredText(formData, "reason", "Hold reason"),
    });
  } catch (error) {
    redirect(withMessage(returnTo, "error", error instanceof Error ? error.message : "Could not place MX hold."));
  }
  revalidateMaintenanceProgramPaths(aircraftId);
  redirect(withMessage(returnTo, "message", "Aircraft removed from service by Maintenance Control."));
}

export async function releaseMaintenanceControlHoldAction(holdId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);
  try {
    await releaseMaintenanceControlHold({
      actorId: currentUser.id,
      holdId,
      noDefectOrMaintenanceConfirmed:
        formData.get("noDefectOrMaintenanceConfirmed") === "on",
      releaseExplanation: requiredText(formData, "releaseExplanation", "Release explanation"),
    });
  } catch (error) {
    redirect(withMessage(returnTo, "error", error instanceof Error ? error.message : "Could not release MX hold."));
  }
  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "MX Control hold released."));
}

export async function convertMaintenanceControlHoldAction(holdId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);
  try {
    await convertMaintenanceControlHoldToDiscrepancy({
      actorId: currentUser.id,
      description: optionalText(formData, "description"),
      holdId,
      title: requiredText(formData, "title", "Write-up title"),
    });
  } catch (error) {
    redirect(withMessage(returnTo, "error", error instanceof Error ? error.message : "Could not convert MX hold."));
  }
  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "MX hold converted to an official write-up."));
}

export async function convertMaintenanceControlHoldToScheduledAction(
  holdId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);
  try {
    await convertMaintenanceControlHoldToMaintenanceEvent({
      actorId: currentUser.id,
      holdId,
      maintenanceEventId: requiredText(
        formData,
        "maintenanceEventId",
        "Scheduled maintenance occurrence",
      ),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Could not link MX hold to scheduled maintenance.",
      ),
    );
  }
  revalidateMaintenanceProgramPaths();
  redirect(withMessage(returnTo, "message", "MX hold linked to scheduled maintenance."));
}

export async function markMaintenanceTaskNotApplicableAction(
  aircraftId: string,
  taskId: string,
  formData: FormData,
) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);
  const returnTo = maintenanceReturnTo(formData);

  try {
    await prisma.$transaction([
      prisma.maintenanceProgramOverride.create({
        data: {
          action: MaintenanceProgramOverrideAction.EXCLUDE,
          aircraftId,
          createdById: currentUser.id,
          effectiveFrom: new Date(),
          reason: requiredText(formData, "reason", "Reason"),
          taskId,
        },
      }),
      prisma.maintenanceComplianceState.upsert({
        create: {
          aircraftId,
          status: MaintenanceComplianceStatus.NOT_APPLICABLE,
          taskId,
          updatedById: currentUser.id,
        },
        update: {
          status: MaintenanceComplianceStatus.NOT_APPLICABLE,
          updatedById: currentUser.id,
        },
        where: {
          aircraftId_taskId: {
            aircraftId,
            taskId,
          },
        },
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Applicability override failed.";
    redirect(withMessage(returnTo, "error", message));
  }

  revalidatePath("/maintenance");
  revalidatePath("/aircraft");
  redirect(withMessage(returnTo, "message", "Maintenance task marked not applicable for this tail."));
}
