import { AircraftFuelEventType, UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { recordAircraftFuelEventAction } from "@/app/aircraft/[aircraftId]/fuel/actions";
import {
  formatFuelAmount,
  fuelEventLabel,
  getDeploymentOperatorFuelSetting,
} from "@/lib/fuel";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ aircraftId: string }>;
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

function FuelEventForm({
  aircraftId,
  eventType,
  label,
  requireOnboardHint,
}: {
  aircraftId: string;
  eventType: AircraftFuelEventType;
  label: string;
  requireOnboardHint?: string;
}) {
  const action = recordAircraftFuelEventAction.bind(null, aircraftId, eventType);
  const isCorrection = eventType === AircraftFuelEventType.CORRECTION;

  return (
    <form action={action} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <input name="recordedAt" type="hidden" value={dateTimeLocalValue(new Date())} />
        {!isCorrection ? (
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {eventType === AircraftFuelEventType.DEFUEL ? "Pounds removed" : "Pounds added"}
            <input
              className="mt-1 w-40 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
              min="0"
              name="fuelChangeLbs"
              step="0.01"
              type="number"
            />
          </label>
        ) : null}
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Fuel onboard after event
          <input
            className="mt-1 w-48 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            min="0"
            name="fuelOnboardLbs"
            placeholder={isCorrection ? "Required" : "Required if no current fuel"}
            step="0.01"
            type="number"
          />
        </label>
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
      {requireOnboardHint ? <p className="mt-2 text-xs text-amber-700">{requireOnboardHint}</p> : null}
    </form>
  );
}

export default async function AircraftFuelPage({ params, searchParams }: PageProps) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH, UserRole.MAINTENANCE]);
  const { aircraftId } = await params;
  const query = await searchParams;
  const error = firstParam(query.error);
  const [aircraft, setting] = await Promise.all([
    prisma.aircraft.findUnique({
      where: { id: aircraftId },
      select: {
        fuelEvents: {
          orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
          select: {
            eventType: true,
            flightLeg: {
              select: {
                flightNumber: true,
                id: true,
              },
            },
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
          take: 25,
        },
        id: true,
        tailNumber: true,
        type: true,
      },
    }),
    getDeploymentOperatorFuelSetting(),
  ]);

  if (!aircraft) {
    notFound();
  }

  const latest = aircraft.fuelEvents[0] ?? null;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Aircraft Fuel
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {aircraft.tailNumber} Fuel Ledger
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Entries are in pounds. Approx gallons use{" "}
                {setting.defaultJetAFuelDensityLbsPerGallon.toString()} lb/gal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                href={`/aircraft/${aircraft.id}`}
              >
                Aircraft context
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/aircraft"
              >
                Fleet
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </p>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Current fuel</p>
            <p className="mt-2 text-xl font-semibold">
              {latest ? formatFuelAmount(latest.fuelOnboardLbs, latest.fuelOnboardGallons) : "Unknown"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {latest ? `${fuelEventLabel(latest.eventType)} at ${latest.recordedAt.toLocaleString()}` : "Record a correction or first uplift."}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Aircraft</p>
            <p className="mt-2 font-mono text-xl font-semibold">{aircraft.tailNumber}</p>
            <p className="mt-1 text-xs text-zinc-500">{aircraft.type}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Density</p>
            <p className="mt-2 text-xl font-semibold">
              {setting.defaultJetAFuelDensityLbsPerGallon.toString()} lb/gal
            </p>
            <p className="mt-1 text-xs text-zinc-500">Editable in Admin settings.</p>
          </article>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Record fuel event</h2>
          <div className="mt-3 grid gap-3">
            <FuelEventForm
              aircraftId={aircraft.id}
              eventType={AircraftFuelEventType.UPLIFT}
              label="Record uplift"
              requireOnboardHint={!latest ? "No current fuel is known; include fuel onboard after event." : undefined}
            />
            <FuelEventForm
              aircraftId={aircraft.id}
              eventType={AircraftFuelEventType.DEFUEL}
              label="Record defuel"
              requireOnboardHint={!latest ? "No current fuel is known; include fuel onboard after event." : undefined}
            />
            <FuelEventForm
              aircraftId={aircraft.id}
              eventType={AircraftFuelEventType.CORRECTION}
              label="Set current fuel"
            />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Recent fuel ledger</h2>
          {aircraft.fuelEvents.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">No fuel events recorded.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Recorded</th>
                    <th className="px-3 py-2 font-medium">Event</th>
                    <th className="px-3 py-2 font-medium">Change</th>
                    <th className="px-3 py-2 font-medium">Onboard</th>
                    <th className="px-3 py-2 font-medium">FlightLeg</th>
                    <th className="px-3 py-2 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {aircraft.fuelEvents.map((event) => (
                    <tr className="border-b border-zinc-100" key={event.id}>
                      <td className="px-3 py-2.5">{event.recordedAt.toLocaleString()}</td>
                      <td className="px-3 py-2.5">{fuelEventLabel(event.eventType)}</td>
                      <td className="px-3 py-2.5">
                        {event.fuelChangeLbs
                          ? formatFuelAmount(event.fuelChangeLbs, event.fuelChangeGallons)
                          : "N/A"}
                      </td>
                      <td className="px-3 py-2.5">
                        {formatFuelAmount(event.fuelOnboardLbs, event.fuelOnboardGallons)}
                      </td>
                      <td className="px-3 py-2.5">
                        {event.flightLeg ? (
                          <Link className="font-medium text-sky-700 hover:text-sky-900" href={`/operations-control/${event.flightLeg.id}`}>
                            {event.flightLeg.flightNumber ?? event.flightLeg.id}
                          </Link>
                        ) : (
                          "Aircraft"
                        )}
                      </td>
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
