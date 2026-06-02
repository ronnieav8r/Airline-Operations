import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getOperationalCounts() {
  const [
    stationCount,
    aircraftCount,
    crewMemberCount,
    flightCount,
    aircraftCrewAssignmentCount,
    activeAlertCount,
  ] = await Promise.all([
    prisma.station.count(),
    prisma.aircraft.count(),
    prisma.crewMember.count(),
    prisma.flight.count(),
    prisma.aircraftCrewAssignment.count(),
    prisma.alert.count({ where: { status: "ACTIVE" } }),
  ]);

  return [
    { label: "Stations", value: stationCount },
    { label: "Aircraft", value: aircraftCount },
    { label: "Crew", value: crewMemberCount },
    { label: "Flights", value: flightCount },
    { label: "Crew assignments", value: aircraftCrewAssignmentCount },
    { label: "Active alerts", value: activeAlertCount },
  ];
}

export default async function Home() {
  const counts = await getOperationalCounts();

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-10 text-zinc-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="border-b border-zinc-300 pb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Operations foundation
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            AeroOps Center
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-600">
            The app is connected to PostgreSQL and reading live operational
            records from Prisma.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((count) => (
            <div
              className="rounded-md border border-zinc-300 bg-white p-5 shadow-sm"
              key={count.label}
            >
              <p className="text-sm font-medium text-zinc-500">
                {count.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tabular-nums">
                {count.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Health endpoint: <code>/api/health</code>
        </div>
      </section>
    </main>
  );
}
