import { createHash } from "node:crypto";

import {
  AircraftLogbookAttachmentAccessEvent,
  AircraftLogbookAuditEventType,
  AircraftLogbookEntrySource,
  AircraftLogbookEntryStatus,
  AircraftLogbookEntryType,
  AircraftLogbookSignaturePurpose,
  AssignmentStatus,
  DiscrepancyStatus,
  MaintenanceComplianceStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
  Prisma,
  UserRole,
  type AircraftLogbookAttachment,
} from "@prisma/client";

import {
  deleteAircraftLogbookAttachmentObject,
  readAircraftLogbookAttachmentObject,
  storeAircraftLogbookAttachmentFile,
} from "@/lib/aircraft-logbook-storage";
import { assertCrewAssignedToFlightLeg } from "@/lib/crew-me-queries";
import { prisma } from "@/lib/prisma";

export class AircraftLogbookError extends Error {}

const maintenanceAuthorityRoles = new Set<UserRole>([UserRole.MAINTENANCE]);

function optionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredText(value: FormDataEntryValue | null, label: string): string {
  const text = optionalText(value);

  if (!text) {
    throw new AircraftLogbookError(`${label} is required.`);
  }

  return text;
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

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeTail(tailNumber: string): string {
  return tailNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase() || "AIRCRAFT";
}

function yyyymmdd(value = new Date()): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("");
}

async function nextAircraftScopedNumber(
  transaction: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
  prefix: string,
): Promise<string> {
  const count = await transaction.aircraftLogbookEntry.count({
    where: {
      aircraftId,
      entryNumber: {
        startsWith: `${prefix}-${safeTail(tailNumber)}-${yyyymmdd()}`,
      },
    },
  });

  return `${prefix}-${safeTail(tailNumber)}-${yyyymmdd()}-${String(count + 1).padStart(3, "0")}`;
}

async function nextDiscrepancyNumber(
  transaction: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
): Promise<string> {
  const count = await transaction.discrepancy.count({
    where: {
      aircraftId,
      discrepancyNumber: {
        startsWith: `SQ-${safeTail(tailNumber)}-${yyyymmdd()}`,
      },
    },
  });

  return `SQ-${safeTail(tailNumber)}-${yyyymmdd()}-${String(count + 1).padStart(3, "0")}`;
}

async function nextMaintenanceNumber(
  transaction: Prisma.TransactionClient,
  aircraftId: string,
  tailNumber: string,
): Promise<string> {
  const count = await transaction.maintenanceEvent.count({
    where: {
      aircraftId,
      maintenanceNumber: {
        startsWith: `MX-${safeTail(tailNumber)}-${yyyymmdd()}`,
      },
    },
  });

  return `MX-${safeTail(tailNumber)}-${yyyymmdd()}-${String(count + 1).padStart(3, "0")}`;
}

function logbookEntrySnapshot(entry: {
  approvedByCertificateNumber: string | null;
  approvedByCertificateType: string | null;
  approvedByName: string | null;
  category: string | null;
  deferralAuthority: string | null;
  dueAt: Date | null;
  entryNumber: string;
  entryType: AircraftLogbookEntryType;
  id: string;
  manualReference: string | null;
  melCategory: string | null;
  melItemNumber: string | null;
  narrative: string | null;
  operatingLimitations: string | null;
  performedByCertificateNumber: string | null;
  performedByName: string | null;
  placardRequired: boolean;
  requiredProcedures: string | null;
  returnToServiceAt: Date | null;
  severity: string | null;
  source: AircraftLogbookEntrySource;
  status: AircraftLogbookEntryStatus;
  taskReference: string | null;
  title: string;
}) {
  return {
    approvedByCertificateNumber: entry.approvedByCertificateNumber,
    approvedByCertificateType: entry.approvedByCertificateType,
    approvedByName: entry.approvedByName,
    category: entry.category,
    deferralAuthority: entry.deferralAuthority,
    dueAt: entry.dueAt?.toISOString() ?? null,
    entryNumber: entry.entryNumber,
    entryType: entry.entryType,
    id: entry.id,
    manualReference: entry.manualReference,
    melCategory: entry.melCategory,
    melItemNumber: entry.melItemNumber,
    narrative: entry.narrative,
    operatingLimitations: entry.operatingLimitations,
    performedByCertificateNumber: entry.performedByCertificateNumber,
    performedByName: entry.performedByName,
    placardRequired: entry.placardRequired,
    requiredProcedures: entry.requiredProcedures,
    returnToServiceAt: entry.returnToServiceAt?.toISOString() ?? null,
    severity: entry.severity,
    source: entry.source,
    status: entry.status,
    taskReference: entry.taskReference,
    title: entry.title,
  };
}

