import {
  AircraftMeterSnapshotSource,
  AircraftType,
  MaintenanceComplianceStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
  MaintenanceProgramApplicabilityScope,
  MaintenanceProgramOverrideAction,
  MaintenanceProgramTaskCategory,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_NOTE = "Scheduled maintenance demo foundation.";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function cleanTail(tailNumber: string) {
  return tailNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

async function upsertTask(
  taskKey: string,
  data: {
    title: string;
    category: MaintenanceProgramTaskCategory;
    sourceReference?: string;
    description?: string;
    requiredForServiceability: boolean;
    intervalMonths?: number;
    intervalDays?: number;
    intervalAirframeHours?: string;
    intervalCycles?: number;
    warningDays?: number;
    warningAirframeHours?: string;
    warningCycles?: number;
    createdById?: string | null;
  },
) {
  return prisma.maintenanceProgramTask.upsert({
    where: { taskKey },
    create: {
      taskKey,
      title: data.title,
      category: data.category,
      sourceReference: data.sourceReference,
      description: data.description,
      requiredForServiceability: data.requiredForServiceability,
      intervalMonths: data.intervalMonths,
      intervalDays: data.intervalDays,
      intervalAirframeHours: data.intervalAirframeHours,
      intervalCycles: data.intervalCycles,
      warningDays: data.warningDays ?? 30,
      warningAirframeHours: data.warningAirframeHours,
      warningCycles: data.warningCycles,
      createdById: data.createdById,
    },
    update: {
      title: data.title,
      category: data.category,
      sourceReference: data.sourceReference,
      description: data.description,
      requiredForServiceability: data.requiredForServiceability,
      intervalMonths: data.intervalMonths,
      intervalDays: data.intervalDays,
      intervalAirframeHours: data.intervalAirframeHours,
      intervalCycles: data.intervalCycles,
      warningDays: data.warningDays ?? 30,
      warningAirframeHours: data.warningAirframeHours,
      warningCycles: data.warningCycles,
      active: true,
      effectiveTo: null,
      createdById: data.createdById,
    },
  });
}

async function resetApplicability(
  taskId: string,
  records: {
    scope: MaintenanceProgramApplicabilityScope;
    aircraftType?: AircraftType;
    aircraftId?: string;
    notes?: string;
    createdById?: string | null;
  }[],
) {
  await prisma.maintenanceProgramApplicability.deleteMany({
    where: { taskId },
  });

  await prisma.maintenanceProgramApplicability.createMany({
    data: records.map((record) => ({
      taskId,
      scope: record.scope,
      aircraftType: record.aircraftType,
      aircraftId: record.aircraftId,
      notes: record.notes,
      createdById: record.createdById,
    })),
  });
}

async function upsertOverride(data: {
  taskId: string;
  aircraftId: string;
  action: MaintenanceProgramOverrideAction;
  reason: string;
  createdById?: string | null;
}) {
  const existing = await prisma.maintenanceProgramOverride.findFirst({
    where: {
      taskId: data.taskId,
      aircraftId: data.aircraftId,
      action: data.action,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.maintenanceProgramOverride.update({
      where: { id: existing.id },
      data: {
        reason: data.reason,
        effectiveTo: null,
        createdById: data.createdById,
      },
    });
  }

  return prisma.maintenanceProgramOverride.create({
    data,
  });
}

async function upsertMeterSnapshot(data: {
  aircraftId: string;
  airframeHours: string;
  airframeCycles: number;
  recordedById?: string | null;
}) {
  const existing = await prisma.aircraftMeterSnapshot.findFirst({
    where: {
      aircraftId: data.aircraftId,
      notes: DEMO_NOTE,
      source: AircraftMeterSnapshotSource.MANUAL,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.aircraftMeterSnapshot.update({
      where: { id: existing.id },
      data: {
        recordedAt: new Date(),
        airframeHours: data.airframeHours,
        airframeCycles: data.airframeCycles,
        recordedById: data.recordedById,
      },
    });
  }

  return prisma.aircraftMeterSnapshot.create({
    data: {
      aircraftId: data.aircraftId,
      recordedAt: new Date(),
      airframeHours: data.airframeHours,
      airframeCycles: data.airframeCycles,
      source: AircraftMeterSnapshotSource.MANUAL,
      notes: DEMO_NOTE,
      recordedById: data.recordedById,
    },
  });
}

async function upsertCompliance(data: {
  aircraftId: string;
  taskId: string;
  status: MaintenanceComplianceStatus;
  lastCompletedAt?: Date | null;
  lastCompletedAirframeHours?: string | null;
  lastCompletedCycles?: number | null;
  nextDueAt?: Date | null;
  nextDueAirframeHours?: string | null;
  nextDueCycles?: number | null;
  baselineNotes: string;
  updatedById?: string | null;
}) {
  return prisma.maintenanceComplianceState.upsert({
    where: {
      aircraftId_taskId: {
        aircraftId: data.aircraftId,
        taskId: data.taskId,
      },
    },
    create: data,
    update: {
      status: data.status,
      lastCompletedAt: data.lastCompletedAt,
      lastCompletedAirframeHours: data.lastCompletedAirframeHours,
      lastCompletedCycles: data.lastCompletedCycles,
      nextDueAt: data.nextDueAt,
      nextDueAirframeHours: data.nextDueAirframeHours,
      nextDueCycles: data.nextDueCycles,
      manualNextDueAt: null,
      manualNextDueAirframeHours: null,
      manualNextDueCycles: null,
      baselineNotes: data.baselineNotes,
      updatedById: data.updatedById,
    },
  });
}

async function upsertLinkedPlannedEvent(data: {
  aircraftId: string;
  tailNumber: string;
  taskId: string;
  complianceStateId: string;
  scheduledAt: Date;
}) {
  const maintenanceNumber = `MXPROG-${cleanTail(data.tailNumber)}-PHASE`;

  return prisma.maintenanceEvent.upsert({
    where: {
      aircraftId_maintenanceNumber: {
        aircraftId: data.aircraftId,
        maintenanceNumber,
      },
    },
    create: {
      aircraftId: data.aircraftId,
      maintenanceProgramTaskId: data.taskId,
      maintenanceComplianceStateId: data.complianceStateId,
      maintenanceNumber,
      eventType: MaintenanceEventType.SCHEDULED_MAINTENANCE,
      status: MaintenanceEventStatus.PLANNED,
      scheduledAt: data.scheduledAt,
      providerName: "AeroOps Maintenance",
      description: "Planned CL-65 phase check from the scheduled maintenance program.",
      notes: DEMO_NOTE,
    },
    update: {
      maintenanceProgramTaskId: data.taskId,
      maintenanceComplianceStateId: data.complianceStateId,
      eventType: MaintenanceEventType.SCHEDULED_MAINTENANCE,
      status: MaintenanceEventStatus.PLANNED,
      scheduledAt: data.scheduledAt,
      providerName: "AeroOps Maintenance",
      description: "Planned CL-65 phase check from the scheduled maintenance program.",
      notes: DEMO_NOTE,
    },
  });
}

async function main() {
  const now = new Date();
  const maintenanceUser = await prisma.user.findFirst({
    where: {
      role: {
        in: [UserRole.MAINTENANCE, UserRole.ADMIN],
      },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const createdById = maintenanceUser?.id ?? null;

  const aircraft = await prisma.aircraft.findMany({
    orderBy: { tailNumber: "asc" },
    select: {
      id: true,
      tailNumber: true,
      type: true,
    },
  });

  if (aircraft.length === 0) {
    throw new Error("No aircraft exist. Run the main seed before seeding maintenance program demo data.");
  }

  const firstAircraft = aircraft[0];
  const secondAircraft = aircraft[1] ?? aircraft[0];
  const cl65Aircraft = aircraft.filter((item) => item.type === AircraftType.CL_65);
  const firstCl65 = cl65Aircraft[0] ?? firstAircraft;
  const secondCl65 = cl65Aircraft[1] ?? firstCl65;

  const annualInspection = await upsertTask("mx.program.12-month-inspection", {
    title: "12-month aircraft inspection",
    category: MaintenanceProgramTaskCategory.INSPECTION,
    sourceReference: "Operator AAIP / inspection program",
    description: "Recurring annual-style inspection package tracked by aircraft.",
    requiredForServiceability: true,
    intervalMonths: 12,
    warningDays: 45,
    createdById,
  });
  const transponderCheck = await upsertTask("mx.program.transponder-24-month", {
    title: "24-month transponder check",
    category: MaintenanceProgramTaskCategory.INSPECTION,
    sourceReference: "14 CFR 91.413",
    description: "Transponder test and inspection recurring every 24 calendar months.",
    requiredForServiceability: true,
    intervalMonths: 24,
    warningDays: 60,
    createdById,
  });
  const cl65PhaseCheck = await upsertTask("mx.program.cl65-phase-check", {
    title: "CL-65 phase check",
    category: MaintenanceProgramTaskCategory.INSPECTION,
    sourceReference: "CL-65 maintenance program",
    description: "Fleet-level CL-65 phase check driven by airframe hours.",
    requiredForServiceability: true,
    intervalAirframeHours: "300.00",
    warningAirframeHours: "30.00",
    createdById,
  });
  const stcInspection = await upsertTask("mx.program.stc-recurring-inspection", {
    title: "STC recurring inspection",
    category: MaintenanceProgramTaskCategory.STC_MODIFICATION,
    sourceReference: "STC ICA demo",
    description: "Recurring inspection required only on aircraft where this STC is installed.",
    requiredForServiceability: true,
    intervalMonths: 6,
    warningDays: 30,
    createdById,
  });
  const tailSpecificTask = await upsertTask("mx.program.tail-specific-service-check", {
    title: `${firstAircraft.tailNumber} tail-specific service check`,
    category: MaintenanceProgramTaskCategory.SERVICE_CHECK,
    sourceReference: "Tail-specific maintenance control item",
    description: "Demo item assigned to one aircraft only.",
    requiredForServiceability: false,
    intervalDays: 90,
    warningDays: 15,
    createdById,
  });

  await resetApplicability(annualInspection.id, [
    {
      scope: MaintenanceProgramApplicabilityScope.ALL_AIRCRAFT,
      notes: "Demo all-aircraft inspection.",
      createdById,
    },
  ]);
  await resetApplicability(transponderCheck.id, [
    {
      scope: MaintenanceProgramApplicabilityScope.ALL_AIRCRAFT,
      notes: "Demo all-aircraft regulatory inspection.",
      createdById,
    },
  ]);
  await resetApplicability(cl65PhaseCheck.id, [
    {
      scope: MaintenanceProgramApplicabilityScope.AIRCRAFT_TYPE,
      aircraftType: AircraftType.CL_65,
      notes: "Applies to CL-65 fleet.",
      createdById,
    },
  ]);
  await resetApplicability(stcInspection.id, [
    {
      scope: MaintenanceProgramApplicabilityScope.AIRCRAFT_TYPE,
      aircraftType: AircraftType.CL_65,
      notes: "Demo STC task applied by type, with tail overrides allowed.",
      createdById,
    },
  ]);
  await resetApplicability(tailSpecificTask.id, [
    {
      scope: MaintenanceProgramApplicabilityScope.AIRCRAFT,
      aircraftId: firstAircraft.id,
      notes: "Tail-specific demo assignment.",
      createdById,
    },
  ]);

  await upsertOverride({
    taskId: stcInspection.id,
    aircraftId: secondCl65.id,
    action: MaintenanceProgramOverrideAction.EXCLUDE,
    reason: "Demo STC not installed on this tail.",
    createdById,
  });

  await Promise.all(
    aircraft.slice(0, 6).map((item, index) =>
      upsertMeterSnapshot({
        aircraftId: item.id,
        airframeHours: new Prisma.Decimal(4925 + index * 115).toFixed(2),
        airframeCycles: 3110 + index * 74,
        recordedById: createdById,
      }),
    ),
  );

  await upsertCompliance({
    aircraftId: firstAircraft.id,
    taskId: annualInspection.id,
    status: MaintenanceComplianceStatus.OVERDUE,
    lastCompletedAt: addMonths(now, -13),
    nextDueAt: addDays(now, -7),
    baselineNotes: "Demo overdue required inspection; should affect serviceability.",
    updatedById: createdById,
  });
  await upsertCompliance({
    aircraftId: secondAircraft.id,
    taskId: transponderCheck.id,
    status: MaintenanceComplianceStatus.DUE_SOON,
    lastCompletedAt: addMonths(now, -23),
    nextDueAt: addDays(now, 20),
    baselineNotes: "Demo due-soon regulatory check.",
    updatedById: createdById,
  });
  const phaseCompliance = await upsertCompliance({
    aircraftId: firstCl65.id,
    taskId: cl65PhaseCheck.id,
    status: MaintenanceComplianceStatus.DUE,
    lastCompletedAirframeHours: "4625.00",
    lastCompletedCycles: 2950,
    nextDueAirframeHours: "4925.00",
    nextDueCycles: 3150,
    baselineNotes: "Demo hours/cycles-driven phase check.",
    updatedById: createdById,
  });
  await upsertCompliance({
    aircraftId: firstCl65.id,
    taskId: stcInspection.id,
    status: MaintenanceComplianceStatus.CURRENT,
    lastCompletedAt: addMonths(now, -2),
    nextDueAt: addMonths(now, 4),
    baselineNotes: "Demo current STC inspection.",
    updatedById: createdById,
  });
  await upsertCompliance({
    aircraftId: secondCl65.id,
    taskId: stcInspection.id,
    status: MaintenanceComplianceStatus.NOT_APPLICABLE,
    baselineNotes: "Demo exclusion because STC is not installed.",
    updatedById: createdById,
  });
  await upsertCompliance({
    aircraftId: firstAircraft.id,
    taskId: tailSpecificTask.id,
    status: MaintenanceComplianceStatus.DUE_SOON,
    lastCompletedAt: addDays(now, -80),
    nextDueAt: addDays(now, 10),
    baselineNotes: "Demo tail-specific task.",
    updatedById: createdById,
  });

  await upsertLinkedPlannedEvent({
    aircraftId: firstCl65.id,
    tailNumber: firstCl65.tailNumber,
    taskId: cl65PhaseCheck.id,
    complianceStateId: phaseCompliance.id,
    scheduledAt: addDays(now, 5),
  });

  console.log("Seeded scheduled maintenance program demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
