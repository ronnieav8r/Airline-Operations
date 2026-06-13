"use server";

import {
  AssignmentStatus,
  FaaFlightPlanStatus,
  FlightLegStatus,
  FlightPhaseStatus,
  FlightStatus,
  OperatorManifestMode,
  Prisma,
  ReleaseAuditEventType,
  ReleaseFindingStatus,
  ReleasePackageEvidenceType,
  ReleasePackageStatus,
  ReleaseStatus,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { getReleaseEvidenceDetail } from "@/lib/release-evidence-detail-queries";
import {
  getReleaseSnapshotStatus,
  getReleaseReadinessItems,
  mapReadinessClassificationToSeverity,
  mapReleaseReadinessFindingStatus,
} from "@/lib/release-readiness";
import {
  isPostflightFuelReady,
  isPreflightComplete,
  resolveOperatorReleaseSetting,
} from "@/lib/flight-workflow";

class FlightLegFormError extends Error {}

type SnapshotCaptureMode = "strict" | "best-effort";

type SnapshotSummaryContext =
  | {
      source: "explicit-preview";
    }
  | {
      attemptedAction: string;
      attemptedReleaseStatus: ReleaseStatus;
      actorRole: UserRole;
      actorUserId: string;
      capturedBeforeStatus: ReleaseStatus | null;
      source: "release-attempt";
    };

type AttemptSnapshotResult = {
  capturedBeforeStatus: ReleaseStatus | null;
  skippedReason: string | null;
  snapshotId: string | null;
};

type PackageEvidenceLinkInput = {
  evidenceType: ReleasePackageEvidenceType;
  evidenceId: string | null;
  evidenceLabel: string;
  statusLabel: string | null;
  isRequired: boolean;
};

type FlightLegFormInput = {
  flightNumber: string;
  aircraftId: string;
  departureStationId: string;
  arrivalStationId: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  operatorId: string;
  operatingAuthorityId: string;
  authorityRevisionId: string;
  controllingEntity: string;
  notes: string | null;
  controlNotes: string | null;
};

function getRequiredText(formData: FormData, key: string, label: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FlightLegFormError(`${label} is required.`);
  }

  return value.trim();
}

function getOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDateTime(value: string, label: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new FlightLegFormError(`${label} must be a valid date and time.`);
  }

  return parsed;
}

function parseFlightLegForm(formData: FormData): FlightLegFormInput {
  const scheduledDeparture = parseDateTime(
    getRequiredText(formData, "scheduledDeparture", "Scheduled departure"),
    "Scheduled departure",
  );
  const scheduledArrival = parseDateTime(
    getRequiredText(formData, "scheduledArrival", "Scheduled arrival"),
    "Scheduled arrival",
  );

  if (scheduledArrival.getTime() <= scheduledDeparture.getTime()) {
    throw new FlightLegFormError("Scheduled arrival must be after scheduled departure.");
  }

  return {
    flightNumber: getRequiredText(formData, "flightNumber", "Flight number").toUpperCase(),
    aircraftId: getRequiredText(formData, "aircraftId", "Aircraft"),
    departureStationId: getRequiredText(formData, "departureStationId", "Departure station"),
    arrivalStationId: getRequiredText(formData, "arrivalStationId", "Arrival station"),
    scheduledDeparture,
    scheduledArrival,
    operatorId: getRequiredText(formData, "operatorId", "Operator"),
    operatingAuthorityId: getRequiredText(formData, "operatingAuthorityId", "Operating authority"),
    authorityRevisionId: getRequiredText(formData, "authorityRevisionId", "Authority revision"),
    controllingEntity: getRequiredText(formData, "controllingEntity", "Controlling entity"),
    notes: getOptionalText(formData, "notes"),
    controlNotes: getOptionalText(formData, "controlNotes"),
  };
}

function buildTripNumber(input: Pick<FlightLegFormInput, "flightNumber" | "scheduledDeparture">) {
  const dateKey = input.scheduledDeparture.toISOString().slice(0, 10).replaceAll("-", "");
  const flightKey = input.flightNumber.replace(/\s+/g, "-");

  return `TRIP-${flightKey}-${dateKey}`;
}

