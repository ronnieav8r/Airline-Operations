import {
  CrewScheduleRequestType,
  DutyStatus,
  TimeOffRequestType,
} from "@prisma/client";
import { Clock3, Fuel, Plane, Scale, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";

import {
  recordCrewMeReleaseFuelAction,
  submitCrewMeSquawkAction,
  submitCrewMeScheduleRequestAction,
  submitCrewMeTimeOffRequestAction,
} from "@/app/crew/me/actions";
import { requireCrewPortalUser } from "@/lib/auth/crew-portal";
import { CREW_ME_WINDOW_DAYS, CrewMeData, CrewMeFlightCard, getCrewMeData } from "@/lib/crew-me-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    submitted?: string | string[];
    tab?: string | string[];
  }>;
};

type CrewMeTab = "flights" | "profile" | "requests" | "schedule" | "today";

const tabs: Array<{ href: string; key: CrewMeTab; label: string }> = [
  { href: "/crew/me?tab=today", key: "today", label: "Today" },
  { href: "/crew/me?tab=schedule", key: "schedule", label: "Schedule" },
  { href: "/crew/me?tab=flights", key: "flights", label: "Flights" },
  { href: "/crew/me?tab=requests", key: "requests", label: "Requests" },
  { href: "/crew/me?tab=profile", key: "profile", label: "Profile" },
];

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseTab(value: string | string[] | undefined): CrewMeTab {
  const tab = firstSearchParam(value);

  if (tab === "schedule" || tab === "flights" || tab === "requests" || tab === "profile") {
    return tab;
  }

  return "today";
}

function formatDate(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(value);
}

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

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  }).format(value);
}