function hashSnapshot(snapshot: unknown): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function parseLogbookAttachmentFile(formData: FormData): File | null {
  const file = formData.get("attachment");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return file;
}

export async function getActiveMaintenanceEntryTemplates() {
  return prisma.maintenanceEntryTemplate.findMany({
    where: {
      isActive: true,
      retiredAt: null,
    },
    orderBy: [{ entryType: "asc" }, { title: "asc" }],
  });
}

export async function getAircraftLogbookWorkspaceData(aircraftId: string) {
  return prisma.aircraft.findUnique({
    where: { id: aircraftId },
    select: {
      id: true,
      name: true,
      status: true,
      tailNumber: true,
      type: true,
      homeStation: {
        select: {
          code: true,
          city: true,
        },
      },
      configurations: {
        orderBy: [{ effectiveStart: "desc" }],
        select: {
          configurationLabel: true,
          effectiveEnd: true,
          effectiveStart: true,
          passengerSeatCount: true,
          status: true,
        },
        take: 1,
      },
      discrepancies: {
        orderBy: [{ reportedAt: "desc" }],
        select: {
          id: true,
          discrepancyNumber: true,
          title: true,
          status: true,
          severity: true,
          reportedAt: true,
          clearedAt: true,
        },
        take: 10,
      },
      deferrals: {
        orderBy: [{ deferredAt: "desc" }],
        select: {
          id: true,
          deferralNumber: true,
          status: true,
          category: true,
          melItemNumber: true,
          repairInterval: true,
          dueAt: true,
          placardRequired: true,
          operatingLimitations: true,
          discrepancy: {
            select: {
              discrepancyNumber: true,
              title: true,
            },
          },
        },
        take: 10,
      },
      maintenanceEvents: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          maintenanceNumber: true,
          eventType: true,
          status: true,
          completedAt: true,
          providerName: true,
          requiresIndependentInspection: true,
          maintenanceApprovedAt: true,
          inspectionApprovedAt: true,
          returnToServiceAt: true,
        },
        take: 10,
      },
      maintenanceControlHolds: {
        where: { status: "ACTIVE" },
        select: { id: true, reason: true, status: true },
      },
      maintenanceComplianceStates: {
        where: { status: MaintenanceComplianceStatus.OVERDUE },
        select: {
          id: true,
          status: true,
          task: { select: { requiredForServiceability: true, title: true } },
        },
      },
      airworthinessReleases: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          releaseNumber: true,
          status: true,
          releasedAt: true,
          expiresAt: true,
        },
        take: 5,
      },
      logbookEntries: {
        orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          entryNumber: true,
          entryType: true,
          status: true,
          source: true,
          title: true,
          narrative: true,
          category: true,
          severity: true,
          manualReference: true,
          taskReference: true,
          melItemNumber: true,
          melCategory: true,
          dueAt: true,
          placardRequired: true,
          operatingLimitations: true,
          requiredProcedures: true,
          requiresIndependentInspection: true,
          performedByName: true,
          approvedByName: true,
          returnToServiceAt: true,
          lockedAt: true,
          voidedAt: true,
          reportedAt: true,
          createdAt: true,
          discrepancy: {
            select: {
              discrepancyNumber: true,
              status: true,
            },
          },
          deferral: {
            select: {
              deferralNumber: true,
              status: true,
            },
          },
          maintenanceEvent: {
            select: {
              maintenanceNumber: true,
              status: true,
            },
          },
          airworthinessRelease: {
            select: {
              releaseNumber: true,
              status: true,
            },
          },
          attachments: {
            where: { deletedAt: null },
            orderBy: [{ createdAt: "desc" }],
            select: {
              id: true,
              originalFilename: true,
              contentType: true,
              byteSize: true,
              createdAt: true,
            },
          },
          signatures: {
            orderBy: [{ signedAt: "desc" }],
            select: {
              id: true,
              purpose: true,
              signerName: true,
              certificateNumber: true,
              certificateType: true,
              signedAt: true,
              signedContentHash: true,
            },
          },
        },
        take: 50,
      },
      logbookAuditEvents: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          eventType: true,
          message: true,
          createdAt: true,
        },
        take: 20,
      },
    },
  });
}