function mapFlightLegStatusToFlightStatus(status: FlightLegStatus): FlightStatus {
  if (status === FlightLegStatus.CANCELLED) {
    return FlightStatus.CANCELLED;
  }

  if (status === FlightLegStatus.COMPLETE) {
    return FlightStatus.COMPLETE;
  }

  if (status === FlightLegStatus.ENROUTE) {
    return FlightStatus.ENROUTE;
  }

  if (status === FlightLegStatus.DELAYED) {
    return FlightStatus.DELAYED;
  }

  return FlightStatus.SCHEDULED;
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function encodeError(error: unknown): string {
  if (error instanceof FlightLegFormError) {
    return encodeURIComponent(error.message);
  }

  if (isUniqueConflict(error)) {
    return encodeURIComponent(
      "A flight already exists with that flight number and scheduled departure.",
    );
  }

  throw error;
}

async function validateReferences(tx: Prisma.TransactionClient, input: FlightLegFormInput) {
  const [aircraft, departureStation, arrivalStation, operator, operatingAuthority, authorityRevision] =
    await Promise.all([
      tx.aircraft.findUnique({ where: { id: input.aircraftId }, select: { id: true } }),
      tx.station.findUnique({ where: { id: input.departureStationId }, select: { id: true } }),
      tx.station.findUnique({ where: { id: input.arrivalStationId }, select: { id: true } }),
      tx.operator.findUnique({ where: { id: input.operatorId }, select: { id: true } }),
      tx.operatingAuthority.findUnique({
        where: { id: input.operatingAuthorityId },
        select: { id: true, operatorId: true },
      }),
      tx.authorityRevision.findUnique({
        where: { id: input.authorityRevisionId },
        select: { id: true, operatingAuthorityId: true },
      }),
    ]);

  if (!aircraft) {
    throw new FlightLegFormError("Selected aircraft was not found.");
  }

  if (!departureStation) {
    throw new FlightLegFormError("Selected departure station was not found.");
  }

  if (!arrivalStation) {
    throw new FlightLegFormError("Selected arrival station was not found.");
  }

  if (!operator) {
    throw new FlightLegFormError("Selected operator was not found.");
  }

  if (!operatingAuthority) {
    throw new FlightLegFormError("Selected operating authority was not found.");
  }

  if (operatingAuthority.operatorId !== input.operatorId) {
    throw new FlightLegFormError("Selected operating authority does not belong to the operator.");
  }

  if (!authorityRevision) {
    throw new FlightLegFormError("Selected authority revision was not found.");
  }

  if (authorityRevision.operatingAuthorityId !== input.operatingAuthorityId) {
    throw new FlightLegFormError(
      "Selected authority revision does not belong to the operating authority.",
    );
  }
}

async function ensureTripOrMission(
  tx: Prisma.TransactionClient,
  input: FlightLegFormInput,
  existingTripOrMissionId?: string | null,
) {
  if (existingTripOrMissionId) {
    return tx.tripOrMission.update({
      where: { id: existingTripOrMissionId },
      data: {
        operatorId: input.operatorId,
        tripNumber: buildTripNumber(input),
        requestedStart: input.scheduledDeparture,
        requestedEnd: input.scheduledArrival,
        notes: input.notes,
      },
      select: { id: true },
    });
  }

  return tx.tripOrMission.upsert({
    where: {
      operatorId_tripNumber: {
        operatorId: input.operatorId,
        tripNumber: buildTripNumber(input),
      },
    },
    update: {
      requestedStart: input.scheduledDeparture,
      requestedEnd: input.scheduledArrival,
      notes: input.notes,
    },
    create: {
      operatorId: input.operatorId,
      tripNumber: buildTripNumber(input),
      requestedStart: input.scheduledDeparture,
      requestedEnd: input.scheduledArrival,
      notes: input.notes,
    },
    select: { id: true },
  });
}

async function assertNoDuplicateLegacyFlight(
  tx: Prisma.TransactionClient,
  input: FlightLegFormInput,
  allowedFlightId?: string | null,
) {
  const duplicate = await tx.flight.findUnique({
    where: {
      flightNumber_scheduledDeparture: {
        flightNumber: input.flightNumber,
        scheduledDeparture: input.scheduledDeparture,
      },
    },
    select: { id: true },
  });

  if (duplicate && duplicate.id !== allowedFlightId) {
    throw new FlightLegFormError(
      "A flight already exists with that flight number and scheduled departure.",
    );
  }
}

async function rebuildTurnaroundLinks(
  tx: Prisma.TransactionClient,
  flightLegId: string,
  aircraftId: string,
  scheduledDeparture: Date,
  scheduledArrival: Date,
) {
  await tx.turnaroundLink.deleteMany({
    where: {
      OR: [{ inboundFlightLegId: flightLegId }, { outboundFlightLegId: flightLegId }],
    },
  });

  const activeAssignmentFilter = {
    aircraftId,
    status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
  };

  const [inbound, outbound] = await Promise.all([
    tx.flightLeg.findFirst({
      where: {
        id: { not: flightLegId },
        scheduledArrival: { lte: scheduledDeparture },
        aircraftAssignments: { some: activeAssignmentFilter },
      },
      orderBy: { scheduledArrival: "desc" },
      select: { id: true },
    }),
    tx.flightLeg.findFirst({
      where: {
        id: { not: flightLegId },
        scheduledDeparture: { gte: scheduledArrival },
        aircraftAssignments: { some: activeAssignmentFilter },
      },
      orderBy: { scheduledDeparture: "asc" },
      select: { id: true },
    }),
  ]);

  if (inbound) {
    await tx.turnaroundLink.create({
      data: {
        inboundFlightLegId: inbound.id,
        outboundFlightLegId: flightLegId,
        notes: "Auto-linked by FlightLeg create/edit workflow.",
      },
    });
  }

  if (outbound) {
    await tx.turnaroundLink.create({
      data: {
        inboundFlightLegId: flightLegId,
        outboundFlightLegId: outbound.id,
        notes: "Auto-linked by FlightLeg create/edit workflow.",
      },
    });
  }
}

async function syncCrewLegAssignments(
  tx: Prisma.TransactionClient,
  flightLegId: string,
  legacyFlightId: string,
) {
  const flight = await tx.flight.findUnique({
    where: { id: legacyFlightId },
    select: {
      aircraftId: true,
      scheduledDeparture: true,
    },
  });

  if (!flight) {
    throw new FlightLegFormError("Legacy Flight was not found for crew snapshot sync.");
  }

  const sourceAssignments = await tx.aircraftCrewAssignment.findMany({
    where: {
      aircraftId: flight.aircraftId,
      isActive: true,
      startsAt: { lte: flight.scheduledDeparture },
      OR: [{ endsAt: null }, { endsAt: { gt: flight.scheduledDeparture } }],
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
        status: AssignmentStatus.PLANNED,
        reportTime: flight.scheduledDeparture,
        releaseTime: null,
        sourceAircraftCrewAssignmentId: assignment.id,
      },
      create: {
        flightLegId,
        crewMemberId: assignment.crewMemberId,
        seatRole: assignment.seatRole,
        status: AssignmentStatus.PLANNED,
        reportTime: flight.scheduledDeparture,
        sourceAircraftCrewAssignmentId: assignment.id,
      },
    });
  }
}

