import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { seedDefaultReleasePolicies } from "../lib/release-policy-defaults";

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
  if (process.env.RUN_RELEASE_POLICY_BACKFILL !== "1") {
    console.log("Skipping release policy backfill. Set RUN_RELEASE_POLICY_BACKFILL=1 to run.");
    return;
  }

  const result = await seedDefaultReleasePolicies(prisma);
  console.log(
    `Release policy backfill complete for ${result.profiles} profiles and ${result.rules} rules.`,
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
