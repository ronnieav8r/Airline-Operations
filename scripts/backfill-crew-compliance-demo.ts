import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { seedCrewComplianceDemo } from "../lib/crew-compliance-demo-seed";

function loadLocalDatabaseUrlIfPresent() {
  if (process.env.USE_RENDER_DATABASE === "1") {
    return;
  }

  const localEnvPath = join(process.cwd(), ".env.local");
  if (!existsSync(localEnvPath)) {
    return;
  }

  const databaseUrlLine = readFileSync(localEnvPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("DATABASE_URL="));

  if (!databaseUrlLine) {
    return;
  }

  process.env.DATABASE_URL = databaseUrlLine
    .replace(/^DATABASE_URL=/, "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

loadLocalDatabaseUrlIfPresent();

const prisma = new PrismaClient();

async function main() {
  if (process.env.RUN_CREW_COMPLIANCE_BACKFILL !== "1") {
    console.log("Skipping crew compliance backfill. Set RUN_CREW_COMPLIANCE_BACKFILL=1 to run.");
    return;
  }

  const result = await seedCrewComplianceDemo(prisma);
  console.log(
    `Crew compliance backfill complete: ${result.crewCertificates} certificates, ` +
      `${result.crewMedicals} medicals, ${result.crewTrainingEvents} training events, ` +
      `${result.crewCheckEvents} check events, ${result.crewRecencyEvents} recency events, ` +
      `${result.crewDutyPeriods} duty periods, ${result.crewRestPeriods} rest periods.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