export async function createCrewSquawkLogbookEntry({
  actorId,
  file,
  flightLegId,
  formData,
}: {
  actorId: string;
  file: File | null;
  flightLegId: string;
  formData: FormData;
}) {
  await assertCrewAssignedToFlightLeg(actorId, flightLegId);

  const title = requiredText(formData.get("title"), "Issue title");
  const narrative = requiredText(formData.get("narrative"), "Issue details");
  const category = optionalText(formData.get("category"))?.toUpperCase() ?? "CREW_SQUAWK";
  const severity = optionalText(formData.get("severity"))?.toUpperCase() ?? "REVIEW";
  const phaseOfFlight = optionalText(formData.get("phaseOfFlight"))?.toUpperCase() ?? null;
  const reportedAt = new Date();

  const flightLeg = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: {
      aircraftAssignments: {
        orderBy: { assignedAt: "desc" },
        select: {
          aircraft: {
            select: {
              id: true,
              tailNumber: true,
            },
          },
        },
        take: 1,
        where: { status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] } },
      },
    },
  });

  const aircraft = flightLeg?.aircraftAssignments[0]?.aircraft ?? null;

  if (!aircraft) {
    throw new AircraftLogbookError("This flight does not have an assigned aircraft.");
  }

  const result = await prisma.$transaction(async (transaction) => {
    const discrepancy = await transaction.discrepancy.create({
      data: {
        aircraftId: aircraft.id,
        discrepancyNumber: await nextDiscrepancyNumber(transaction, aircraft.id, aircraft.tailNumber),
        description: narrative,
        reportedAt,
        reportedById: actorId,
        severity,
        status: DiscrepancyStatus.OPEN,
        title,
      },
    });

    const entry = await transaction.aircraftLogbookEntry.create({
      data: {
        aircraftId: aircraft.id,
        category,
        createdById: actorId,
        discrepancyId: discrepancy.id,
        entryNumber: await nextAircraftScopedNumber(transaction, aircraft.id, aircraft.tailNumber, "LB"),
        entryType: AircraftLogbookEntryType.CREW_SQUAWK,
        flightLegId,
        narrative,
        phaseOfFlight,
        reportedAt,
        severity,
        source: AircraftLogbookEntrySource.CREW,
        status: AircraftLogbookEntryStatus.OPEN,
        title,
        updatedById: actorId,
      },
    });

    await transaction.aircraftLogbookAuditEvent.create({
      data: {
        actorId,
        aircraftId: aircraft.id,
        entryId: entry.id,
        eventType: AircraftLogbookAuditEventType.CREATED,
        message: "Crew squawk created from crew portal.",
        metadata: { flightLegId },
      },
    });

    return { aircraftId: aircraft.id, entryId: entry.id };
  });

  if (file) {
    await uploadAircraftLogbookAttachment({
      actorId,
      aircraftId: result.aircraftId,
      entryId: result.entryId,
      file,
    });
  }

  return result;
}