async function createFlightLeg(input: FlightLegFormInput, currentUserId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    await validateReferences(tx, input);
    await assertNoDuplicateLegacyFlight(tx, input);

    const trip = await ensureTripOrMission(tx, input);
    const legacyFlight = await tx.flight.create({
      data: {
        flightNumber: input.flightNumber,
        aircraftId: input.aircraftId,
        departureStationId: input.departureStationId,
        arrivalStationId: input.arrivalStationId,
        scheduledDeparture: input.scheduledDeparture,
        scheduledArrival: input.scheduledArrival,
        status: FlightStatus.SCHEDULED,
        notes: input.notes,
      },
      select: { id: true },
    });

    const flightLeg = await tx.flightLeg.create({
      data: {
        legacyFlightId: legacyFlight.id,
        tripOrMissionId: trip.id,
        operatorId: input.operatorId,
        operatingAuthorityId: input.operatingAuthorityId,
        authorityRevisionId: input.authorityRevisionId,
        flightNumber: input.flightNumber,
        departureStationId: input.departureStationId,
        arrivalStationId: input.arrivalStationId,
        scheduledDeparture: input.scheduledDeparture,
        scheduledArrival: input.scheduledArrival,
        status: FlightLegStatus.SCHEDULED,
        notes: input.notes,
        aircraftAssignments: {
          create: {
            aircraftId: input.aircraftId,
            status: AssignmentStatus.PLANNED,
            assignedAt: input.scheduledDeparture,
            assignedById: currentUserId,
          },
        },
      },
      select: { id: true },
    });

    const controlRecord = await tx.operationalControlRecord.create({
      data: {
        flightId: legacyFlight.id,
        flightLegId: flightLeg.id,
        operatorId: input.operatorId,
        operatingAuthorityId: input.operatingAuthorityId,
        authorityRevisionId: input.authorityRevisionId,
        controllingEntity: input.controllingEntity,
        controlNotes: input.controlNotes,
        createdById: currentUserId,
      },
      select: { id: true },
    });

    await tx.flightRelease.create({
      data: {
        operationalControlRecordId: controlRecord.id,
        status: ReleaseStatus.PLANNED,
      },
    });

    await syncCrewLegAssignments(tx, flightLeg.id, legacyFlight.id);

    await rebuildTurnaroundLinks(
      tx,
      flightLeg.id,
      input.aircraftId,
      input.scheduledDeparture,
      input.scheduledArrival,
    );

    return flightLeg.id;
  });
}

async function updateFlightLeg(
  flightLegId: string,
  input: FlightLegFormInput,
  currentUserId: string,
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    await validateReferences(tx, input);

    const existing = await tx.flightLeg.findUnique({
      where: { id: flightLegId },
      select: {
        id: true,
        legacyFlightId: true,
        tripOrMissionId: true,
        status: true,
        operationalControlRecord: {
          select: { id: true },
        },
      },
    });

    if (!existing) {
      throw new FlightLegFormError("FlightLeg was not found.");
    }

    await assertNoDuplicateLegacyFlight(tx, input, existing.legacyFlightId);

    const trip = await ensureTripOrMission(tx, input, existing.tripOrMissionId);
    const legacyFlight = existing.legacyFlightId
      ? await tx.flight.update({
          where: { id: existing.legacyFlightId },
          data: {
            flightNumber: input.flightNumber,
            aircraftId: input.aircraftId,
            departureStationId: input.departureStationId,
            arrivalStationId: input.arrivalStationId,
            scheduledDeparture: input.scheduledDeparture,
            scheduledArrival: input.scheduledArrival,
            status: mapFlightLegStatusToFlightStatus(existing.status),
            notes: input.notes,
          },
          select: { id: true },
        })
      : await tx.flight.create({
          data: {
            flightNumber: input.flightNumber,
            aircraftId: input.aircraftId,
            departureStationId: input.departureStationId,
            arrivalStationId: input.arrivalStationId,
            scheduledDeparture: input.scheduledDeparture,
            scheduledArrival: input.scheduledArrival,
            status: mapFlightLegStatusToFlightStatus(existing.status),
            notes: input.notes,
          },
          select: { id: true },
        });

    await tx.flightLeg.update({
      where: { id: flightLegId },
      data: {
        legacyFlightId: legacyFlight.id,
        tripOrMissionId: trip.id,
        operatorId: input.operatorId,
        operatingAuthorityId: input.operatingAuthorityId,
        authorityRevisionId: input.authorityRevisionId,
        flightNumber: input.flightNumber,
        departureStationId: input.departureStationId,
        arrivalStationId: input.arrivalStationId,
        scheduledDeparture: input.scheduledDeparture,
        scheduledArrival: input.scheduledArrival,
        notes: input.notes,
      },
    });

    await tx.aircraftAssignment.updateMany({
      where: {
        flightLegId,
        aircraftId: { not: input.aircraftId },
        status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
      },
      data: {
        status: AssignmentStatus.RELIEVED,
        releasedAt: new Date(),
      },
    });

    await tx.aircraftAssignment.upsert({
      where: {
        flightLegId_aircraftId: {
          flightLegId,
          aircraftId: input.aircraftId,
        },
      },
      update: {
        status: AssignmentStatus.PLANNED,
        assignedAt: input.scheduledDeparture,
        releasedAt: null,
      },
      create: {
        flightLegId,
        aircraftId: input.aircraftId,
        status: AssignmentStatus.PLANNED,
        assignedAt: input.scheduledDeparture,
        assignedById: currentUserId,
      },
    });

    if (existing.operationalControlRecord) {
      await tx.operationalControlRecord.update({
        where: { id: existing.operationalControlRecord.id },
        data: {
          flightId: legacyFlight.id,
          flightLegId,
          operatorId: input.operatorId,
          operatingAuthorityId: input.operatingAuthorityId,
          authorityRevisionId: input.authorityRevisionId,
          controllingEntity: input.controllingEntity,
          controlNotes: input.controlNotes,
          createdById: currentUserId,
        },
      });

      await tx.flightRelease.upsert({
        where: { operationalControlRecordId: existing.operationalControlRecord.id },
        update: {},
        create: {
          operationalControlRecordId: existing.operationalControlRecord.id,
          status: ReleaseStatus.PLANNED,
        },
      });
    } else {
      const controlRecord = await tx.operationalControlRecord.create({
        data: {
          flightId: legacyFlight.id,
          flightLegId,
          operatorId: input.operatorId,
          operatingAuthorityId: input.operatingAuthorityId,
          authorityRevisionId: input.authorityRevisionId,
          controllingEntity: input.controllingEntity,
          controlNotes: input.controlNotes,
          createdById: currentUserId,
        },
        select: { id: true },
      });

      await tx.flightRelease.create({
        data: {
          operationalControlRecordId: controlRecord.id,
          status: ReleaseStatus.PLANNED,
        },
      });
    }

    await syncCrewLegAssignments(tx, flightLegId, legacyFlight.id);

    await rebuildTurnaroundLinks(
      tx,
      flightLegId,
      input.aircraftId,
      input.scheduledDeparture,
      input.scheduledArrival,
    );

    return flightLegId;
  });
}

