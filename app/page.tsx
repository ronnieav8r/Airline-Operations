import {
  AlertSeverity,
  FlightLegStatus,
  FlightStatus,
  OperatorManifestMode,
  ReleaseStatus,
  SeatRole,
  UserRole,
} from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  dashboardReleaseFlightAction,
  dashboardVoidReleaseAction,
} from "@/app/dashboard-actions";
import { ContextDrawer } from "@/components/context-drawer";
import {
  DashboardFlight,
  DashboardReleaseComponent,
  DashboardReleaseComponentStatus,
  DashboardWindowValue,
  getDashboardData,
} from "@/lib/dashboard-queries";
import { formatFuelAmount, fuelReadyLabel } from "@/lib/fuel";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    id?: string | string[];
    object?: string | string[];
    panel?: string | string[];
    releaseError?: string | string[];
    size?: string | string[];
    view?: string | string[];
    window?: string | string[];
  }>;
};

type DashboardPanel = "alerts" | "release";
type DrawerObject = "flightLeg";
type DrawerSize = "expanded" | "standard";
type FlightLegDrawerView =
  | "audit"
  | "crew"
  | "dispatch"
  | "fuel"
  | "locating"
  | "manifest"
  | "mx"
  | "postflight"
  | "preflight"
  | "release"
  | "release-confirm"
  | "summary"
  | "void-confirm"
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

  if (firstValue === "alerts" || firstValue === "release") {
    return firstValue;
  }

  return null;
}

function parseDrawerObject(value: string | string[] | undefined): DrawerObject | null {
  return firstParam(value) === "flightLeg" ? "flightLeg" : null;
}

function parseDrawerSize(value: string | string[] | undefined): DrawerSize {
  return firstParam(value) === "expanded" ? "expanded" : "standard";
}

function parseFlightLegView(value: string | string[] | undefined): FlightLegDrawerView {
  const firstValue = firstParam(value);

  if (
    firstValue === "audit" ||
    firstValue === "crew" ||
    firstValue === "dispatch" ||
    firstValue === "fuel" ||
    firstValue === "locating" ||
    firstValue === "manifest" ||
    firstValue === "mx" ||
    firstValue === "postflight" ||
    firstValue === "preflight" ||
    firstValue === "release" ||
    firstValue === "release-confirm" ||
    firstValue === "void-confirm" ||
    firstValue === "weight-balance"
  ) {
    return firstValue;
  }

  return "summary";
}