export async function createCorrectiveActionDraft({
  actorId,
  aircraftId,
  formData,
}: {
  actorId: string;
  aircraftId: string;
  formData: FormData;
}) {
  const title = requiredText(formData.get("title"), "Corrective action title");
  const narrative = requiredText(formData.get("narrative"), "Work performed");
  const discrepancyId = requiredText(formData.get("discrepancyId"), "Open write-up");
  const requiresIndependentInspection = formData.get("requiresIndependentInspection") === "on";

  return prisma.$transaction(async (transaction) => {
    const aircraft = await transaction.aircraft.findUnique({
      where: { id: aircraftId },
      select: { id: true, tailNumber: true },
    });

    if (!aircraft) {
      throw new AircraftLogbookError("Aircraft was not found.");
    }

    const discrepancy = await transaction.discrepancy.findFirst({
      where: {
        aircraftId,
        id: discrepancyId,
        status: { in: [DiscrepancyStatus.OPEN, DiscrepancyStatus.DEFERRED] },
      },
      select: { id: true },
    });

    if (!discrepancy) {
      throw new AircraftLogbookError("Select an open or deferred write-up for corrective maintenance.");
    }

    const maintenanceEvent = await transaction.maintenanceEvent.create({
      data: {
        aircraftId,
        description: narrative,
        discrepancyId,
        eventType: MaintenanceEventType.REPAIR,
        maintenanceNumber: await nextMaintenanceNumber(transaction, aircraftId, aircraft.tailNumber),
        manualReference: optionalText(formData.get("manualReference")),
        performedByName: optionalText(formData.get("performedByName")),
        providerName: optionalText(formData.get("providerName")),
        requiresIndependentInspection,
        startedAt: new Date(),
        status: MaintenanceEventStatus.IN_PROGRESS,
        taskReference: optionalText(formData.get("taskReference")),
        workPerformed: narrative,
      },
    });

    const entry = await transaction.aircraftLogbookEntry.create({
      data: {
        aircraftId,
        approvedByName: optionalText(formData.get("approvedByName")),
        category: optionalText(formData.get("category"))?.toUpperCase() ?? "CORRECTIVE_ACTION",
        createdById: actorId,
        discrepancyId,
        entryNumber: await nextAircraftScopedNumber(transaction, aircraftId, aircraft.tailNumber, "LB"),
        entryType: AircraftLogbookEntryType.CORRECTIVE_ACTION,
        maintenanceEventId: maintenanceEvent.id,
        manualReference: optionalText(formData.get("manualReference")),
        narrative,
        performedByName: optionalText(formData.get("performedByName")),
        requiresIndependentInspection,
        source: AircraftLogbookEntrySource.MAINTENANCE,
        status: AircraftLogbookEntryStatus.DRAFT,
        taskReference: optionalText(formData.get("taskReference")),
        title,
        updatedById: actorId,
      },
    });

    await transaction.aircraftLogbookAuditEvent.create({
      data: {
        actorId,
        aircraftId,
        entryId: entry.id,
        eventType: AircraftLogbookAuditEventType.CREATED,
        message: "Maintenance corrective action draft created.",
      },
    });

    return entry;
  });
}