function formatTimeWindow(startsAt: Date | null, endsAt: Date | null): string {
  if (!startsAt && !endsAt) {
    return "All day";
  }

  if (startsAt && endsAt) {
    return `${formatTime(startsAt)} - ${formatTime(endsAt)}`;
  }

  if (startsAt) {
    return `Starts ${formatTime(startsAt)}`;
  }

  if (endsAt) {
    return `Ends ${formatTime(endsAt)}`;
  }

  return "All day";
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function formatFuelPounds(value: string | null): string {
  if (!value) {
    return "Fuel not recorded";
  }

  return `${Math.round(Number(value)).toLocaleString("en-US")} lb`;
}

function isSameCalendarDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function dateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function scheduleDisplayPriority(status?: string): number {
  if (status === "PUBLISHED") {
    return 3;
  }

  if (status === "DRAFT") {
    return 2;
  }

  return 1;
}

function statusBadgeClasses(status: string): string {
  if (status === "ACTIVE" || status === "APPROVED" || status === "COMPLETE" || status === "PUBLISHED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "DRAFT" || status === "PENDING" || status === "PLANNED" || status === "SUBMITTED") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "CANCELLED" || status === "DENIED" || status === "WITHDRAWN") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function crewMemberOptionLabel(crewMember: CrewMeData["requestOptions"]["activeCrewMembers"][number]): string {
  const normalizedLastName = crewMember.lastName.replace(/\s/g, "");
  const lastNameLooksLikeAircraftAssignment = /^\d{3}AO(?:Captain|Firstofficer|Cabin)$/i.test(
    normalizedLastName,
  );
  const name = [crewMember.firstName, lastNameLooksLikeAircraftAssignment ? "" : crewMember.lastName]
    .filter(Boolean)
    .join(" ");

  return `${name} #${crewMember.employeeNumber}`;
}

function SetupRequired({ email }: { email: string }) {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-5 text-zinc-950">
      <section className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">Crew setup required</p>
        <h1 className="mt-2 text-2xl font-semibold">No crew profile is linked</h1>
        <p className="mt-2 text-sm leading-6">
          {email} needs a linked crew profile before this crew app can show schedule and flight information.
        </p>
      </section>
    </main>
  );
}

function TabNavigation({ activeTab }: { activeTab: CrewMeTab }) {
  return (
    <nav aria-label="Crew app tabs" className="crew-tab-nav sticky top-[3.5rem] z-10 -mx-1 px-1 py-2 backdrop-blur">
      <div className="crew-tab-list">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`crew-tab-pill ${active ? "crew-tab-pill-active" : ""}`}
              href={tab.href}
              key={tab.key}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function FlightCard({ flight }: { flight: CrewMeFlightCard }) {
  const preflightLabel = flight.preflightComplete ? "Preflight complete" : "Preflight open";
  const postflightLabel = flight.postflightComplete ? "Postflight complete" : "Postflight open";

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {flight.flightNumber}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-950">{flight.route}</h3>
          <p className="mt-1 text-sm text-zinc-600">
            {formatDateTime(flight.scheduledDeparture)} - {formatDateTime(flight.scheduledArrival)}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(flight.status)}`}>
          {formatStatus(flight.status)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-700">
          {flight.aircraft?.tailNumber ?? "No tail"}
        </span>
        {flight.seatRoles.map((role) => (
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-800" key={role}>
            {formatStatus(role)}
          </span>
        ))}
        <span className={`rounded-full border px-2.5 py-1 ${flight.preflightComplete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {preflightLabel}
        </span>
        <span className={`rounded-full border px-2.5 py-1 ${flight.postflightComplete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {postflightLabel}
        </span>
      </div>
      <Link
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 sm:w-auto"
        href={`/crew/me/flights/${flight.id}`}
      >
        Open flight
      </Link>
    </article>
  );
}

function ReadinessIcon({
  icon: Icon,
  label,
  ready,
}: {
  icon: LucideIcon;
  label: string;
  ready: boolean;
}) {
  const tone = ready
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
  const content = (
    <span
      aria-label={`${label}: ${ready ? "ready" : "not ready"}`}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${tone}`}
      title={`${label}: ${ready ? "ready" : "not ready"}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
    </span>
  );

  return content;
}

function FuelReadinessControl({ flight }: { flight: CrewMeFlightCard }) {
  const action = recordCrewMeReleaseFuelAction.bind(null, flight.id);
  const tone = flight.releaseFuelReady
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <details className="relative">
      <summary
        aria-label={`Fuel: ${flight.releaseFuelReady ? "ready" : "not ready"}`}
        className={`flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border ${tone} [&::-webkit-details-marker]:hidden`}
        title={`Fuel: ${flight.releaseFuelReady ? "ready" : "not ready"}`}
      >
        <Fuel aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
      </summary>
      <form
        action={action}
        className="fixed inset-x-4 top-24 z-50 mx-auto grid max-w-sm gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-lg"
      >
        <div>
          <p className="font-semibold text-zinc-950">Fuel onboard</p>
          <p className="mt-0.5 text-xs text-zinc-500">{formatFuelPounds(flight.releaseFuelOnboardLbs)}</p>
        </div>
        <label className="grid gap-1 text-xs font-semibold text-zinc-700">
          Pounds onboard
          <input
            className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950"
            defaultValue={flight.releaseFuelOnboardLbs ?? ""}
            inputMode="decimal"
            min="0"
            name="fuelOnboardLbs"
            placeholder="e.g. 12600"
            required
            step="1"
            type="number"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <input className="h-4 w-4" defaultChecked name="fueledReady" type="checkbox" />
          Fueled ready
        </label>
        <button
          className="min-h-10 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800"
          type="submit"
        >
          Save fuel
        </button>
      </form>
    </details>
  );
}

function FlightReadinessIcons({ flight }: { flight: CrewMeFlightCard }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <ReadinessIcon icon={Plane} label="Ops release" ready={flight.opsReleaseReady} />
      <ReadinessIcon icon={Wrench} label="Maintenance" ready={flight.maintenanceReady} />
      <ReadinessIcon icon={ShieldCheck} label="Crew compliance" ready={flight.crewComplianceReady} />
      <ReadinessIcon icon={Clock3} label="Duty/rest" ready={flight.dutyRestReady} />
      <FuelReadinessControl flight={flight} />
      <ReadinessIcon icon={Scale} label="Weight and balance" ready={flight.weightBalanceReady} />
    </div>
  );
}

function CrewSquawkControl({
  flight,
  redirectTo = "/crew/me?tab=today",
}: {
  flight: CrewMeFlightCard;
  redirectTo?: string;
}) {
  const action = submitCrewMeSquawkAction.bind(null, flight.id);

  return (
    <details className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
        Report aircraft issue
      </summary>
      <form action={action} className="mt-3 grid gap-2">
        <input name="redirectTo" type="hidden" value={redirectTo} />
        <label className="grid gap-1 text-xs font-semibold text-zinc-700">
          Issue title
          <input
            className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950"
            name="title"
            placeholder="Short write-up"
            required
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-zinc-700">
            Category
            <select className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950" name="category">
              <option value="CREW_SQUAWK">Crew squawk</option>
              <option value="CABIN">Cabin</option>
              <option value="AVIONICS">Avionics</option>
              <option value="ENGINE">Engine</option>
              <option value="LANDING_GEAR">Landing gear</option>
              <option value="PASSENGER_COMFORT">Passenger comfort</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-zinc-700">
            Severity
            <select className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950" name="severity">
              <option value="REVIEW">Review</option>
              <option value="AOG">AOG</option>
              <option value="SAFETY">Safety</option>
              <option value="CABIN">Cabin</option>
              <option value="COSMETIC">Cosmetic</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-xs font-semibold text-zinc-700">
          Phase/timing
          <input
            className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950"
            name="phaseOfFlight"
            placeholder="Preflight, taxi, climb, cruise, postflight"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-700">
          Details
          <textarea
            className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            name="narrative"
            placeholder="What did you see, hear, smell, or observe?"
            required
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-700">
          Photo or document
          <input
            accept="image/*,application/pdf,text/plain"
            className="min-h-10 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
            name="attachment"
            type="file"
          />
        </label>
        <button
          className="min-h-10 cursor-pointer rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800"
          type="submit"
        >
          Submit issue
        </button>
      </form>
    </details>
  );
}

function TodayFlightBlock({ flight }: { flight: CrewMeFlightCard }) {
  const passengerLabel = `${flight.passengerCount} passenger${flight.passengerCount === 1 ? "" : "s"}`;
  const passengerPillClasses = flight.manifestReady
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link className="min-w-0 flex-1 rounded-md transition hover:text-zinc-700" href={`/crew/me/flights/${flight.id}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {formatTime(flight.scheduledDeparture)} - {formatTime(flight.scheduledArrival)}
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-zinc-950">
            {flight.flightNumber}
          </h3>
        </Link>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(flight.status)}`}>
          {formatStatus(flight.status)}
        </span>
      </div>
      <Link
        className="mt-2 flex items-center justify-between gap-3 rounded-md bg-zinc-50 px-2.5 py-2 text-sm transition hover:bg-zinc-100"
        href={`/crew/me/flights/${flight.id}`}
      >
        <div className="min-w-0">
          <p className="font-semibold text-zinc-950">
            {flight.departure.code} - {flight.arrival.code}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {flight.departure.city} to {flight.arrival.city}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Open</span>
      </Link>
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
        <Link
          aria-label={`Passenger list: ${flight.manifestReady ? "ready" : "not ready"}`}
          className={`rounded-full border px-2.5 py-1 transition hover:border-zinc-400 hover:brightness-95 ${passengerPillClasses}`}
          href={`/crew/me/flights/${flight.id}/passengers`}
          title={`Passenger list: ${flight.manifestReady ? "ready" : "not ready"}`}
        >
          {passengerLabel}
        </Link>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-700">
          {flight.aircraft?.tailNumber ?? "No tail"}
        </span>
        <Link
          className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
          href={`/crew/me/flights/${flight.id}#crew`}
        >
          Crew
        </Link>
      </div>
      <FlightReadinessIcons flight={flight} />
      <CrewSquawkControl flight={flight} />
    </article>
  );
}

function TodaysFlights({ flights }: { flights: CrewMeFlightCard[] }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Today</p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950">Today&apos;s flights</h2>
        </div>
        <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
          {flights.length} flight{flights.length === 1 ? "" : "s"}
        </span>
      </div>
      {flights.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          No assigned flights scheduled today.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {flights.map((flight) => (
            <TodayFlightBlock flight={flight} key={flight.id} />
          ))}
        </div>
      )}
    </section>
  );
}

