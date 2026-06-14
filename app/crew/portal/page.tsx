import {
  CrewScheduleEntryStatus,
  CrewScheduleRequestType,
  DutyStatus,
  TimeOffRequestStatus,
  TimeOffRequestType,
  UserRole,
} from "@prisma/client";
import Link from "next/link";

import {
  submitCrewPortalScheduleRequestAction,
  submitCrewPortalTimeOffRequestAction,
} from "@/app/crew/portal/actions";
import { requireRole } from "@/lib/auth/guards";
import {
  CREW_MEMBER_CONTEXT_WINDOW_DAYS,
  CrewPortalData,
  getCrewPortalData,
} from "@/lib/crew-member-context-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    submitted?: string | string[];
  }>;
};

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toDate(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function toDateTime(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function statusBadgeClasses(status: string): string {
  if (status === "APPROVED" || status === "PUBLISHED" || status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "SUBMITTED" || status === "PENDING" || status === "DRAFT") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "DENIED" || status === "CANCELLED" || status === "WITHDRAWN") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function Section({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{eyebrow}</p>
      ) : null}
      <h2 className="mt-1 text-lg font-semibold text-zinc-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TimeOffRequestForm() {
  return (
    <form action={submitCrewPortalTimeOffRequestAction} className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Request type</span>
        <select className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="requestType" required>
          {Object.values(TimeOffRequestType).map((type) => (
            <option key={type} value={type}>
              {formatStatus(type)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Start date/time</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="startDate" required type="datetime-local" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">End date/time</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="endDate" required type="datetime-local" />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Reason / notes</span>
        <textarea className="mt-1 min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="reason" />
      </label>
      <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800" type="submit">
        Submit time-off request
      </button>
    </form>
  );
}

function ScheduleRequestForm({ crew }: { crew: CrewPortalData }) {
  return (
    <form action={submitCrewPortalScheduleRequestAction} className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Schedule period</span>
          <select className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="periodId" required>
            <option value="">Select period</option>
            {crew.requestOptions.schedulePeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({period.periodKey})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Request type</span>
          <select className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="requestType" required>
            {Object.values(CrewScheduleRequestType).map((type) => (
              <option key={type} value={type}>
                {formatStatus(type)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Start date</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="startDate" type="date" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">End date</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="endDate" type="date" />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Preferred duty</span>
          <select className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="preferredDutyStatus">
            <option value="">No preference</option>
            {Object.values(DutyStatus).map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Requested pattern</span>
          <select className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="requestedPatternId">
            <option value="">No pattern</option>
            {crew.requestOptions.activePatterns.map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Swap crew member</span>
          <select className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="requestedSwapCrewMemberId">
            <option value="">No swap</option>
            {crew.requestOptions.activeCrewMembers.map((crewMember) => (
              <option key={crewMember.id} value={crewMember.id}>
                {crewMember.firstName} {crewMember.lastName} #{crewMember.employeeNumber}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Request notes</span>
        <textarea className="mt-1 min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="requestNotes" />
      </label>
      <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800" type="submit">
        Submit schedule request
      </button>
    </form>
  );
}

function SetupRequired({ email }: { email: string }) {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <p className="text-xs font-semibold uppercase tracking-wide">Crew Portal Setup Required</p>
        <h1 className="mt-2 text-2xl font-semibold">No crew profile is linked</h1>
        <p className="mt-2 text-sm">
          The signed-in crew account {email} is not linked to a crew member
          record yet. An admin must link this user to `CrewMember.userId` before
          the portal can show crew-specific data.
        </p>
      </div>
    </main>
  );
}

function SummaryCards({ crew }: { crew: CrewPortalData }) {
  const cards = [
    ["Assignments", crew.activeAssignments.length],
    ["Schedule blocks", crew.schedulesInWindow.length],
    ["Period entries", crew.scheduleEntriesInWindow.length],
    ["Time off", crew.timeOffInWindow.length],
    ["Requests", crew.scheduleRequests.length],
    ["Coverage", crew.upcomingFlights.length],
    ["Warnings", crew.complianceWarnings.length + crew.availabilityWarnings.length],
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {cards.map(([label, value]) => (
        <article className="rounded-md border border-zinc-200 bg-white p-4" key={label}>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        </article>
      ))}
    </section>
  );
}

export default async function CrewPortalPage({ searchParams }: PageProps) {
  const currentUser = await requireRole([UserRole.CREW]);
  const queryParams = await searchParams;
  const error = firstSearchParam(queryParams.error);
  const submitted = firstSearchParam(queryParams.submitted);
  const crew = await getCrewPortalData(currentUser.id);

  if (!crew) {
    return <SetupRequired email={currentUser.email} />;
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Crew Self-Service Portal
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {crew.firstName} {crew.lastName}
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                #{crew.employeeNumber} | Base {crew.baseStation.code} - {crew.baseStation.city}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(crew.employmentStatus)}`}>
                {formatStatus(crew.employmentStatus)}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(crew.dutyStatus)}`}>
                {formatStatus(crew.dutyStatus)}
              </span>
            </div>
          </div>
        </header>

        <section className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-semibold">Portal boundary</p>
          <p className="mt-1">
            This portal submits requests for this linked crew profile only. Admin/ops
            review is still required before requests affect planning, and the portal
            cannot approve requests, publish schedules, change aircraft assignments,
            edit compliance records, or create logistics records.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {[
            ["Submit", "Crew submits time off, pattern, duty preference, swap, or note requests."],
            ["Review", "Admin/ops reviews submitted items on time-off and schedule-period queues."],
            ["Plan", "Approved requests can inform draft entries; assignments stay explicit."],
          ].map(([title, body]) => (
            <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={title}>
              <p className="text-sm font-semibold text-zinc-950">{title}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-600">{body}</p>
            </article>
          ))}
        </section>

        {error ? (
          <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </section>
        ) : null}

        {submitted ? (
          <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {submitted === "time-off" ? "Time-off request submitted." : "Schedule request submitted."}
          </section>
        ) : null}

        <SummaryCards crew={crew} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Section eyebrow="Warning-only" title="Attention">
            {crew.availabilityWarnings.length + crew.complianceWarnings.length === 0 ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                No warning-only portal items found in the {CREW_MEMBER_CONTEXT_WINDOW_DAYS}-day window.
              </p>
            ) : (
              <ul className="grid gap-2 text-sm text-amber-900">
                {[...crew.availabilityWarnings, ...crew.complianceWarnings].map((warning) => (
                  <li className="rounded-md border border-amber-200 bg-amber-50 p-3" key={warning}>
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section eyebrow="Crew self-service" title="Request Submission">
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              Time-off requests go to the time-off queue. Schedule requests go to
              the selected schedule period for admin/ops review.
            </div>
            <div className="mt-3 grid gap-3" id="request-submission">
              <TimeOffRequestForm />
              <ScheduleRequestForm crew={crew} />
            </div>
          </Section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Schedule Blocks">
            {crew.schedulesInWindow.length === 0 ? (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                No published schedule blocks in the current window.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {crew.schedulesInWindow.map((schedule) => (
                  <li className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={schedule.id}>
                    <p className="font-semibold text-zinc-900">
                      {toDate(schedule.date)} | {formatStatus(schedule.dutyStatus)}
                    </p>
                    <p className="mt-1 text-zinc-600">
                      {toDateTime(schedule.startsAt)} - {toDateTime(schedule.endsAt)} |{" "}
                      {schedule.station?.code ?? "No station"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Schedule Period Entries">
            {crew.scheduleEntriesInWindow.length === 0 ? (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                No schedule-period entries in the current window.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {crew.scheduleEntriesInWindow.map((entry) => (
                  <li className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={entry.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-900">
                        {toDate(entry.date)} | {formatStatus(entry.dutyStatus)}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses(entry.status)}`}>
                        {formatStatus(entry.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-600">
                      {entry.period.name} | {entry.station?.code ?? "No station"} |{" "}
                      {entry.status === CrewScheduleEntryStatus.DRAFT ? "planning draft" : "published"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Time Off">
            {crew.timeOffInWindow.length === 0 ? (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                No pending or approved time off in the current window.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {crew.timeOffInWindow.map((request) => (
                  <li className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={request.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-900">{formatStatus(request.requestType)}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses(request.status)}`}>
                        {formatStatus(request.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-600">
                      {toDate(request.startDate)} - {toDate(request.endDate)}
                    </p>
                    {request.status === TimeOffRequestStatus.PENDING ? (
                      <p className="mt-1 text-xs text-zinc-500">Awaiting admin/ops review.</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Schedule Requests">
            {crew.scheduleRequests.length === 0 ? (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                No schedule requests found.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {crew.scheduleRequests.map((request) => (
                  <li className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={request.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-900">{formatStatus(request.requestType)}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses(request.status)}`}>
                        {formatStatus(request.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-600">{request.period.name}</p>
                    <p className="mt-1 text-zinc-600">
                      {toDate(request.startDate)} - {toDate(request.endDate)}
                    </p>
                    {request.requestedPattern ? (
                      <p className="mt-1 text-zinc-500">Pattern: {request.requestedPattern.name}</p>
                    ) : null}
                    {request.requestedSwapCrewMember ? (
                      <p className="mt-1 text-zinc-500">
                        Swap with {request.requestedSwapCrewMember.firstName}{" "}
                        {request.requestedSwapCrewMember.lastName}
                      </p>
                    ) : null}
                    {request.reviewNotes ? (
                      <p className="mt-1 text-zinc-500">Review notes: {request.reviewNotes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section title="Aircraft Assignments">
          {crew.activeAssignments.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No active aircraft assignment.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {crew.activeAssignments.map((assignment) => (
                <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={assignment.id}>
                  <p className="font-semibold text-zinc-900">
                    {assignment.aircraft.tailNumber} | {formatStatus(assignment.seatRole)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {toDateTime(assignment.startsAt)} -{" "}
                    {assignment.endsAt ? toDateTime(assignment.endsAt) : "open block"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </Section>

        <Section title="Upcoming FlightLeg Coverage">
          {crew.upcomingFlights.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No upcoming FlightLeg coverage in the current window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Flight</th>
                    <th className="px-3 py-2 font-medium">Route</th>
                    <th className="px-3 py-2 font-medium">Departure</th>
                    <th className="px-3 py-2 font-medium">Aircraft</th>
                    <th className="px-3 py-2 font-medium">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {crew.upcomingFlights.map((flight) => (
                    <tr className="border-b border-zinc-100" key={flight.id}>
                      <td className="px-3 py-2.5 font-medium text-zinc-900">{flight.flightNumber}</td>
                      <td className="px-3 py-2.5 text-zinc-700">{flight.route}</td>
                      <td className="px-3 py-2.5 text-zinc-700">{toDateTime(flight.scheduledDeparture)}</td>
                      <td className="px-3 py-2.5 text-zinc-700">{flight.tailNumber}</td>
                      <td className="px-3 py-2.5">
                        {flight.flightLegId ? (
                          <Link
                            className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                            href={`/operations-control/${flight.flightLegId}`}
                          >
                            Detail
                          </Link>
                        ) : (
                          <span className="text-xs text-zinc-500">No detail</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}
