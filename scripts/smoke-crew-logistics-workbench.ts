import {
  CrewLogisticsNeedStatus,
  CrewLogisticsNeedType,
  PrismaClient,
} from "@prisma/client";

import {
  assertSmokeTestAuthEnabled,
  createSmokeSession,
  ensureSmokeTestUsers,
} from "./smoke-test-auth";

const prisma = new PrismaClient();
const baseUrl = (process.env.AEROOPS_SMOKE_BASE_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");
const runKey = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const smokeLabel = `LOGISTICS-WORKBENCH-SMOKE-${runKey}`;

function absoluteUrl(path: string) {
  return `${baseUrl}${path}`;
}

function atUtcHour(daysFromNow: number, hour: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function fetchWithCookie(path: string, cookie: string) {
  return fetch(absoluteUrl(path), {
    headers: { cookie },
    redirect: "manual",
  });
}

async function assertPageContains(path: string, cookie: string, expectedSnippets: string[]) {
  const response = await fetchWithCookie(path, cookie);
  if (response.status !== 200) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}.`);
  }

  const body = await response.text();
  for (const snippet of expectedSnippets) {
    if (!body.includes(snippet)) {
      throw new Error(`Expected ${path} to include "${snippet}".`);
    }
  }

  console.log(`PASS 200 ${path}`);
}

async function assertRedirect(path: string, cookie: string) {
  const response = await fetchWithCookie(path, cookie);
  if (![303, 307, 308].includes(response.status)) {
    throw new Error(`Expected ${path} to redirect for a non-admin role, received ${response.status}.`);
  }

  console.log(`PASS ${response.status} non-admin redirect ${path}`);
}

async function main() {
  assertSmokeTestAuthEnabled();
  await ensureSmokeTestUsers(prisma);

  const [admin, crewMember, stations, aircraft, flightLeg] = await Promise.all([
    prisma.user.findUnique({
      where: { email: "admin@aeroops.local" },
      select: { id: true },
    }),
    prisma.crewMember.findFirst({
      where: { employmentStatus: "ACTIVE" },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true },
    }),
    prisma.station.findMany({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      take: 2,
      select: { id: true },
    }),
    prisma.aircraft.findFirst({
      orderBy: [{ tailNumber: "asc" }],
      select: { id: true, tailNumber: true },
    }),
    prisma.flightLeg.findFirst({
      orderBy: [{ scheduledDeparture: "asc" }],
      select: { id: true, flightNumber: true },
    }),
  ]);

  if (!admin) {
    throw new Error("admin@aeroops.local was not found. Run local seed first.");
  }
  if (!crewMember) {
    throw new Error("No active crew member was found. Run local seed first.");
  }
  if (stations.length < 2) {
    throw new Error("At least two active stations are required for logistics workbench smoke.");
  }
  if (!aircraft) {
    throw new Error("No aircraft was found. Run local seed first.");
  }

  const requestedNeed = await prisma.crewLogisticsNeed.create({
    data: {
      aircraftId: aircraft.id,
      createdById: admin.id,
      crewMemberId: crewMember.id,
      flightLegId: flightLeg?.id ?? null,
      fromStationId: stations[0].id,
      needType: CrewLogisticsNeedType.AIRLINE_TICKET,
      neededBy: atUtcHour(2, 10),
      notes: `${smokeLabel} missing provider details`,
      status: CrewLogisticsNeedStatus.REQUESTED,
      toStationId: stations[1].id,
    },
    select: { id: true },
  });

  const bookedNeed = await prisma.crewLogisticsNeed.create({
    data: {
      aircraftId: aircraft.id,
      confirmationNumber: `${smokeLabel}-CONF`,
      createdById: admin.id,
      crewMemberId: crewMember.id,
      flightLegId: flightLeg?.id ?? null,
      fromStationId: stations[1].id,
      needType: CrewLogisticsNeedType.HOTEL,
      neededBy: atUtcHour(4, 18),
      notes: `${smokeLabel} booked hotel`,
      providerName: `${smokeLabel} Hotel`,
      status: CrewLogisticsNeedStatus.BOOKED,
      toStationId: stations[0].id,
    },
    select: { id: true },
  });

  const adminSession = await createSmokeSession(prisma, "admin@aeroops.local");
  const crewSession = await createSmokeSession(prisma, "crew@aeroops.local");

  const commonSnippets = [
    "Crew Logistics Workbench",
    smokeLabel,
    "Manage logistics",
    "Crew detail",
    "Aircraft context",
    "Aircraft crew",
  ];

  await assertPageContains("/crew/logistics", adminSession.cookie, commonSnippets);
  await assertPageContains("/crew/logistics?groupBy=needType", adminSession.cookie, [
    "AIRLINE TICKET",
    "HOTEL",
    smokeLabel,
  ]);
  await assertPageContains("/crew/logistics?groupBy=aircraft", adminSession.cookie, [
    aircraft.tailNumber,
    smokeLabel,
  ]);
  await assertPageContains("/crew/logistics?groupBy=neededBy", adminSession.cookie, [
    "Next 7 days",
    smokeLabel,
  ]);
  await assertPageContains("/crew/logistics?status=missing-details", adminSession.cookie, [
    "Missing provider details",
    `${smokeLabel} missing provider details`,
  ]);
  await assertPageContains("/crew/logistics?status=booked", adminSession.cookie, [
    `${smokeLabel} booked hotel`,
    `${smokeLabel} Hotel`,
  ]);
  await assertPageContains(`/crew/logistics?type=${CrewLogisticsNeedType.AIRLINE_TICKET}`, adminSession.cookie, [
    `${smokeLabel} missing provider details`,
  ]);
  await assertPageContains(`/crew/logistics?crew=${crewMember.id}`, adminSession.cookie, [smokeLabel]);
  await assertPageContains(`/crew/logistics?aircraft=${aircraft.id}`, adminSession.cookie, [smokeLabel]);
  await assertPageContains(
    `/crew/logistics?from=${stations[0].id}&to=${stations[1].id}`,
    adminSession.cookie,
    [`${smokeLabel} missing provider details`],
  );
  await assertRedirect("/crew/logistics", crewSession.cookie);

  console.log(
    `crew logistics workbench smoke: verified filters/grouping for needs ${requestedNeed.id} and ${bookedNeed.id}.`,
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