function revalidateFlightLegWorkflowPaths() {
  revalidatePath("/");
  revalidatePath("/operations-control");
  revalidatePath("/flights");
  revalidatePath("/scheduling");
  revalidatePath("/aircraft");
  revalidatePath("/crew");
  revalidatePath("/api/health");
  revalidatePath("/internal/flightleg-parity");
}

function revalidateSingleFlightLegWorkflowPaths(flightLegId: string) {
  revalidateFlightLegWorkflowPaths();
  revalidatePath(`/operations-control/${flightLegId}`);
}

function parseFaaFlightPlanStatus(value: FormDataEntryValue | null): FaaFlightPlanStatus {
  if (
    value === FaaFlightPlanStatus.UNKNOWN ||
    value === FaaFlightPlanStatus.FILED ||
    value === FaaFlightPlanStatus.NOT_FILED ||
    value === FaaFlightPlanStatus.NOT_APPLICABLE
  ) {
    return value;
  }

  throw new FlightLegFormError("FAA flight-plan status is invalid.");
}

function parseRequiredDateTimeFormValue(formData: FormData, key: string, label: string): Date {
  return parseDateTime(getRequiredText(formData, key, label), label);
}

function assertChronologicalTimes(times: {
  inTime: Date;
  offTime: Date;
  onTime: Date;
  outTime: Date;
}) {
  if (times.offTime.getTime() < times.outTime.getTime()) {
    throw new FlightLegFormError("OFF time must be after OUT time.");
  }

  if (times.onTime.getTime() < times.offTime.getTime()) {
    throw new FlightLegFormError("ON time must be after OFF time.");
  }

  if (times.inTime.getTime() < times.onTime.getTime()) {
    throw new FlightLegFormError("IN time must be after ON time.");
  }
}

export async function updateFlightPlanBasisAction(flightLegId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH, UserRole.CREW]);

  try {
    const faaFlightPlanStatus = parseFaaFlightPlanStatus(formData.get("faaFlightPlanStatus"));

    await prisma.flightLeg.update({
      where: { id: flightLegId },
      data: { faaFlightPlanStatus },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}?releaseError=${encodeError(error)}`);
  }

  revalidateSingleFlightLegWorkflowPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}`);
}

