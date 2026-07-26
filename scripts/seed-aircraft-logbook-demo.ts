import {
  AircraftLogbookEntrySource,
  AircraftLogbookEntryStatus,
  AircraftLogbookEntryType,
  AircraftStatus,
  AircraftType,
  DeferralMethod,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
  PrismaClient,
  ReturnToServiceRecordStatus,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    templateKey: "crew-squawk-cabin-item",
    title: "Cabin item damaged",
    entryType: AircraftLogbookEntryType.CREW_SQUAWK,
    category: "CABIN",
    starterNarrative: "Crew observed cabin item [ITEM] at [LOCATION] requiring maintenance review.",
    defaultSeverity: "REVIEW",
    requiredVariables: ["ITEM", "LOCATION"],
  },
  {
    templateKey: "crew-squawk-avionics-message",
    title: "Avionics message observed",
    entryType: AircraftLogbookEntryType.CREW_SQUAWK,
    category: "AVIONICS",
    starterNarrative: "Crew observed avionics message [MESSAGE] during [PHASE]. System behavior: [DETAILS].",
    defaultSeverity: "REVIEW",
    requiredVariables: ["MESSAGE", "PHASE", "DETAILS"],
  },
  {
    templateKey: "mx-ops-check-satisfactory",
    title: "Operational check satisfactory",
    entryType: AircraftLogbookEntryType.CORRECTIVE_ACTION,
    category: "CORRECTIVE_ACTION",
    starterNarrative: "Performed operational check per [REFERENCE]. Check satisfactory.",
    defaultSeverity: "N/A",
    requiredVariables: ["REFERENCE"],
  },
  {
    templateKey: "mx-component-replaced",
    title: "Component replaced",
    entryType: AircraftLogbookEntryType.CORRECTIVE_ACTION,
    category: "REPAIR",
    starterNarrative: "Removed and replaced [COMPONENT] per [REFERENCE]. Operational check satisfactory.",
    defaultSeverity: "N/A",
    requiredVariables: ["COMPONENT", "REFERENCE"],
  },
  {
    templateKey: "mx-deferred-per-mel",
    title: "Deferred per MEL",
    entryType: AircraftLogbookEntryType.DEFERRAL,
    category: "MEL",
    starterNarrative: "Deferred discrepancy per MEL item [MEL_ITEM], category [CATEGORY]. Placard and required procedures complete.",
    defaultSeverity: "DEFERRED",
    requiredVariables: ["MEL_ITEM", "CATEGORY"],
  },
];

async function seedTemplates(adminUserId: string | null) {
  for (const template of templates) {
    await prisma.maintenanceEntryTemplate.upsert({
      where: { templateKey: template.templateKey },
      create: {
        ...template,
        approvedAt: new Date(),
        approvedById: adminUserId,
        createdById: adminUserId,
      },
      update: {
        ...template,
        approvedAt: new Date(),
        approvedById: adminUserId,
        isActive: true,
        retiredAt: null,
      },
    });
  }
}

