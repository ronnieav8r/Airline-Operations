import {
  AlertSeverity,
  FlightLegStatus,
  FlightStatus,
  ReleaseStatus,
  SeatRole,
} from "@prisma/client";
import Link from "next/link";

import { DashboardFlight, getDashboardData } from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

function toTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function statusBadgeClasses(status: DashboardFlight["status"]): string {
  if (status === FlightStatus.ENROUTE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === FlightLegStatus.RELEASED || status === FlightLegStatus.READY_FOR_RELEASE) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === FlightStatus.DELAYED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === FlightStatus.CANCELLED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  return "border-zinc-200 bg-white text-zinc-700";
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

function evidenceBadgeClasses(flight: DashboardFlight): string {
  if (flight.releaseEvidence?.complete) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (flight.releaseEvidence) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function evidenceLabel(flight: DashboardFlight): string {
  if (flight.releaseEvidence?.complete) {
    return "Evidence ready";
  }
  if (flight.releaseEvidence) {
    return "Evidence partial";
  }
  return "No evidence";
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

function releaseLabel(status: ReleaseStatus | null): string {
  return status ?? "NO RELEASE";
}

function attentionBadgeClasses(state: "Ready" | "Needs attention" | "Missing"): string {
  if (state === "Ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "Missing") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function DashboardActionLink({
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

function StatusTile({
  href,
  label,
  tone,
  value,
}: {
  href: string;
  label: string;
  tone: "amber" | "emerald" | "rose" | "sky" | "zinc";
  value: number;
}) {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300",
    rose: "border-rose-200 bg-rose-50 text-rose-950 hover:border-rose-300",
    sky: "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-300",
    zinc: "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300",
  }[tone];

  return (
    <Link className={`rounded-xl border p-3 shadow-sm transition ${toneClasses}`} href={href}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </Link>
  );
}

function MiniSection({
  action,
  children,
  id,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm" id={id}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function crewCoverageLabel(flight: DashboardFlight): string {
  if (!flight.coverage) {
    return "No coverage data";
  }
  if (flight.coverage.isCovered) {
    return "Covered";
  }
  return `Missing ${flight.coverage.missingRoles.map(formatRoleLabel).join(", ")}`;
}

export default async function Home() {
  const dashboard = await getDashboardData();
  const visibleFlights = dashboard.flights.slice(0, 8);
  const visiblePriorityFlightLegs = dashboard.operationsAttention.priorityFlightLegs.slice(0, 4);
  const visibleAlerts = dashboard.alerts.slice(0, 3);
  const visibleCoverageGaps = dashboard.coverageGaps.slice(0, 3);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Today&apos;s Operations
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                Dashboard | {dashboard.dateLabel}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <DashboardActionLink href="/operations-control" label="Open workbench" primary />
              <DashboardActionLink href="/operations-control/new" label="New FlightLeg" />
              <DashboardActionLink href="/crew/logistics" label="Crew logistics" />
              <DashboardActionLink href="/crew/scheduling" label="Crew planner" />
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <StatusTile
              href="/operations-control"
              label="Flights today"
              tone="zinc"
              value={dashboard.statusSummary.totalFlights}
            />
            <StatusTile
              href="/operations-control?release=planned"
              label="Unreleased"
              tone={dashboard.statusSummary.plannedOrUnreleased > 0 ? "sky" : "emerald"}
              value={dashboard.statusSummary.plannedOrUnreleased}
            />
            <StatusTile
              href="/operations-control?evidence=missing"
              label="Evidence gaps"
              tone={dashboard.statusSummary.operationsEvidencePartialMissing > 0 ? "amber" : "emerald"}
              value={dashboard.statusSummary.operationsEvidencePartialMissing}
            />
            <StatusTile
              href="#coverage-gaps"
              label="Crew gaps"
              tone={dashboard.coverageGaps.length > 0 ? "rose" : "emerald"}
              value={dashboard.coverageGaps.length}
            />
            <StatusTile
              href="#active-alerts"
              label="Active alerts"
              tone={dashboard.statusSummary.activeAlerts > 0 ? "rose" : "emerald"}
              value={dashboard.statusSummary.activeAlerts}
            />
            <StatusTile
              href="/aircraft"
              label="Aircraft"
              tone="zinc"
              value={dashboard.statusSummary.aircraftCount}
            />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <MiniSection
            action={<DashboardActionLink href="/operations-control" label="View all" />}
            title="Needs attention now"
          >
            {visiblePriorityFlightLegs.length === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                No current FlightLeg attention items found.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {visiblePriorityFlightLegs.map((flightLeg) => {
                  const detailHref = `/operations-control/${flightLeg.id}`;

                  return (
                    <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-3" key={flightLeg.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link className="font-semibold text-sky-700 hover:text-sky-900" href={detailHref}>
                            {flightLeg.flightNumber}
                          </Link>
                          <p className="mt-1 text-sm text-zinc-600">
                            {flightLeg.route} | {flightLeg.tailNumber}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {flightLeg.scheduledDeparture ? toTime(flightLeg.scheduledDeparture) : "Not scheduled"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(
                              flightLeg.releaseStatus,
                            )}`}
                          >
                            {releaseLabel(flightLeg.releaseStatus)}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${attentionBadgeClasses(
                              flightLeg.evidenceState,
                            )}`}
                          >
                            {flightLeg.evidenceState}
                          </span>
                        </div>
                      </div>
                      {flightLeg.attentionReasons.length > 0 ? (
                        <p className="mt-2 text-xs text-zinc-600">
                          {flightLeg.attentionReasons.slice(0, 3).join(" | ")}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <DashboardActionLink href={detailHref} label="Detail" primary />
                        <DashboardActionLink href={`${detailHref}/manifest`} label="Manifest" />
                        <DashboardActionLink href={`${detailHref}/weight-balance`} label="W&B" />
                        <DashboardActionLink href={`${detailHref}/locating`} label="Locating" />
                        <DashboardActionLink href={`${detailHref}/dispatch`} label="Dispatch" />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </MiniSection>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <MiniSection
              action={<DashboardActionLink href="/operations-control" label="Ops board" />}
              id="active-alerts"
              title="Active alerts"
            >
              {visibleAlerts.length === 0 ? (
                <p className="text-sm text-zinc-600">No active alerts.</p>
              ) : (
                <ul className="space-y-2">
                  {visibleAlerts.map((alert) => (
                    <li className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm" key={alert.id}>
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${severityBadgeClasses(
                            alert.severity,
                          )}`}
                        >
                          {alert.severity}
                        </span>
                        <span className="font-medium text-zinc-800">{alert.type}</span>
                      </div>
                      <p className="font-medium text-zinc-950">{alert.title}</p>
                      <p className="mt-1 line-clamp-2 text-zinc-600">{alert.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </MiniSection>

            <MiniSection id="coverage-gaps" title="Crew gaps">
              {visibleCoverageGaps.length === 0 ? (
                <p className="text-sm text-zinc-600">No CPT/FO coverage gaps in today&apos;s board.</p>
              ) : (
                <ul className="space-y-2">
                  {visibleCoverageGaps.map((gap) => (
                    <li className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm" key={`${gap.id}-gap`}>
                      <div className="font-medium text-rose-950">
                        {gap.flightNumber} | {toTime(gap.scheduledDeparture)}
                      </div>
                      <div className="text-rose-800">
                        Missing {gap.missingRoles.map((role) => formatRoleLabel(role)).join(", ")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </MiniSection>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <MiniSection
            action={<DashboardActionLink href="/operations-control" label="Full workbench" />}
            title="Today&apos;s flight board"
          >
            {dashboard.flights.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No flights found for today.
              </p>
            ) : (
              <div className="space-y-2">
                {visibleFlights.map((flight) => {
                  const detailHref = flight.flightLegId ? `/operations-control/${flight.flightLegId}` : null;

                  return (
                    <article
                      className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm md:grid-cols-[auto_1fr_auto]"
                      key={flight.id}
                    >
                      <div className="font-mono text-base font-semibold text-zinc-950">
                        {toTime(flight.scheduledDeparture)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-zinc-950">{flight.flightNumber}</span>
                          <span className="text-zinc-500">
                            {flight.departureCode} -&gt; {flight.arrivalCode}
                          </span>
                          <span className="font-mono text-zinc-600">{flight.tailNumber}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
                              flight.status,
                            )}`}
                          >
                            {flight.status}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(
                              flight.releaseStatus,
                            )}`}
                          >
                            {releaseLabel(flight.releaseStatus)}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${evidenceBadgeClasses(
                              flight,
                            )}`}
                          >
                            {evidenceLabel(flight)}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                              flight.coverage?.isCovered
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : flight.coverage
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-500"
                            }`}
                          >
                            {crewCoverageLabel(flight)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-start justify-end gap-2">
                        {detailHref ? (
                          <>
                            <DashboardActionLink href={detailHref} label="Detail" primary />
                            <DashboardActionLink href={`${detailHref}/manifest`} label="Manifest" />
                            <DashboardActionLink href={`${detailHref}/weight-balance`} label="W&B" />
                            <DashboardActionLink href={`${detailHref}/locating`} label="Locating" />
                            <DashboardActionLink href={`${detailHref}/dispatch`} label="Dispatch" />
                          </>
                        ) : (
                          <span className="text-xs text-zinc-400">No FlightLeg actions</span>
                        )}
                      </div>
                    </article>
                  );
                })}
                {dashboard.flights.length > visibleFlights.length ? (
                  <p className="text-xs text-zinc-500">
                    Showing {visibleFlights.length} of {dashboard.flights.length} flights. Open Operations Control for the full board.
                  </p>
                ) : null}
              </div>
            )}
          </MiniSection>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <MiniSection action={<DashboardActionLink href="/aircraft" label="Aircraft" />} title="Fleet snapshot">
              <div className="grid grid-cols-2 gap-2">
                {dashboard.fleetSnapshot.map((bucket) => (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3" key={bucket.status}>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-zinc-500">
                      {bucket.status}
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{bucket.count}</p>
                  </div>
                ))}
              </div>
            </MiniSection>

            <aside className="rounded-xl border border-dashed border-sky-300 bg-sky-50/70 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                Future placeholder
              </p>
              <h2 className="mt-1 text-lg font-semibold text-sky-950">AI Review Notes</h2>
              <p className="mt-2 text-sm text-sky-900">
                Reserved for future AI-generated operational observations and follow-up suggestions.
              </p>
              <p className="mt-3 rounded-lg border border-sky-200 bg-white/80 p-3 text-xs text-sky-900">
                Inactive: no provider calls, note storage, or automated recommendations.
              </p>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