export async function completePreflightAction(flightLegId: string, formData: FormData) {
  const currentUser = await requireRole([
    UserRole.ADMIN,
    UserRole.OPS,
    UserRole.DISPATCH,
    UserRole.CREW,
  ]);

  try {
    const flightLeg = await prisma.flightLeg.findUnique({
      where: { id: flightLegId },
      select: {
        fuelEvents: {
          orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
          select: {
            eventType: true,
            fueledReady: true,
            fuelOnboardLbs: true,
          },
        },
        operator: {
          select: {
            releaseSetting: {
              select: {
                dispatcherEnabled: true,
                manifestMode: true,
              },
            },
          },
        },
        preflightRecord: {
          select: {
            status: true,
            manifestVerified: true,
          },
        },
        weightBalanceRuns: {
          orderBy: { createdAt: "desc" },
          select: { status: true },
          take: 1,
        },
      },
    });

    if (!flightLeg) {
      throw new FlightLegFormError("FlightLeg was not found.");
    }

    const releaseSetting = resolveOperatorReleaseSetting(flightLeg.operator.releaseSetting);
    const manifestVerified =
      releaseSetting.manifestMode === OperatorManifestMode.PREFLIGHT_VERIFY
        ? formData.get("manifestVerified") === "on"
        : false;
    const candidateRecord = {
      manifestVerified,
      status: FlightPhaseStatus.COMPLETE,
    };

    if (
      !isPreflightComplete({
        fuelEvents: flightLeg.fuelEvents,
        manifestMode: releaseSetting.manifestMode,
        preflightRecord: candidateRecord,
        weightBalanceStatus: flightLeg.weightBalanceRuns[0]?.status ?? null,
      })
    ) {
      throw new FlightLegFormError(
        "Preflight requires release fuel ready, calculated or approved W&B, and manifest verification when configured.",
      );
    }

    await prisma.flightPreflightRecord.upsert({
      where: { flightLegId },
      create: {
        completedAt: new Date(),
        completedById: currentUser.id,
        flightLegId,
        manifestNotes: getOptionalText(formData, "manifestNotes"),
        manifestVerified,
        notes: getOptionalText(formData, "notes"),
        status: FlightPhaseStatus.COMPLETE,
      },
      update: {
        completedAt: new Date(),
        completedById: currentUser.id,
        manifestNotes: getOptionalText(formData, "manifestNotes"),
        manifestVerified,
        notes: getOptionalText(formData, "notes"),
        status: FlightPhaseStatus.COMPLETE,
      },
    });
  } catch (error) {
    redirect(`/operations-control/${flightLegId}?releaseError=${encodeError(error)}`);
  }

  revalidateSingleFlightLegWorkflowPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}`);
}

export async function completePostflightAction(flightLegId: string, formData: FormData) {
  const currentUser = await requireRole([
    UserRole.ADMIN,
    UserRole.OPS,
    UserRole.DISPATCH,
    UserRole.CREW,
  ]);

  try {
    const outTime = parseRequiredDateTimeFormValue(formData, "outTime", "OUT time");
    const offTime = parseRequiredDateTimeFormValue(formData, "offTime", "OFF time");
    const onTime = parseRequiredDateTimeFormValue(formData, "onTime", "ON time");
    const inTime = parseRequiredDateTimeFormValue(formData, "inTime", "IN time");
    const delayNotes = getOptionalText(formData, "delayNotes");
    const notes = getOptionalText(formData, "notes");

    assertChronologicalTimes({ inTime, offTime, onTime, outTime });

    const flightLeg = await prisma.flightLeg.findUnique({
      where: { id: flightLegId },
      select: {
        fuelEvents: {
          orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
          select: {
            eventType: true,
            fueledReady: true,
            fuelOnboardLbs: true,
          },
        },
        status: true,
      },
    });

    if (!flightLeg) {
      throw new FlightLegFormError("FlightLeg was not found.");
    }

    if (flightLeg.status === FlightLegStatus.DELAYED && !delayNotes) {
      throw new FlightLegFormError("Delay notes are required for delayed flights.");
    }

    if (!isPostflightFuelReady(flightLeg.fuelEvents)) {
      throw new FlightLegFormError("Postflight requires landing/postflight fuel.");
    }

    await prisma.$transaction([
      prisma.flightPostflightRecord.upsert({
        where: { flightLegId },
        create: {
          completedAt: new Date(),
          completedById: currentUser.id,
          delayNotes,
          flightLegId,
          inTime,
          notes,
          offTime,
          onTime,
          outTime,
          status: FlightPhaseStatus.COMPLETE,
        },
        update: {
          completedAt: new Date(),
          completedById: currentUser.id,
          delayNotes,
          inTime,
          notes,
          offTime,
          onTime,
          outTime,
          status: FlightPhaseStatus.COMPLETE,
        },
      }),
      prisma.flightLeg.update({
        where: { id: flightLegId },
        data: {
          actualArrival: onTime,
          actualDeparture: offTime,
        },
      }),
    ]);
  } catch (error) {
    redirect(`/operations-control/${flightLegId}?releaseError=${encodeError(error)}`);
  }

  revalidateSingleFlightLegWorkflowPaths(flightLegId);
  redirect(`/operations-control/${flightLegId}`);
}

function packageDateKey(date: Date): string {
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function buildPackageNumber(flightNumber: string | null, scheduledDeparture: Date): string {
  const safeFlightNumber = (flightNumber ?? "UNNUMBERED").replace(/[^A-Z0-9-]/gi, "").toUpperCase();

  return `PKG-${safeFlightNumber}-${packageDateKey(scheduledDeparture)}-${Date.now().toString(36).toUpperCase()}`;
}

function packageEvidenceLink(
  evidenceType: ReleasePackageEvidenceType,
  evidenceLabel: string,
  evidenceId: string | null,
  statusLabel: string | null,
  isRequired = true,
): PackageEvidenceLinkInput {
  return {
    evidenceType,
    evidenceId,
    evidenceLabel,
    statusLabel,
    isRequired,
  };
}

export async function createFlightLegAction(formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);
  let flightLegId: string;

  try {
    flightLegId = await createFlightLeg(parseFlightLegForm(formData), currentUser.id);
  } catch (error) {
    redirect(`/operations-control/new?error=${encodeError(error)}`);
  }

  revalidateFlightLegWorkflowPaths();
  redirect(`/operations-control/${flightLegId}`);
}

export async function updateFlightLegAction(flightLegId: string, formData: FormData) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    await updateFlightLeg(flightLegId, parseFlightLegForm(formData), currentUser.id);
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/edit?error=${encodeError(error)}`);
  }

  revalidateFlightLegWorkflowPaths();
  revalidatePath(`/operations-control/${flightLegId}`);
  redirect(`/operations-control/${flightLegId}`);
}

async function setFlightLegReleaseStatus(
  flightLegId: string,
  status: ReleaseStatus,
  currentUserId: string,
) {
  return prisma.$transaction(async (tx) => {
    const controlRecord = await tx.operationalControlRecord.findUnique({
      where: { flightLegId },
      select: { id: true },
    });

    if (!controlRecord) {
      throw new FlightLegFormError("Operational-control record was not found.");
    }

    const release = await tx.flightRelease.upsert({
      where: { operationalControlRecordId: controlRecord.id },
      update: {
        status,
        ...(status === ReleaseStatus.RELEASED
          ? {
              releasedAt: new Date(),
              releasedById: currentUserId,
            }
          : status === ReleaseStatus.CANCELLED
            ? {
                releasedAt: null,
                releasedById: null,
              }
            : {}),
      },
      create: {
        operationalControlRecordId: controlRecord.id,
        status,
        releasedAt: status === ReleaseStatus.RELEASED ? new Date() : null,
        releasedById: status === ReleaseStatus.RELEASED ? currentUserId : null,
      },
      select: { id: true },
    });

    await tx.flightLeg.update({
      where: { id: flightLegId },
      data: {
        status: status === ReleaseStatus.RELEASED ? FlightLegStatus.RELEASED : FlightLegStatus.SCHEDULED,
      },
    });

    return release;
  });
}

