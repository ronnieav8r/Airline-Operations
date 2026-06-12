import { AircraftFuelEventType, AssignmentStatus, UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  recordPostflightFuelAction,
  recordReleaseFuelAction,
} from "@/app/operations-control/[flightLegId]/fuel/actions";
import {
  formatFuelAmount,
  fuelEventLabel,
  fuelReadyLabel,
  getDefaultOperatorFuelSetting,
} from "@/lib/fuel";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ flightLegId: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function dateTimeLocalValue(value: Date) {
  return value.toISOString().slice(0, 16);
}

function FuelSnapshotForm({
  action,
  label,
  showReady,
}: {
  action: (formData: FormData) => Promise<void>;
  label: string;
  showReady?: boolean;
}) {
  return (
    <form action={action} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <input name="recordedAt" type="hidden" value={dateTimeLocalValue(new Date())} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Fuel onboard lbs
          <input
            className="mt-1 w-48 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            min="0"
            name="fuelOnboardLbs"
            required
            step="0.01"
            type="number"
          />
        </label>
        {showReady ? (
          <label className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700">
            <input className="h-4 w-4" name="fueledReady" type="checkbox" />
            Fueled and ready
          </label>
        ) : null}
        <label className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Notes
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            name="notes"
            placeholder="Optional"
          />
        </label>
        <button
          className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          type="submit"
        >
          {label}
        </button>
      </div>
    </form>
  );
}

export default async function FlightLegFuelPage({ params, searchParams }: PageProps) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH, UserRole.CREW, UserRole.MAINTENANCE]);
  const { flightLegId } = await params;
  const query = await searchParams;
  const error = firstParam(query.error);
  const flightLeg = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: {
      aircraftAssignments: {
        orderBy: { assignedAt: "desc" },
        select: {
          aircraft: {
            select: {
              fuelEvents: {
                orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
                select: {
                  eventType: true,
                  fuelOnboardGallons: true,
                  fuelOnboardLbs: true,
                  recordedAt: true,
                },
                take: 1,
              },
              id: true,
              tailNumber: true,
            },
          },
        },
        take: 1,
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
        },
      },
      arrivalStation: { select: { code: true } },
      departureStation: { select: { code: true } },
      flightNumber: true,
      fuelEvents: {
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
        select: {
          eventType: true,
          fuelChangeGallons: true,
          fuelChangeLbs: true,
          fuelDensityLbsPerGallon: true,
          fueledReady: true,
          fuelOnboardGallons: true,
          fuelOnboardLbs: true,
          id: true,
          notes: true,
          recordedAt: true,
          recordedBy: {
            select: { email: true },
          },
        },
      },
      id: true,
      operatorId: true,
      scheduledDeparture: true,
    },
  });

  if (!flightLeg) {
    notFound();
  }

  const aircraft = flightLeg.aircraftAssignments[0]?.aircraft ?? null;
  const setting = await getDefaultOperatorFuelSetting(flightLeg.operatorId);
  const latestAircraftFuel = aircraft?.fuelEvents[0] ?? null;
  const releaseFuel =
    flightLeg.fuelEvents.find((event) => event.eventType === AircraftFuelEventType.RELEASE_ONBOARD) ??
    null;
  const postflightFuel =
    flightLeg.fuelEvents.find((event) => event.eventType === AircraftFuelEventType.POSTFLIGHT_ONBOARD) ??
    null;
  const consumedLbs =
    releaseFuel && postflightFuel
      ? Number(releaseFuel.fuelOnboardLbs.toString()) - Number(postflightFuel.fuelOnboardLbs.toString())
      : null;
  const consumedGallons =
    consumedLbs !== null
      ? consumedLbs / Number(releaseFuel?.fuelDensityLbsPerGallon.toString() ?? setting.defaultJetAFuelDensityLbsPerGallon.toString())
      : null;
  const releaseAction = recordReleaseFuelAction.bind(null, flightLeg.id);
  const postflightAction = recordPostflightFuelAction.bind(null, flightLeg.id);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                FlightLeg Fuel
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {flightLeg.flightNumber ?? "FlightLeg"} Fuel
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                {flightLeg.departureStation.code} -&gt; {flightLeg.arrivalStation.code} |{" "}
                {aircraft?.tailNumber ?? "No aircraft assigned"} | Density{" "}
                {setting.defaultJetAFuelDensityLbsPerGallon.toString()} lb/gal
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                href={`/operations-control/${flightLeg.id}`}
              >
                Release workspace
              </Link>
              {aircraft ? (
                <Link
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  href={`/aircraft/${aircraft.id}/fuel`}
                >
                  Aircraft fuel ledger
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </p>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Aircraft current</p>
            <p className="mt-2 text-lg font-semibold">
              {latestAircraftFuel
                ? formatFuelAmount(latestAircraftFuel.fuelOnboardLbs, latestAircraftFuel.fuelOnboardGallons)
                : "Unknown"}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Release onboard</p>
            <p className="mt-2 text-lg font-semibold">
              {releaseFuel ? formatFuelAmount(releaseFuel.fuelOnboardLbs, releaseFuel.fuelOnboardGallons) : "Missing"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{fuelReadyLabel(releaseFuel?.fueledReady)}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Postflight onboard</p>
            <p className="mt-2 text-lg font-semibold">
              {postflightFuel
                ? formatFuelAmount(postflightFuel.fuelOnboardLbs, postflightFuel.fuelOnboardGallons)
                : "Missing"}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Consumed</p>
            <p className="mt-2 text-lg font-semibold">
              {consumedLbs !== null
                ? `${Math.round(consumedLbs).toLocaleString("en-US")} lb / ${Math.round(consumedGallons ?? 0).toLocaleString("en-US")} gal approx`
                : "Pending"}
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Record FlightLeg fuel</h2>
          {aircraft ? (
            <div className="mt-3 grid gap-3">
              <FuelSnapshotForm action={releaseAction} label="Record release fuel" showReady />
              <FuelSnapshotForm action={postflightAction} label="Record postflight fuel" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Assign an aircraft before recording FlightLeg fuel.</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">FlightLeg fuel events</h2>
          {flightLeg.fuelEvents.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">No fuel events are linked to this FlightLeg.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Recorded</th>
                    <th className="px-3 py-2 font-medium">Event</th>
                    <th className="px-3 py-2 font-medium">Onboard</th>
                    <th className="px-3 py-2 font-medium">Ready</th>
                    <th className="px-3 py-2 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {flightLeg.fuelEvents.map((event) => (
                    <tr className="border-b border-zinc-100" key={event.id}>
                      <td className="px-3 py-2.5">{event.recordedAt.toLocaleString()}</td>
                      <td className="px-3 py-2.5">{fuelEventLabel(event.eventType)}</td>
                      <td className="px-3 py-2.5">
                        {formatFuelAmount(event.fuelOnboardLbs, event.fuelOnboardGallons)}
                      </td>
                      <td className="px-3 py-2.5">{fuelReadyLabel(event.fueledReady)}</td>
                      <td className="px-3 py-2.5">{event.recordedBy?.email ?? "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
