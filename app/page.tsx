import {
  AlertSeverity,
  FlightLegStatus,
  FlightStatus,
  ReleaseStatus,
  SeatRole,
} from "@prisma/client";
import Link from "next/link";

import {
  DashboardFlight,
  DashboardReleaseComponent,
  DashboardReleaseComponentStatus,
  DashboardWindowValue,
  getDashboardData,
} from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    leg?: string | string[];
    panel?: string | string[];
    window?: string | string[];
  }>;
};

type DashboardPanel =
  | "alerts"
  | "crew"
  | "dispatch"
  | "flight"
  | "flight-following"
  | "manifest"
  | "mx"
  | "release"
  | "weight-balance";

const WINDOW_OPTIONS: Array<{ label: string; value: DashboardWindowValue }> = [
  { label: "+1 hr", value: "1" },
  { label: "+2 hr", value: "2" },
  { label: "+6 hr", value: "6" },
  { label: "+12 hr", value: "12" },
  { label: "+24 hr", value: "24" },
  { label: "Today", value: "today" },
];

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseWindow(value: string | string[] | undefined): DashboardWindowValue {
  const firstValue = firstParam(value);

  if (
    firstValue === "1" ||
    firstValue === "2" ||
    firstValue === "6" ||
    firstValue === "12" ||
    firstValue === "24" ||
    firstValue === "today"
  ) {
    return firstValue;
  }

  return "6";
}

function parsePanel(value: string | string[] | undefined): DashboardPanel | null {
  const firstValue = firstParam(value);

  if (
    firstValue === "alerts" ||
    firstValue === "crew" ||
    firstValue === "dispatch" ||
    firstValue === "flight" ||
    firstValue === "flight-following" ||
    firstValue === "manifest" ||
    firstValue === "mx" ||
    firstValue === "release" ||
    firstValue === "weight-balance"
  ) {
    return firstValue;
  }

  return null;
}