function dashboardHref(
  window: DashboardWindowValue,
  options: {
    id?: string | null;
    object?: DrawerObject | null;
    panel?: DashboardPanel | null;
    size?: DrawerSize | null;
    view?: FlightLegDrawerView | null;
  } = {},
): string {
  const params = new URLSearchParams();

  if (window !== "6") {
    params.set("window", window);
  }

  if (options.panel) {
    params.set("panel", options.panel);
  }

  if (options.object) {
    params.set("object", options.object);
  }

  if (options.id) {
    params.set("id", options.id);
  }

  if (options.view && options.view !== "summary") {
    params.set("view", options.view);
  }

  if (options.size === "expanded") {
    params.set("size", options.size);
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
  if (status === FlightStatus.DELAYED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === FlightStatus.CANCELLED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  return "border-zinc-200 bg-white text-zinc-700";
}

function lifecycleStatusLabel(status: DashboardFlight["status"]): string {
  if (status === FlightLegStatus.RELEASED || status === FlightLegStatus.READY_FOR_RELEASE) {
    return "SCHEDULED";
  }

  return status;
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

function releaseActionLabel(flight: DashboardFlight): string {
  if (flight.releaseStatus === ReleaseStatus.RELEASED) {
    return "Released";
  }

  if (flight.releaseSummary.allReady) {
    return "Ops release ready";
  }

  return "Ops release review";
}

function releaseActionClasses(flight: DashboardFlight): string {
  if (flight.releaseStatus === ReleaseStatus.RELEASED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300";
  }

  if (flight.releaseSummary.allReady) {
    return "border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300";
}

function releaseViewForFlight(flight: DashboardFlight): FlightLegDrawerView {
  if (flight.releaseStatus === ReleaseStatus.RELEASED) {
    return "void-confirm";
  }

  return flight.releaseSummary.allReady ? "release-confirm" : "summary";
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
    <Link className={`rounded-lg border px-2.5 py-2 shadow-sm transition ${toneClasses}`} href={href}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
    </Link>
  );
}

function MiniSection({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
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

function componentView(component: DashboardReleaseComponent): FlightLegDrawerView {
  if (component.key === "preflight" || component.key === "postflight") {
    return component.key;
  }

  if (component.key === "flight-following") {
    return "locating";
  }

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
    fuel: "fuel",
    manifest: "manifest",
    postflight: "fuel",
    preflight: "fuel",
    "weight-balance": "weight-balance",
  }[component.key];

  return suffix ? `/operations-control/${flight.flightLegId}/${suffix}` : null;
}

function summaryComponentHref(
  flight: DashboardFlight,
  component: DashboardReleaseComponent,
  selectedWindow: DashboardWindowValue,
  size: DrawerSize,
): string {
  const workflow = workflowHref(flight, component);

  if (workflow) {
    return workflow;
  }

  if (component.key === "mx" && flight.assignedAircraft) {
    return `/aircraft/${flight.assignedAircraft.id}/airworthiness`;
  }

  if (component.key === "crew" && flight.assignedAircraft) {
    return `/aircraft/${flight.assignedAircraft.id}/crew`;
  }

  return dashboardHref(selectedWindow, {
    id: flight.flightLegId,
    object: "flightLeg",
    size,
    view: componentView(component),
  });
}

function ReleaseStrip({
  flight,
  hideCrew = false,
}: {
  flight: DashboardFlight;
  hideCrew?: boolean;
}) {
  const components = hideCrew
    ? flight.releaseSummary.components.filter((component) => component.key !== "crew")
    : flight.releaseSummary.components;

  return (
    <div className="flex flex-wrap gap-1.5">
      {components.map((component) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${componentToneClasses(
            component.status,
          )}`}
          key={component.key}
          title={component.message}
        >
          <span className={`h-2 w-2 rounded-full ${componentDotClasses(component.status)}`} />
          {component.label}
        </span>
      ))}
    </div>
  );
}

function releaseComponentByView(
  flight: DashboardFlight,
  view: FlightLegDrawerView,
): DashboardReleaseComponent | null {
  return flight.releaseSummary.components.find((component) => componentView(component) === view) ?? null;
}

function statusText(value: string | null | undefined): string {
  return value ? value.replaceAll("_", " ") : "Missing";
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

function isCurrentUserReleaseAuthorized(currentUser: CurrentUser | null): boolean {
  return currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.OPS;
}

function ReleaseCredentialFields({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-950">Authorized release credentials required</p>
      <p className="mt-1 text-xs text-amber-900">
        Enter an ADMIN or OPS username and password to authorize this action.
      </p>
      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-amber-950">
        Username / email
        <input
          className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-950"
          name="authorizerEmail"
          type="email"
        />
      </label>
      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-amber-950">
        Password
        <input
          className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-950"
          name="authorizerPassword"
          type="password"
        />
      </label>
    </div>
  );
}

function ReleaseVerificationPanel({
  currentUser,
  releaseError,
  selectedFlight,
  selectedWindow,
}: {
  currentUser: CurrentUser | null;
  releaseError: string | null;
  selectedFlight: DashboardFlight;
  selectedWindow: DashboardWindowValue;
}) {
  const action = dashboardReleaseFlightAction.bind(null, selectedFlight.flightLegId ?? "");
  const authorized = isCurrentUserReleaseAuthorized(currentUser);
  const returnTo = dashboardHref(selectedWindow, {
    id: selectedFlight.flightLegId,
    object: "flightLeg",
    view: "release",
  });

  if (!selectedFlight.releaseSummary.allReady) {
    return (
      <div className="space-y-4">
        {releaseError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {releaseError}
          </p>
        ) : null}
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">This flight is not ready for Ops Release.</p>
          <p className="mt-1">
            Review the Ops Release items below or open the full workspace for warning-first
            operational handling.
          </p>
        </section>
        <ReleaseStrip flight={selectedFlight} />
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white"
            href={`/operations-control/${selectedFlight.flightLegId}`}
          >
            Open release workspace
          </Link>
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            href={returnTo}
          >
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      {releaseError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {releaseError}
        </p>
      ) : null}
      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
        <p className="font-semibold text-zinc-950">
          Ops Release {selectedFlight.flightNumber}?
        </p>
        <p className="mt-1 text-zinc-600">
          {selectedFlight.departureCode} -&gt; {selectedFlight.arrivalCode} |{" "}
          {selectedFlight.tailNumber} | {toTime(selectedFlight.scheduledDeparture)}
        </p>
      </section>
      <ReleaseStrip flight={selectedFlight} />
      <ReleaseCredentialFields show={!authorized} />
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          type="submit"
        >
          Confirm Ops Release
        </button>
        <Link
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          href={returnTo}
        >
          No, go back
        </Link>
      </div>
    </form>
  );
}

function VoidReleasePanel({
  currentUser,
  releaseError,
  selectedFlight,
  selectedWindow,
}: {
  currentUser: CurrentUser | null;
  releaseError: string | null;
  selectedFlight: DashboardFlight;
  selectedWindow: DashboardWindowValue;
}) {
  const action = dashboardVoidReleaseAction.bind(null, selectedFlight.flightLegId ?? "");
  const authorized = isCurrentUserReleaseAuthorized(currentUser);
  const returnTo = dashboardHref(selectedWindow, {
    id: selectedFlight.flightLegId,
    object: "flightLeg",
    view: "release",
  });

  return (
    <form action={action} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      {releaseError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {releaseError}
        </p>
      ) : null}
      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
        <p className="font-semibold text-zinc-950">
          Void release for {selectedFlight.flightNumber}?
        </p>
        <p className="mt-1 text-zinc-600">
          This does not erase the release history. It changes the active release status to VOIDED
          and adds a release audit event.
        </p>
      </section>
      <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Void reason
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
          name="reason"
          required
        />
      </label>
      <ReleaseCredentialFields show={!authorized} />
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800"
          type="submit"
        >
          Confirm void
        </button>
        <Link
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          href={returnTo}
        >
          No, go back
        </Link>
      </div>
    </form>
  );
}

function DrawerSectionLink({
  children,
  href,
  tone = "zinc",
}: {
  children: ReactNode;
  href: string;
  tone?: "amber" | "emerald" | "rose" | "sky" | "zinc";
}) {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300",
    rose: "border-rose-200 bg-rose-50 text-rose-950 hover:border-rose-300",
    sky: "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-300",
    zinc: "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300",
  }[tone];

  return (
    <Link className={`rounded-xl border p-3 text-left text-sm transition ${toneClasses}`} href={href}>
      {children}
    </Link>
  );
}

function componentTone(component: DashboardReleaseComponent): "amber" | "emerald" | "rose" {
  if (component.status === "ready") {
    return "emerald";
  }

  return component.status === "missing" ? "rose" : "amber";
}

function preflightSummary(flight: DashboardFlight): { message: string; ready: boolean } {
  const evidence = flight.releaseEvidence;

  if (!evidence) {
    return { message: "Preflight evidence is not available.", ready: false };
  }

  const required = ["fuel onboard", "W&B"];
  if (flight.releaseSetting.manifestMode === OperatorManifestMode.PREFLIGHT_VERIFY) {
    required.push("manifest verification");
  }

  return {
    message: evidence.preflightComplete
      ? "Fuel, W&B, and required Preflight checks are complete."
      : `Needs ${required.join(", ")}.`,
    ready: evidence.preflightComplete,
  };
}

function postflightSummary(flight: DashboardFlight): { message: string; ready: boolean } {
  const evidence = flight.releaseEvidence;

  if (!evidence) {
    return { message: "Postflight evidence is not available.", ready: false };
  }

  return {
    message: evidence.postflightComplete
      ? "Times, landing fuel, and required notes are complete."
      : "Needs OUT/OFF/ON/IN, landing fuel, and delay notes when applicable.",
    ready: evidence.postflightComplete,
  };
}

function FlightLegDrawerHeader({ flight }: { flight: DashboardFlight }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-sm font-semibold text-zinc-950">
        {flight.tailNumber} | {toTime(flight.scheduledDeparture)}
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        {flight.departureCode} -&gt; {flight.arrivalCode}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(
            flight.status,
          )}`}
        >
          {lifecycleStatusLabel(flight.status)}
        </span>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${releaseActionClasses(
            flight,
          )}`}
        >
          {releaseActionLabel(flight)}
        </span>
      </div>
      <p className="mt-2 text-xs font-medium text-zinc-600">
        Preflight {flight.releaseEvidence?.preflightComplete ? "complete" : "open"} | Postflight{" "}
        {flight.releaseEvidence?.postflightComplete ? "complete" : "open"}
      </p>
    </div>
  );
}

function FlightLegSummaryView({
  flight,
  selectedWindow,
  size,
}: {
  flight: DashboardFlight;
  selectedWindow: DashboardWindowValue;
  size: DrawerSize;
}) {
  return (
    <div className="space-y-4">
      <FlightLegDrawerHeader flight={flight} />
      <div className={size === "expanded" ? "grid gap-3 lg:grid-cols-2" : "grid gap-3"}>
        {flight.releaseSummary.components.map((component) => (
          <DrawerSectionLink
            href={summaryComponentHref(flight, component, selectedWindow, size)}
            key={component.key}
            tone={componentTone(component)}
          >
            <div className="flex items-center gap-2 font-semibold">
              <span className={`h-2.5 w-2.5 rounded-full ${componentDotClasses(component.status)}`} />
              {component.label}
            </div>
            <p className="mt-1 text-xs opacity-80">{component.message}</p>
          </DrawerSectionLink>
        ))}
        <DrawerSectionLink
          href={dashboardHref(selectedWindow, {
            id: flight.flightLegId,
            object: "flightLeg",
            size,
            view: "preflight",
          })}
          tone={preflightSummary(flight).ready ? "emerald" : "amber"}
        >
          <p className="font-semibold">Preflight</p>
          <p className="mt-1 text-xs opacity-80">{preflightSummary(flight).message}</p>
        </DrawerSectionLink>
        <DrawerSectionLink
          href={dashboardHref(selectedWindow, {
            id: flight.flightLegId,
            object: "flightLeg",
            size,
            view: "postflight",
          })}
          tone={postflightSummary(flight).ready ? "emerald" : "amber"}
        >
          <p className="font-semibold">Postflight</p>
          <p className="mt-1 text-xs opacity-80">{postflightSummary(flight).message}</p>
        </DrawerSectionLink>
        <DrawerSectionLink
          href={dashboardHref(selectedWindow, {
            id: flight.flightLegId,
            object: "flightLeg",
            size,
            view: "audit",
          })}
        >
          <p className="font-semibold">Audit</p>
          <p className="mt-1 text-xs opacity-80">
            {flight.releaseAuditEvents.length} recent release event
            {flight.releaseAuditEvents.length === 1 ? "" : "s"}
          </p>
        </DrawerSectionLink>
      </div>
      {flight.flightLegId ? (
        <DashboardActionLink href={`/operations-control/${flight.flightLegId}`} label="Open full release workspace" primary />
      ) : null}
    </div>
  );
}

function ReleaseDetailView({
  currentUser,
  flight,
  releaseError,
  selectedWindow,
}: {
  currentUser: CurrentUser | null;
  flight: DashboardFlight;
  releaseError: string | null;
  selectedWindow: DashboardWindowValue;
}) {
  if (flight.releaseStatus === ReleaseStatus.RELEASED) {
    return (
      <div className="space-y-4">
        <FlightLegDrawerHeader flight={flight} />
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          This FlightLeg is released. Use the void workflow only if the release was entered in
          error or needs to be invalidated.
        </p>
        <DashboardActionLink
          href={dashboardHref(selectedWindow, {
            id: flight.flightLegId,
            object: "flightLeg",
            view: "void-confirm",
          })}
          label="Void release"
          primary
        />
      </div>
    );
  }

  if (flight.releaseSummary.allReady) {
    return (
      <ReleaseVerificationPanel
        currentUser={currentUser}
        releaseError={releaseError}
        selectedFlight={flight}
        selectedWindow={selectedWindow}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FlightLegDrawerHeader flight={flight} />
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        This FlightLeg is not ready for Ops Release. Review the items below or open the full
        workspace for warning-first operational handling.
      </p>
      <ReleaseStrip flight={flight} />
      {flight.flightLegId ? (
        <DashboardActionLink href={`/operations-control/${flight.flightLegId}`} label="Open release workspace" primary />
      ) : null}
    </div>
  );
}

function PhaseDetailView({
  flight,
  phase,
}: {
  flight: DashboardFlight;
  phase: "postflight" | "preflight";
}) {
  const summary = phase === "preflight" ? preflightSummary(flight) : postflightSummary(flight);
  const href = flight.flightLegId
    ? phase === "preflight"
      ? `/operations-control/${flight.flightLegId}`
      : `/operations-control/${flight.flightLegId}`
    : null;

  return (
    <div className="space-y-4">
      <FlightLegDrawerHeader flight={flight} />
      <section
        className={`rounded-xl border p-3 text-sm ${
          summary.ready
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <p className="font-semibold">{phase === "preflight" ? "Preflight" : "Postflight"}</p>
        <p className="mt-1">{summary.message}</p>
      </section>
      {phase === "preflight" && flight.releaseEvidence ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
          <p className="font-semibold text-zinc-950">Preflight evidence</p>
          <div className="mt-2 grid gap-1 text-zinc-600">
            <p>
              Fuel: {formatFuelAmount(flight.releaseEvidence.fuelOnboardLbs, flight.releaseEvidence.fuelOnboardGallons)} |{" "}
              {fuelReadyLabel(flight.releaseEvidence.fueledReady)}
            </p>
            <p>W&B: {statusText(flight.releaseEvidence.weightBalanceStatus)}</p>
            <p>
              Manifest:{" "}
              {flight.releaseSetting.manifestMode === OperatorManifestMode.PREFLIGHT_VERIFY
                ? "Preflight verification required"
                : "Not a Preflight verification item"}
            </p>
          </div>
        </section>
      ) : null}
      {phase === "postflight" && flight.releaseEvidence ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
          <p className="font-semibold text-zinc-950">Postflight evidence</p>
          <div className="mt-2 grid gap-1 text-zinc-600">
            <p>Postflight fuel: {flight.releaseEvidence.postflightComplete ? "Recorded" : "Open"}</p>
            <p>OUT/OFF/ON/IN: {flight.releaseEvidence.postflightStatus ?? "Not started"}</p>
          </div>
        </section>
      ) : null}
      {href ? <DashboardActionLink href={href} label="Open full workflow" primary /> : null}
    </div>
  );
}

function ComponentDetailView({
  component,
  flight,
}: {
  component: DashboardReleaseComponent;
  flight: DashboardFlight;
}) {
  const fullWorkflowHref = workflowHref(flight, component);

  return (
    <div className="space-y-4">
      <FlightLegDrawerHeader flight={flight} />
      <section className={`rounded-xl border p-3 ${componentToneClasses(component.status)}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${componentDotClasses(component.status)}`} />
          <h3 className="font-semibold">{component.label}</h3>
        </div>
        <p className="mt-2 text-sm opacity-85">{component.message}</p>
      </section>
      {component.key === "mx" && flight.assignedAircraft ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
          <p className="font-semibold text-zinc-950">Aircraft MX context</p>
          <p className="mt-1 text-zinc-600">
            {flight.assignedAircraft.tailNumber} status {flight.assignedAircraft.status}
          </p>
          <p className="mt-1 text-zinc-600">
            {flight.assignedAircraft.discrepancyCount} open discrepancies |{" "}
            {flight.assignedAircraft.deferralCount} active deferrals
          </p>
        </section>
      ) : null}
      {component.key === "crew" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
          <p className="font-semibold text-zinc-950">Crew coverage</p>
          <p className="mt-1 text-zinc-600">{crewCoverageLabel(flight)}</p>
          {flight.coverage?.warnings.length ? (
            <ul className="mt-2 space-y-1 text-amber-800">
              {flight.coverage.warnings.map((warning) => (
                <li key={`${warning.seatRole}-${warning.message}`}>{warning.message}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      {component.key === "manifest" && flight.releaseEvidence ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
          <p className="font-semibold text-zinc-950">Manifest load context</p>
          <div className="mt-2 grid gap-1 text-zinc-600">
            <p>Crew count: {flight.coverage?.assignedCrew.length ?? 0}</p>
            <p>Passenger/manifest count: {flight.releaseEvidence.manifestItemCount}</p>
            <p>Status: {statusText(flight.releaseEvidence.manifestStatus)}</p>
          </div>
        </section>
      ) : null}
      {component.key === "fuel" && flight.releaseEvidence ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
          <p className="font-semibold text-zinc-950">Fuel release context</p>
          <div className="mt-2 grid gap-1 text-zinc-600">
            <p>
              Release fuel:{" "}
              {formatFuelAmount(
                flight.releaseEvidence.fuelOnboardLbs,
                flight.releaseEvidence.fuelOnboardGallons,
              )}
            </p>
            <p>{fuelReadyLabel(flight.releaseEvidence.fueledReady)}</p>
            <p>
              Recorded:{" "}
              {flight.releaseEvidence.fuelRecordedAt
                ? flight.releaseEvidence.fuelRecordedAt.toLocaleString()
                : "Missing"}
            </p>
          </div>
        </section>
      ) : null}
      {flight.releaseEvidence ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
          <p className="font-semibold text-zinc-950">Evidence snapshot</p>
          <div className="mt-2 grid gap-1 text-zinc-600">
            <p>Manifest: {statusText(flight.releaseEvidence.manifestStatus)}</p>
            <p>
              Fuel: {formatFuelAmount(flight.releaseEvidence.fuelOnboardLbs, flight.releaseEvidence.fuelOnboardGallons)} |{" "}
              {fuelReadyLabel(flight.releaseEvidence.fueledReady)}
            </p>
            <p>W&B: {statusText(flight.releaseEvidence.weightBalanceStatus)}</p>
            <p>Locating: {statusText(flight.releaseEvidence.locatingStatus)}</p>
            <p>Dispatch: {flight.releaseEvidence.dispatchPackageReady ? "Ready" : "Incomplete"}</p>
          </div>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {fullWorkflowHref ? (
          <DashboardActionLink href={fullWorkflowHref} label="Open full workflow" primary />
        ) : null}
        {flight.flightLegId ? (
          <DashboardActionLink href={`/operations-control/${flight.flightLegId}`} label="Open release workspace" />
        ) : null}
      </div>
    </div>
  );
}

function AuditDetailView({ flight }: { flight: DashboardFlight }) {
  return (
    <div className="space-y-4">
      <FlightLegDrawerHeader flight={flight} />
      {flight.releaseAuditEvents.length ? (
        <ul className="space-y-3">
          {flight.releaseAuditEvents.map((event) => (
            <li className="rounded-xl border border-zinc-200 bg-white p-3 text-sm" key={event.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                  {event.eventType}
                </span>
                <span className="text-xs text-zinc-500">
                  {event.createdAt.toLocaleString()} | {event.actorRole ?? "System"}
                </span>
              </div>
              <p className="mt-2 text-zinc-700">{event.message}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          No release audit events have been recorded for this FlightLeg yet.
        </p>
      )}
    </div>
  );
}

function DashboardDrawer({
  dashboard,
  currentUser,
  drawerObject,
  drawerSize,
  drawerView,
  panel,
  releaseError,
  selectedFlight,
  selectedWindow,
}: {
  dashboard: Awaited<ReturnType<typeof getDashboardData>>;
  currentUser: CurrentUser | null;
  drawerObject: DrawerObject | null;
  drawerSize: DrawerSize;
  drawerView: FlightLegDrawerView;
  panel: DashboardPanel | null;
  releaseError: string | null;
  selectedFlight: DashboardFlight | null;
  selectedWindow: DashboardWindowValue;
}) {
  if (!panel && !drawerObject) {
    return null;
  }

  const closeHref = dashboardHref(selectedWindow);

  if (panel === "alerts") {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Dashboard quick review" title="Active Alerts">
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
      </ContextDrawer>
    );
  }

  if (panel === "release") {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Dashboard quick review" title={`Ops Release Review | ${dashboard.releaseWindowLabel}`}>
        {dashboard.operationsAttention.priorityFlightLegs.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            No Ops Release review items inside this window.
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
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {flightLeg.releaseStatus === ReleaseStatus.RELEASED
                      ? "Released"
                      : flightLeg.releaseSummary.allReady
                        ? "Ops release ready"
                        : "Ops release review"}
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
      </ContextDrawer>
    );
  }

  if (drawerObject !== "flightLeg") {
    return null;
  }

  if (!selectedFlight) {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Dashboard quick review" title="FlightLeg Review">
        <p className="text-sm text-zinc-600">Select a FlightLeg from the dashboard to review details.</p>
      </ContextDrawer>
    );
  }

  const identity = selectedFlight.flightLegId ?? selectedFlight.id;
  const baseOptions = {
    id: identity,
    object: "flightLeg" as const,
    size: drawerSize,
  };
  const summaryHref = dashboardHref(selectedWindow, {
    ...baseOptions,
    view: "summary",
  });
  const expandedHref = dashboardHref(selectedWindow, {
    id: identity,
    object: "flightLeg",
    size: "expanded",
    view: drawerView,
  });
  const contractHref = dashboardHref(selectedWindow, {
    id: identity,
    object: "flightLeg",
    size: "standard",
    view: drawerView,
  });
  const component = releaseComponentByView(selectedFlight, drawerView);
  let content: ReactNode;
  let eyebrow = "FlightLeg workspace";
  let title = `${selectedFlight.flightNumber} | ${selectedFlight.departureCode} -> ${selectedFlight.arrivalCode}`;

  if (drawerView === "release-confirm") {
    eyebrow = "Release verification";
    title = "Ops release ready";
    content = selectedFlight.flightLegId ? (
      <ReleaseVerificationPanel
        currentUser={currentUser}
        releaseError={releaseError}
        selectedFlight={selectedFlight}
        selectedWindow={selectedWindow}
      />
    ) : (
      <p className="text-sm text-zinc-600">This row is not backed by a FlightLeg release workflow.</p>
    );
  } else if (drawerView === "void-confirm") {
    eyebrow = "Release verification";
    title = "Void release";
    content = selectedFlight.flightLegId ? (
      <VoidReleasePanel
        currentUser={currentUser}
        releaseError={releaseError}
        selectedFlight={selectedFlight}
        selectedWindow={selectedWindow}
      />
    ) : (
      <p className="text-sm text-zinc-600">This row is not backed by a FlightLeg release workflow.</p>
    );
  } else if (drawerView === "release") {
    content = (
      <ReleaseDetailView
        currentUser={currentUser}
        flight={selectedFlight}
        releaseError={releaseError}
        selectedWindow={selectedWindow}
      />
    );
  } else if (drawerView === "preflight" || drawerView === "postflight") {
    content = <PhaseDetailView flight={selectedFlight} phase={drawerView} />;
  } else if (drawerView === "audit") {
    content = <AuditDetailView flight={selectedFlight} />;
  } else if (component) {
    content = <ComponentDetailView component={component} flight={selectedFlight} />;
  } else {
    content = (
      <FlightLegSummaryView
        flight={selectedFlight}
        selectedWindow={selectedWindow}
        size={drawerSize}
      />
    );
  }

  return (
    <ContextDrawer
      backHref={drawerView === "summary" ? undefined : summaryHref}
      closeHref={closeHref}
      contractHref={contractHref}
      expandHref={expandedHref}
      eyebrow={eyebrow}
      size={drawerSize}
      title={title}
    >
      {content}
    </ContextDrawer>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedWindow = parseWindow(params.window);
  const panel = parsePanel(params.panel);
  const drawerObject = parseDrawerObject(params.object);
  const drawerId = firstParam(params.id);
  const drawerSize = parseDrawerSize(params.size);
  const drawerView = parseFlightLegView(params.view);
  const releaseError = firstParam(params.releaseError);
  const [dashboard, currentUser] = await Promise.all([
    getDashboardData({ window: selectedWindow }),
    getCurrentUser(),
  ]);
  const visibleFlights = dashboard.flights;
  const selectedFlight =
    drawerObject === "flightLeg"
      ? dashboard.flights.find((flight) => flight.flightLegId === drawerId || flight.id === drawerId) ??
        null
      : null;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
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
            Ops release window: {dashboard.releaseWindowLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WindowControls selectedWindow={dashboard.selectedWindow} />
              <DashboardActionLink href="/operations-control" label="Open workbench" primary />
              <DashboardActionLink href="/operations-control/new" label="New FlightLeg" />
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-11">
            <StatusTile
              href="/operations-control"
              label="Flights in view"
              tone="zinc"
              value={dashboard.statusSummary.totalFlights}
            />
            <StatusTile
              href={dashboardHref(dashboard.selectedWindow, { panel: "release" })}
              label="Released"
              tone="emerald"
              value={dashboard.statusSummary.released}
            />
            <StatusTile
              href={dashboardHref(dashboard.selectedWindow, { panel: "release" })}
              label="Needs release"
              tone={dashboard.statusSummary.plannedOrUnreleased > 0 ? "sky" : "emerald"}
              value={dashboard.statusSummary.plannedOrUnreleased}
            />
            <StatusTile
              href={dashboardHref(dashboard.selectedWindow, { panel: "release" })}
              label="Ops review"
              tone={dashboard.statusSummary.releaseReviewNeeded > 0 ? "amber" : "emerald"}
              value={dashboard.statusSummary.releaseReviewNeeded}
            />
            <StatusTile
              href={dashboardHref(dashboard.selectedWindow, { panel: "release" })}
              label="Ops ready"
              tone="emerald"
              value={dashboard.statusSummary.releaseReady}
            />
            <StatusTile
              href="/flights?status=enroute"
              label="Enroute"
              tone={dashboard.statusSummary.enroute > 0 ? "sky" : "zinc"}
              value={dashboard.statusSummary.enroute}
            />
            <StatusTile
              href="/flights?status=delayed"
              label="Delayed"
              tone={dashboard.statusSummary.delayed > 0 ? "rose" : "zinc"}
              value={dashboard.statusSummary.delayed}
            />
            <StatusTile
              href="/flights?status=complete"
              label="Complete"
              tone="zinc"
              value={dashboard.statusSummary.complete}
            />
            <StatusTile
              href="/flights?status=cancelled"
              label="Cancelled"
              tone={dashboard.statusSummary.cancelled > 0 ? "rose" : "zinc"}
              value={dashboard.statusSummary.cancelled}
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
                    className="relative grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm transition hover:border-sky-300 hover:bg-sky-50/40 md:grid-cols-[auto_1fr]"
                    key={flight.id}
                  >
                    {flight.flightLegId ? (
                      <Link
                        aria-label={`Open quick review for ${flight.flightNumber}`}
                        className="absolute inset-0 z-0 rounded-lg"
                        href={dashboardHref(dashboard.selectedWindow, {
                          id: flight.flightLegId,
                          object: "flightLeg",
                          view: "summary",
                        })}
                      />
                    ) : null}
                    <div className="pointer-events-none relative z-10 font-mono text-base font-semibold text-zinc-950">
                      {toTime(flight.scheduledDeparture)}
                    </div>
                    <div className="pointer-events-none relative z-10 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-zinc-950">
                          {flight.flightNumber}
                        </span>
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
                          {lifecycleStatusLabel(flight.status)}
                        </span>
                        {flight.flightLegId ? (
                          <Link
                            className={`pointer-events-auto relative z-20 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${releaseActionClasses(
                              flight,
                            )}`}
                            href={dashboardHref(dashboard.selectedWindow, {
                              id: flight.flightLegId,
                              object: "flightLeg",
                              view: releaseViewForFlight(flight),
                            })}
                          >
                            {releaseActionLabel(flight)}
                          </Link>
                        ) : null}
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
                        <ReleaseStrip flight={flight} hideCrew />
                      </div>
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
        currentUser={currentUser}
        drawerObject={drawerObject}
        drawerSize={drawerSize}
        drawerView={drawerView}
        panel={panel}
        releaseError={releaseError}
        selectedFlight={selectedFlight}
        selectedWindow={dashboard.selectedWindow}
      />
    </main>
  );
}
