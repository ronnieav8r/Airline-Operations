import { PrismaClient, UserRole } from "@prisma/client";

import { createSmokeSession, ensureSmokeTestUsers, SMOKE_TEST_USERS } from "./smoke-test-auth";

const prisma = new PrismaClient();
const baseUrl = (process.env.AEROOPS_SMOKE_BASE_URL ?? "http://127.0.0.1:3200").replace(/\/$/, "");

type SmokeCheck = {
  label: string;
  path: string;
  expectedStatuses?: number[];
};

type RoleSmokePlan = {
  role: UserRole;
  checks: SmokeCheck[];
};

function absoluteUrl(path: string) {
  return `${baseUrl}${path}`;
}

function isExpected(status: number, expectedStatuses: number[]) {
  return expectedStatuses.includes(status);
}

async function fetchWithCookie(path: string, cookie?: string) {
  return fetch(absoluteUrl(path), {
    headers: cookie ? { cookie } : undefined,
    redirect: "manual",
  });
}

async function firstId<T extends { id: string }>(items: T[], label: string) {
  const item = items[0];
  if (!item) {
    throw new Error(`No ${label} record found for smoke testing. Seed demo data first.`);
  }
  return item.id;
}

async function getDynamicRouteIds() {
  const [crewMembers, aircraft, flightLegs] = await Promise.all([
    prisma.crewMember.findMany({ orderBy: [{ lastName: "asc" }], select: { id: true }, take: 1 }),
    prisma.aircraft.findMany({ orderBy: [{ tailNumber: "asc" }], select: { id: true }, take: 1 }),
    prisma.flightLeg.findMany({
      orderBy: [{ scheduledDeparture: "asc" }],
      select: { id: true, legacyFlightId: true },
      take: 1,
      where: { legacyFlightId: { not: null } },
    }),
  ]);
  const flightLeg = flightLegs[0];
  if (!flightLeg?.legacyFlightId) {
    throw new Error("No bridged FlightLeg record found for smoke testing. Seed demo data first.");
  }

  return {
    aircraftId: await firstId(aircraft, "aircraft"),
    crewMemberId: await firstId(crewMembers, "crew member"),
    flightLegId: flightLeg.id,
    legacyFlightId: flightLeg.legacyFlightId,
  };
}

type CoverageIdentityResponse = {
  assignedCrew?: Array<{ crewMemberId: string; seatRole: string }>;
  flightId: string;
  flightLegId: string | null;
  identitySource: "FLIGHT_LEG_ID" | "LEGACY_FLIGHT_ID" | "LEGACY_FLIGHT_ONLY";
  inputId: string;
  legacyFlightId: string | null;
  operationalFlightLegId: string | null;
  readSource: "FLIGHT_LEG" | "LEGACY_FLIGHT";
};

function comparableApiCrew(value: CoverageIdentityResponse) {
  return {
    assignedCrew: (value.assignedCrew ?? [])
      .map((crew) => `${crew.crewMemberId}:${crew.seatRole}`)
      .sort(),
    flightId: value.flightId,
    flightLegId: value.flightLegId,
    legacyFlightId: value.legacyFlightId,
    operationalFlightLegId: value.operationalFlightLegId,
    readSource: value.readSource,
  };
}

