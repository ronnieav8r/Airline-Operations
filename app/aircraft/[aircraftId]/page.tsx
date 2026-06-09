import {
  AircraftStatus,
  AirworthinessReleaseStatus,
  AlertSeverity,
  AssignmentStatus,
  FlightLegStatus,
  OperatingPart,
  ReleaseStatus,
  SeatRole,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AircraftContextCrewAssignment,
  AircraftContextData,
  AircraftContextLeg,
  getAircraftContextData,
} from "@/lib/aircraft-context-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    aircraftId: string;
  }>;
};

function toDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function toOptionalDateTime(value: Date | null | undefined): string {
  return value ? toDateTime(value) : "Not set";
}

function formatAircraftType(value: string): string {
  return value.replaceAll("_", "-");
}

function formatOperatingPart(part: OperatingPart): string {
  return part.replace("PART_", "Part ");
}

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function aircraftStatusBadgeClasses(status: AircraftStatus): string {
  if (status === AircraftStatus.IN_FLIGHT) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === AircraftStatus.IN_MAINTENANCE || status === AircraftStatus.OUT_OF_SERVICE) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === AircraftStatus.RESERVED) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function legStatusBadgeClasses(status: FlightLegStatus): string {
  if (status === FlightLegStatus.ENROUTE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === FlightLegStatus.DELAYED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === FlightLegStatus.CANCELLED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  if (status === FlightLegStatus.COMPLETE) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function releaseBadgeClasses(status: ReleaseStatus | null): string {
  if (status === ReleaseStatus.RELEASED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === ReleaseStatus.PLANNED) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === ReleaseStatus.CANCELLED || status === ReleaseStatus.VOIDED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function assignmentBadgeClasses(status: AssignmentStatus): string {
  if (status === AssignmentStatus.ACTIVE) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === AssignmentStatus.PLANNED) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function severityBadgeClasses(severity: AlertSeverity): string {
  if (severity === AlertSeverity.CRITICAL) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (severity === AlertSeverity.HIGH) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }
  if (severity === AlertSeverity.MEDIUM) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function evidenceSummary(leg: AircraftContextLeg): string {
  const dispatchReady =
    leg.evidence.dispatchPackageReady &&
    leg.evidence.weatherSnapshotReady &&
    leg.evidence.notamSnapshotReady &&
    Boolean(leg.evidence.flightPlanStatus);

  return [
    `Manifest ${leg.evidence.manifestStatus ?? "missing"}`,
    `W&B ${leg.evidence.weightBalanceStatus ?? "missing"}`,
    `Locating ${leg.evidence.locatingStatus ?? "missing"}`,
    `Dispatch ${dispatchReady ? "ready" : "partial"}`,
  ].join(" | ");
}

function Section({
  children,
  id,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  id: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" id={id}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="text-sm text-zinc-600">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ActionLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      className={
        primary
          ? "inline-flex rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
          : "inline-flex rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
      }
      href={href}
    >
      {label}
    </Link>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
      {children}
    </div>
  );
}

function LegCard({ leg }: { leg: AircraftContextLeg }) {
  const detailHref = `/operations-control/${leg.flightLegId}`;

  return (
    <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="font-semibold text-sky-700 hover:text-sky-900" href={detailHref}>
            {leg.flightNumber}
          </Link>
          <p className="mt-1 text-sm text-zinc-700">
            {leg.departureStation.code} -&gt; {leg.arrivalStation.code}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {toDateTime(leg.scheduledDeparture)} to {toDateTime(leg.scheduledArrival)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${legStatusBadgeClasses(
              leg.status,
            )}`}
          >
            {leg.status}
          </span>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(
              leg.releaseStatus,
            )}`}
          >
            {leg.releaseStatus ?? "NO RELEASE"}
          </span>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Assignment</dt>
          <dd>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${assignmentBadgeClasses(
                leg.assignmentStatus,
              )}`}
            >
              {leg.assignmentStatus}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Authority</dt>
          <dd className="font-medium text-zinc-900">
            {leg.operatingAuthority
              ? `${formatOperatingPart(leg.operatingAuthority.operatingPart)}`
              : "Not assigned"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Controller</dt>
          <dd className="font-medium text-zinc-900">
            {leg.controllingEntity ?? "Not assigned"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Evidence</dt>
          <dd className="text-zinc-700">{evidenceSummary(leg)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionLink href={detailHref} label="Detail" primary />
        <ActionLink href={`${detailHref}/edit`} label="Edit" />
        <ActionLink href={`${detailHref}/manifest`} label="Manifest" />
        <ActionLink href={`${detailHref}/weight-balance`} label="W&B" />
        <ActionLink href={`${detailHref}/locating`} label="Locating" />
        <ActionLink href={`${detailHref}/dispatch`} label="Dispatch" />
      </div>
    </article>
  );
}

function CrewAssignmentCard({
  aircraft,
  assignment,
  now,
}: {
  aircraft: AircraftContextData;
  assignment: AircraftContextCrewAssignment;
  now: Date;
}) {
  const crewMemberName = `${assignment.crewMember.firstName} ${assignment.crewMember.lastName}`;
  const matchingQualification =
    assignment.crewMember.qualifications.find(
      (qualification) =>
        qualification.aircraftType === aircraft.type &&
        qualification.seatRole === assignment.seatRole,
    ) ?? null;
  const qualificationExpired =
    Boolean(matchingQualification?.expiresAt) &&
    matchingQualification!.expiresAt!.getTime() < now.getTime();

  return (
    <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
          {formatRoleLabel(assignment.seatRole)}
        </span>
        <span className="font-semibold text-zinc-950">{crewMemberName}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {assignment.crewMember.employeeNumber} | {assignment.crewMember.dutyStatus} |{" "}
        {assignment.crewMember.employmentStatus}
      </p>
      <p className="mt-2 text-xs leading-5 text-zinc-600">
        Starts {toDateTime(assignment.startsAt)}
        <br />
        Ends {assignment.endsAt ? toDateTime(assignment.endsAt) : "open block"}
      </p>
      {!matchingQualification ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          No matching qualification found for this aircraft type and seat.
        </p>
      ) : qualificationExpired ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          Qualification expired {toOptionalDateTime(matchingQualification.expiresAt)}.
        </p>
      ) : (
        <p className="mt-2 text-xs text-emerald-700">Matching qualification on file.</p>
      )}
    </article>
  );
}

function AirworthinessReleaseLabel({
  aircraft,
}: {
  aircraft: AircraftContextData;
}): string {
  const latestRelease = aircraft.airworthinessReleases[0] ?? null;
  const currentRelease =
    aircraft.airworthinessReleases.find(
      (release) =>
        release.status === AirworthinessReleaseStatus.RELEASED &&
        (!release.expiresAt || release.expiresAt > new Date()),
    ) ?? null;

  if (currentRelease) {
    return `Current: ${currentRelease.releaseNumber}`;
  }

  if (latestRelease) {
    return `Latest ${latestRelease.status}: ${latestRelease.releaseNumber}`;
  }

  return "No airworthiness release history";
}

export default async function AircraftContextPage({ params }: PageProps) {
  const { aircraftId } = await params;
  const aircraft = await getAircraftContextData(aircraftId);

  if (!aircraft) {
    notFound();
  }

  const now = new Date();
  const currentConfiguration = aircraft.configurations[0] ?? null;
  const latestMaintenanceEvent = aircraft.maintenanceEvents[0] ?? null;
  const activeCapabilityCodes = aircraft.capabilities
    .map((capability) => capability.capabilityCode)
    .join(", ");
  const assignmentFocus = aircraft.currentLeg ?? aircraft.nextLeg;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href="/aircraft">
                Back to fleet board
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Aircraft Context
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
                  {aircraft.tailNumber}
                </h1>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${aircraftStatusBadgeClasses(
                    aircraft.status,
                  )}`}
                >
                  {aircraft.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                {aircraft.name ?? "Unnamed aircraft"} | {formatAircraftType(aircraft.type)}
                {aircraft.seats ? ` | ${aircraft.seats} seats` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionLink href="/operations-control" label="Operations Control" />
              <ActionLink
                href={`/crew/scheduling?aircraft=${aircraft.id}&assignment=assigned`}
                label="Crew planner"
              />
              <ActionLink href={`/aircraft/${aircraft.id}/crew`} label="Crew assignment" />
              <ActionLink
                href={`/aircraft/${aircraft.id}/airworthiness`}
                label="Airworthiness"
                primary
              />
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Upcoming legs</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {aircraft.upcomingLegs.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active crew</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {aircraft.summary.activeCrewCount}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Crew gaps</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {aircraft.summary.missingCockpitRoles.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">A/W current</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {aircraft.summary.hasCurrentAirworthinessRelease ? "Yes" : "No"}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Alerts</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {aircraft.summary.activeAlertCount}
            </p>
          </article>
        </section>

        <nav className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {[
              ["Overview", "#overview"],
              ["Current Assignment", "#current-assignment"],
              ["Upcoming Legs", "#upcoming-legs"],
              ["Airworthiness", "#airworthiness"],
              ["Crew Coverage", "#crew-coverage"],
              ["Alerts", "#alerts"],
              ["Operations Links", "#operations-links"],
            ].map(([label, href]) => (
              <a
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
                href={href}
                key={href}
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <Section id="overview" title="Overview" subtitle="Aircraft identity and operating context.">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-semibold text-zinc-900">Home station</p>
              <p className="mt-1 text-zinc-700">
                {aircraft.homeStation
                  ? `${aircraft.homeStation.code} - ${aircraft.homeStation.city}`
                  : "Not assigned"}
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-semibold text-zinc-900">Configuration</p>
              <p className="mt-1 text-zinc-700">
                {currentConfiguration?.configurationLabel ?? "No active configuration"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Seats {currentConfiguration?.passengerSeatCount ?? aircraft.seats ?? "not set"} |
                Empty weight {currentConfiguration?.emptyWeight?.toString() ?? "not set"} | CG{" "}
                {currentConfiguration?.emptyWeightCg ?? "not set"}
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-semibold text-zinc-900">Capabilities</p>
              <p className="mt-1 text-zinc-700">
                {activeCapabilityCodes || "No active capability records"}
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="current-assignment"
          title="Current Assignment"
          subtitle="Current active leg when available, otherwise the next upcoming leg."
        >
          {assignmentFocus ? (
            <LegCard leg={assignmentFocus} />
          ) : (
            <EmptyState>No current or upcoming FlightLeg assignment found.</EmptyState>
          )}
        </Section>

        <Section
          id="upcoming-legs"
          title="Upcoming Legs"
          subtitle="FlightLegs assigned to this aircraft through aircraft assignments."
        >
          {aircraft.upcomingLegs.length === 0 ? (
            <EmptyState>No upcoming FlightLeg assignments found for this aircraft.</EmptyState>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {aircraft.upcomingLegs.map((leg) => (
                <LegCard key={leg.assignmentId} leg={leg} />
              ))}
            </div>
          )}
        </Section>

        <Section
          id="airworthiness"
          title="Airworthiness"
          subtitle="Aircraft maintenance airworthiness context. Operational FlightRelease remains separate."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-semibold text-zinc-900">Maintenance airworthiness release</p>
              <p className="mt-1 text-zinc-700">{AirworthinessReleaseLabel({ aircraft })}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Latest records: {aircraft.airworthinessReleases.length}
              </p>
              <div className="mt-3">
                <ActionLink
                  href={`/aircraft/${aircraft.id}/airworthiness`}
                  label="Manage airworthiness"
                  primary
                />
              </div>
            </div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <p className="font-semibold text-zinc-900">Latest maintenance</p>
              <p className="mt-1 text-zinc-700">
                {latestMaintenanceEvent
                  ? `${latestMaintenanceEvent.maintenanceNumber} | ${latestMaintenanceEvent.eventType}`
                  : "No completed maintenance event"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Completed {toOptionalDateTime(latestMaintenanceEvent?.completedAt)} | RTS{" "}
                {toOptionalDateTime(latestMaintenanceEvent?.returnToServiceAt)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Open discrepancies</p>
              {aircraft.discrepancies.length === 0 ? (
                <p className="mt-1 text-amber-800">None.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {aircraft.discrepancies.map((discrepancy) => (
                    <li key={discrepancy.id}>
                      {discrepancy.discrepancyNumber}: {discrepancy.title} (
                      {discrepancy.status})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Active deferrals</p>
              {aircraft.deferrals.length === 0 ? (
                <p className="mt-1 text-amber-800">None.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {aircraft.deferrals.map((deferral) => (
                    <li key={deferral.id}>
                      {deferral.deferralNumber}: {deferral.discrepancy.title}
                      {deferral.dueAt ? ` due ${toDateTime(deferral.dueAt)}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>

        <Section
          id="crew-coverage"
          title="Crew Coverage"
          subtitle="Current aircraft-block crew assignments and cockpit coverage."
        >
          <div className="mb-3">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                aircraft.summary.missingCockpitRoles.length === 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {aircraft.summary.missingCockpitRoles.length === 0
                ? "CPT/FO covered"
                : `Missing ${aircraft.summary.missingCockpitRoles
                    .map(formatRoleLabel)
                    .join(", ")}`}
            </span>
          </div>
          {aircraft.activeCrewAssignments.length === 0 ? (
            <EmptyState>No active aircraft-block crew assignments.</EmptyState>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {aircraft.activeCrewAssignments.map((assignment) => (
                <CrewAssignmentCard
                  aircraft={aircraft}
                  assignment={assignment}
                  key={assignment.id}
                  now={now}
                />
              ))}
            </div>
          )}
        </Section>

        <Section id="alerts" title="Alerts" subtitle="Active alerts attached to this aircraft.">
          {aircraft.alerts.length === 0 ? (
            <EmptyState>No active alerts attached to this aircraft.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {aircraft.alerts.map((alert) => (
                <li className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm" key={alert.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${severityBadgeClasses(
                        alert.severity,
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-medium text-zinc-800">{alert.type}</span>
                    {alert.flight?.flightNumber ? (
                      <span className="ml-auto text-xs text-zinc-500">
                        Flight {alert.flight.flightNumber}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-medium text-zinc-950">{alert.title}</p>
                  <p className="text-zinc-600">{alert.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          id="operations-links"
          title="Operations Links"
          subtitle="Fast links from this aircraft into Operations Control."
        >
          <div className="flex flex-wrap gap-2">
            <ActionLink href="/operations-control" label="Operations Control" primary />
            <ActionLink
              href={`/crew/scheduling?aircraft=${aircraft.id}&assignment=assigned`}
              label="Crew planner"
            />
            <ActionLink href={`/aircraft/${aircraft.id}/crew`} label="Crew assignment" />
            <ActionLink href={`/aircraft/${aircraft.id}/airworthiness`} label="Airworthiness" />
            <ActionLink href="/scheduling" label="Scheduling" />
            <ActionLink href="/flights" label="Flights" />
          </div>
          {aircraft.upcomingLegs.length > 0 ? (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {aircraft.upcomingLegs.slice(0, 4).map((leg) => (
                <LegCard key={`links-${leg.assignmentId}`} leg={leg} />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState>No FlightLeg workflow links are available for this aircraft.</EmptyState>
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}
