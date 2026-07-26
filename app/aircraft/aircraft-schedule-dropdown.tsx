"use client";

import Link from "next/link";
import { useState } from "react";

export type AircraftScheduleDropdownFlight = {
  flightLegId: string | null;
  flightNumber: string;
  id: string;
  routeLabel: string;
  statusClassName: string;
  statusLabel: string;
  windowLabel: string;
};

type AircraftScheduleDropdownProps = {
  currentFlight: {
    flightNumber: string;
    routeLabel: string;
    windowLabel: string;
  } | null;
  flights: AircraftScheduleDropdownFlight[];
  fullScheduleHref: string;
};

export function AircraftScheduleDropdown({
  currentFlight,
  flights,
  fullScheduleHref,
}: AircraftScheduleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <button
        className="block w-full cursor-pointer rounded-xl p-3 text-left transition hover:border-sky-200 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Current / next leg:
          </h3>
          {currentFlight ? (
            <p className="min-w-0 flex-1 truncate text-zinc-700">
              <span className="font-semibold text-zinc-950">{currentFlight.flightNumber}</span>{" "}
              {currentFlight.routeLabel} | {currentFlight.windowLabel}
            </p>
          ) : (
            <p className="min-w-0 flex-1 truncate text-zinc-600">
              No current or upcoming leg in view.
            </p>
          )}
          <span className="shrink-0 rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-zinc-700">
            {isOpen ? "Shrink" : "Expand"}
          </span>
        </div>
      </button>

      {isOpen ? (
        <div className="max-h-60 overflow-y-auto border-t border-zinc-200 px-3 pb-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Next 7 days
            </p>
            <Link
              className="text-xs font-semibold text-sky-700 hover:text-sky-900"
              href={fullScheduleHref}
            >
              Full schedule
            </Link>
          </div>
          {flights.length > 0 ? (
            <ul className="mt-2 divide-y divide-zinc-100">
              {flights.map((flight) => {
                const flightContent = (
                  <>
                    <p className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                      <span className="font-semibold text-zinc-950">{flight.flightNumber}</span>{" "}
                      {flight.routeLabel} | {flight.windowLabel}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${flight.statusClassName}`}
                    >
                      {flight.statusLabel}
                    </span>
                  </>
                );

                return (
                  <li key={flight.id}>
                    {flight.flightLegId ? (
                      <Link
                        className="flex items-center justify-between gap-3 py-2 hover:text-sky-900"
                        href={`/operations-control/${flight.flightLegId}`}
                      >
                        {flightContent}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-3 py-2">
                        {flightContent}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-600">
              No scheduled legs in the next seven days.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