function releaseAuditEventType(status: ReleaseStatus): ReleaseAuditEventType {
  if (status === ReleaseStatus.RELEASED) {
    return ReleaseAuditEventType.RELEASE_COMPLETED;
  }

  if (status === ReleaseStatus.CANCELLED) {
    return ReleaseAuditEventType.RELEASE_CANCELLED;
  }

  return ReleaseAuditEventType.RELEASE_VOIDED;
}

function releaseAttemptAction(status: ReleaseStatus): string {
  if (status === ReleaseStatus.RELEASED) {
    return "mark-released";
  }

  if (status === ReleaseStatus.CANCELLED) {
    return "cancel-release";
  }

  return "void-release";
}

function releaseAuditMessage(
  status: ReleaseStatus,
  snapshot: AttemptSnapshotResult,
  reason?: string | null,
): string {
  const action =
    status === ReleaseStatus.RELEASED
      ? "marked released"
      : status === ReleaseStatus.CANCELLED
        ? "cancelled"
        : "voided";
  const reasonNote = reason ? ` Reason: ${reason}` : "";

  if (snapshot.snapshotId) {
    return `FlightLeg release ${action}.${reasonNote} Pre-action readiness snapshot captured.`;
  }

  return `FlightLeg release ${action}.${reasonNote} Pre-action readiness snapshot skipped.`;
}

async function createReadinessSnapshot(
  flightLegId: string,
  summaryContext: SnapshotSummaryContext,
  mode: SnapshotCaptureMode,
  currentUserId: string,
): Promise<AttemptSnapshotResult> {
  try {
    const detail = await getReleaseEvidenceDetail(flightLegId);

    if (!detail) {
      throw new FlightLegFormError("FlightLeg was not found.");
    }

    const flightRelease = detail.operationalControlRecord?.release;
    const capturedBeforeStatus = flightRelease?.status ?? null;

    if (!flightRelease) {
      throw new FlightLegFormError("FlightRelease record was not found.");
    }

    const policyProfile = await prisma.releasePolicyProfile.findFirst({
      where: {
        operatingAuthorityId: detail.operatingAuthority.id,
        isDefault: true,
        effectiveTo: null,
      },
      include: {
        rules: true,
      },
      orderBy: {
        effectiveFrom: "desc",
      },
    });

    if (!policyProfile) {
      throw new FlightLegFormError(
        "Default release policy profile was not found for this operating authority.",
      );
    }

    const policyRulesByKey = new Map(policyProfile.rules.map((rule) => [rule.ruleKey, rule]));
    const readinessItems = getReleaseReadinessItems(detail);
    const findings = readinessItems.map((item) => {
      const policyRule = policyRulesByKey.get(item.ruleKey) ?? null;
      const severity = policyRule?.severity ?? mapReadinessClassificationToSeverity(item.classification);
      const findingStatus = mapReleaseReadinessFindingStatus(item.ready, severity);

      return {
        item,
        policyRule,
        severity,
        status: findingStatus,
      };
    });
    const passCount = findings.filter((finding) => finding.status === ReleaseFindingStatus.PASS).length;
    const failCount = findings.filter((finding) => finding.status === ReleaseFindingStatus.FAIL).length;
    const warningCount = findings.filter(
      (finding) => finding.status === ReleaseFindingStatus.WARNING,
    ).length;
    const notApplicableCount = findings.filter(
      (finding) => finding.status === ReleaseFindingStatus.NOT_APPLICABLE,
    ).length;
    const snapshotStatus = getReleaseSnapshotStatus(failCount, warningCount);

    const snapshot = await prisma.releaseReadinessSnapshot.create({
      data: {
        flightLegId: detail.id,
        flightReleaseId: flightRelease.id,
        policyProfileId: policyProfile.id,
        evaluatedById: currentUserId,
        snapshotStatus,
        authorityClass: policyProfile.authorityClass,
        summary: {
          total: findings.length,
          pass: passCount,
          fail: failCount,
          warning: warningCount,
          notApplicable: notApplicableCount,
          ...summaryContext,
        },
        findings: {
          create: findings.map((finding) => ({
            ruleId: finding.policyRule?.id ?? null,
            ruleKey: finding.item.ruleKey,
            readinessCategory: finding.item.readinessCategory,
            severity: finding.severity,
            status: finding.status,
            isOverridable: finding.policyRule?.isOverridable ?? false,
            summary: finding.item.message,
            evidenceRefType: finding.item.evidenceRefType ?? null,
            evidenceRefId: finding.item.evidenceRefId ?? null,
            details: finding.item.details ?? {},
          })),
        },
      },
      select: { id: true },
    });

    return {
      capturedBeforeStatus,
      skippedReason: null,
      snapshotId: snapshot.id,
    };
  } catch (error) {
    if (mode === "strict") {
      throw error;
    }

    return {
      capturedBeforeStatus:
        summaryContext.source === "release-attempt" ? summaryContext.capturedBeforeStatus : null,
      skippedReason: error instanceof Error ? error.message : "Readiness snapshot capture failed.",
      snapshotId: null,
    };
  }
}

