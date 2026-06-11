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
    prisma.flightLeg.findMany({ orderBy: [{ scheduledDeparture: "asc" }], select: { id: true }, take: 1 }),
  ]);

  return {
    aircraftId: await firstId(aircraft, "aircraft"),
    crewMemberId: await firstId(crewMembers, "crew member"),
    flightLegId: await firstId(flightLegs, "FlightLeg"),
  };
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
        { label: "crew logistics manage", path: `/crew/${ids.crewMemberId}/logistics` },
        { label: "aircraft crew workflow", path: `/aircraft/${ids.aircraftId}/crew` },
        { label: "schedule periods", path: "/crew/scheduling/periods" },
      ],
    },
    {
      role: UserRole.OPS,
      checks: [
        ...commonChecks,
        { label: "crew logistics manage", path: `/crew/${ids.crewMemberId}/logistics` },
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

  console.log(`Running AeroOps smoke checks against ${baseUrl}`);
  console.log(`Anonymous /login: ${anonymousLogin.status}`);

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
