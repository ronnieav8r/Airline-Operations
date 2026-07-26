import Link from "next/link";
import { notFound } from "next/navigation";

import {
  toggleCrewPassengerBoardedAction,
  toggleCrewPassengerCheckedInAction,
} from "@/app/crew/me/flights/[flightLegId]/passengers/actions";
import { PassengerIdentityDocumentCapture } from "@/components/passenger-identity-document-capture";
import { requireCrewPortalUser } from "@/lib/auth/crew-portal";
import { getCrewMeFlightPassengers } from "@/lib/crew-me-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    flightLegId: string;
  }>;
};

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function formatStatus(value: string | null): string {
  return value ? value.replaceAll("_", " ") : "Not ready";
}

function formatWeight(value: string | null): string {
  if (!value) {
    return "Not listed";
  }

  return `${Math.round(Number(value)).toLocaleString("en-US")} lb`;
}

function toDateInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function statusBadgeClasses(status: string | null): string {
  if (status === "READY" || status === "LOCKED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "DRAFT" || !status) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

export default async function CrewMeFlightPassengersPage({ params }: PageProps) {
  const currentUser = await requireCrewPortalUser();
  const { flightLegId } = await params;
  const flight = await getCrewMeFlightPassengers(currentUser.id, flightLegId);

  if (!flight) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-4xl gap-4">
        <Link className="text-sm font-semibold text-zinc-600 hover:text-zinc-950" href="/crew/me?tab=today">
          Back
        </Link>

        <header className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {flight.flightNumber}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{flight.route}</h1>
              <p className="mt-1 text-sm text-zinc-600">
                {formatDateTime(flight.scheduledDeparture)} - {formatDateTime(flight.scheduledArrival)}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {flight.aircraft ? `${flight.aircraft.tailNumber} | ${formatStatus(flight.aircraft.type)}` : "No aircraft"}
              </p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(flight.manifestStatus)}`}>
              Manifest {formatStatus(flight.manifestStatus)}
            </span>
          </div>
        </header>

        <section className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-950">Passengers</h2>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700">
              {flight.passengers.length} passenger{flight.passengers.length === 1 ? "" : "s"}
            </span>
          </div>

          {flight.passengers.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No passengers are listed for this flight yet.
            </p>
          ) : (
            <div className="grid gap-2">
              {flight.passengers.map((passenger, index) => (
                <article
                  className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto]"
                  key={passenger.id}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-700">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-zinc-950">{passenger.name}</h3>
                      {passenger.seatNumber ? (
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-zinc-600">
                          Seat {passenger.seatNumber}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600">
                      <span>Weight {formatWeight(passenger.weight)}</span>
                      <span>Bags {formatWeight(passenger.baggageWeight)}</span>
                      <span>{passenger.identityDocument ? "ID photo on file" : "No ID photo"}</span>
                    </div>
                    {passenger.notes ? (
                      <p className="mt-1 text-xs text-zinc-500">{passenger.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[0.68rem] font-semibold sm:justify-end">
                    <form action={toggleCrewPassengerCheckedInAction.bind(null, flight.id, passenger.id)}>
                      <button
                        className={`cursor-pointer rounded-full border px-2 py-0.5 font-semibold transition hover:brightness-95 ${
                          passenger.checkedInAt
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-zinc-200 bg-white text-zinc-500"
                        }`}
                        type="submit"
                      >
                        {passenger.checkedInAt ? "Checked in" : "Not checked in"}
                      </button>
                    </form>
                    <form action={toggleCrewPassengerBoardedAction.bind(null, flight.id, passenger.id)}>
                      <button
                        className={`cursor-pointer rounded-full border px-2 py-0.5 font-semibold transition hover:brightness-95 ${
                          passenger.boardedAt
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-zinc-200 bg-white text-zinc-500"
                        }`}
                        type="submit"
                      >
                        {passenger.boardedAt ? "Boarded" : "Not boarded"}
                      </button>
                    </form>
                  </div>
                  <div className="sm:col-span-3">
                    {passenger.passengerId ? (
                      <details className="rounded-lg border border-zinc-200 bg-white">
                        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                          ID photo
                        </summary>
                        <div className="border-t border-zinc-200 p-3">
                          <PassengerIdentityDocumentCapture
                            deleteUrl={`/crew/me/flights/${flight.id}/passengers/${passenger.passengerId}/identity-document`}
                            hasDocument={Boolean(passenger.identityDocument)}
                            initialMetadata={{
                              idDocumentExpiresAt: toDateInput(passenger.idDocumentExpiresAt),
                              idDocumentNumber: passenger.idDocumentNumber ?? "",
                              idDocumentType: passenger.idDocumentType ?? "",
                              idIssuingCountry: passenger.idIssuingCountry ?? "",
                              idIssuingState: passenger.idIssuingState ?? "",
                            }}
                            passengerName={passenger.name}
                            uploadUrl={`/crew/me/flights/${flight.id}/passengers/${passenger.passengerId}/identity-document`}
                            viewUrl={`/crew/me/flights/${flight.id}/passengers/${passenger.passengerId}/identity-document`}
                          />
                        </div>
                      </details>
                    ) : (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                        ID photo requires a reusable passenger profile, not a manual manifest-only name.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
