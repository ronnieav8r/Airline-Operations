import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { seedDefaultCrewComplianceRules } from "../lib/crew-compliance-rule-defaults";

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
  if (process.env.RUN_CREW_COMPLIANCE_RULE_BACKFILL !== "1") {
    console.log(
      "Skipping crew compliance rule backfill. Set RUN_CREW_COMPLIANCE_RULE_BACKFILL=1 to run.",
    );
    return;
  }

  const result = await seedDefaultCrewComplianceRules(prisma);
  console.log(`Crew compliance rule backfill complete for ${result.rules} rules.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
