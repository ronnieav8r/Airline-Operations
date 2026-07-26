import Link from "next/link";
import { notFound } from "next/navigation";

import { submitCrewMeSquawkAction } from "@/app/crew/me/actions";
import { requireCrewPortalUser } from "@/lib/auth/crew-portal";
import { getCrewMeFlightDetail } from "@/lib/crew-me-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    flightLegId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    submitted?: string | string[];
  }>;
};

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function contactPhoneHref(phone: string | null, scheme: "sms" | "tel"): string | null {
  if (!phone) {
    return null;
  }

  const normalized = phone.replace(/[^\d+]/g, "");

  return normalized ? `${scheme}:${normalized}` : null;
}

function contactEmailHref(email: string | null): string | null {
  return email ? `mailto:${encodeURIComponent(email)}` : null;
}

function groupEmailHref(values: Array<string | null>): string | null {
  const contacts = values.filter((value): value is string => Boolean(value));

  if (contacts.length === 0) {
    return null;
  }

  return `mailto:${contacts.map(encodeURIComponent).join(",")}`;
}

function ContactAction({
  disabledLabel,
  href,
  label,
}: {
  disabledLabel: string;
  href: string | null;
  label: string;
}) {
  if (!href) {
    return (
      <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-400">
        {disabledLabel}
      </span>
    );
  }

  return (
    <a
      className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950"
      href={href}
    >
      {label}
    </a>
  );
}

function CrewSquawkForm({ flightId }: { flightId: string }) {
  const action = submitCrewMeSquawkAction.bind(null, flightId);

  return (
    <section className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-zinc-950">Report aircraft issue</h2>
      <form action={action} className="grid gap-3">
        <input name="redirectTo" type="hidden" value={`/crew/me/flights/${flightId}`} />
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Issue title
          <input
            className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950"
            name="title"
            placeholder="Short write-up"
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Category
            <select className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950" name="category">
              <option value="CREW_SQUAWK">Crew squawk</option>
              <option value="CABIN">Cabin</option>
              <option value="AVIONICS">Avionics</option>
              <option value="ENGINE">Engine</option>
              <option value="LANDING_GEAR">Landing gear</option>
              <option value="PASSENGER_COMFORT">Passenger comfort</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Severity
            <select className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950" name="severity">
              <option value="REVIEW">Review</option>
              <option value="AOG">AOG</option>
              <option value="SAFETY">Safety</option>
              <option value="CABIN">Cabin</option>
              <option value="COSMETIC">Cosmetic</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Phase/timing
          <input
            className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950"
            name="phaseOfFlight"
            placeholder="Preflight, taxi, climb, cruise, postflight"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Details
          <textarea
            className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            name="narrative"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Photo or document
          <input
            accept="image/*,application/pdf,text/plain"
            className="min-h-11 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            name="attachment"
            type="file"
          />
        </label>
        <button className="min-h-11 cursor-pointer rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800" type="submit">
          Submit issue
        </button>
      </form>
    </section>
  );
}

export default async function CrewMeFlightDetailPage({ params, searchParams }: PageProps) {
  const currentUser = await requireCrewPortalUser();
  const { flightLegId } = await params;
  const query = await searchParams;
  const flight = await getCrewMeFlightDetail(currentUser.id, flightLegId);

  if (!flight) {
    notFound();
  }

  const otherCrew = flight.assignedCrew.filter(
    (assignment) => assignment.crewMemberId !== flight.currentCrewMemberId,
  );
  const crewEmailHref = groupEmailHref(otherCrew.map((assignment) => assignment.email));

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-4xl gap-4">
        <Link className="text-sm font-semibold text-zinc-600 hover:text-zinc-950" href="/crew/me?tab=today">
          Back
        </Link>

        <header className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {flight.flightNumber}
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{flight.route}</h1>
              <p className="mt-1 text-sm text-zinc-600">
                {formatDateTime(flight.scheduledDeparture)} - {formatDateTime(flight.scheduledArrival)}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {flight.aircraft?.tailNumber ?? "No tail"} | {flight.seatRoles.map(formatStatus).join(", ")}
              </p>
            </div>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700">
              {formatStatus(flight.status)}
            </span>
          </div>
        </header>

        {firstSearchParam(query.error) ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">
            {firstSearchParam(query.error)}
          </p>
        ) : null}
        {firstSearchParam(query.submitted) === "squawk" ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
            Aircraft issue submitted.
          </p>
        ) : null}

        <CrewSquawkForm flightId={flight.id} />

        <section className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4" id="crew">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-950">Crew</h2>
            <div className="flex flex-wrap gap-2">
              <ContactAction disabledLabel="Group email unavailable" href={crewEmailHref} label="Email crew" />
            </div>
          </div>
          {flight.assignedCrew.length === 0 ? (
            <p className="text-sm text-zinc-600">No crew assignments are attached to this flight yet.</p>
          ) : (
            <div className="grid gap-2">
              {flight.assignedCrew.map((assignment) => {
                const isCurrentCrewMember = assignment.crewMemberId === flight.currentCrewMemberId;

                return (
                  <div
                    className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                    key={`${assignment.employeeNumber}-${assignment.seatRole}`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-950">
                          {assignment.firstName} {assignment.lastName}
                        </p>
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-zinc-600">
                          {formatStatus(assignment.seatRole)}
                        </span>
                        {isCurrentCrewMember ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-semibold text-emerald-800">
                            You
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 grid gap-0.5 text-xs text-zinc-600">
                        <p>{assignment.phone ?? "No phone on file"}</p>
                        <p>{assignment.email ?? "No email on file"}</p>
                      </div>
                    </div>
                    {isCurrentCrewMember ? null : (
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <ContactAction disabledLabel="No phone" href={contactPhoneHref(assignment.phone, "tel")} label="Call" />
                        <ContactAction disabledLabel="No text" href={contactPhoneHref(assignment.phone, "sms")} label="Text" />
                        <ContactAction disabledLabel="No email" href={contactEmailHref(assignment.email)} label="Email" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
