import { CrewScheduleEntryStatus, TimeOffRequestStatus, UserRole } from "@prisma/client";
import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import {
  CREW_MEMBER_CONTEXT_WINDOW_DAYS,
  CrewPortalData,
  getCrewPortalData,
} from "@/lib/crew-member-context-queries";

export const dynamic = "force-dynamic";

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

export default async function CrewPortalPage() {
  const currentUser = await requireRole([UserRole.CREW]);
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
            This first crew portal is read-only. It does not submit requests,
            approve requests, publish schedules, change aircraft assignments,
            edit compliance records, or create logistics records.
          </p>
        </section>

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

          <Section eyebrow="Prompt 196 placeholder" title="Request Submission">
            <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              Crew request submission is planned next. This placeholder will
              become the entry point for schedule requests and time-off requests
              scoped to this crew member only.
            </p>
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
