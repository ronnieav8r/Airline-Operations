import { PrismaClient } from "@prisma/client";

import { ensureSmokeTestUsers, SMOKE_TEST_PASSWORD, SMOKE_TEST_USERS } from "./smoke-test-auth";

const prisma = new PrismaClient();

async function main() {
  await ensureSmokeTestUsers(prisma);

  console.log("Smoke-test users are ready.");
  console.log("");
  console.log("Email / role:");

  for (const user of SMOKE_TEST_USERS) {
    console.log(`- ${user.email} / ${user.role}`);
  }

  console.log("");
  console.log(`Default smoke password: ${SMOKE_TEST_PASSWORD}`);
  console.log("Override with AEROOPS_SMOKE_TEST_PASSWORD when needed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