function RequestForms({ crew }: { crew: CrewMeData }) {
  return (
    <div className="crew-request-grid grid w-full min-w-0 max-w-full gap-3 lg:grid-cols-2">
      <form action={submitCrewMeTimeOffRequestAction} className="crew-request-form grid w-full min-w-0 max-w-full gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="text-base font-semibold text-zinc-950">Time off</h3>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Request type
          <select className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="requestType" required>
            {Object.values(TimeOffRequestType).map((type) => (
              <option key={type} value={type}>
                {formatStatus(type)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Start
            <input className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="startDate" required type="datetime-local" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            End
            <input className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="endDate" required type="datetime-local" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Notes
          <textarea className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="reason" />
        </label>
        <button
          className="min-h-11 w-full cursor-pointer rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:border-zinc-700 hover:bg-zinc-700 hover:text-white active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          type="submit"
        >
          Submit time off
        </button>
      </form>

      <form action={submitCrewMeScheduleRequestAction} className="crew-request-form grid w-full min-w-0 max-w-full gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="text-base font-semibold text-zinc-950">Schedule request</h3>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Period
          <select className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="periodId" required>
            <option value="">Select period</option>
            {crew.requestOptions.schedulePeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({period.periodKey})
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Request type
          <select className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="requestType" required>
            {Object.values(CrewScheduleRequestType).map((type) => (
              <option key={type} value={type}>
                {formatStatus(type)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Start date
            <input className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="startDate" type="date" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            End date
            <input className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="endDate" type="date" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Preferred duty
          <select className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="preferredDutyStatus">
            <option value="">No preference</option>
            {Object.values(DutyStatus).map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Requested pattern
          <select className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="requestedPatternId">
            <option value="">No pattern</option>
            {crew.requestOptions.activePatterns.map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Swap crew member
          <select className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm" name="requestedSwapCrewMemberId">
            <option value="">No swap</option>
            {crew.requestOptions.activeCrewMembers.map((crewMember) => (
              <option key={crewMember.id} value={crewMember.id}>
                {crewMemberOptionLabel(crewMember)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Notes
          <textarea className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="requestNotes" />
        </label>
        <button
          className="min-h-11 w-full cursor-pointer rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:border-zinc-700 hover:bg-zinc-700 hover:text-white active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          type="submit"
        >
          Submit request
        </button>
      </form>
    </div>
  );
}

function TodayTab({ crew }: { crew: CrewMeData }) {
  const today = new Date();
  const todaysFlights = crew.flights
    .filter((flight) => isSameCalendarDay(flight.scheduledDeparture, today))
    .sort((first, second) => first.scheduledDeparture.getTime() - second.scheduledDeparture.getTime());

  return (
    <div className="grid gap-4">
      <TodaysFlights flights={todaysFlights} />
    </div>
  );
}

function ScheduleTab({ crew }: { crew: CrewMeData }) {
  const scheduleItemsByDate = new Map<
    string,
    {
      date: Date;
      dutyStatus: string;
      endsAt: Date | null;
      id: string;
      priority: number;
      startsAt: Date | null;
    }
  >();

  for (const item of crew.schedules) {
    scheduleItemsByDate.set(dateKey(item.date), {
      date: item.date,
      dutyStatus: item.dutyStatus,
      endsAt: item.endsAt,
      id: item.id,
      priority: scheduleDisplayPriority(),
      startsAt: item.startsAt,
    });
  }

  for (const item of crew.scheduleEntries) {
    const key = dateKey(item.date);
    const priority = scheduleDisplayPriority(item.status);
    const existing = scheduleItemsByDate.get(key);

    if (!existing || priority >= existing.priority) {
      scheduleItemsByDate.set(key, {
        date: item.date,
        dutyStatus: item.dutyStatus,
        endsAt: item.endsAt,
        id: item.id,
        priority,
        startsAt: item.startsAt,
      });
    }
  }

  const scheduleItems = Array.from(scheduleItemsByDate.values()).sort(
    (first, second) => first.date.getTime() - second.date.getTime(),
  );

  return (
    <section className="grid gap-3">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-950">Next {CREW_ME_WINDOW_DAYS} days</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {formatDate(crew.windowStart)} - {formatDate(crew.windowEnd)}
        </p>
      </div>
      {scheduleItems.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">No schedule items in this window.</p>
      ) : (
        scheduleItems.map((item) => (
          <article
            className="grid min-h-10 grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5"
            key={item.id}
          >
            <h3 className="text-[0.78rem] font-semibold leading-none text-zinc-950">{formatDate(item.date)}</h3>
            <p className="min-w-0 whitespace-nowrap text-[0.78rem] font-medium leading-none text-zinc-600">
              {formatTimeWindow(item.startsAt, item.endsAt)}
            </p>
            <span className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${statusBadgeClasses(item.dutyStatus)}`}>
              {formatStatus(item.dutyStatus)}
            </span>
          </article>
        ))
      )}
    </section>
  );
}

function FlightsTab({ crew }: { crew: CrewMeData }) {
  return (
    <section className="grid gap-3">
      {crew.flights.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">No assigned flights in the current window.</p>
      ) : (
        crew.flights.map((flight) => <FlightCard flight={flight} key={flight.id} />)
      )}
    </section>
  );
}

function RequestsTab({
  crew,
  error,
  submitted,
}: {
  crew: CrewMeData;
  error: string | null;
  submitted: string | null;
}) {
  return (
    <section className="grid min-w-0 gap-4">
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">
          {decodeURIComponent(error)}
        </p>
      ) : null}
      {submitted ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
          {submitted === "time-off" ? "Time-off request submitted." : "Schedule request submitted."}
        </p>
      ) : null}
      <RequestForms crew={crew} />
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold text-zinc-950">Time off</h2>
          {crew.timeOffRequests.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">No pending or approved time off.</p>
          ) : (
            crew.timeOffRequests.map((request) => (
              <article className="rounded-lg border border-zinc-200 bg-white p-4" key={request.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-zinc-950">{formatStatus(request.requestType)}</h3>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(request.status)}`}>
                    {formatStatus(request.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                </p>
              </article>
            ))
          )}
        </section>
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold text-zinc-950">Schedule requests</h2>
          {crew.scheduleRequests.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">No schedule requests found.</p>
          ) : (
            crew.scheduleRequests.map((request) => (
              <article className="rounded-lg border border-zinc-200 bg-white p-4" key={request.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-zinc-950">{formatStatus(request.requestType)}</h3>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(request.status)}`}>
                    {formatStatus(request.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-600">{request.periodName}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                </p>
              </article>
            ))
          )}
        </section>
      </div>
    </section>
  );
}

function ProfileTab({ crew }: { crew: CrewMeData }) {
  return (
    <section className="grid gap-3">
      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-950">Profile</h2>
        <div className="mt-3 grid gap-2 text-sm text-zinc-700">
          <p>Employee #{crew.employeeNumber}</p>
          <p>Base {crew.baseStation.code} - {crew.baseStation.city}</p>
          <p>{crew.email ?? "No email"}</p>
          <p>{crew.phone ?? "No phone"}</p>
          <p>Hire date {formatDate(crew.hireDate)}</p>
        </div>
      </article>
      <article className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-950">Qualifications</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {crew.qualifications.length === 0 ? (
            <p className="text-sm text-zinc-600">No qualifications found.</p>
          ) : (
            crew.qualifications.map((qualification) => (
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700" key={qualification.id}>
                {formatStatus(qualification.aircraftType)} {formatStatus(qualification.seatRole)}
              </span>
            ))
          )}
        </div>
      </article>
    </section>
  );
}

export default async function CrewMePage({ searchParams }: PageProps) {
  const currentUser = await requireCrewPortalUser();
  const params = await searchParams;
  const activeTab = parseTab(params.tab);
  const crew = await getCrewMeData(currentUser.id);
  const error = firstSearchParam(params.error);
  const submitted = firstSearchParam(params.submitted);

  if (!crew) {
    return <SetupRequired email={currentUser.email} />;
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        <TabNavigation activeTab={activeTab} />
        {error && activeTab !== "requests" ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">
            {error}
          </p>
        ) : null}
        {submitted && activeTab !== "requests" ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
            {submitted === "squawk"
              ? "Aircraft issue submitted."
              : submitted === "fuel"
                ? "Fuel status saved."
                : "Request submitted."}
          </p>
        ) : null}

        {activeTab === "today" ? <TodayTab crew={crew} /> : null}
        {activeTab === "schedule" ? <ScheduleTab crew={crew} /> : null}
        {activeTab === "flights" ? <FlightsTab crew={crew} /> : null}
        {activeTab === "requests" ? <RequestsTab crew={crew} error={error} submitted={submitted} /> : null}
        {activeTab === "profile" ? <ProfileTab crew={crew} /> : null}
      </div>
    </main>
  );
}
