import {
  AuthorityStatus,
  OperatingPart,
  PrismaClient,
  ReleaseStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function main() {
  if (process.env.RUN_AUTHORITY_BACKFILL !== "1") {
    console.log("Skipping authority backfill. Set RUN_AUTHORITY_BACKFILL=1 to run.");
    return;
  }

  const now = new Date();
  const effectiveStart = addDays(now, -30);

  const operator = await prisma.operator.upsert({
    where: { code: "AEROOPS-DEMO" },
    create: {
      code: "AEROOPS-DEMO",
      name: "AeroOps Demo Operator",
      isActive: true,
    },
    update: {
      name: "AeroOps Demo Operator",
      isActive: true,
    },
  });

  const part91 = await prisma.operatingAuthority.upsert({
    where: {
      operatorId_operatingPart: {
        operatorId: operator.id,
        operatingPart: OperatingPart.PART_91,
      },
    },
    create: {
      operatorId: operator.id,
      operatingPart: OperatingPart.PART_91,
      displayName: "Part 91 Company Operations",
      status: AuthorityStatus.ACTIVE,
    },
    update: {
      displayName: "Part 91 Company Operations",
      status: AuthorityStatus.ACTIVE,
    },
  });

  const part135 = await prisma.operatingAuthority.upsert({
    where: {
      operatorId_operatingPart: {
        operatorId: operator.id,
        operatingPart: OperatingPart.PART_135,
      },
    },
    create: {
      operatorId: operator.id,
      operatingPart: OperatingPart.PART_135,
      displayName: "Part 135 Charter Operations",
      status: AuthorityStatus.ACTIVE,
    },
    update: {
      displayName: "Part 135 Charter Operations",
      status: AuthorityStatus.ACTIVE,
    },
  });

  const part91Revision = await prisma.authorityRevision.upsert({
    where: {
      operatingAuthorityId_revisionLabel: {
        operatingAuthorityId: part91.id,
        revisionLabel: "Initial demo authority",
      },
    },
    create: {
      operatingAuthorityId: part91.id,
      revisionLabel: "Initial demo authority",
      effectiveStart,
      status: AuthorityStatus.ACTIVE,
      notes: "Demo Part 91 authority revision for initial operations control.",
    },
    update: {
      effectiveStart,
      status: AuthorityStatus.ACTIVE,
      notes: "Demo Part 91 authority revision for initial operations control.",
    },
  });

  const part135Revision = await prisma.authorityRevision.upsert({
    where: {
      operatingAuthorityId_revisionLabel: {
        operatingAuthorityId: part135.id,
        revisionLabel: "Initial demo authority",
      },
    },
    create: {
      operatingAuthorityId: part135.id,
      revisionLabel: "Initial demo authority",
      effectiveStart,
      status: AuthorityStatus.ACTIVE,
      notes: "Demo Part 135 authority revision for initial operations control.",
    },
    update: {
      effectiveStart,
      status: AuthorityStatus.ACTIVE,
      notes: "Demo Part 135 authority revision for initial operations control.",
    },
  });

  const part91Manual = await prisma.manual.upsert({
    where: {
      operatingAuthorityId_name: {
        operatingAuthorityId: part91.id,
        name: "General Operations Manual",
      },
    },
    create: {
      operatingAuthorityId: part91.id,
      name: "General Operations Manual",
      documentIdentifier: "GOM-91-DEMO",
      publishedAt: effectiveStart,
    },
    update: {
      documentIdentifier: "GOM-91-DEMO",
      publishedAt: effectiveStart,
    },
  });

  const part135Manual = await prisma.manual.upsert({
    where: {
      operatingAuthorityId_name: {
        operatingAuthorityId: part135.id,
        name: "Charter Operations Manual",
      },
    },
    create: {
      operatingAuthorityId: part135.id,
      name: "Charter Operations Manual",
      documentIdentifier: "COM-135-DEMO",
      publishedAt: effectiveStart,
    },
    update: {
      documentIdentifier: "COM-135-DEMO",
      publishedAt: effectiveStart,
    },
  });

  await prisma.manualRevision.upsert({
    where: {
      manualId_revisionLabel: {
        manualId: part91Manual.id,
        revisionLabel: "Rev 1",
      },
    },
    create: {
      manualId: part91Manual.id,
      revisionLabel: "Rev 1",
      revisionDate: effectiveStart,
      effectiveStart,
      notes: "Initial demo revision.",
    },
    update: {
      revisionDate: effectiveStart,
      effectiveStart,
      notes: "Initial demo revision.",
    },
  });

  await prisma.manualRevision.upsert({
    where: {
      manualId_revisionLabel: {
        manualId: part135Manual.id,
        revisionLabel: "Rev 1",
      },
    },
    create: {
      manualId: part135Manual.id,
      revisionLabel: "Rev 1",
      revisionDate: effectiveStart,
      effectiveStart,
      notes: "Initial demo revision.",
    },
    update: {
      revisionDate: effectiveStart,
      effectiveStart,
      notes: "Initial demo revision.",
    },
  });

  const flights = await prisma.flight.findMany({
    orderBy: { scheduledDeparture: "asc" },
    select: {
      id: true,
      flightNumber: true,
      scheduledDeparture: true,
    },
  });

  for (const [index, flight] of flights.entries()) {
    const isPart135 = index % 2 === 1;
    const authority = isPart135 ? part135 : part91;
    const revision = isPart135 ? part135Revision : part91Revision;
    const releaseStatus =
      flight.scheduledDeparture <= now ? ReleaseStatus.RELEASED : ReleaseStatus.PLANNED;

    const controlRecord = await prisma.operationalControlRecord.upsert({
      where: { flightId: flight.id },
      create: {
        flightId: flight.id,
        operatorId: operator.id,
        operatingAuthorityId: authority.id,
        authorityRevisionId: revision.id,
        controllingEntity: "AeroOps Operations Control",
        controlNotes: `Demo operational control record for ${flight.flightNumber}.`,
      },
      update: {
        operatorId: operator.id,
        operatingAuthorityId: authority.id,
        authorityRevisionId: revision.id,
        controllingEntity: "AeroOps Operations Control",
        controlNotes: `Demo operational control record for ${flight.flightNumber}.`,
      },
    });

    await prisma.flightRelease.upsert({
      where: { operationalControlRecordId: controlRecord.id },
      create: {
        operationalControlRecordId: controlRecord.id,
        status: releaseStatus,
        releasedAt: releaseStatus === ReleaseStatus.RELEASED ? flight.scheduledDeparture : null,
        releaseNotes: `Demo ${releaseStatus.toLowerCase()} release for ${flight.flightNumber}.`,
      },
      update: {
        status: releaseStatus,
        releasedAt: releaseStatus === ReleaseStatus.RELEASED ? flight.scheduledDeparture : null,
        releaseNotes: `Demo ${releaseStatus.toLowerCase()} release for ${flight.flightNumber}.`,
      },
    });
  }

  console.log(`Authority backfill complete for ${flights.length} flights.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