async function captureReleaseAttemptSnapshot(
  flightLegId: string,
  status: ReleaseStatus,
  currentUser: CurrentUser,
): Promise<AttemptSnapshotResult> {
  const detail = await getReleaseEvidenceDetail(flightLegId);
  const capturedBeforeStatus = detail?.operationalControlRecord?.release?.status ?? null;

  return createReadinessSnapshot(
    flightLegId,
    {
      attemptedAction: releaseAttemptAction(status),
      attemptedReleaseStatus: status,
      actorRole: currentUser.role,
      actorUserId: currentUser.id,
      capturedBeforeStatus,
      source: "release-attempt",
    },
    "best-effort",
    currentUser.id,
  );
}

async function createReleaseAuditEvent(
  flightLegId: string,
  releaseId: string,
  status: ReleaseStatus,
  snapshot: AttemptSnapshotResult,
  currentUser: CurrentUser,
  reason?: string | null,
  workstationUser?: CurrentUser | null,
) {
  await prisma.$transaction(async (tx) => {
    await tx.releaseAuditEvent.create({
      data: {
        flightLegId,
        flightReleaseId: releaseId,
        snapshotId: snapshot.snapshotId,
        eventType: releaseAuditEventType(status),
        actorUserId: currentUser.id,
        actorRole: currentUser.role,
        message: releaseAuditMessage(status, snapshot, reason),
        metadata: {
          attemptedAction: releaseAttemptAction(status),
          attemptedReleaseStatus: status,
          actorRole: currentUser.role,
          actorUserId: currentUser.id,
          capturedBeforeStatus: snapshot.capturedBeforeStatus,
          reason: reason ?? null,
          snapshotCaptured: !!snapshot.snapshotId,
          snapshotSkippedReason: snapshot.skippedReason,
          workstationUserId:
            workstationUser && workstationUser.id !== currentUser.id ? workstationUser.id : null,
          workstationUserRole:
            workstationUser && workstationUser.id !== currentUser.id ? workstationUser.role : null,
        },
      },
    });
  });
}

export async function runReleaseAction(
  flightLegId: string,
  status: ReleaseStatus,
  currentUser: CurrentUser,
  options: {
    reason?: string | null;
    redirectTo?: string;
    workstationUser?: CurrentUser | null;
  } = {},
) {
  let attemptSnapshot: AttemptSnapshotResult;
  let release: { id: string };

  try {
    attemptSnapshot = await captureReleaseAttemptSnapshot(flightLegId, status, currentUser);
    release = await setFlightLegReleaseStatus(flightLegId, status, currentUser.id);
    await createReleaseAuditEvent(
      flightLegId,
      release.id,
      status,
      attemptSnapshot,
      currentUser,
      options.reason,
      options.workstationUser,
    );
  } catch (error) {
    const redirectTo = options.redirectTo ?? `/operations-control/${flightLegId}`;
    const separator = redirectTo.includes("?") ? "&" : "?";
    redirect(`${redirectTo}${separator}releaseError=${encodeError(error)}`);
  }

  revalidateFlightLegWorkflowPaths();
  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath("/");
  redirect(options.redirectTo ?? `/operations-control/${flightLegId}`);
}

export async function markFlightLegReleasedAction(flightLegId: string) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);
  await runReleaseAction(flightLegId, ReleaseStatus.RELEASED, currentUser);
}

export async function cancelFlightLegReleaseAction(flightLegId: string) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);
  await runReleaseAction(flightLegId, ReleaseStatus.CANCELLED, currentUser);
}

export async function voidFlightLegReleaseAction(flightLegId: string) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);
  await runReleaseAction(flightLegId, ReleaseStatus.VOIDED, currentUser);
}

export async function captureReleasePreviewSnapshotAction(flightLegId: string) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH]);

  try {
    await createReadinessSnapshot(
      flightLegId,
      { source: "explicit-preview" },
      "strict",
      currentUser.id,
    );
  } catch (error) {
    redirect(`/operations-control/${flightLegId}?snapshotError=${encodeError(error)}`);
  }

  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath("/api/health");
  redirect(`/operations-control/${flightLegId}?snapshotMessage=Preview%20snapshot%20captured.`);
}