async function fetchJsonWithCookie<T>(path: string, cookie: string): Promise<T> {
  const response = await fetchWithCookie(path, cookie);
  if (response.status !== 200) {
    throw new Error(`Expected ${path} to return 200, received ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function runCoverageIdentitySmoke(
  ids: Awaited<ReturnType<typeof getDynamicRouteIds>>,
  cookie: string,
) {
  const checks = [
    {
      label: "coverage",
      legacyPath: `/api/flights/${ids.legacyFlightId}/coverage`,
      legPath: `/api/flights/${ids.flightLegId}/coverage`,
    },
    {
      label: "crew",
      legacyPath: `/api/flights/${ids.legacyFlightId}/crew`,
      legPath: `/api/flights/${ids.flightLegId}/crew`,
    },
  ];

  for (const check of checks) {
    const byLeg = await fetchJsonWithCookie<CoverageIdentityResponse>(check.legPath, cookie);
    const byLegacy = await fetchJsonWithCookie<CoverageIdentityResponse>(check.legacyPath, cookie);

    if (
      byLeg.identitySource !== "FLIGHT_LEG_ID" ||
      byLegacy.identitySource !== "LEGACY_FLIGHT_ID" ||
      byLeg.inputId !== ids.flightLegId ||
      byLegacy.inputId !== ids.legacyFlightId ||
      byLeg.operationalFlightLegId !== ids.flightLegId ||
      byLegacy.operationalFlightLegId !== ids.flightLegId ||
      byLeg.legacyFlightId !== ids.legacyFlightId ||
      byLegacy.legacyFlightId !== ids.legacyFlightId
    ) {
      throw new Error(`${check.label} identity fields did not match the FlightLeg compatibility contract.`);
    }

    if (JSON.stringify(comparableApiCrew(byLeg)) !== JSON.stringify(comparableApiCrew(byLegacy))) {
      throw new Error(`${check.label} API data differs between FlightLeg ID and legacy Flight ID requests.`);
    }

    console.log(
      `PASS 200 ${check.label} identity aliases ${check.legPath} + ${check.legacyPath}`,
    );
  }
}

function buildSmokePlans(ids: Awaited<ReturnType<typeof getDynamicRouteIds>>): RoleSmokePlan[] {
  const commonChecks: SmokeCheck[] = [
    { label: "dashboard", path: "/" },
    { label: "operations control", path: "/operations-control" },
    { label: "flights", path: "/flights" },
    { label: "aircraft", path: "/aircraft" },
    { label: "crew", path: "/crew" },
    { label: "crew planner", path: "/crew/scheduling" },
    { label: "scheduling", path: "/scheduling" },
    { label: "health", path: "/api/health" },
    { label: "FlightLeg detail", path: `/operations-control/${ids.flightLegId}` },
    { label: "aircraft context", path: `/aircraft/${ids.aircraftId}` },
    { label: "crew detail", path: `/crew/${ids.crewMemberId}` },
  ];

  return [
    {
      role: UserRole.ADMIN,
      checks: [
        ...commonChecks,
        { label: "crew logistics workbench", path: "/crew/logistics" },
        { label: "crew logistics manage", path: `/crew/${ids.crewMemberId}/logistics` },
        { label: "crew compliance manage", path: `/crew/${ids.crewMemberId}/compliance` },
        { label: "aircraft crew workflow", path: `/aircraft/${ids.aircraftId}/crew` },
        { label: "schedule periods", path: "/crew/scheduling/periods" },
      ],
    },
    {
      role: UserRole.OPS,
      checks: [
        ...commonChecks,
        { label: "crew logistics workbench", path: "/crew/logistics" },
        { label: "crew logistics manage", path: `/crew/${ids.crewMemberId}/logistics` },
        { label: "crew compliance manage", path: `/crew/${ids.crewMemberId}/compliance` },
        { label: "aircraft crew workflow", path: `/aircraft/${ids.aircraftId}/crew` },
        { label: "schedule periods", path: "/crew/scheduling/periods" },
      ],
    },
    {
      role: UserRole.DISPATCH,
      checks: [
        ...commonChecks,
        { label: "dispatch evidence", path: `/operations-control/${ids.flightLegId}/dispatch` },
        { label: "manifest evidence", path: `/operations-control/${ids.flightLegId}/manifest` },
        { label: "W&B evidence", path: `/operations-control/${ids.flightLegId}/weight-balance` },
        { label: "locating evidence", path: `/operations-control/${ids.flightLegId}/locating` },
        {
          label: "crew logistics blocked",
          path: `/crew/${ids.crewMemberId}/logistics`,
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew logistics workbench blocked",
          path: "/crew/logistics",
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew compliance blocked",
          path: `/crew/${ids.crewMemberId}/compliance`,
          expectedStatuses: [303, 307, 308],
        },
      ],
    },
    {
      role: UserRole.MAINTENANCE,
      checks: [
        ...commonChecks,
        { label: "airworthiness workflow", path: `/aircraft/${ids.aircraftId}/airworthiness` },
        {
          label: "crew logistics blocked",
          path: `/crew/${ids.crewMemberId}/logistics`,
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew logistics workbench blocked",
          path: "/crew/logistics",
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew compliance blocked",
          path: `/crew/${ids.crewMemberId}/compliance`,
          expectedStatuses: [303, 307, 308],
        },
      ],
    },
    {
      role: UserRole.CREW,
      checks: [
        ...commonChecks,
        { label: "crew portal", path: "/crew/portal" },
        {
          label: "crew logistics blocked",
          path: `/crew/${ids.crewMemberId}/logistics`,
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew logistics workbench blocked",
          path: "/crew/logistics",
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew compliance blocked",
          path: `/crew/${ids.crewMemberId}/compliance`,
          expectedStatuses: [303, 307, 308],
        },
      ],
    },
    {
      role: UserRole.SAFETY,
      checks: [
        ...commonChecks,
        {
          label: "crew logistics blocked",
          path: `/crew/${ids.crewMemberId}/logistics`,
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew logistics workbench blocked",
          path: "/crew/logistics",
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew compliance blocked",
          path: `/crew/${ids.crewMemberId}/compliance`,
          expectedStatuses: [303, 307, 308],
        },
      ],
    },
    {
      role: UserRole.VIEWER,
      checks: [
        ...commonChecks,
        {
          label: "crew logistics blocked",
          path: `/crew/${ids.crewMemberId}/logistics`,
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew logistics workbench blocked",
          path: "/crew/logistics",
          expectedStatuses: [303, 307, 308],
        },
        {
          label: "crew compliance blocked",
          path: `/crew/${ids.crewMemberId}/compliance`,
          expectedStatuses: [303, 307, 308],
        },
      ],
    },
  ];
}

async function runCheck(role: UserRole, cookie: string, check: SmokeCheck) {
  const expectedStatuses = check.expectedStatuses ?? [200];
  const response = await fetchWithCookie(check.path, cookie);
  const passed = isExpected(response.status, expectedStatuses);

  return {
    expectedStatuses,
    label: check.label,
    location: response.headers.get("location"),
    passed,
    path: check.path,
    role,
    status: response.status,
  };
}

async function main() {
  await ensureSmokeTestUsers(prisma);

  const anonymousLogin = await fetchWithCookie("/login");
  if (anonymousLogin.status !== 200) {
    throw new Error(`Expected /login to return 200, received ${anonymousLogin.status}. Is the app running at ${baseUrl}?`);
  }

  const ids = await getDynamicRouteIds();
  const plans = buildSmokePlans(ids);
  const failures: Array<Awaited<ReturnType<typeof runCheck>>> = [];
  const adminUser = SMOKE_TEST_USERS.find((item) => item.role === UserRole.ADMIN);
  if (!adminUser) {
    throw new Error("Missing admin smoke user.");
  }
  const adminSession = await createSmokeSession(prisma, adminUser.email);

  console.log(`Running AeroOps smoke checks against ${baseUrl}`);
  console.log(`Anonymous /login: ${anonymousLogin.status}`);
  await runCoverageIdentitySmoke(ids, adminSession.cookie);

  for (const plan of plans) {
    const user = SMOKE_TEST_USERS.find((item) => item.role === plan.role);
    if (!user) {
      throw new Error(`Missing smoke user for role ${plan.role}.`);
    }

    const session = await createSmokeSession(prisma, user.email);
    console.log(`\n${plan.role} (${user.email})`);

    for (const check of plan.checks) {
      const result = await runCheck(plan.role, session.cookie, check);
      const suffix = result.location ? ` -> ${result.location}` : "";
      console.log(
        `${result.passed ? "PASS" : "FAIL"} ${result.status} ${check.label} ${check.path}${suffix}`,
      );

      if (!result.passed) {
        failures.push(result);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} smoke check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("\nAll smoke checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
