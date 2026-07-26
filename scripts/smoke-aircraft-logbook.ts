import {
  AircraftStatus,
  AircraftType,
  DiscrepancyStatus,
  UserRole,
  PrismaClient,
} from "@prisma/client";

import {
  AircraftLogbookError,
  createCorrectiveActionDraft,
  getAircraftLogbookExportPackage,
  signAircraftLogbookEntry,
} from "@/lib/aircraft-logbook";

const prisma = new PrismaClient();
const smokeKey = "AIRCRAFT-LOGBOOK-SMOKE";

function formData(values: Record<string, string | boolean>) {
  const form = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "boolean") {
      if (value) {
        form.set(key, "on");
      }
    } else {
      form.set(key, value);
    }
  }

  return form;
}

async function cleanup() {
  await prisma.aircraftLogbookAuditEvent.deleteMany({
    where: {
      aircraft: {
        tailNumber: smokeKey,
      },
    },
  });
  await prisma.aircraft.deleteMany({
    where: { tailNumber: smokeKey },
  });
  await prisma.user.deleteMany({
    where: { email: "aircraft-logbook-smoke@aeroops.local" },
  });
}

async function main() {
  await cleanup();

  const user = await prisma.user.create({
    data: {
      email: "aircraft-logbook-smoke@aeroops.local",
      role: UserRole.MAINTENANCE,
    },
  });
  const aircraft = await prisma.aircraft.create({
    data: {
      status: AircraftStatus.AVAILABLE,
      tailNumber: smokeKey,
      type: AircraftType.CL_65,
    },
  });
  await prisma.maintenanceAuthorityProfile.create({
    data: {
      certificateNumber: "A&P-SMOKE",
      certificateType: "A&P",
      isActive: true,
      legalName: "Smoke Mechanic",
      userId: user.id,
    },
  });
  const discrepancy = await prisma.discrepancy.create({
    data: {
      aircraftId: aircraft.id,
      discrepancyNumber: "DISC-AIRCRAFT-LOGBOOK-SMOKE",
      reportedById: user.id,
      status: DiscrepancyStatus.OPEN,
      title: "Smoke discrepancy",
    },
  });

  const entry = await createCorrectiveActionDraft({
    actorId: user.id,
    aircraftId: aircraft.id,
    formData: formData({
      discrepancyId: discrepancy.id,
      manualReference: "SMOKE-AMM-001",
      narrative: "Smoke corrective action completed.",
      performedByName: "Smoke Mechanic",
      providerName: "Smoke Maintenance",
      title: "Smoke corrective action",
    }),
  });

  if (entry.status !== "DRAFT") {
    throw new Error(`Expected DRAFT, received ${entry.status}.`);
  }

  await signAircraftLogbookEntry({
    actorId: user.id,
    actorRole: user.role,
    entryId: entry.id,
    formData: formData({
      certificateNumber: "A&P-SMOKE",
      certificateType: "A&P",
      intentText: "I certify this smoke logbook entry.",
      signerName: "Smoke Mechanic",
    }),
  });

  const lockedEntry = await prisma.aircraftLogbookEntry.findUniqueOrThrow({
    where: { id: entry.id },
    select: {
      lockedAt: true,
      signedContentHash: true,
      signatures: { select: { id: true } },
      status: true,
    },
  });

  if (!lockedEntry.lockedAt || !lockedEntry.signedContentHash || lockedEntry.signatures.length !== 1) {
    throw new Error("Signed smoke entry was not locked with a signature.");
  }

  try {
    await signAircraftLogbookEntry({
      actorId: user.id,
      actorRole: user.role,
      entryId: entry.id,
      formData: formData({
        intentText: "Duplicate sign attempt.",
        signerName: "Smoke Mechanic",
      }),
    });
    throw new Error("Expected duplicate signing to fail.");
  } catch (error) {
    if (!(error instanceof AircraftLogbookError)) {
      throw error;
    }
  }

  const exported = await getAircraftLogbookExportPackage(aircraft.id, user.id);

  if (exported.aircraft.logbookEntries.length !== 1) {
    throw new Error("Export did not include the signed smoke entry.");
  }

  await cleanup();
  console.log("Aircraft logbook smoke passed.");
}

main()
  .catch(async (error) => {
    console.error(error);
    await cleanup().catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