async function captureReleasePackage(
  flightLegId: string,
  currentUser: CurrentUser,
  status: ReleasePackageStatus,
) {
  let capturedPackageNumber: string;

  try {
    const flightLeg = await prisma.flightLeg.findUnique({
      where: { id: flightLegId },
      select: {
        id: true,
        flightNumber: true,
        scheduledDeparture: true,
        operationalControlRecord: {
          select: {
            id: true,
            release: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        manifest: {
          select: {
            id: true,
            status: true,
          },
        },
        weightBalanceRuns: {
          where: {
            status: { not: "VOIDED" },
          },
          orderBy: [{ createdAt: "desc" }],
          take: 1,
          select: {
            id: true,
            runLabel: true,
            status: true,
          },
        },
        flightLocatingRecord: {
          select: {
            id: true,
            status: true,
          },
        },
        dispatchPackage: {
          select: {
            id: true,
            status: true,
          },
        },
        readinessSnapshots: {
          orderBy: [{ evaluatedAt: "desc" }],
          take: 1,
          select: {
            id: true,
            snapshotStatus: true,
          },
        },
        aircraftAssignments: {
          where: {
            status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
          },
          orderBy: [{ assignedAt: "desc" }],
          take: 1,
          select: {
            aircraft: {
              select: {
                configurations: {
                  where: { status: "ACTIVE" },
                  orderBy: [{ effectiveStart: "desc" }],
                  take: 1,
                  select: {
                    id: true,
                    configurationLabel: true,
                    status: true,
                  },
                },
                airworthinessReleases: {
                  where: { status: "RELEASED" },
                  orderBy: [{ releasedAt: "desc" }, { createdAt: "desc" }],
                  take: 1,
                  select: {
                    id: true,
                    releaseNumber: true,
                    status: true,
                  },
                },
                discrepancies: {
                  where: {
                    status: { in: ["OPEN", "DEFERRED"] },
                  },
                  select: {
                    id: true,
                  },
                },
                deferrals: {
                  where: { status: "ACTIVE" },
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!flightLeg) {
      throw new FlightLegFormError("FlightLeg was not found.");
    }

    const controlRecord = flightLeg.operationalControlRecord;

    if (!controlRecord) {
      throw new FlightLegFormError("Operational-control record was not found.");
    }

    if (!controlRecord.release) {
      throw new FlightLegFormError("FlightRelease record was not found.");
    }

    const latestWeightBalanceRun = flightLeg.weightBalanceRuns[0] ?? null;
    const latestReadinessSnapshot = flightLeg.readinessSnapshots[0] ?? null;
    const aircraft = flightLeg.aircraftAssignments[0]?.aircraft ?? null;
    const aircraftConfiguration = aircraft?.configurations[0] ?? null;
    const airworthinessRelease = aircraft?.airworthinessReleases[0] ?? null;
    const evidenceLinks = [
      packageEvidenceLink(
        ReleasePackageEvidenceType.OPERATIONAL_CONTROL_RECORD,
        "Operational control",
        controlRecord.id,
        "Linked",
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.FLIGHT_RELEASE,
        "FlightRelease",
        controlRecord.release.id,
        controlRecord.release.status,
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.RELEASE_READINESS_SNAPSHOT,
        "Latest readiness snapshot",
        latestReadinessSnapshot?.id ?? null,
        latestReadinessSnapshot?.snapshotStatus ?? "Missing",
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.MANIFEST,
        "Manifest",
        flightLeg.manifest?.id ?? null,
        flightLeg.manifest?.status ?? "Missing",
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.WEIGHT_BALANCE_RUN,
        latestWeightBalanceRun?.runLabel ?? "Weight and balance",
        latestWeightBalanceRun?.id ?? null,
        latestWeightBalanceRun?.status ?? "Missing",
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.FLIGHT_LOCATING_RECORD,
        "Flight locating",
        flightLeg.flightLocatingRecord?.id ?? null,
        flightLeg.flightLocatingRecord?.status ?? "Missing",
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.DISPATCH_PACKAGE,
        "Dispatch package",
        flightLeg.dispatchPackage?.id ?? null,
        flightLeg.dispatchPackage?.status ?? "Missing",
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.AIRWORTHINESS_RELEASE,
        airworthinessRelease?.releaseNumber ?? "Aircraft airworthiness release",
        airworthinessRelease?.id ?? null,
        airworthinessRelease?.status ?? "Missing",
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.AIRCRAFT_CONFIGURATION,
        aircraftConfiguration?.configurationLabel ?? "Aircraft configuration",
        aircraftConfiguration?.id ?? null,
        aircraftConfiguration?.status ?? "Missing",
        false,
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.DISCREPANCY,
        "Open discrepancies",
        null,
        `${aircraft?.discrepancies.length ?? 0} open/deferred`,
        false,
      ),
      packageEvidenceLink(
        ReleasePackageEvidenceType.DEFERRAL,
        "Active deferrals",
        null,
        `${aircraft?.deferrals.length ?? 0} active`,
        false,
      ),
    ];
    const presentRequiredCount = evidenceLinks.filter(
      (link) => link.isRequired && link.evidenceId,
    ).length;
    const requiredCount = evidenceLinks.filter((link) => link.isRequired).length;
    const releasePackage = await prisma.releasePackage.create({
      data: {
        flightLegId: flightLeg.id,
        operationalControlRecordId: controlRecord.id,
        flightReleaseId: controlRecord.release.id,
        readinessSnapshotId: latestReadinessSnapshot?.id ?? null,
        packageNumber: buildPackageNumber(flightLeg.flightNumber, flightLeg.scheduledDeparture),
        status,
        finalizedAt: status === ReleasePackageStatus.FINALIZED ? new Date() : null,
        capturedById: currentUser.id,
        summary: {
          requiredCount,
          presentRequiredCount,
          source:
            status === ReleasePackageStatus.FINALIZED
              ? "manual-final-capture"
              : "manual-preview-capture",
        },
        evidenceLinks: {
          create: evidenceLinks,
        },
      },
      select: {
        packageNumber: true,
      },
    });
    capturedPackageNumber = releasePackage.packageNumber;

    revalidatePath(`/operations-control/${flightLegId}`);
    revalidatePath("/api/health");
  } catch (error) {
    redirect(`/operations-control/${flightLegId}?packageError=${encodeError(error)}#release-package`);
  }

  return capturedPackageNumber;
}

export async function captureReleasePackagePreviewAction(flightLegId: string) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH]);
  const capturedPackageNumber = await captureReleasePackage(
    flightLegId,
    currentUser,
    ReleasePackageStatus.PREVIEW,
  );

  redirect(
    `/operations-control/${flightLegId}?packageMessage=${encodeURIComponent(
      `ReleasePackage ${capturedPackageNumber} captured.`,
    )}#release-package`,
  );
}

export async function captureReleasePackageFinalAction(flightLegId: string) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const capturedPackageNumber = await captureReleasePackage(
    flightLegId,
    currentUser,
    ReleasePackageStatus.FINALIZED,
  );

  redirect(
    `/operations-control/${flightLegId}?packageMessage=${encodeURIComponent(
      `ReleasePackage ${capturedPackageNumber} finalized.`,
    )}#release-package`,
  );
}
