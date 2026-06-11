import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import {
  ensureSmokeTestUsers,
  SMOKE_TEST_PASSWORD,
} from "../../scripts/smoke-test-auth";

const localDatabaseUrl =
  "postgresql://aeroops_local:aeroops_local_password@127.0.0.1:5434/aeroops_local?schema=public";

process.env.DATABASE_URL ??= localDatabaseUrl;
process.env.AEROOPS_ENABLE_TEST_AUTH ??= "1";

const prisma = new PrismaClient();

type DynamicRouteIds = {
  aircraftId: string;
  crewMemberId: string;
  flightLegId: string;
};

let ids: DynamicRouteIds;

async function firstId<T extends { id: string }>(items: T[], label: string) {
  const item = items[0];
  if (!item) {
    throw new Error(`No ${label} record found for browser smoke testing. Seed demo data first.`);
  }

  return item.id;
}

async function getDynamicRouteIds(): Promise<DynamicRouteIds> {
  const [aircraft, crewMembers, flightLegs] = await Promise.all([
    prisma.aircraft.findMany({ orderBy: [{ tailNumber: "asc" }], select: { id: true }, take: 1 }),
    prisma.crewMember.findMany({ orderBy: [{ lastName: "asc" }], select: { id: true }, take: 1 }),
    prisma.flightLeg.findMany({ orderBy: [{ scheduledDeparture: "asc" }], select: { id: true }, take: 1 }),
  ]);

  return {
    aircraftId: await firstId(aircraft, "aircraft"),
    crewMemberId: await firstId(crewMembers, "crew member"),
    flightLegId: await firstId(flightLegs, "FlightLeg"),
  };
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SMOKE_TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

async function expectPageOk(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} should return 200`).toBe(200);
  await expect(page.getByText("AeroOps Center").first()).toBeVisible();
}

test.beforeAll(async () => {
  await ensureSmokeTestUsers(prisma);
  ids = await getDynamicRouteIds();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe.serial("AeroOps browser smoke", () => {
  test("admin signs in and opens protected workflow pages", async ({ page }) => {
    await signIn(page, "admin@aeroops.local");
    await expect(page.getByText("ADMIN").first()).toBeVisible();

    await expectPageOk(page, "/");
    await expectPageOk(page, "/operations-control");
    await expectPageOk(page, `/operations-control/${ids.flightLegId}`);
    await expectPageOk(page, "/crew/scheduling/periods");
    await expectPageOk(page, "/crew/logistics");
    await expectPageOk(page, `/crew/${ids.crewMemberId}/logistics`);
    await expectPageOk(page, `/aircraft/${ids.aircraftId}/crew`);
  });

  test("crew signs in, opens crew portal, and is redirected away from logistics management", async ({
    page,
  }) => {
    await signIn(page, "crew@aeroops.local");
    await expect(page.getByText("CREW").first()).toBeVisible();

    await expectPageOk(page, "/crew/portal");

    await page.goto(`/crew/${ids.crewMemberId}/logistics`);
    await expect(page).toHaveURL(/authError=You%20do%20not%20have%20access/);
    await expect(page.getByText("AeroOps Center").first()).toBeVisible();

    await page.goto("/crew/logistics");
    await expect(page).toHaveURL(/authError=You%20do%20not%20have%20access/);
    await expect(page.getByText("AeroOps Center").first()).toBeVisible();
  });
});
