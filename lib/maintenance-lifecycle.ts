import { createHash } from "node:crypto";

import {
  AircraftLogbookAuditEventType,
  AircraftLogbookEntrySource,
  AircraftLogbookEntryStatus,
  AircraftLogbookEntryType,
  AircraftLogbookSignaturePurpose,
  DiscrepancyStatus,
  MaintenanceControlHoldStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
  Prisma,
  ReturnToServiceRecordStatus,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class MaintenanceLifecycleError extends Error {}

type DatabaseClient = Prisma.TransactionClient;

function required(value: string | null | undefined, label: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new MaintenanceLifecycleError(`${label} is required.`);
  }
  return trimmed;
}

function tailKey(value: string) {
  return value.replace(/[^A-Z0-9]/gi, "").toUpperCase() || "AIRCRAFT";
}

function dateKey(value = new Date()) {
  return value.toISOString().slice(0, 10).replaceAll("-", "");
}

async function nextNumber(
  tx: DatabaseClient,
  kind: "DISC" | "LB" | "MX" | "RTS",
  aircraftId: string,
  tailNumber: string,
) {
  const prefix = `${kind}-${tailKey(tailNumber)}-${dateKey()}`;
  for (let sequence = 1; sequence < 1000; sequence += 1) {
    const candidate = `${prefix}-${String(sequence).padStart(3, "0")}`;
    const exists =
      kind === "DISC"
        ? await tx.discrepancy.findFirst({ where: { aircraftId, discrepancyNumber: candidate }, select: { id: true } })
        : kind === "LB"
          ? await tx.aircraftLogbookEntry.findFirst({ where: { aircraftId, entryNumber: candidate }, select: { id: true } })
          : kind === "MX"
            ? await tx.maintenanceEvent.findFirst({ where: { aircraftId, maintenanceNumber: candidate }, select: { id: true } })
            : await tx.returnToServiceRecord.findFirst({ where: { aircraftId, rtsNumber: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new MaintenanceLifecycleError(`Could not generate a ${kind} number.`);
}

async function assertMaintenanceUser(tx: DatabaseClient, actorId: string, requireAuthority = false) {
  const actor = await tx.user.findUnique({
    where: { id: actorId },
    select: {
      id: true,
      isActive: true,
      role: true,
      maintenanceAuthorityProfiles: {
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!actor || !actor.isActive || actor.role !== UserRole.MAINTENANCE) {
    throw new MaintenanceLifecycleError("This action requires an active Maintenance user.");
  }
  if (requireAuthority && !actor.maintenanceAuthorityProfiles[0]) {
    throw new MaintenanceLifecycleError("An active maintenance authority profile is required.");
  }
  return { actor, authorityProfile: actor.maintenanceAuthorityProfiles[0] ?? null };
}

async function getAircraft(tx: DatabaseClient, aircraftId: string) {
  const aircraft = await tx.aircraft.findUnique({
    where: { id: aircraftId },
    select: { id: true, tailNumber: true },
  });
  if (!aircraft) throw new MaintenanceLifecycleError("Aircraft was not found.");
  return aircraft;
}

export async function placeMaintenanceControlHold(input: {
  actorId: string;
  aircraftId: string;
  reason: string;
  note?: string | null;
  expectedReturnAt?: Date | null;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertMaintenanceUser(tx, input.actorId);
      await getAircraft(tx, input.aircraftId);
      return tx.maintenanceControlHold.create({
        data: {
          aircraftId: input.aircraftId,
          expectedReturnAt: input.expectedReturnAt ?? null,
          note: input.note?.trim() || null,
          placedById: input.actorId,
          reason: required(input.reason, "Hold reason"),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new MaintenanceLifecycleError("This aircraft already has an active MX Control hold.");
    }
    throw error;
  }
}

export async function releaseMaintenanceControlHold(input: {
  actorId: string;
  holdId: string;
  releaseExplanation: string;
  noDefectOrMaintenanceConfirmed: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    await assertMaintenanceUser(tx, input.actorId);
    if (!input.noDefectOrMaintenanceConfirmed) {
      throw new MaintenanceLifecycleError(
        "Confirm that no defect was found and no maintenance was performed before releasing the hold.",
      );
    }
    const updated = await tx.maintenanceControlHold.updateMany({
      where: { id: input.holdId, status: MaintenanceControlHoldStatus.ACTIVE },
      data: {
        releaseExplanation: required(input.releaseExplanation, "Release explanation"),
        releasedAt: new Date(),
        releasedById: input.actorId,
        status: MaintenanceControlHoldStatus.RELEASED,
      },
    });
    if (updated.count !== 1) {
      throw new MaintenanceLifecycleError("The MX Control hold is no longer active.");
    }
    return tx.maintenanceControlHold.findUniqueOrThrow({ where: { id: input.holdId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function convertMaintenanceControlHoldToDiscrepancy(input: {
  actorId: string;
  holdId: string;
  title: string;
  description?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    await assertMaintenanceUser(tx, input.actorId);
    const hold = await tx.maintenanceControlHold.findFirst({
      where: { id: input.holdId, status: MaintenanceControlHoldStatus.ACTIVE },
      include: { aircraft: { select: { id: true, tailNumber: true } } },
    });
    if (!hold) throw new MaintenanceLifecycleError("The MX Control hold is no longer active.");

    const discrepancy = await tx.discrepancy.create({
      data: {
        aircraftId: hold.aircraftId,
        description: input.description?.trim() || hold.note,
        discrepancyNumber: await nextNumber(tx, "DISC", hold.aircraftId, hold.aircraft.tailNumber),
        reportedById: input.actorId,
        status: DiscrepancyStatus.OPEN,
        title: required(input.title, "Discrepancy title"),
      },
    });
    const entry = await tx.aircraftLogbookEntry.create({
      data: {
        aircraftId: hold.aircraftId,
        category: "MAINTENANCE_CONTROL",
        createdById: input.actorId,
        discrepancyId: discrepancy.id,
        entryNumber: await nextNumber(tx, "LB", hold.aircraftId, hold.aircraft.tailNumber),
        entryType: AircraftLogbookEntryType.MAINTENANCE_ENTRY,
        narrative: discrepancy.description,
        source: AircraftLogbookEntrySource.MAINTENANCE,
        status: AircraftLogbookEntryStatus.OPEN,
        title: discrepancy.title,
        updatedById: input.actorId,
      },
    });
    await tx.aircraftLogbookAuditEvent.create({
      data: {
        actorId: input.actorId,
        aircraftId: hold.aircraftId,
        entryId: entry.id,
        eventType: AircraftLogbookAuditEventType.CREATED,
        message: "MX Control hold converted to an official write-up.",
        metadata: { maintenanceControlHoldId: hold.id },
      },
    });
    const converted = await tx.maintenanceControlHold.updateMany({
      where: { id: hold.id, status: MaintenanceControlHoldStatus.ACTIVE },
      data: {
        convertedAt: new Date(),
        convertedById: input.actorId,
        convertedDiscrepancyId: discrepancy.id,
        status: MaintenanceControlHoldStatus.CONVERTED,
      },
    });
    if (converted.count !== 1) throw new MaintenanceLifecycleError("The MX Control hold changed during conversion.");
    return { discrepancy, entry };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function convertMaintenanceControlHoldToMaintenanceEvent(input: {
  actorId: string;
  holdId: string;
  maintenanceEventId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await assertMaintenanceUser(tx, input.actorId);
    const hold = await tx.maintenanceControlHold.findFirst({
      where: { id: input.holdId, status: MaintenanceControlHoldStatus.ACTIVE },
    });
    if (!hold) throw new MaintenanceLifecycleError("The MX Control hold is no longer active.");
    const event = await tx.maintenanceEvent.findFirst({
      where: {
        aircraftId: hold.aircraftId,
        id: input.maintenanceEventId,
        status: { in: [MaintenanceEventStatus.PLANNED, MaintenanceEventStatus.IN_PROGRESS, MaintenanceEventStatus.COMPLETED] },
      },
      include: {
        aircraft: { select: { tailNumber: true } },
        logbookEntries: { select: { id: true }, take: 1 },
        maintenanceProgramTask: true,
      },
    });
    if (!event) throw new MaintenanceLifecycleError("The selected maintenance occurrence is not an active blocker for this aircraft.");
    if (event.status === MaintenanceEventStatus.PLANNED) {
      await tx.aircraftLogbookEntry.create({
        data: {
          aircraftId: event.aircraftId,
          category: event.maintenanceProgramTask?.category ?? "SCHEDULED_MAINTENANCE",
          createdById: input.actorId,
          entryNumber: await nextNumber(tx, "LB", event.aircraftId, event.aircraft.tailNumber),
          entryType: AircraftLogbookEntryType.MAINTENANCE_ENTRY,
          maintenanceComplianceStateId: event.maintenanceComplianceStateId,
          maintenanceEventId: event.id,
          maintenanceProgramTaskId: event.maintenanceProgramTaskId,
          narrative: event.planNote,
          requiresIndependentInspection: event.requiresIndependentInspection,
          source: AircraftLogbookEntrySource.MAINTENANCE,
          status: AircraftLogbookEntryStatus.DRAFT,
          taskReference: event.maintenanceProgramTask?.sourceReference,
          title: event.maintenanceProgramTask?.title ?? "Scheduled maintenance",
          updatedById: input.actorId,
        },
      });
      await tx.maintenanceEvent.update({
        where: { id: event.id },
        data: { startedAt: new Date(), status: MaintenanceEventStatus.IN_PROGRESS },
      });
    } else if (event.status === MaintenanceEventStatus.COMPLETED && event.returnToServiceAt) {
      throw new MaintenanceLifecycleError("A released maintenance occurrence cannot replace an active MX hold.");
    }
    const converted = await tx.maintenanceControlHold.updateMany({
      where: { id: hold.id, status: MaintenanceControlHoldStatus.ACTIVE },
      data: {
        convertedAt: new Date(),
        convertedById: input.actorId,
        convertedMaintenanceEventId: event.id,
        status: MaintenanceControlHoldStatus.CONVERTED,
      },
    });
    if (converted.count !== 1) throw new MaintenanceLifecycleError("The MX Control hold changed during conversion.");
    return { maintenanceEventId: event.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function planScheduledMaintenance(input: {
  actorId: string;
  aircraftId: string;
  taskId: string;
  plannedAt?: Date | null;
  stationId?: string | null;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({ where: { id: input.actorId }, select: { id: true, isActive: true, role: true } });
    if (!actor?.isActive || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MAINTENANCE)) {
      throw new MaintenanceLifecycleError("Scheduled maintenance planning requires Admin or Maintenance.");
    }
    const aircraft = await getAircraft(tx, input.aircraftId);
    const task = await tx.maintenanceProgramTask.findUnique({ where: { id: input.taskId } });
    if (!task) throw new MaintenanceLifecycleError("Maintenance program task was not found.");
    const compliance = await tx.maintenanceComplianceState.upsert({
      where: { aircraftId_taskId: { aircraftId: input.aircraftId, taskId: input.taskId } },
      create: {
        aircraftId: input.aircraftId,
        status: "NEEDS_BASELINE",
        taskId: input.taskId,
        updatedById: input.actorId,
      },
      update: { updatedById: input.actorId },
    });
    const existing = await tx.maintenanceEvent.findFirst({
      where: {
        aircraftId: input.aircraftId,
        maintenanceProgramTaskId: input.taskId,
        status: { in: [MaintenanceEventStatus.PLANNED, MaintenanceEventStatus.IN_PROGRESS] },
      },
    });
    if (existing) throw new MaintenanceLifecycleError("This scheduled task already has an open maintenance occurrence.");
    return tx.maintenanceEvent.create({
      data: {
        aircraftId: input.aircraftId,
        eventType: MaintenanceEventType.SCHEDULED_MAINTENANCE,
        maintenanceComplianceStateId: compliance.id,
        maintenanceNumber: await nextNumber(tx, "MX", input.aircraftId, aircraft.tailNumber),
        maintenanceProgramTaskId: task.id,
        planNote: input.note?.trim() || null,
        plannedStationId: input.stationId || null,
        requiresIndependentInspection: task.requiresIndependentInspection,
        scheduledAt: input.plannedAt ?? null,
        status: MaintenanceEventStatus.PLANNED,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function startScheduledMaintenance(input: { actorId: string; maintenanceEventId: string }) {
  return prisma.$transaction(async (tx) => {
    await assertMaintenanceUser(tx, input.actorId);
    const event = await tx.maintenanceEvent.findFirst({
      where: { id: input.maintenanceEventId, status: MaintenanceEventStatus.PLANNED },
      include: { aircraft: { select: { tailNumber: true } }, maintenanceProgramTask: true },
    });
    if (!event || event.eventType !== MaintenanceEventType.SCHEDULED_MAINTENANCE) {
      throw new MaintenanceLifecycleError("Only planned scheduled maintenance can be started.");
    }
    const entry = await tx.aircraftLogbookEntry.create({
      data: {
        aircraftId: event.aircraftId,
        category: event.maintenanceProgramTask?.category ?? "SCHEDULED_MAINTENANCE",
        createdById: input.actorId,
        entryNumber: await nextNumber(tx, "LB", event.aircraftId, event.aircraft.tailNumber),
        entryType: AircraftLogbookEntryType.MAINTENANCE_ENTRY,
        maintenanceComplianceStateId: event.maintenanceComplianceStateId,
        maintenanceEventId: event.id,
        maintenanceProgramTaskId: event.maintenanceProgramTaskId,
        narrative: event.planNote,
        requiresIndependentInspection: event.requiresIndependentInspection,
        source: AircraftLogbookEntrySource.MAINTENANCE,
        status: AircraftLogbookEntryStatus.DRAFT,
        taskReference: event.maintenanceProgramTask?.sourceReference,
        title: event.maintenanceProgramTask?.title ?? "Scheduled maintenance",
        updatedById: input.actorId,
      },
    });
    const updated = await tx.maintenanceEvent.updateMany({
      where: { id: event.id, status: MaintenanceEventStatus.PLANNED },
      data: { startedAt: new Date(), status: MaintenanceEventStatus.IN_PROGRESS },
    });
    if (updated.count !== 1) throw new MaintenanceLifecycleError("Scheduled maintenance changed before it could be started.");
    return { entry, eventId: event.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function hash(value: Prisma.InputJsonValue) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function releaseMaintenanceOccurrence(input: {
  actorId: string;
  maintenanceEventId: string;
  note: string;
}) {
  return prisma.$transaction(async (tx) => {
    await assertMaintenanceUser(tx, input.actorId);
    const event = await tx.maintenanceEvent.findUnique({
      where: { id: input.maintenanceEventId },
      include: {
        aircraft: { select: { tailNumber: true } },
        discrepancy: true,
        logbookEntries: {
          orderBy: { createdAt: "desc" },
          include: { signatures: { orderBy: { signedAt: "asc" } } },
        },
      },
    });
    if (!event || event.status !== MaintenanceEventStatus.COMPLETED || !event.maintenanceApprovedAt) {
      throw new MaintenanceLifecycleError("Maintenance approval must be signed before MX Control release.");
    }
    if (event.mxControlReleasedAt) throw new MaintenanceLifecycleError("This maintenance occurrence is already released.");
    const entry = event.logbookEntries[0];
    if (!entry) throw new MaintenanceLifecycleError("The signed logbook entry was not found.");
    const maintenanceSignature = entry.signatures.find((item) => item.purpose === AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL);
    if (!maintenanceSignature) throw new MaintenanceLifecycleError("The maintenance approval signature was not found.");
    if (event.requiresIndependentInspection) {
      const inspectionSignature = entry.signatures.find((item) => item.purpose === AircraftLogbookSignaturePurpose.INSPECTION_APPROVAL);
      if (!inspectionSignature) throw new MaintenanceLifecycleError("Independent inspection approval is required before MX Control release.");
      if (inspectionSignature.signerUserId === maintenanceSignature.signerUserId) {
        throw new MaintenanceLifecycleError("The independent inspector must be different from the maintenance signer.");
      }
    }

    const releasedAt = new Date();
    const note = required(input.note, "MX Control release note");
    const snapshot: Prisma.InputJsonObject = {
      aircraftId: event.aircraftId,
      entryId: entry.id,
      maintenanceEventId: event.id,
      maintenanceApprovalSignatureId: maintenanceSignature.id,
      maintenanceSignedAt: maintenanceSignature.signedAt.toISOString(),
      mxControlReleasedAt: releasedAt.toISOString(),
      mxControlReleasedById: input.actorId,
      workSummary: event.workPerformed ?? entry.narrative ?? entry.title,
    };
    const signedContentHash = hash(snapshot);
    const rts = await tx.returnToServiceRecord.create({
      data: {
        aircraftId: event.aircraftId,
        approvalBasis: maintenanceSignature.authorizationBasis,
        authorityProfileId: maintenanceSignature.authorityProfileId,
        createdById: input.actorId,
        discrepancyId: event.discrepancyId,
        logbookEntryId: entry.id,
        maintenanceEventId: event.id,
        mxControlReleaseNote: note,
        mxControlReleasedAt: releasedAt,
        mxControlReleasedById: input.actorId,
        returnToServiceAt: releasedAt,
        rtsNumber: await nextNumber(tx, "RTS", event.aircraftId, event.aircraft.tailNumber),
        signedAt: maintenanceSignature.signedAt,
        signedContentHash,
        signedSnapshot: snapshot,
        signerUserId: maintenanceSignature.signerUserId,
        status: ReturnToServiceRecordStatus.SIGNED,
        workSummary: event.workPerformed ?? entry.narrative ?? entry.title,
      },
    });
    await tx.maintenanceEvent.update({
      where: { id: event.id },
      data: {
        mxControlReleaseNote: note,
        mxControlReleasedAt: releasedAt,
        mxControlReleasedById: input.actorId,
        returnToServiceAt: releasedAt,
      },
    });
    if (event.discrepancyId) {
      const cleared = await tx.discrepancy.updateMany({
        where: { id: event.discrepancyId, status: DiscrepancyStatus.CORRECTED_PENDING_RTS },
        data: {
          activeDeferralId: null,
          clearedAt: releasedAt,
          clearingReturnToServiceRecordId: rts.id,
          status: DiscrepancyStatus.CLEARED,
        },
      });
      if (cleared.count !== 1) {
        throw new MaintenanceLifecycleError(
          "The linked corrected write-up is not ready for MX Control release.",
        );
      }
    }
    await tx.aircraftLogbookAuditEvent.create({
      data: {
        actorId: input.actorId,
        aircraftId: event.aircraftId,
        entryId: entry.id,
        eventType: AircraftLogbookAuditEventType.SIGNED,
        message: `MX Control released aircraft under ${rts.rtsNumber}.`,
        metadata: { maintenanceEventId: event.id, returnToServiceRecordId: rts.id },
      },
    });
    return rts;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