function dashboardHref(
  window: DashboardWindowValue,
  options: { leg?: string | null; panel?: DashboardPanel | null } = {},
): string {
  const params = new URLSearchParams();

  if (window !== "6") {
    params.set("window", window);
  }

  if (options.panel) {
    params.set("panel", options.panel);
  }

  if (options.leg) {
    params.set("leg", options.leg);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function toTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
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

function componentToneClasses(status: DashboardReleaseComponentStatus): string {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300";
  }
  if (status === "warning" || status === "review") {
    return "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300";
  }
  return "border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300";
}

function componentDotClasses(status: DashboardReleaseComponentStatus): string {
  if (status === "ready") {
    return "bg-emerald-500";
  }
  if (status === "warning" || status === "review") {
    return "bg-amber-500";
  }
  return "bg-rose-500";
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
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function WindowControls({ selectedWindow }: { selectedWindow: DashboardWindowValue }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
      {WINDOW_OPTIONS.map((option) => {
        const active = selectedWindow === option.value;

        return (
          <Link
            className={
              active
                ? "rounded-lg bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white"
                : "rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-white"
            }
            href={dashboardHref(option.value)}
            key={option.value}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function componentPanel(component: DashboardReleaseComponent): DashboardPanel {
  return component.key === "weight-balance" ? "weight-balance" : component.key;
}

function workflowHref(flight: DashboardFlight, component: DashboardReleaseComponent): string | null {
  if (!flight.flightLegId) {
    return null;
  }

  if (component.key === "mx") {
    return flight.assignedAircraft ? `/aircraft/${flight.assignedAircraft.id}/airworthiness` : null;
  }

  if (component.key === "crew") {
    return flight.assignedAircraft ? `/aircraft/${flight.assignedAircraft.id}/crew` : null;
  }

  const suffix = {
    dispatch: "dispatch",
    "flight-following": "locating",
    manifest: "manifest",
    "weight-balance": "weight-balance",
  }[component.key];

  return suffix ? `/operations-control/${flight.flightLegId}/${suffix}` : null;
}

function ReleaseStrip({
  flight,
  selectedWindow,
}: {
  flight: DashboardFlight;
  selectedWindow: DashboardWindowValue;
}) {
  if (flight.releaseStatus === ReleaseStatus.RELEASED && flight.releaseSummary.allReady) {
    return (
      <Link
        className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:border-emerald-300"
        href={dashboardHref(selectedWindow, { leg: flight.flightLegId, panel: "flight" })}
      >
        Released | release all clear
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {flight.releaseSummary.components.map((component) => (
        <Link
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${componentToneClasses(
            component.status,
          )}`}
          href={dashboardHref(selectedWindow, {
            leg: flight.flightLegId,
            panel: componentPanel(component),
          })}
          key={component.key}
          title={component.message}
        >
          <span className={`h-2 w-2 rounded-full ${componentDotClasses(component.status)}`} />
          {component.label}
        </Link>
      ))}
    </div>
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

function Drawer({
  children,
  closeHref,
  title,
}: {
  children: React.ReactNode;
  closeHref: string;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-zinc-950/35">
      <Link aria-label="Close panel" className="absolute inset-0" href={closeHref} />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Dashboard quick review
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">{title}</h2>
          </div>
          <Link
            className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
            href={closeHref}
          >
            Close
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function DashboardDrawer({
  dashboard,
  panel,
  selectedFlight,
  selectedWindow,
}: {
  dashboard: Awaited<ReturnType<typeof getDashboardData>>;
  panel: DashboardPanel | null;
  selectedFlight: DashboardFlight | null;
  selectedWindow: DashboardWindowValue;
}) {
  if (!panel) {
    return null;
  }

  const closeHref = dashboardHref(selectedWindow);

  if (panel === "alerts") {
    return (
      <Drawer closeHref={closeHref} title="Active Alerts">
        {dashboard.alerts.length === 0 ? (
          <p className="text-sm text-zinc-600">No active alerts.</p>
        ) : (
          <ul className="space-y-3">
            {dashboard.alerts.map((alert) => (
              <li className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm" key={alert.id}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${severityBadgeClasses(
                      alert.severity,
                    )}`}
                  >
                    {alert.severity}
                  </span>
                  <span className="font-medium text-zinc-800">{alert.type}</span>
                </div>
                <p className="font-semibold text-zinc-950">{alert.title}</p>
                <p className="mt-1 text-zinc-600">{alert.message}</p>
                {(alert.flightNumber || alert.aircraftTail) && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {alert.flightNumber ? `Flight ${alert.flightNumber}` : null}
                    {alert.flightNumber && alert.aircraftTail ? " | " : null}
                    {alert.aircraftTail ? `Aircraft ${alert.aircraftTail}` : null}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    );
  }

  if (panel === "release") {
    return (
      <Drawer closeHref={closeHref} title={`Release Review | ${dashboard.releaseWindowLabel}`}>
        {dashboard.operationsAttention.priorityFlightLegs.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            No release review items inside this window.
          </p>
        ) : (
          <ul className="space-y-3">
            {dashboard.operationsAttention.priorityFlightLegs.map((flightLeg) => (
              <li className="rounded-xl border border-zinc-200 bg-zinc-50 p-3" key={flightLeg.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-950">{flightLeg.flightNumber}</p>
                    <p className="text-sm text-zinc-600">
                      {flightLeg.route} | {flightLeg.tailNumber} |{" "}
                      {flightLeg.scheduledDeparture ? toTime(flightLeg.scheduledDeparture) : "Not scheduled"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${releaseBadgeClasses(
                      flightLeg.releaseStatus,
                    )}`}
                  >
                    {flightLeg.releaseStatus ?? "NO RELEASE"}
                  </span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-zinc-700">
                  {flightLeg.releaseSummary.reviewReasons.slice(0, 6).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div className="mt-3">
                  <DashboardActionLink href={`/operations-control/${flightLeg.id}`} label="Open release workspace" primary />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    );
  }

  if (!selectedFlight) {
    return (
      <Drawer closeHref={closeHref} title="FlightLeg Review">
        <p className="text-sm text-zinc-600">Select a FlightLeg from the dashboard to review details.</p>
      </Drawer>
    );
  }

  const selectedComponent =
    panel === "flight"
      ? null
      : selectedFlight.releaseSummary.components.find((component) => componentPanel(component) === panel) ??
        null;
  const fullWorkflowHref = selectedComponent ? workflowHref(selectedFlight, selectedComponent) : null;

  return (
    <Drawer closeHref={closeHref} title={`${selectedFlight.flightNumber} | ${selectedFlight.departureCode} -> ${selectedFlight.arrivalCode}`}>
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold text-zinc-950">
            {selectedFlight.tailNumber} | {toTime(selectedFlight.scheduledDeparture)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${releaseBadgeClasses(
                selectedFlight.releaseStatus,
              )}`}
            >
              {selectedFlight.releaseStatus ?? "NO RELEASE"}
            </span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(
                selectedFlight.status,
              )}`}
            >
              {selectedFlight.status}
            </span>
          </div>
        </div>

        {selectedComponent ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${componentDotClasses(selectedComponent.status)}`} />
              <h3 className="font-semibold text-zinc-950">{selectedComponent.label}</h3>
            </div>
            <p className="mt-2 text-sm text-zinc-700">{selectedComponent.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {fullWorkflowHref ? (
                <DashboardActionLink href={fullWorkflowHref} label="Open full workflow" primary />
              ) : null}
              {selectedFlight.flightLegId ? (
                <DashboardActionLink
                  href={`/operations-control/${selectedFlight.flightLegId}`}
                  label="Open release workspace"
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Release readiness
            </h3>
            <div className="mt-3 grid gap-2">
              {selectedFlight.releaseSummary.components.map((component) => (
                <Link
                  className={`rounded-xl border p-3 text-sm ${componentToneClasses(component.status)}`}
                  href={dashboardHref(selectedWindow, {
                    leg: selectedFlight.flightLegId,
                    panel: componentPanel(component),
                  })}
                  key={component.key}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <span className={`h-2.5 w-2.5 rounded-full ${componentDotClasses(component.status)}`} />
                    {component.label}
                  </div>
                  <p className="mt-1 text-xs opacity-80">{component.message}</p>
                </Link>
              ))}
            </div>
            {selectedFlight.flightLegId ? (
              <div className="mt-4">
                <DashboardActionLink
                  href={`/operations-control/${selectedFlight.flightLegId}`}
                  label="Open release workspace"
                  primary
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedWindow = parseWindow(params.window);
  const panel = parsePanel(params.panel);
  const selectedLegId = firstParam(params.leg);
  const dashboard = await getDashboardData({ window: selectedWindow });
  const visibleFlights = dashboard.flights;
  const selectedFlight =
    dashboard.flights.find((flight) => flight.flightLegId === selectedLegId || flight.id === selectedLegId) ??
    null;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Today&apos;s Operations
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                Dashboard | {dashboard.dateLabel}
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Release review window: {dashboard.releaseWindowLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WindowControls selectedWindow={dashboard.selectedWindow} />
              <DashboardActionLink href="/operations-control" label="Open workbench" primary />
              <DashboardActionLink href="/operations-control/new" label="New FlightLeg" />
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <StatusTile
              href="/operations-control"
              label="Flights in view"
              tone="zinc"
              value={dashboard.statusSummary.totalFlights}
            />
            <StatusTile
              href={dashboardHref(dashboard.selectedWindow, { panel: "release" })}
              label="Release review"
              tone={dashboard.statusSummary.releaseReviewNeeded > 0 ? "amber" : "emerald"}
              value={dashboard.statusSummary.releaseReviewNeeded}
            />
            <StatusTile
              href={dashboardHref(dashboard.selectedWindow, { panel: "release" })}
              label="Ready for release"
              tone="emerald"
              value={dashboard.statusSummary.releaseReady}
            />
            <StatusTile
              href={dashboardHref(dashboard.selectedWindow, { panel: "release" })}
              label="Unreleased"
              tone={dashboard.statusSummary.plannedOrUnreleased > 0 ? "sky" : "emerald"}
              value={dashboard.statusSummary.plannedOrUnreleased}
            />
            <StatusTile
              href={dashboardHref(dashboard.selectedWindow, { panel: "alerts" })}
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

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <MiniSection
            action={<DashboardActionLink href="/operations-control" label="Full workbench" />}
            title={`Flight board | ${dashboard.releaseWindowLabel}`}
          >
            {dashboard.flights.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No flights found inside this selected view.
              </p>
            ) : (
              <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                {visibleFlights.map((flight) => (
                  <article
                    className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm md:grid-cols-[auto_1fr_auto]"
                    key={flight.id}
                  >
                    <div className="font-mono text-base font-semibold text-zinc-950">
                      {toTime(flight.scheduledDeparture)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="font-semibold text-sky-700 hover:text-sky-900"
                          href={dashboardHref(dashboard.selectedWindow, {
                            leg: flight.flightLegId,
                            panel: "flight",
                          })}
                        >
                          {flight.flightNumber}
                        </Link>
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
                          {flight.releaseStatus ?? "NO RELEASE"}
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
                      <div className="mt-2">
                        <ReleaseStrip flight={flight} selectedWindow={dashboard.selectedWindow} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      {flight.flightLegId ? (
                        <>
                          <DashboardActionLink
                            href={dashboardHref(dashboard.selectedWindow, {
                              leg: flight.flightLegId,
                              panel: "flight",
                            })}
                            label="Quick review"
                            primary
                          />
                          <DashboardActionLink
                            href={`/operations-control/${flight.flightLegId}`}
                            label="Release workspace"
                          />
                        </>
                      ) : (
                        <span className="text-xs text-zinc-400">No FlightLeg actions</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </MiniSection>

          <MiniSection title="AI Review Notes">
            <div className="flex min-h-[34rem] flex-col justify-between rounded-xl border border-dashed border-sky-300 bg-sky-50/70 p-4">
              <div>
                <p className="text-sm font-semibold text-sky-950">Future placeholder</p>
                <p className="mt-2 text-sm text-sky-900">
                  Reserved for future AI-generated operational observations, release-readiness
                  review notes, suggested follow-ups, and trend callouts.
                </p>
              </div>
              <p className="mt-4 rounded-lg border border-sky-200 bg-white/80 p-3 text-xs text-sky-900">
                Inactive: no provider calls, note storage, or automated recommendations.
              </p>
            </div>
          </MiniSection>
        </section>

        <footer className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Fleet snapshot
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Aircraft state overview. Detailed maintenance context stays in Aircraft.
              </p>
            </div>
            <DashboardActionLink href="/aircraft" label="Open aircraft" />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {dashboard.fleetSnapshot.map((bucket) => (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3" key={bucket.status}>
                <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-zinc-500">
                  {bucket.status}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{bucket.count}</p>
              </div>
            ))}
          </div>
        </footer>
      </div>

      <DashboardDrawer
        dashboard={dashboard}
        panel={panel}
        selectedFlight={selectedFlight}
        selectedWindow={dashboard.selectedWindow}
      />
    </main>
  );
}
