import { DutyStatus, EmploymentStatus, SeatRole, TimeOffRequestStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CREW_MEMBER_CONTEXT_WINDOW_DAYS,
  CrewMemberContextData,
  CrewMemberContextFlight,
  getCrewMemberContextData,
} from "@/lib/crew-member-context-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    crewMemberId: string;
  }>;
};

type QualificationRow = CrewMemberContextData["qualifications"][number];

function toDate(value: Date | null): string {
  if (!value) {
    return "No expiration";
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

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function formatAircraftType(value: string): string {
  return value.replaceAll("_", "-");
}

function employmentBadgeClasses(status: EmploymentStatus): string {
  if (status === EmploymentStatus.ACTIVE) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === EmploymentStatus.ON_LEAVE) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function dutyBadgeClasses(status: DutyStatus): string {
  if (status === DutyStatus.ON_DUTY || status === DutyStatus.RESERVE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === DutyStatus.SICK || status === DutyStatus.VACATION) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === DutyStatus.TRAINING || status === DutyStatus.DEADHEADING) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function qualificationBadgeClasses(qualification: QualificationRow, now: Date): string {
  if (!qualification.expiresAt) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  const expiringSoon = new Date(now);
  expiringSoon.setDate(expiringSoon.getDate() + 30);

  if (qualification.expiresAt < now) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (qualification.expiresAt <= expiringSoon) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function qualificationStatus(qualification: QualificationRow, now: Date): string {
  if (!qualification.expiresAt) {
    return "Current";
  }

  const expiringSoon = new Date(now);
  expiringSoon.setDate(expiringSoon.getDate() + 30);

  if (qualification.expiresAt < now) {
    return "Expired";
  }
  if (qualification.expiresAt <= expiringSoon) {
    return "Expiring soon";
  }
  return "Current";
}

function complianceBadgeClasses(status: string, expiresAt?: Date | null): string {
  if (status === "EXPIRED" || status === "VOIDED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (expiresAt && expiresAt < new Date()) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "SUPERSEDED") {
    return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function flightCoverageLabel(flight: CrewMemberContextFlight): string {
  if (!flight.coverage) {
    return "No coverage data";
  }
  if (!flight.coverage.isCovered) {
    return `Missing ${flight.coverage.missingRoles.map(formatRoleLabel).join(", ")}`;
  }
  if (flight.coverage.warnings.length > 0) {
    return `${flight.coverage.warnings.length} warning${
      flight.coverage.warnings.length === 1 ? "" : "s"
    }`;
  }
  return "Covered";
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

export default async function CrewMemberContextPage({ params }: PageProps) {
  const { crewMemberId } = await params;
  const crewMember = await getCrewMemberContextData(crewMemberId);

  if (!crewMember) {
    notFound();
  }

  const now = new Date();
  const availabilityLabel =
    crewMember.availabilityWarnings.length === 0 ? "Available context clear" : "Review warnings";

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                <Link className="text-sky-700 hover:text-sky-900" href="/crew">
                  Back to crew roster
                </Link>
                <Link className="text-sky-700 hover:text-sky-900" href="/crew/scheduling">
                  Crew planner
                </Link>
                <Link className="text-sky-700 hover:text-sky-900" href="/crew/scheduling/time-off">
                  Time off
                </Link>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Crew Member Context
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                {crewMember.firstName} {crewMember.lastName}
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                #{crewMember.employeeNumber} | Base {crewMember.baseStation.code} -{" "}
                {crewMember.baseStation.city}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${employmentBadgeClasses(
                  crewMember.employmentStatus,
                )}`}
              >
                {formatStatus(crewMember.employmentStatus)}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${dutyBadgeClasses(
                  crewMember.dutyStatus,
                )}`}
              >
                {formatStatus(crewMember.dutyStatus)}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Availability</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{availabilityLabel}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active assignments</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {crewMember.activeAssignments.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Schedule blocks</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {crewMember.schedulesInWindow.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Period entries</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {crewMember.scheduleEntriesInWindow.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Time-off overlaps</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {crewMember.timeOffInWindow.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Upcoming coverage</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {crewMember.upcomingFlights.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Compliance warnings</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {crewMember.complianceWarnings.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Open logistics needs</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {crewMember.logisticsNeeds.length}
            </p>
          </article>
        </section>

        <Section eyebrow="Warning-only" title="Availability Snapshot">
          <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            This page is planning context only. It does not assign crew, enforce
            duty/rest, write schedules, approve time off, or block release actions.
          </div>
          {crewMember.availabilityWarnings.length === 0 ? (
            <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              No availability warnings found in the {CREW_MEMBER_CONTEXT_WINDOW_DAYS}-day planning
              window.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 text-sm text-amber-900 md:grid-cols-2">
              {crewMember.availabilityWarnings.map((warning) => (
                <li className="rounded-md border border-amber-200 bg-amber-50 p-3" key={warning}>
                  {warning}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section eyebrow="Planning context" title="Crew Logistics">
          <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            Logistics records show location and travel-support context only. They do not
            create bookings, expenses, aircraft assignments, schedule entries, or duty/rest
            compliance decisions.
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-950">Latest location records</h3>
              {crewMember.locationRecords.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No crew location records.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {crewMember.locationRecords.map((location) => (
                    <li key={location.id}>
                      <p className="font-medium text-zinc-900">
                        {location.station
                          ? `${location.station.code} - ${location.station.city}`
                          : location.locationText ?? "Location not specified"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatStatus(location.source)} | effective {toDateTime(location.effectiveAt)}
                      </p>
                      {location.notes ? <p className="text-xs text-zinc-500">{location.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-950">Open logistics needs</h3>
              {crewMember.logisticsNeeds.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No open logistics needs.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {crewMember.logisticsNeeds.map((need) => (
                    <li key={need.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-900">
                          {formatStatus(need.needType)}
                        </span>
                        <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
                          {formatStatus(need.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {need.fromStation?.code ?? "Origin TBD"} - {need.toStation?.code ?? "Destination TBD"}
                        {need.neededBy ? ` | needed by ${toDateTime(need.neededBy)}` : ""}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {need.aircraft ? `Aircraft ${need.aircraft.tailNumber}` : "No aircraft link"}
                        {need.flightLeg ? ` | ${need.flightLeg.flightNumber ?? "FlightLeg"}` : ""}
                      </p>
                      {need.providerName || need.confirmationNumber ? (
                        <p className="text-xs text-zinc-500">
                          {need.providerName ?? "Provider TBD"}
                          {need.confirmationNumber ? ` | ${need.confirmationNumber}` : ""}
                        </p>
                      ) : null}
                      {need.notes ? <p className="text-xs text-zinc-500">{need.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Qualifications">
            {crewMember.qualifications.length === 0 ? (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                No qualifications recorded.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {crewMember.qualifications.map((qualification) => (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${qualificationBadgeClasses(
                      qualification,
                      now,
                    )}`}
                    key={qualification.id}
                  >
                    {formatAircraftType(qualification.aircraftType)}{" "}
                    {formatRoleLabel(qualification.seatRole)} -{" "}
                    {qualificationStatus(qualification, now)} ({toDate(qualification.expiresAt)})
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section eyebrow="Warning-only" title="Compliance Evidence">
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              Compliance records are evidence context only. They do not assign
              crew, enforce duty/rest, sign releases, or block operations in
              this slice.
            </div>
            {crewMember.complianceWarnings.length === 0 ? (
              <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                No compliance warnings found from recorded evidence.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 text-sm text-amber-900">
                {crewMember.complianceWarnings.map((warning) => (
                  <li className="rounded-md border border-amber-200 bg-amber-50 p-3" key={warning}>
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section title="Crew Compliance Records">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-950">Certificates / ratings</h3>
              {crewMember.certificates.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No certificate records.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {crewMember.certificates.map((item) => (
                    <li key={item.id}>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceBadgeClasses(
                          item.status,
                          item.expiresAt,
                        )}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                      <p className="mt-1 font-medium text-zinc-900">
                        {formatStatus(item.certificateType)}
                        {item.ratingOrEndorsement ? ` - ${item.ratingOrEndorsement}` : ""}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.aircraftType ? formatAircraftType(item.aircraftType) : "No aircraft type"} |{" "}
                        {item.seatRole ? formatRoleLabel(item.seatRole) : "No seat role"} | expires{" "}
                        {toDate(item.expiresAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-950">Medical</h3>
              {crewMember.medicals.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No medical records.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {crewMember.medicals.map((item) => (
                    <li key={item.id}>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceBadgeClasses(
                          item.status,
                          item.expiresAt,
                        )}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                      <p className="mt-1 font-medium text-zinc-900">
                        {formatStatus(item.medicalClass)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Issued {toDate(item.issuedAt)} | expires {toDate(item.expiresAt)}
                      </p>
                      {item.limitations ? <p className="text-xs text-zinc-500">{item.limitations}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-950">Training</h3>
              {crewMember.trainingEvents.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No training records.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {crewMember.trainingEvents.map((item) => (
                    <li key={item.id}>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceBadgeClasses(
                          item.status,
                          item.expiresAt,
                        )}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                      <p className="mt-1 font-medium text-zinc-900">{item.programName}</p>
                      <p className="text-xs text-zinc-500">
                        {formatStatus(item.trainingType)} | {formatStatus(item.result)} | completed{" "}
                        {toDate(item.completedAt)} | expires {toDate(item.expiresAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-950">Checks</h3>
              {crewMember.checkEvents.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No check records.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {crewMember.checkEvents.map((item) => (
                    <li key={item.id}>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceBadgeClasses(
                          item.status,
                          item.expiresAt,
                        )}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                      <p className="mt-1 font-medium text-zinc-900">{formatStatus(item.checkType)}</p>
                      <p className="text-xs text-zinc-500">
                        {item.aircraftType ? formatAircraftType(item.aircraftType) : "No aircraft type"} |{" "}
                        {item.seatRole ? formatRoleLabel(item.seatRole) : "No seat role"} |{" "}
                        {formatStatus(item.result)} | expires {toDate(item.expiresAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-950">Recency</h3>
              {crewMember.recencyEvents.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No recency records.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {crewMember.recencyEvents.map((item) => (
                    <li key={item.id}>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceBadgeClasses(
                          item.status,
                        )}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                      <p className="mt-1 font-medium text-zinc-900">{formatStatus(item.recencyType)}</p>
                      <p className="text-xs text-zinc-500">
                        {toDate(item.eventAt)} | qty {item.quantity ?? "n/a"} | {formatStatus(item.result)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold text-zinc-950">Duty / rest evidence</h3>
              <div className="mt-2 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Duty</p>
                  {crewMember.dutyPeriods.length === 0 ? (
                    <p className="mt-1 text-zinc-600">No duty records.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {crewMember.dutyPeriods.map((item) => (
                        <li key={item.id}>
                          {formatStatus(item.status)} | {toDateTime(item.startsAt)} -{" "}
                          {toDateTime(item.endsAt)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Rest</p>
                  {crewMember.restPeriods.length === 0 ? (
                    <p className="mt-1 text-zinc-600">No rest records.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {crewMember.restPeriods.map((item) => (
                        <li key={item.id}>
                          {formatStatus(item.status)} | {toDateTime(item.startsAt)} -{" "}
                          {toDateTime(item.endsAt)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Contact And Notes">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-zinc-500">Phone</dt>
                <dd className="font-medium text-zinc-900">{crewMember.phone ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Email</dt>
                <dd className="font-medium text-zinc-900">{crewMember.email ?? "Not recorded"}</dd>
              </div>
            </dl>
          </Section>
        </div>

        <Section title="Current Aircraft Assignments">
          {crewMember.activeAssignments.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No active aircraft-block assignment.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {crewMember.activeAssignments.map((assignment) => (
                <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={assignment.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-zinc-950">
                      {formatRoleLabel(assignment.seatRole)} on {assignment.aircraft.tailNumber}
                    </h3>
                    <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
                      {formatAircraftType(assignment.aircraft.type)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">
                    Starts {toDateTime(assignment.startsAt)}
                    <br />
                    Ends {assignment.endsAt ? toDateTime(assignment.endsAt) : "open block"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <Link className="text-sky-700 hover:text-sky-900" href={`/aircraft/${assignment.aircraft.id}`}>
                      Aircraft context
                    </Link>
                    <Link
                      className="text-sky-700 hover:text-sky-900"
                      href={`/aircraft/${assignment.aircraft.id}/crew`}
                    >
                      Manage aircraft crew
                    </Link>
                    <Link
                      className="text-sky-700 hover:text-sky-900"
                      href={`/crew/scheduling?aircraft=${assignment.aircraft.id}&assignment=assigned`}
                    >
                      Planner filter
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Schedule Blocks">
            {crewMember.schedulesInWindow.length === 0 ? (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                No schedule blocks in the planning window.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {crewMember.schedulesInWindow.map((schedule) => (
                  <li className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={schedule.id}>
                    <div className="font-semibold text-zinc-900">
                      {toDate(schedule.date)} | {formatStatus(schedule.dutyStatus)}
                    </div>
                    <div className="mt-1 text-zinc-600">
                      {toDateTime(schedule.startsAt)} - {toDateTime(schedule.endsAt)} |{" "}
                      {schedule.station?.code ?? "No station"}
                    </div>
                    {schedule.notes ? <p className="mt-1 text-zinc-500">{schedule.notes}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Schedule Period Entries">
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              These are schedule-period planning rows. They do not assign this
              crew member to aircraft and do not replace aircraft-block coverage.
            </div>
            {crewMember.scheduleEntriesInWindow.length === 0 ? (
              <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                No schedule-period entries in the planning window.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {crewMember.scheduleEntriesInWindow.map((entry) => (
                  <li className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={entry.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-zinc-900">
                        {toDate(entry.date)} | {formatStatus(entry.dutyStatus)}
                      </span>
                      <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
                        {formatStatus(entry.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-600">
                      {entry.period.name} | {entry.station?.code ?? "No station"}
                    </p>
                    <p className="mt-1 text-zinc-600">
                      {toDateTime(entry.startsAt)} - {toDateTime(entry.endsAt)}
                    </p>
                    {entry.rotationPattern ? (
                      <p className="mt-1 text-zinc-500">
                        Pattern: {entry.rotationPattern.name}
                      </p>
                    ) : null}
                    {entry.notes ? <p className="mt-1 text-zinc-500">{entry.notes}</p> : null}
                    <Link
                      className="mt-2 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                      href={`/crew/scheduling/periods/${entry.period.id}#schedule-entries`}
                    >
                      Schedule period detail
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Time Off">
            {crewMember.timeOffInWindow.length === 0 ? (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                No pending or approved time off overlaps the planning window.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {crewMember.timeOffInWindow.map((request) => (
                  <li className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={request.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-zinc-900">
                        {formatStatus(request.requestType)}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          request.status === TimeOffRequestStatus.APPROVED
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {formatStatus(request.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-600">
                      {toDate(request.startDate)} - {toDate(request.endDate)}
                    </p>
                    {request.reason ? <p className="mt-1 text-zinc-500">{request.reason}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section title="Upcoming FlightLeg Coverage">
          {crewMember.upcomingFlights.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No upcoming covered FlightLegs found in the planning window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Flight</th>
                    <th className="px-3 py-2 font-medium">Route</th>
                    <th className="px-3 py-2 font-medium">Schedule</th>
                    <th className="px-3 py-2 font-medium">Aircraft / role</th>
                    <th className="px-3 py-2 font-medium">Coverage</th>
                    <th className="px-3 py-2 font-medium">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {crewMember.upcomingFlights.map((flight) => (
                    <tr className="border-b border-zinc-100 align-top" key={flight.id}>
                      <td className="px-3 py-2.5 font-medium text-zinc-900">
                        {flight.flightNumber}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700">{flight.route}</td>
                      <td className="px-3 py-2.5 text-zinc-700">
                        {toDateTime(flight.scheduledDeparture)}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700">
                        {flight.tailNumber} | {flight.seatRoles.map(formatRoleLabel).join(", ")}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700">{flightCoverageLabel(flight)}</td>
                      <td className="px-3 py-2.5">
                        {flight.flightLegId ? (
                          <Link
                            className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                            href={`/operations-control/${flight.flightLegId}`}
                          >
                            Operations detail
                          </Link>
                        ) : (
                          <span className="text-xs text-zinc-500">No FlightLeg detail</span>
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
