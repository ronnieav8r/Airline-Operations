import {
  AircraftType,
  DutyStatus,
  EmploymentStatus,
  SeatRole,
  TimeOffRequestStatus,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createCrewQualificationAction,
  deleteCrewQualificationAction,
  expireCrewQualificationAction,
  updateCrewMemberAction,
  updateCrewQualificationAction,
} from "@/app/crew/actions";
import {
  CREW_MEMBER_CONTEXT_WINDOW_DAYS,
  CrewMemberContextData,
  CrewMemberContextFlight,
  getCrewMemberContextData,
} from "@/lib/crew-member-context-queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    crewMemberId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
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

function toDueDate(value: Date | null): string {
  return value ? toDate(value) : "Not calculated";
}

function toProfileDate(value: Date | null): string {
  return value ? toDate(value) : "Not set";
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

function toInputDate(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
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
    return "status-badge-success";
  }
  if (status === EmploymentStatus.ON_LEAVE) {
    return "status-badge-caution";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function dutyBadgeClasses(status: DutyStatus): string {
  if (status === DutyStatus.ON_DUTY || status === DutyStatus.RESERVE) {
    return "status-badge-info";
  }
  if (status === DutyStatus.SICK || status === DutyStatus.VACATION) {
    return status === DutyStatus.SICK ? "status-badge-stop" : "status-badge-caution";
  }
  if (status === DutyStatus.TRAINING || status === DutyStatus.DEADHEADING) {
    return "status-badge-info";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function qualificationBadgeClasses(qualification: QualificationRow, now: Date): string {
  if (!qualification.expiresAt) {
    return "status-badge-success";
  }

  const expiringSoon = new Date(now);
  expiringSoon.setDate(expiringSoon.getDate() + 30);

  if (qualification.expiresAt < now) {
    return "status-badge-stop";
  }
  if (qualification.expiresAt <= expiringSoon) {
    return "status-badge-caution";
  }
  return "status-badge-success";
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
    return "status-badge-stop";
  }
  if (expiresAt && expiresAt < new Date()) {
    return "status-badge-stop";
  }
  if (status === "SUPERSEDED") {
    return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
  return "status-badge-success";
}

function complianceStatusBadgeClasses(status: string): string {
  if (status === "EXPIRED" || status === "MISSING") {
    return "status-badge-stop";
  }
  if (status === "DUE_SOON" || status === "NOT_ENOUGH_DATA") {
    return "status-badge-caution";
  }
  return "status-badge-success";
}

function complianceEvidenceLabel(
  evidenceRef: CrewMemberContextData["complianceFindings"][number]["evidenceRef"],
): string {
  if (!evidenceRef) {
    return "Evidence missing";
  }

  const labels: Record<typeof evidenceRef.type, string> = {
    CrewCertificate: "Certificate record",
    CrewCheckEvent: "Check record",
    CrewMedical: "Medical record",
    CrewRecencyEvent: "Recency record",
    CrewTrainingEvent: "Training record",
  };

  return labels[evidenceRef.type];
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

type StationOption = {
  city: string;
  code: string;
  id: string;
};

function CrewMemberEditForm({
  crewMember,
  stations,
}: {
  crewMember: CrewMemberContextData;
  stations: StationOption[];
}) {
  const action = updateCrewMemberAction.bind(null, crewMember.id);

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Crew database
          </p>
          <h2 className="text-lg font-semibold text-zinc-950">Core Profile</h2>
        </div>
      </div>
      <form action={action} className="mt-3 grid gap-3 lg:grid-cols-4">
        <input name="returnTo" type="hidden" value={`/crew/${crewMember.id}`} />
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Employee #</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={crewMember.employeeNumber} name="employeeNumber" required />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">First name</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={crewMember.firstName} name="firstName" required />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Last name</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={crewMember.lastName} name="lastName" required />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Base</span>
          <select className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={crewMember.baseStation.id} name="baseStationId" required>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.code} - {station.city}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Employment</span>
          <select className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={crewMember.employmentStatus} name="employmentStatus" required>
            {Object.values(EmploymentStatus).map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Duty</span>
          <select className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={crewMember.dutyStatus} name="dutyStatus" required>
            {Object.values(DutyStatus).map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Hire date</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={toInputDate(crewMember.hireDate)} name="hireDate" type="date" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Date of birth</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={toInputDate(crewMember.dateOfBirth)} name="dateOfBirth" type="date" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Phone</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={crewMember.phone ?? ""} name="phone" />
        </label>
        <label className="block lg:col-span-2">
          <span className="text-xs font-medium text-zinc-600">Email</span>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" defaultValue={crewMember.email ?? ""} name="email" type="email" />
        </label>
        <div className="flex items-end">
          <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800" type="submit">
            Save core profile
          </button>
        </div>
      </form>
    </section>
  );
}

function QualificationForm({
  action,
  buttonLabel,
  qualification,
}: {
  action: (formData: FormData) => void;
  buttonLabel: string;
  qualification?: QualificationRow;
}) {
  return (
    <form action={action} className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2 lg:grid-cols-6">
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Aircraft</span>
        <select className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs" defaultValue={qualification?.aircraftType ?? AircraftType.CL_65} name="aircraftType" required>
          {Object.values(AircraftType).map((type) => (
            <option key={type} value={type}>
              {formatAircraftType(type)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Seat</span>
        <select className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs" defaultValue={qualification?.seatRole ?? SeatRole.FO} name="seatRole" required>
          {Object.values(SeatRole).map((role) => (
            <option key={role} value={role}>
              {formatRoleLabel(role)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Issued</span>
        <input className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs" defaultValue={toInputDate(qualification?.issuedAt ?? new Date())} name="issuedAt" required type="date" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Expires</span>
        <input className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs" defaultValue={toInputDate(qualification?.expiresAt)} name="expiresAt" type="date" />
      </label>
      <label className="block lg:col-span-2">
        <span className="text-xs font-medium text-zinc-600">Notes</span>
        <input className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs" defaultValue={qualification?.notes ?? ""} name="notes" />
      </label>
      <div className="flex items-end">
        <button className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800" type="submit">
          {buttonLabel}
        </button>
      </div>
    </form>
  );
}

function QualificationManagement({
  crewMember,
}: {
  crewMember: CrewMemberContextData;
}) {
  const createAction = createCrewQualificationAction.bind(null, crewMember.id);

  return (
    <Section title="Qualifications" eyebrow="Crew database" >
      {crewMember.qualifications.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          No qualifications recorded.
        </p>
      ) : (
        <div className="grid gap-3">
          {crewMember.qualifications.map((qualification) => {
            const updateAction = updateCrewQualificationAction.bind(
              null,
              crewMember.id,
              qualification.id,
            );
            const expireAction = expireCrewQualificationAction.bind(
              null,
              crewMember.id,
              qualification.id,
            );
            const deleteAction = deleteCrewQualificationAction.bind(
              null,
              crewMember.id,
              qualification.id,
            );

            return (
              <article className="rounded-md border border-zinc-200 bg-white p-3" key={qualification.id}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${qualificationBadgeClasses(
                      qualification,
                      new Date(),
                    )}`}
                  >
                    {formatAircraftType(qualification.aircraftType)} {formatRoleLabel(qualification.seatRole)} -{" "}
                    {qualificationStatus(qualification, new Date())}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Issued {toDate(qualification.issuedAt)} | expires {toDate(qualification.expiresAt)}
                  </span>
                </div>
                <QualificationForm action={updateAction} buttonLabel="Save qualification" qualification={qualification} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={expireAction}>
                    <button className="rounded-md border status-surface-caution px-3 py-1.5 text-xs font-semibold hover:bg-yellow-100" type="submit">
                      Expire now
                    </button>
                  </form>
                  <form action={deleteAction}>
                    <button className="rounded-md border status-surface-stop px-3 py-1.5 text-xs font-semibold hover:bg-red-800" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-zinc-950">Add qualification</h3>
        <div className="mt-2">
          <QualificationForm action={createAction} buttonLabel="Add qualification" />
        </div>
      </div>
    </Section>
  );
}

export default async function CrewMemberContextPage({ params, searchParams }: PageProps) {
  const { crewMemberId } = await params;
  const queryParams = await searchParams;
  const [crewMember, stations] = await Promise.all([
    getCrewMemberContextData(crewMemberId),
    prisma.station.findMany({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      select: {
        city: true,
        code: true,
        id: true,
      },
    }),
  ]);
  const error = firstSearchParam(queryParams.error);

  if (!crewMember) {
    notFound();
  }

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
                <Link className="text-sky-700 hover:text-sky-900" href={`/crew/${crewMemberId}/logistics`}>
                  Manage logistics
                </Link>
                <Link className="text-sky-700 hover:text-sky-900" href={`/crew/${crewMemberId}/compliance`}>
                  Manage compliance
                </Link>
                {crewMember.activeAssignments[0] ? (
                  <Link
                    className="text-sky-700 hover:text-sky-900"
                    href={`/aircraft/${crewMember.activeAssignments[0].aircraft.id}/crew?crewMemberId=${crewMember.id}`}
                  >
                    Aircraft crew
                  </Link>
                ) : null}
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
              <p className="mt-1 text-sm text-zinc-600">DOB {toProfileDate(crewMember.dateOfBirth)}</p>
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

        {error ? (
          <section className="rounded-md border status-surface-stop p-3 text-sm">
            {decodeURIComponent(error)}
          </section>
        ) : null}

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

        <CrewMemberEditForm crewMember={crewMember} stations={stations} />

        <Section eyebrow="Warning-only" title="Availability Snapshot">
          {crewMember.availabilityWarnings.length === 0 ? (
            <p className="rounded-md border status-surface-success p-3 text-sm">
              No availability warnings found in the {CREW_MEMBER_CONTEXT_WINDOW_DAYS}-day planning
              window.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              {crewMember.availabilityWarnings.map((warning) => (
                <li className="rounded-md border status-surface-caution p-3" key={warning}>
                  {warning}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section eyebrow="Planning context" title="Crew Logistics">
          <div className="rounded-md border status-surface-info p-3 text-sm">
            Logistics records show location and travel-support context only. They do not
            create bookings, expenses, aircraft assignments, schedule entries, or duty/rest
            compliance decisions.
          </div>
          <Link
            className="mt-3 inline-flex rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            href={`/crew/${crewMember.id}/logistics`}
          >
            Manage logistics
          </Link>
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

        <div className="grid gap-4 lg:grid-cols-2" id="qualifications">
          <QualificationManagement crewMember={crewMember} />

          <Section eyebrow="Warning-only" title="Compliance Requirements">
            <Link
              className="inline-flex rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              href={`/crew/${crewMember.id}/compliance`}
            >
              Manage compliance records
            </Link>
            <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-950">Requirements checklist</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceStatusBadgeClasses(
                    crewMember.complianceStatus,
                  )}`}
                >
                  {formatStatus(crewMember.complianceStatus)}
                </span>
              </div>
              {crewMember.complianceFindings.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">No active crew compliance rules.</p>
              ) : (
                <ul className="mt-3 grid gap-2">
                  {crewMember.complianceFindings.map((finding) => (
                    <li className="rounded-md border border-zinc-200 bg-white p-3" key={finding.ruleKey}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-zinc-950">{finding.title}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceStatusBadgeClasses(
                            finding.status,
                          )}`}
                        >
                          {formatStatus(finding.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600">
                        Due {toDueDate(finding.dueAt)} | lead {finding.warningLeadDays} days |{" "}
                        {finding.sourceCitation}
                      </p>
                      <p className="mt-1 text-xs font-medium text-zinc-700">
                        {complianceEvidenceLabel(finding.evidenceRef)}
                        {finding.lastSatisfiedAt ? ` | last satisfied ${toDate(finding.lastSatisfiedAt)}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{finding.message}</p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-zinc-500">
                Warning-only review. Planned events remain planning context until completed evidence is recorded.
              </p>
            </div>
            {crewMember.complianceWarnings.length === 0 ? (
              <p className="mt-3 rounded-md border status-surface-success p-3 text-sm">
                No compliance warnings found from recorded evidence.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 text-sm">
                {crewMember.complianceWarnings.map((warning) => (
                  <li className="rounded-md border status-surface-stop p-3" key={warning}>
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
                            ? "status-badge-caution"
                            : "status-badge-info"
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