async function seedDemoRecords(adminUserId: string | null) {
  if (process.env.RUN_AIRCRAFT_LOGBOOK_DEMO !== "1") {
    console.log("Skipping aircraft logbook demo records. Set RUN_AIRCRAFT_LOGBOOK_DEMO=1 to create demo records.");
    return;
  }

  const aircraft = await prisma.aircraft.upsert({
    where: { tailNumber: "N910LG" },
    create: {
      status: AircraftStatus.AVAILABLE,
      tailNumber: "N910LG",
      type: AircraftType.CL_65,
    },
    update: {},
  });

  const openDiscrepancy = await prisma.discrepancy.upsert({
    where: {
      aircraftId_discrepancyNumber: {
        aircraftId: aircraft.id,
        discrepancyNumber: "SQ-N910LG-DEMO-001",
      },
    },
    create: {
      aircraftId: aircraft.id,
      description: "Crew reported galley latch does not remain secured.",
      discrepancyNumber: "SQ-N910LG-DEMO-001",
      reportedById: adminUserId,
      severity: "REVIEW",
      status: DiscrepancyStatus.OPEN,
      title: "Galley latch loose",
    },
    update: {},
  });

  await prisma.aircraftLogbookEntry.upsert({
    where: {
      aircraftId_entryNumber: {
        aircraftId: aircraft.id,
        entryNumber: "LB-N910LG-DEMO-001",
      },
    },
    create: {
      aircraftId: aircraft.id,
      category: "CABIN",
      createdById: adminUserId,
      discrepancyId: openDiscrepancy.id,
      entryNumber: "LB-N910LG-DEMO-001",
      entryType: AircraftLogbookEntryType.CREW_SQUAWK,
      narrative: "Crew reported galley latch does not remain secured.",
      severity: "REVIEW",
      source: AircraftLogbookEntrySource.CREW,
      status: AircraftLogbookEntryStatus.OPEN,
      title: "Galley latch loose",
      updatedById: adminUserId,
    },
    update: {},
  });

  const deferredDiscrepancy = await prisma.discrepancy.upsert({
    where: {
      aircraftId_discrepancyNumber: {
        aircraftId: aircraft.id,
        discrepancyNumber: "SQ-N910LG-DEMO-002",
      },
    },
    create: {
      aircraftId: aircraft.id,
      description: "Cabin reading light inoperative.",
      discrepancyNumber: "SQ-N910LG-DEMO-002",
      reportedById: adminUserId,
      severity: "DEFERRED",
      status: DiscrepancyStatus.DEFERRED,
      title: "Reading light inoperative",
    },
    update: {},
  });

  const deferral = await prisma.deferral.upsert({
    where: {
      aircraftId_deferralNumber: {
        aircraftId: aircraft.id,
        deferralNumber: "MEL-N910LG-DEMO-001",
      },
    },
    create: {
      aircraftId: aircraft.id,
      authorizedById: adminUserId,
      category: "D",
      deferralMethod: DeferralMethod.MEL,
      deferralNumber: "MEL-N910LG-DEMO-001",
      deferralType: "MEL",
      discrepancyId: deferredDiscrepancy.id,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      melItemNumber: "33-20-01",
      notes: "Demo MEL deferral with passenger briefing limitation.",
      operatingLimitations: "Affected passenger seat reading light unavailable.",
      placardRequired: true,
      repairInterval: "D",
      requiredProcedures: "Placard seat position and brief passengers.",
      status: DeferralStatus.ACTIVE,
    },
    update: {},
  });

  await prisma.discrepancy.update({
    where: { id: deferredDiscrepancy.id },
    data: { activeDeferralId: deferral.id },
  });

  await prisma.aircraftLogbookEntry.upsert({
    where: {
      aircraftId_entryNumber: {
        aircraftId: aircraft.id,
        entryNumber: "LB-N910LG-DEMO-002",
      },
    },
    create: {
      aircraftId: aircraft.id,
      category: "MEL",
      createdById: adminUserId,
      deferralId: deferral.id,
      deferralAuthority: "MEL",
      discrepancyId: deferredDiscrepancy.id,
      dueAt: deferral.dueAt,
      entryNumber: "LB-N910LG-DEMO-002",
      entryType: AircraftLogbookEntryType.DEFERRAL,
      melCategory: "D",
      melItemNumber: "33-20-01",
      narrative: "Deferred cabin reading light per MEL 33-20-01.",
      operatingLimitations: "Affected passenger seat reading light unavailable.",
      placardRequired: true,
      requiredProcedures: "Placard seat position and brief passengers.",
      severity: "DEFERRED",
      source: AircraftLogbookEntrySource.MAINTENANCE,
      status: AircraftLogbookEntryStatus.DEFERRED,
      title: "Reading light deferred",
      updatedById: adminUserId,
    },
    update: {},
  });

  const maintenanceEvent = await prisma.maintenanceEvent.upsert({
    where: {
      aircraftId_maintenanceNumber: {
        aircraftId: aircraft.id,
        maintenanceNumber: "MX-N910LG-DEMO-001",
      },
    },
    create: {
      aircraftId: aircraft.id,
      approvedById: adminUserId,
      completedAt: new Date(),
      description: "Completed demo phase inspection review.",
      eventType: MaintenanceEventType.INSPECTION,
      maintenanceNumber: "MX-N910LG-DEMO-001",
      manualReference: "Demo inspection program",
      providerName: "AeroOps Maintenance",
      returnToServiceAt: new Date(),
      status: MaintenanceEventStatus.COMPLETED,
      workPerformed: "Completed demo phase inspection review.",
    },
    update: {},
  });

  await prisma.aircraftLogbookEntry.upsert({
    where: {
      aircraftId_entryNumber: {
        aircraftId: aircraft.id,
        entryNumber: "LB-N910LG-DEMO-003",
      },
    },
    create: {
      aircraftId: aircraft.id,
      category: "INSPECTION",
      createdById: adminUserId,
      entryNumber: "LB-N910LG-DEMO-003",
      entryType: AircraftLogbookEntryType.INSPECTION_ENTRY,
      maintenanceEventId: maintenanceEvent.id,
      manualReference: "Demo inspection program",
      narrative: "Completed demo phase inspection review.",
      returnToServiceAt: new Date(),
      source: AircraftLogbookEntrySource.MAINTENANCE,
      status: AircraftLogbookEntryStatus.READY_FOR_SIGNATURE,
      title: "Demo phase inspection",
      updatedById: adminUserId,
    },
    update: {},
  });

  const pendingRtsDiscrepancy = await prisma.discrepancy.upsert({
    where: {
      aircraftId_discrepancyNumber: {
        aircraftId: aircraft.id,
        discrepancyNumber: "SQ-N910LG-DEMO-003",
      },
    },
    create: {
      aircraftId: aircraft.id,
      correctiveSummary: "Replaced worn galley latch and completed operational check.",
      description: "Galley latch replaced; maintenance signoff pending.",
      discrepancyNumber: "SQ-N910LG-DEMO-003",
      reportedById: adminUserId,
      severity: "RTS",
      status: DiscrepancyStatus.CORRECTED_PENDING_RTS,
      title: "Galley latch corrected pending RTS",
    },
    update: {
      correctiveSummary: "Replaced worn galley latch and completed operational check.",
      status: DiscrepancyStatus.CORRECTED_PENDING_RTS,
    },
  });

  const pendingRtsMaintenance = await prisma.maintenanceEvent.upsert({
    where: {
      aircraftId_maintenanceNumber: {
        aircraftId: aircraft.id,
        maintenanceNumber: "MX-N910LG-DEMO-RTS-PENDING",
      },
    },
    create: {
      aircraftId: aircraft.id,
      approvedById: adminUserId,
      completedAt: new Date(),
      description: "Replaced worn galley latch and completed operational check.",
      discrepancyId: pendingRtsDiscrepancy.id,
      eventType: MaintenanceEventType.REPAIR,
      maintenanceNumber: "MX-N910LG-DEMO-RTS-PENDING",
      providerName: "AeroOps Maintenance",
      status: MaintenanceEventStatus.COMPLETED,
      workPerformed: "Replaced worn galley latch and completed operational check.",
    },
    update: {
      completedAt: new Date(),
      discrepancyId: pendingRtsDiscrepancy.id,
      status: MaintenanceEventStatus.COMPLETED,
      workPerformed: "Replaced worn galley latch and completed operational check.",
    },
  });

  await prisma.discrepancy.update({
    where: { id: pendingRtsDiscrepancy.id },
    data: { correctiveMaintenanceEventId: pendingRtsMaintenance.id },
  });

  const clearedDiscrepancy = await prisma.discrepancy.upsert({
    where: {
      aircraftId_discrepancyNumber: {
        aircraftId: aircraft.id,
        discrepancyNumber: "SQ-N910LG-DEMO-004",
      },
    },
    create: {
      aircraftId: aircraft.id,
      clearedAt: new Date(),
      correctiveSummary: "Operational check satisfactory after component replacement.",
      description: "Demo discrepancy cleared by signed RTS.",
      discrepancyNumber: "SQ-N910LG-DEMO-004",
      reportedById: adminUserId,
      severity: "CLEARED",
      status: DiscrepancyStatus.CLEARED,
      title: "Cleared by RTS demo",
    },
    update: {
      clearedAt: new Date(),
      correctiveSummary: "Operational check satisfactory after component replacement.",
      status: DiscrepancyStatus.CLEARED,
    },
  });

  const signedRts = await prisma.returnToServiceRecord.upsert({
    where: {
      aircraftId_rtsNumber: {
        aircraftId: aircraft.id,
        rtsNumber: "RTS-N910LG-DEMO-001",
      },
    },
    create: {
      aircraftId: aircraft.id,
      createdById: adminUserId,
      discrepancyId: clearedDiscrepancy.id,
      returnToServiceAt: new Date(),
      rtsNumber: "RTS-N910LG-DEMO-001",
      signedAt: new Date(),
      status: ReturnToServiceRecordStatus.SIGNED,
      workSummary: "Operational check satisfactory after component replacement.",
    },
    update: {
      discrepancyId: clearedDiscrepancy.id,
      status: ReturnToServiceRecordStatus.SIGNED,
      workSummary: "Operational check satisfactory after component replacement.",
    },
  });

  await prisma.discrepancy.update({
    where: { id: clearedDiscrepancy.id },
    data: { clearingReturnToServiceRecordId: signedRts.id },
  });

  await prisma.discrepancy.upsert({
    where: {
      aircraftId_discrepancyNumber: {
        aircraftId: aircraft.id,
        discrepancyNumber: "SQ-N910LG-DEMO-005",
      },
    },
    create: {
      aircraftId: aircraft.id,
      description: "Duplicate demo write-up entered in error.",
      discrepancyNumber: "SQ-N910LG-DEMO-005",
      reportedById: adminUserId,
      severity: "VOID",
      status: DiscrepancyStatus.CANCELLED,
      title: "Erroneous duplicate write-up",
      voidReason: "Duplicate entry created for demo workflow.",
      voidedAt: new Date(),
      voidedById: adminUserId,
    },
    update: {
      status: DiscrepancyStatus.CANCELLED,
      voidReason: "Duplicate entry created for demo workflow.",
      voidedAt: new Date(),
      voidedById: adminUserId,
    },
  });
}

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: {
      isActive: true,
      role: { in: [UserRole.ADMIN, UserRole.MAINTENANCE] },
    },
    orderBy: { email: "asc" },
    select: { id: true },
  });
  const adminUserId = adminUser?.id ?? null;

  await seedTemplates(adminUserId);
  await seedDemoRecords(adminUserId);
  console.log(`Seeded ${templates.length} aircraft logbook templates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
