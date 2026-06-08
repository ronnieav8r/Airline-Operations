"use server";

import {
  AssignmentStatus,
  FlightLegStatus,
  FlightStatus,
  Prisma,
  ReleaseAuditEventType,
  ReleaseFindingStatus,
  ReleaseStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getReleaseEvidenceDetail } from "@/lib/release-evidence-detail-queries";
import {
  getReleaseSnapshotStatus,
  getReleaseReadinessItems,
  mapReadinessClassificationToSeverity,
  mapReleaseReadinessFindingStatus,
} from "@/lib/release-readiness";

class FlightLegFormError extends Error {}

type SnapshotCaptureMode = "strict" | "best-effort";

type SnapshotSummaryContext =
  | {
      source: "explicit-preview";
    }
  | {
      attemptedAction: string;
      attemptedReleaseStatus: ReleaseStatus;
      capturedBeforeStatus: ReleaseStatus | null;
      source: "release-attempt";
    };

type AttemptSnapshotResult = {
  capturedBeforeStatus: ReleaseStatus | null;
  skippedReason: string | null;
  snapshotId: string | null;
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

async function createFlightLeg(input: FlightLegFormInput): Promise<string> {
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

async function updateFlightLeg(flightLegId: string, input: FlightLegFormInput): Promise<string> {
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

export async function createFlightLegAction(formData: FormData) {
  let flightLegId: string;

  try {
    flightLegId = await createFlightLeg(parseFlightLegForm(formData));
  } catch (error) {
    redirect(`/operations-control/new?error=${encodeError(error)}`);
  }

  revalidateFlightLegWorkflowPaths();
  redirect(`/operations-control/${flightLegId}`);
}

export async function updateFlightLegAction(flightLegId: string, formData: FormData) {
  try {
    await updateFlightLeg(flightLegId, parseFlightLegForm(formData));
  } catch (error) {
    redirect(`/operations-control/${flightLegId}/edit?error=${encodeError(error)}`);
  }

  revalidateFlightLegWorkflowPaths();
  revalidatePath(`/operations-control/${flightLegId}`);
  redirect(`/operations-control/${flightLegId}`);
}

async function setFlightLegReleaseStatus(flightLegId: string, status: ReleaseStatus) {
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
        releasedAt: status === ReleaseStatus.RELEASED ? new Date() : null,
      },
      create: {
        operationalControlRecordId: controlRecord.id,
        status,
        releasedAt: status === ReleaseStatus.RELEASED ? new Date() : null,
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

function releaseAuditMessage(status: ReleaseStatus, snapshot: AttemptSnapshotResult): string {
  const action =
    status === ReleaseStatus.RELEASED
      ? "marked released"
      : status === ReleaseStatus.CANCELLED
        ? "cancelled"
        : "voided";

  if (snapshot.snapshotId) {
    return `FlightLeg release ${action}; pre-action readiness snapshot captured.`;
  }

  return `FlightLeg release ${action}; pre-action readiness snapshot skipped.`;
}

async function createReadinessSnapshot(
  flightLegId: string,
  summaryContext: SnapshotSummaryContext,
  mode: SnapshotCaptureMode,
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
): Promise<AttemptSnapshotResult> {
  const detail = await getReleaseEvidenceDetail(flightLegId);
  const capturedBeforeStatus = detail?.operationalControlRecord?.release?.status ?? null;

  return createReadinessSnapshot(
    flightLegId,
    {
      attemptedAction: releaseAttemptAction(status),
      attemptedReleaseStatus: status,
      capturedBeforeStatus,
      source: "release-attempt",
    },
    "best-effort",
  );
}

async function createReleaseAuditEvent(
  flightLegId: string,
  releaseId: string,
  status: ReleaseStatus,
  snapshot: AttemptSnapshotResult,
) {
  await prisma.$transaction(async (tx) => {
    await tx.releaseAuditEvent.create({
      data: {
        flightLegId,
        flightReleaseId: releaseId,
        snapshotId: snapshot.snapshotId,
        eventType: releaseAuditEventType(status),
        actorUserId: null,
        message: releaseAuditMessage(status, snapshot),
        metadata: {
          attemptedAction: releaseAttemptAction(status),
          attemptedReleaseStatus: status,
          capturedBeforeStatus: snapshot.capturedBeforeStatus,
          snapshotCaptured: !!snapshot.snapshotId,
          snapshotSkippedReason: snapshot.skippedReason,
        },
      },
    });
  });
}

async function runReleaseAction(flightLegId: string, status: ReleaseStatus) {
  let attemptSnapshot: AttemptSnapshotResult;
  let release: { id: string };

  try {
    attemptSnapshot = await captureReleaseAttemptSnapshot(flightLegId, status);
    release = await setFlightLegReleaseStatus(flightLegId, status);
    await createReleaseAuditEvent(flightLegId, release.id, status, attemptSnapshot);
  } catch (error) {
    redirect(`/operations-control/${flightLegId}?releaseError=${encodeError(error)}`);
  }

  revalidateFlightLegWorkflowPaths();
  revalidatePath(`/operations-control/${flightLegId}`);
  redirect(`/operations-control/${flightLegId}`);
}

export async function markFlightLegReleasedAction(flightLegId: string) {
  await runReleaseAction(flightLegId, ReleaseStatus.RELEASED);
}

export async function cancelFlightLegReleaseAction(flightLegId: string) {
  await runReleaseAction(flightLegId, ReleaseStatus.CANCELLED);
}

export async function voidFlightLegReleaseAction(flightLegId: string) {
  await runReleaseAction(flightLegId, ReleaseStatus.VOIDED);
}

export async function captureReleasePreviewSnapshotAction(flightLegId: string) {
  try {
    await createReadinessSnapshot(flightLegId, { source: "explicit-preview" }, "strict");
  } catch (error) {
    redirect(`/operations-control/${flightLegId}?snapshotError=${encodeError(error)}`);
  }

  revalidatePath(`/operations-control/${flightLegId}`);
  revalidatePath("/api/health");
  redirect(`/operations-control/${flightLegId}?snapshotMessage=Preview%20snapshot%20captured.`);
}