async function completeScheduledProgramWorkFromSignature(
  transaction: Prisma.TransactionClient,
  entry: {
    id: string;
    maintenanceComplianceStateId: string | null;
    maintenanceEventId: string | null;
    maintenanceProgramTaskId: string | null;
  },
  signedAt: Date,
  actorId: string,
) {
  if (!entry.maintenanceProgramTaskId || !entry.maintenanceComplianceStateId) {
    return;
  }

  const task = await transaction.maintenanceProgramTask.findUnique({
    where: { id: entry.maintenanceProgramTaskId },
    select: {
      intervalDays: true,
      intervalMonths: true,
      intervalAirframeHours: true,
      intervalCycles: true,
    },
  });

  if (!task) {
    return;
  }

  const currentState = await transaction.maintenanceComplianceState.findUnique({
    where: { id: entry.maintenanceComplianceStateId },
    select: {
      lastCompletedAirframeHours: true,
      lastCompletedCycles: true,
    },
  });

  let nextDueAt: Date | null = null;

  if (task.intervalMonths || task.intervalDays) {
    nextDueAt = new Date(signedAt);

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

  if (entry.maintenanceEventId) {
    await transaction.maintenanceEvent.update({
      where: { id: entry.maintenanceEventId },
      data: {
        approvedById: actorId,
        completedAt: signedAt,
        maintenanceApprovedAt: signedAt,
        status: MaintenanceEventStatus.COMPLETED,
      },
    });
  }

  await transaction.maintenanceComplianceState.update({
    where: { id: entry.maintenanceComplianceStateId },
    data: {
      lastCompletedAt: signedAt,
      nextDueAirframeHours,
      nextDueAt,
      nextDueCycles,
      status: MaintenanceComplianceStatus.CURRENT,
      updatedById: actorId,
    },
  });
}

export async function signAircraftLogbookEntry({
  actorId,
  actorRole,
  entryId,
  formData,
}: {
  actorId: string;
  actorRole: UserRole;
  entryId: string;
  formData: FormData;
}) {
  if (!maintenanceAuthorityRoles.has(actorRole)) {
    throw new AircraftLogbookError("Only authorized maintenance users can sign logbook records.");
  }

  const signerName = requiredText(formData.get("signerName"), "Signer name");
  const purpose = (optionalText(formData.get("purpose")) ??
    AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL) as AircraftLogbookSignaturePurpose;
  const allowedPurposes = Object.values(AircraftLogbookSignaturePurpose);

  if (!allowedPurposes.includes(purpose)) {
    throw new AircraftLogbookError("Signature purpose is not valid.");
  }

  try {
    return await prisma.$transaction(async (transaction) => {
    const entry = await transaction.aircraftLogbookEntry.findUnique({
      where: { id: entryId },
      include: {
        signatures: {
          orderBy: { signedAt: "asc" },
        },
      },
    });

    if (!entry) {
      throw new AircraftLogbookError("Logbook entry was not found.");
    }

    if (
      purpose !== AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL &&
      purpose !== AircraftLogbookSignaturePurpose.INSPECTION_APPROVAL
    ) {
      throw new AircraftLogbookError("Use maintenance approval or independent inspection approval for this workflow.");
    }

    if (entry.signatures.some((signature) => signature.purpose === purpose)) {
      throw new AircraftLogbookError("This approval has already been signed.");
    }

    const authorityProfile = await transaction.maintenanceAuthorityProfile.findFirst({
      where: { isActive: true, userId: actorId },
      orderBy: { updatedAt: "desc" },
    });
    if (!authorityProfile) {
      throw new AircraftLogbookError("An active maintenance authority profile is required.");
    }
    if (signerName !== authorityProfile.legalName) {
      throw new AircraftLogbookError("Signer name must match the active maintenance authority profile.");
    }

    const maintenanceSignature = entry.signatures.find(
      (signature) => signature.purpose === AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL,
    );
    if (purpose === AircraftLogbookSignaturePurpose.INSPECTION_APPROVAL) {
      if (!entry.requiresIndependentInspection) {
        throw new AircraftLogbookError("This entry is not designated for independent inspection.");
      }
      if (!maintenanceSignature) {
        throw new AircraftLogbookError("Maintenance approval must be signed before independent inspection.");
      }
      if (maintenanceSignature.signerUserId === actorId) {
        throw new AircraftLogbookError("The independent inspector must be different from the maintenance signer.");
      }
    } else if (entry.lockedAt) {
      throw new AircraftLogbookError("Signed logbook entries are locked. Create an amendment instead.");
    }

    const snapshot = logbookEntrySnapshot(entry);
    const signedContentHash = hashSnapshot(snapshot);
    const signedAt = new Date();

    const signature = await transaction.aircraftLogbookSignature.create({
      data: {
        authorityProfileId: authorityProfile.id,
        authorizationBasis: authorityProfile.authorizationBasis,
        certificateNumber: authorityProfile.certificateNumber,
        certificateType: authorityProfile.certificateType,
        entryId,
        intentText: requiredText(formData.get("intentText"), "Signature intent"),
        purpose,
        signedAt,
        signedContentHash,
        signedSnapshot: snapshot,
        signerName,
        signerUserId: actorId,
      },
    });

    await transaction.aircraftLogbookEntry.update({
      where: { id: entryId },
      data: {
        approvedByCertificateNumber:
          purpose === AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL
            ? authorityProfile.certificateNumber
            : entry.approvedByCertificateNumber,
        approvedByCertificateType:
          purpose === AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL
            ? authorityProfile.certificateType
            : entry.approvedByCertificateType,
        approvedByName:
          purpose === AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL
            ? signerName
            : entry.approvedByName,
        lockedAt: entry.lockedAt ?? signedAt,
        signedContentHash,
        signedSnapshot: snapshot,
        status:
          purpose === AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL &&
          entry.requiresIndependentInspection
            ? AircraftLogbookEntryStatus.READY_FOR_SIGNATURE
            : AircraftLogbookEntryStatus.SIGNED,
        updatedById: actorId,
      },
    });

    if (purpose === AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL) {
      await completeScheduledProgramWorkFromSignature(transaction, entry, signedAt, actorId);
      if (entry.maintenanceEventId) {
        const event = await transaction.maintenanceEvent.update({
          where: { id: entry.maintenanceEventId },
          data: {
            approvedById: actorId,
            completedAt: signedAt,
            maintenanceApprovedAt: signedAt,
            status: MaintenanceEventStatus.COMPLETED,
          },
        });
        if (event.discrepancyId && !entry.requiresIndependentInspection) {
          await transaction.discrepancy.updateMany({
            where: {
              id: event.discrepancyId,
              status: { in: [DiscrepancyStatus.OPEN, DiscrepancyStatus.DEFERRED] },
            },
            data: {
              activeDeferralId: null,
              correctiveMaintenanceEventId: event.id,
              correctiveSummary: entry.narrative,
              status: DiscrepancyStatus.CORRECTED_PENDING_RTS,
            },
          });
        }
      }
    } else if (entry.maintenanceEventId) {
      const event = await transaction.maintenanceEvent.update({
        where: { id: entry.maintenanceEventId },
        data: {
          inspectedById: actorId,
          inspectionApprovedAt: signedAt,
        },
      });
      if (event.discrepancyId) {
        await transaction.discrepancy.updateMany({
          where: {
            id: event.discrepancyId,
            status: { in: [DiscrepancyStatus.OPEN, DiscrepancyStatus.DEFERRED] },
          },
          data: {
            activeDeferralId: null,
            correctiveMaintenanceEventId: event.id,
            correctiveSummary: entry.narrative,
            status: DiscrepancyStatus.CORRECTED_PENDING_RTS,
          },
        });
      }
    }

    await transaction.aircraftLogbookAuditEvent.create({
      data: {
        actorId,
        aircraftId: entry.aircraftId,
        entryId,
        eventType: AircraftLogbookAuditEventType.SIGNED,
        message: `Logbook entry signed for ${purpose.replaceAll("_", " ").toLowerCase()}.`,
        metadata: { signatureId: signature.id, signedContentHash },
      },
    });

      return signature;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new AircraftLogbookError(
        "This approval was signed or changed concurrently. Refresh the logbook entry before trying again.",
      );
    }
    throw error;
  }
}

export async function uploadAircraftLogbookAttachment({
  actorId,
  aircraftId,
  entryId,
  file,
}: {
  actorId: string;
  aircraftId: string;
  entryId: string;
  file: File;
}) {
  const entry = await prisma.aircraftLogbookEntry.findFirst({
    where: { aircraftId, id: entryId },
    select: { id: true, lockedAt: true },
  });

  if (!entry) {
    throw new AircraftLogbookError("Logbook entry was not found.");
  }

  if (entry.lockedAt) {
    throw new AircraftLogbookError("Attachments cannot be added to a locked signed entry in this version.");
  }

  const stored = await storeAircraftLogbookAttachmentFile({ aircraftId, entryId, file });

  try {
    return await prisma.$transaction(async (transaction) => {
      const attachment = await transaction.aircraftLogbookAttachment.create({
        data: {
          aircraftId,
          byteSize: stored.byteSize,
          checksumSha256: stored.checksumSha256,
          contentType: stored.contentType,
          entryId,
          originalFilename: stored.originalFilename,
          storageKey: stored.storageKey,
          storageProvider: stored.storageProvider,
          uploadedById: actorId,
        },
      });

      await transaction.aircraftLogbookAttachmentAccessLog.create({
        data: {
          actorId,
          attachmentId: attachment.id,
          event: AircraftLogbookAttachmentAccessEvent.UPLOADED,
        },
      });

      await transaction.aircraftLogbookAuditEvent.create({
        data: {
          actorId,
          aircraftId,
          entryId,
          eventType: AircraftLogbookAuditEventType.ATTACHMENT_UPLOADED,
          message: "Logbook attachment uploaded.",
          metadata: { attachmentId: attachment.id },
        },
      });

      return attachment;
    });
  } catch (error) {
    await deleteAircraftLogbookAttachmentObject(stored.storageProvider, stored.storageKey);
    throw error;
  }
}

export async function readAircraftLogbookAttachment(attachmentId: string, actorId: string | null) {
  const attachment = await prisma.aircraftLogbookAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment || attachment.deletedAt) {
    throw new AircraftLogbookError("Logbook attachment was not found.");
  }

  const object = await readAircraftLogbookAttachmentObject(
    attachment.storageProvider,
    attachment.storageKey,
  );

  await prisma.aircraftLogbookAttachmentAccessLog.create({
    data: {
      actorId,
      attachmentId,
      event: AircraftLogbookAttachmentAccessEvent.VIEWED,
    },
  });

  await prisma.aircraftLogbookAuditEvent.create({
    data: {
      actorId,
      aircraftId: attachment.aircraftId,
      entryId: attachment.entryId,
      eventType: AircraftLogbookAuditEventType.ATTACHMENT_VIEWED,
      message: "Logbook attachment viewed.",
      metadata: { attachmentId },
    },
  });

  return {
    body: object.body,
    contentType: attachment.contentType,
    attachment,
  };
}

export async function deleteAircraftLogbookAttachment(attachment: AircraftLogbookAttachment, actorId: string) {
  await prisma.$transaction(async (transaction) => {
    await transaction.aircraftLogbookAttachment.update({
      where: { id: attachment.id },
      data: { deletedAt: new Date() },
    });

    await transaction.aircraftLogbookAttachmentAccessLog.create({
      data: {
        actorId,
        attachmentId: attachment.id,
        event: AircraftLogbookAttachmentAccessEvent.DELETED,
      },
    });

    await transaction.aircraftLogbookAuditEvent.create({
      data: {
        actorId,
        aircraftId: attachment.aircraftId,
        entryId: attachment.entryId,
        eventType: AircraftLogbookAuditEventType.ATTACHMENT_DELETED,
        message: "Logbook attachment deleted.",
        metadata: { attachmentId: attachment.id },
      },
    });
  });

  await deleteAircraftLogbookAttachmentObject(attachment.storageProvider, attachment.storageKey);
}

export async function getAircraftLogbookExportPackage(aircraftId: string, actorId: string | null) {
  const aircraft = await prisma.aircraft.findUnique({
    where: { id: aircraftId },
    select: {
      id: true,
      name: true,
      status: true,
      tailNumber: true,
      type: true,
      configurations: {
        orderBy: [{ effectiveStart: "desc" }],
        take: 1,
      },
      logbookEntries: {
        orderBy: [{ reportedAt: "asc" }],
        include: {
          attachments: {
            where: { deletedAt: null },
            select: {
              byteSize: true,
              checksumSha256: true,
              contentType: true,
              createdAt: true,
              id: true,
              originalFilename: true,
            },
          },
          signatures: {
            orderBy: [{ signedAt: "asc" }],
          },
        },
      },
      logbookAuditEvents: {
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  if (!aircraft) {
    throw new AircraftLogbookError("Aircraft was not found.");
  }

  await prisma.aircraftLogbookAuditEvent.create({
    data: {
      actorId,
      aircraftId,
      eventType: AircraftLogbookAuditEventType.EXPORTED,
      message: "Aircraft logbook export generated.",
      metadata: { exportedAt: new Date().toISOString() },
    },
  });

  return {
    aircraft,
    exportedAt: new Date().toISOString(),
    exportType: "AIRCRAFT_LOGBOOK_PACKAGE",
    notice:
      "This package is a product export. Official regulatory-record use depends on operator manual alignment and FAA acceptance where required.",
  };
}
