import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AirworthinessReleaseStatus,
  DispatchPackageStatus,
  FlightLocatingStatus,
  ManifestStatus,
  ReleaseStatus,
  WeightBalanceStatus,
} from "@prisma/client";

import {
  cancelFlightLegReleaseAction,
  captureReleasePackagePreviewAction,
  captureReleasePreviewSnapshotAction,
  markFlightLegReleasedAction,
  voidFlightLegReleaseAction,
} from "@/app/operations-control/actions";

import {
  getReleaseEvidenceDetail,
  ReleaseEvidenceDetail,
} from "@/lib/release-evidence-detail-queries";
import {
  getReleaseReadinessItems,
  ReleaseReadinessItem,
} from "@/lib/release-readiness";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    flightLegId: string;
  }>;
  searchParams: Promise<{
    releaseError?: string | string[];
    snapshotError?: string | string[];
    snapshotMessage?: string | string[];
    packageError?: string | string[];
    packageMessage?: string | string[];
  }>;
};

function toDateTimeLabel(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function positionReportFreshnessLabel(reportedAt: Date, now: Date): string {
  const diffMs = now.getTime() - reportedAt.getTime();

  if (diffMs < 0) {
    return `reported ${toDateTimeLabel(reportedAt)}`;
  }

  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 60) {
    return `${Math.max(diffMinutes, 0)} minute(s) ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 48) {
    return `${diffHours} hour(s) ago`;
  }

  return `${Math.floor(diffHours / 24)} day(s) ago`;
}

function dispatchReviewMessage(
  dispatch: ReleaseEvidenceDetail["dispatchPackage"],
  linkedEvidenceReady: boolean,
): string {
  if (!dispatch) {
    return "No dispatch package has been created.";
  }

  const evidenceMessage = linkedEvidenceReady
    ? "Weather, NOTAM, and flight-plan evidence are linked."
    : "Dispatch evidence is incomplete.";

  if (dispatch.status === DispatchPackageStatus.REVIEWED) {
    return `${evidenceMessage} Reviewed ${toDateTimeLabel(dispatch.reviewedAt)}.`;
  }

  if (dispatch.status === DispatchPackageStatus.READY) {
    return `${evidenceMessage} Ready ${toDateTimeLabel(dispatch.readyAt)} and awaiting review.`;
  }

  if (dispatch.status === DispatchPackageStatus.VOIDED) {
    return `Dispatch package is voided as of ${toDateTimeLabel(dispatch.voidedAt)}.`;
  }

  return `${evidenceMessage} Current package status is DRAFT.`;
}

function formatJson(value: unknown): string {
  if (!value) {
    return "No snapshot captured.";
  }

  return JSON.stringify(value, null, 2);
}

function statusBadgeClasses(value: string | null | undefined): string {
  if (!value) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }

  if (["READY", "LOCKED", "CALCULATED", "APPROVED", "FILED", "ACTIVE", "CLOSED", "RELEASED"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["DRAFT", "NOT_STARTED", "PLANNED"].includes(value)) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
        value,
      )}`}
    >
      {value ?? "Missing"}
    </span>
  );
}

function actionStatusClasses(tone: "good" | "warn" | "missing") {
  if (tone === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "warn") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function EvidenceActionCard({
  href,
  label,
  message,
  status,
  tone,
}: {
  href?: string;
  label: string;
  message: string;
  status: string;
  tone: "good" | "warn" | "missing";
}) {
  return (
    <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-900">{label}</p>
          <p className="mt-1 text-sm text-zinc-600">{message}</p>
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${actionStatusClasses(
            tone,
          )}`}
        >
          {status}
        </span>
      </div>
      {href ? (
        <Link className="mt-3 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900" href={href}>
          Open
        </Link>
      ) : (
        <p className="mt-3 text-xs font-medium text-zinc-500">No action link available</p>
      )}
    </article>
  );
}

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function ReleaseActionButton({
  action,
  label,
  variant = "primary",
}: {
  action: () => Promise<void>;
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <form action={action}>
      <button
        className={
          variant === "primary"
            ? "rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
            : "rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        }
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function ReleaseControlActions({ detail }: { detail: ReleaseEvidenceDetail }) {
  const releaseStatus = detail.operationalControlRecord?.release?.status ?? null;
  const markReleased = markFlightLegReleasedAction.bind(null, detail.id);
  const cancelRelease = cancelFlightLegReleaseAction.bind(null, detail.id);
  const voidRelease = voidFlightLegReleaseAction.bind(null, detail.id);

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Release Control</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Minimal release status controls. Evidence mutation and dispatch assembly remain deferred.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {releaseStatus !== ReleaseStatus.RELEASED ? (
            <ReleaseActionButton action={markReleased} label="Mark Released" />
          ) : null}
          {releaseStatus === ReleaseStatus.PLANNED || !releaseStatus ? (
            <ReleaseActionButton action={cancelRelease} label="Cancel Release" variant="secondary" />
          ) : null}
          {releaseStatus === ReleaseStatus.RELEASED ? (
            <ReleaseActionButton action={voidRelease} label="Void Release" variant="secondary" />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SnapshotCaptureForm({ flightLegId }: { flightLegId: string }) {
  const captureSnapshot = captureReleasePreviewSnapshotAction.bind(null, flightLegId);

  return (
    <form action={captureSnapshot}>
      <button
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        type="submit"
      >
        Capture preview snapshot
      </button>
    </form>
  );
}

function ReadinessBadge({ ready }: { ready: boolean }) {
  return (
    <span
      className={
        ready
          ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
      }
    >
      {ready ? "Ready" : "Needs attention"}
    </span>
  );
}

function BlockingPreviewBadge({
  classification,
}: {
  classification: ReleaseReadinessItem["classification"];
}) {
  const classes =
    classification === "WOULD_BLOCK"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : classification === "WOULD_WARN"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const label =
    classification === "WOULD_BLOCK"
      ? "Would block release"
      : classification === "WOULD_WARN"
        ? "Would warn"
        : "No blocker";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

function ReleaseEvidenceActionPanel({
  detail,
  now,
}: {
  detail: ReleaseEvidenceDetail;
  now: Date;
}) {
  const manifest = detail.manifest;
  const latestUsableWeightBalanceRun =
    detail.weightBalanceRuns.find((run) => run.status !== WeightBalanceStatus.VOIDED) ?? null;
  const locating = detail.flightLocatingRecord;
  const dispatch = detail.dispatchPackage;
  const weather = dispatch?.weatherBriefing ?? null;
  const notam = dispatch?.notamSnapshot ?? null;
  const flightPlan = dispatch?.flightPlanReference ?? null;
  const aircraft = detail.aircraftAssignments[0]?.aircraft ?? null;
  const configuration = aircraft?.configurations[0] ?? null;
  const currentAirworthinessRelease =
    aircraft?.airworthinessReleases.find(
      (release) => release.status === AirworthinessReleaseStatus.RELEASED,
    ) ?? null;
  const airworthinessExpired =
    !!currentAirworthinessRelease?.expiresAt &&
    currentAirworthinessRelease.expiresAt.getTime() <= now.getTime();
  const latestSnapshot = detail.readinessSnapshots[0] ?? null;
  const manifestReady =
    !!manifest &&
    manifest.items.length > 0 &&
    (manifest.status === ManifestStatus.READY || manifest.status === ManifestStatus.LOCKED);
  const weightBalanceReady =
    !!latestUsableWeightBalanceRun &&
    (latestUsableWeightBalanceRun.status === WeightBalanceStatus.CALCULATED ||
      latestUsableWeightBalanceRun.status === WeightBalanceStatus.APPROVED);
  const latestPositionReport = locating?.positionReports[0] ?? null;
  const locatingFreshnessMessage = latestPositionReport
    ? `Latest position ${latestPositionReport.positionSummary}, ${positionReportFreshnessLabel(
        latestPositionReport.reportedAt,
        now,
      )}.`
    : "No position report has been recorded.";
  const locatingFreshnessWarning = locating?.status === FlightLocatingStatus.ACTIVE && !latestPositionReport;
  const locatingReady =
    !!locating &&
    (locating.status === FlightLocatingStatus.FILED ||
      locating.status === FlightLocatingStatus.ACTIVE ||
      locating.status === FlightLocatingStatus.CLOSED);
  const dispatchLinkedEvidenceReady = !!dispatch && !!weather && !!notam && !!flightPlan;
  const dispatchReady =
    dispatchLinkedEvidenceReady && dispatch.status !== DispatchPackageStatus.VOIDED;
  const dispatchStatus =
    dispatch?.status === DispatchPackageStatus.REVIEWED
      ? "Reviewed"
      : dispatch?.status === DispatchPackageStatus.READY
        ? "Ready"
        : dispatch
          ? "Needs attention"
          : "Missing";
  const airworthinessReady =
    !!aircraft && !!configuration && !!currentAirworthinessRelease && !airworthinessExpired;

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Release Evidence Actions</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Quick links to the existing evidence workflows. These statuses are
            informational and do not block release actions.
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-sky-700 hover:text-sky-900"
          href="/internal/release-snapshot-readiness"
        >
          Snapshot diagnostic
        </Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <EvidenceActionCard
          href={`/operations-control/${detail.id}/manifest`}
          label="Manifest"
          message={
            manifest
              ? `${manifest.items.length} item(s), status ${manifest.status}.`
              : "No manifest has been created."
          }
          status={manifestReady ? "Ready" : manifest ? "Needs attention" : "Missing"}
          tone={manifestReady ? "good" : manifest ? "warn" : "missing"}
        />
        <EvidenceActionCard
          href={`/operations-control/${detail.id}/weight-balance`}
          label="Weight and balance"
          message={
            latestUsableWeightBalanceRun
              ? `${latestUsableWeightBalanceRun.runLabel} is ${latestUsableWeightBalanceRun.status}.`
              : "No active W&B run is recorded."
          }
          status={weightBalanceReady ? "Ready" : latestUsableWeightBalanceRun ? "Needs attention" : "Missing"}
          tone={weightBalanceReady ? "good" : latestUsableWeightBalanceRun ? "warn" : "missing"}
        />
        <EvidenceActionCard
          href={`/operations-control/${detail.id}/locating`}
          label="Flight locating"
          message={
            locating
              ? `Locating status is ${locating.status}. ${locatingFreshnessMessage}`
              : "No locating record has been created."
          }
          status={locatingReady && !locatingFreshnessWarning ? "Ready" : locating ? "Needs attention" : "Missing"}
          tone={locatingReady && !locatingFreshnessWarning ? "good" : locating ? "warn" : "missing"}
        />
        <EvidenceActionCard
          href={`/operations-control/${detail.id}/dispatch`}
          label="Dispatch package"
          message={dispatchReviewMessage(dispatch, dispatchLinkedEvidenceReady)}
          status={dispatchReady ? dispatchStatus : dispatch ? "Needs attention" : "Missing"}
          tone={dispatchReady ? "good" : dispatch ? "warn" : "missing"}
        />
        <EvidenceActionCard
          href={aircraft ? `/aircraft/${aircraft.id}/airworthiness` : undefined}
          label="Airworthiness"
          message={
            aircraft
              ? `${aircraft.tailNumber}: ${
                  airworthinessReady ? "current release and configuration found" : "review aircraft status"
                }.`
              : "No assigned aircraft is available."
          }
          status={airworthinessReady ? "Current" : aircraft ? "Review" : "Missing"}
          tone={airworthinessReady ? "good" : aircraft ? "warn" : "missing"}
        />
        <EvidenceActionCard
          href={latestSnapshot ? `/operations-control/${detail.id}/snapshots/${latestSnapshot.id}` : undefined}
          label="Preview snapshots"
          message={
            latestSnapshot
              ? `${latestSnapshot.snapshotStatus} captured ${toDateTimeLabel(latestSnapshot.evaluatedAt)}.`
              : "No preview snapshot has been captured."
          }
          status={latestSnapshot ? latestSnapshot.snapshotStatus : "Missing"}
          tone={latestSnapshot ? (latestSnapshot.snapshotStatus === "PASS" ? "good" : "warn") : "missing"}
        />
      </div>
    </section>
  );
}

function SectionNavigation() {
  const sections = [
    ["#readiness", "Readiness"],
    ["#release-history", "Release History"],
    ["#release-package", "Release Package"],
    ["#airworthiness", "Airworthiness"],
    ["#evidence-details", "Evidence Details"],
    ["#raw-reference-data", "Raw Reference Data"],
  ];

  return (
    <nav
      aria-label="FlightLeg detail sections"
      className="sticky top-2 z-10 rounded-md border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Sections
        </span>
        {sections.map(([href, label]) => (
          <Link
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function SectionGroup({
  children,
  description,
  id,
  title,
}: {
  children: React.ReactNode;
  description: string;
  id: string;
  title: string;
}) {
  return (
    <section className="scroll-mt-24 space-y-4" id={id}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {title}
        </p>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ReleasePackagePreview({ detail }: { detail: ReleaseEvidenceDetail }) {
  const latestPackage = detail.releasePackages[0] ?? null;
  const latestUsableWeightBalanceRun =
    detail.weightBalanceRuns.find((run) => run.status !== WeightBalanceStatus.VOIDED) ?? null;
  const currentAirworthinessRelease =
    detail.aircraftAssignments[0]?.aircraft.airworthinessReleases.find(
      (release) => release.status === "RELEASED" && (!release.expiresAt || release.expiresAt > new Date()),
    ) ?? null;
  const packageItems = [
    {
      label: "Operational control",
      ready: Boolean(detail.operationalControlRecord),
      status: detail.operationalControlRecord ? "Linked" : "Missing",
    },
    {
      label: "FlightRelease",
      ready: Boolean(detail.operationalControlRecord?.release),
      status: detail.operationalControlRecord?.release?.status ?? "Missing",
    },
    {
      label: "Readiness snapshot",
      ready: detail.readinessSnapshots.length > 0,
      status: detail.readinessSnapshots[0]?.snapshotStatus ?? "Missing",
    },
    {
      label: "Manifest",
      ready: Boolean(detail.manifest),
      status: detail.manifest?.status ?? "Missing",
    },
    {
      label: "Weight and balance",
      ready: Boolean(latestUsableWeightBalanceRun),
      status: latestUsableWeightBalanceRun?.status ?? "Missing",
    },
    {
      label: "Flight locating",
      ready: Boolean(detail.flightLocatingRecord),
      status: detail.flightLocatingRecord?.status ?? "Missing",
    },
    {
      label: "Dispatch package",
      ready: Boolean(detail.dispatchPackage),
      status: detail.dispatchPackage?.status ?? "Missing",
    },
    {
      label: "Airworthiness release",
      ready: Boolean(currentAirworthinessRelease),
      status: currentAirworthinessRelease?.status ?? "Missing",
    },
  ];
  const readyCount = packageItems.filter((item) => item.ready).length;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-zinc-950">ReleasePackage Preview</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Read-only package completeness context. Capture/finalize actions are deferred.
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
            {readyCount} / {packageItems.length} evidence groups present
          </span>
        </div>

        <form action={captureReleasePackagePreviewAction.bind(null, detail.id)} className="mt-4">
          <button
            className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
            type="submit"
          >
            Capture package preview
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            Creates a preview package record only. FlightRelease status is not changed.
          </p>
        </form>

        {latestPackage ? (
          <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            Latest package {latestPackage.packageNumber} is {latestPackage.status}; captured{" "}
            {toDateTimeLabel(latestPackage.capturedAt)} with{" "}
            {latestPackage.evidenceLinks.length} evidence links.
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            No ReleasePackage has been captured yet. This does not block current release actions.
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {packageItems.map((item) => (
            <div
              className={`rounded-md border p-3 ${
                item.ready
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-zinc-200 bg-zinc-50"
              }`}
              key={item.label}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-950">{item.status}</p>
            </div>
          ))}
        </div>
      </div>

      {latestPackage?.evidenceLinks.length ? (
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Evidence</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {latestPackage.evidenceLinks.map((link) => (
                <tr key={link.id}>
                  <td className="px-3 py-2.5 font-medium text-zinc-900">{link.evidenceLabel}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{link.evidenceType}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{link.statusLabel ?? "Not captured"}</td>
                  <td className="px-3 py-2.5 text-zinc-600">{link.isRequired ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ReleaseReadinessChecklist({ detail }: { detail: ReleaseEvidenceDetail }) {
  const items = getReleaseReadinessItems(detail);
  const readyCount = items.filter((item) => item.ready).length;
  const wouldBlockCount = items.filter((item) => item.classification === "WOULD_BLOCK").length;
  const wouldWarnCount = items.filter((item) => item.classification === "WOULD_WARN").length;
  const overallReady = readyCount === items.length;

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Release Readiness</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Warning-only evidence checklist with a non-enforcing blocking preview.
            Release actions remain available.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <ReadinessBadge ready={overallReady} />
          <p className="text-xs text-zinc-500">
            {readyCount} of {items.length} ready
          </p>
          <p className="text-xs text-zinc-500">
            Preview: {wouldBlockCount} would block, {wouldWarnCount} would warn
          </p>
          <div className="mt-2">
            <SnapshotCaptureForm flightLegId={detail.id} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={item.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-zinc-900">{item.label}</p>
              <div className="flex flex-wrap items-center gap-2">
                <ReadinessBadge ready={item.ready} />
                <BlockingPreviewBadge classification={item.classification} />
              </div>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{item.message}</p>
            {item.href ? (
              <Link
                className="mt-3 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                href={item.href}
              >
                Manage evidence
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function snapshotSummaryValue(summary: unknown, key: string): number {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return 0;
  }

  const value = (summary as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
}

function metadataValue(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return null;
}

function actorLabel(event: ReleaseEvidenceDetail["releaseAuditEvents"][number]): string {
  const profile = event.actorUser?.profile;
  const profileName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  if (profileName) {
    return profileName;
  }

  if (event.actorUser?.email) {
    return event.actorUser.email;
  }

  return event.actorRole ?? "System / unauthenticated";
}

function RecentReleaseSnapshots({ detail }: { detail: ReleaseEvidenceDetail }) {
  if (detail.readinessSnapshots.length === 0) {
    return (
      <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Preview Snapshots</h2>
        <p className="mt-2 text-sm text-zinc-600">
          No preview release-readiness snapshots have been captured yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Preview Snapshots</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Recent explicit preview captures. These do not block release actions.
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {detail.readinessSnapshots.map((snapshot) => (
          <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={snapshot.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-900">{snapshot.snapshotStatus}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {snapshot.authorityClass} | {toDateTimeLabel(snapshot.evaluatedAt)}
                </p>
              </div>
              <Link
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 hover:border-sky-200 hover:text-sky-700"
                href={`/operations-control/${detail.id}/snapshots/${snapshot.id}`}
              >
                {snapshot.findings.length} findings
              </Link>
            </div>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-xs">
              <div>
                <dt className="text-zinc-500">Pass</dt>
                <dd className="font-semibold">{snapshotSummaryValue(snapshot.summary, "pass")}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Fail</dt>
                <dd className="font-semibold">{snapshotSummaryValue(snapshot.summary, "fail")}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Warn</dt>
                <dd className="font-semibold">{snapshotSummaryValue(snapshot.summary, "warning")}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">N/A</dt>
                <dd className="font-semibold">
                  {snapshotSummaryValue(snapshot.summary, "notApplicable")}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReleaseAuditTimeline({ detail }: { detail: ReleaseEvidenceDetail }) {
  if (detail.releaseAuditEvents.length === 0) {
    return (
      <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Release Audit Timeline</h2>
        <p className="mt-2 text-sm text-zinc-600">
          No release audit events have been recorded for this FlightLeg yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Release Audit Timeline</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Read-only release-control audit events. These records do not change
        warning-only release behavior.
      </p>
      <div className="mt-4 space-y-3">
        {detail.releaseAuditEvents.map((event) => {
          const attemptedAction = metadataValue(event.metadata, "attemptedAction");
          const attemptedReleaseStatus = metadataValue(event.metadata, "attemptedReleaseStatus");
          const capturedBeforeStatus = metadataValue(event.metadata, "capturedBeforeStatus");
          const snapshotCaptured = metadataValue(event.metadata, "snapshotCaptured");
          const snapshotSkippedReason = metadataValue(event.metadata, "snapshotSkippedReason");

          return (
            <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={event.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{event.eventType}</p>
                  <p className="mt-1 text-sm text-zinc-700">{event.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {toDateTimeLabel(event.createdAt)} | {actorLabel(event)}
                  </p>
                </div>
                {event.snapshot ? (
                  <Link
                    className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 hover:border-sky-200 hover:text-sky-700"
                    href={`/operations-control/${detail.id}/snapshots/${event.snapshot.id}`}
                  >
                    Snapshot {event.snapshot.snapshotStatus}
                  </Link>
                ) : (
                  <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-500">
                    No snapshot link
                  </span>
                )}
              </div>
              {attemptedAction ||
              attemptedReleaseStatus ||
              capturedBeforeStatus ||
              snapshotCaptured ||
              snapshotSkippedReason ? (
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
                  {attemptedAction ? (
                    <div>
                      <dt className="text-zinc-500">Attempt</dt>
                      <dd className="font-medium">{attemptedAction}</dd>
                    </div>
                  ) : null}
                  {attemptedReleaseStatus ? (
                    <div>
                      <dt className="text-zinc-500">Requested status</dt>
                      <dd className="font-medium">{attemptedReleaseStatus}</dd>
                    </div>
                  ) : null}
                  {capturedBeforeStatus ? (
                    <div>
                      <dt className="text-zinc-500">Before status</dt>
                      <dd className="font-medium">{capturedBeforeStatus}</dd>
                    </div>
                  ) : null}
                  {snapshotCaptured ? (
                    <div>
                      <dt className="text-zinc-500">Snapshot captured</dt>
                      <dd className="font-medium">{snapshotCaptured}</dd>
                    </div>
                  ) : null}
                  {snapshotSkippedReason ? (
                    <div className="lg:col-span-2">
                      <dt className="text-zinc-500">Snapshot skip reason</dt>
                      <dd className="font-medium">{snapshotSkippedReason}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24 rounded-md border border-zinc-200 bg-white p-4 shadow-sm" id={id}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryGrid({ detail }: { detail: ReleaseEvidenceDetail }) {
  const aircraft = detail.aircraftAssignments[0]?.aircraft;
  const release = detail.operationalControlRecord?.release;

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-md border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">FlightLeg</p>
        <p className="mt-2 text-xl font-semibold">{detail.flightNumber ?? "Unnumbered"}</p>
        <p className="text-sm text-zinc-600">
          {detail.departureStation.code} {"->"} {detail.arrivalStation.code}
        </p>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">Release</p>
        <div className="mt-2">
          <StatusBadge value={release?.status} />
        </div>
        <p className="mt-2 text-xs text-zinc-500">{toDateTimeLabel(release?.releasedAt ?? null)}</p>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">Aircraft</p>
        <p className="mt-2 font-mono text-xl font-semibold">
          {aircraft?.tailNumber ?? "Not assigned"}
        </p>
        <p className="text-sm text-zinc-600">{aircraft?.type ?? "Unknown type"}</p>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">Authority</p>
        <p className="mt-2 text-sm font-semibold">{detail.operatingAuthority.displayName}</p>
        <p className="text-xs text-zinc-500">{detail.authorityRevision.revisionLabel}</p>
      </article>
    </section>
  );
}

function ManifestSection({ detail }: { detail: ReleaseEvidenceDetail }) {
  const manifest = detail.manifest;

  if (!manifest) {
    return (
      <div>
        <p className="text-sm text-zinc-600">No manifest record exists for this FlightLeg.</p>
        <Link
          className="mt-3 inline-flex rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          href={`/operations-control/${detail.id}/manifest`}
        >
          Manage manifest
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={manifest.status} />
          <span className="text-sm text-zinc-500">{manifest.items.length} manifest items</span>
        </div>
        <Link
          className="inline-flex rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          href={`/operations-control/${detail.id}/manifest`}
        >
          Manage manifest
        </Link>
      </div>
      {manifest.items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">No manifest items recorded.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="px-3 py-2 font-medium">Passenger</th>
                <th className="px-3 py-2 font-medium">Seat</th>
                <th className="px-3 py-2 font-medium">Weight</th>
                <th className="px-3 py-2 font-medium">Baggage</th>
                <th className="px-3 py-2 font-medium">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {manifest.items.map((item) => (
                <tr className="border-b border-zinc-100" key={item.id}>
                  <td className="px-3 py-2.5">
                    {item.personName ??
                      [item.passenger?.firstName, item.passenger?.lastName].filter(Boolean).join(" ") ??
                      "Unnamed"}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{item.seatNumber ?? "Unassigned"}</td>
                  <td className="px-3 py-2.5">{item.weight?.toString() ?? "Not set"}</td>
                  <td className="px-3 py-2.5">{item.baggageWeight?.toString() ?? "Not set"}</td>
                  <td className="px-3 py-2.5">{toDateTimeLabel(item.checkedInAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WeightBalanceSection({ detail }: { detail: ReleaseEvidenceDetail }) {
  if (detail.weightBalanceRuns.length === 0) {
    return (
      <div>
        <p className="text-sm text-zinc-600">No weight and balance runs recorded.</p>
        <Link
          className="mt-3 inline-flex rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          href={`/operations-control/${detail.id}/weight-balance`}
        >
          Manage W&B
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end">
        <Link
          className="inline-flex rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          href={`/operations-control/${detail.id}/weight-balance`}
        >
          Manage W&B
        </Link>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {detail.weightBalanceRuns.map((run) => (
          <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={run.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{run.runLabel}</p>
              <StatusBadge value={run.status} />
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Takeoff weight</dt>
                <dd className="font-medium">{run.takeoffWeight?.toString() ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Landing weight</dt>
                <dd className="font-medium">{run.landingWeight?.toString() ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">CG</dt>
                <dd className="font-medium">{run.centerOfGravity ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Calculated</dt>
                <dd className="font-medium">{toDateTimeLabel(run.calculatedAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function LocatingSection({ detail }: { detail: ReleaseEvidenceDetail }) {
  const locating = detail.flightLocatingRecord;

  if (!locating) {
    return (
      <div>
        <p className="text-sm text-zinc-600">No locating record exists for this FlightLeg.</p>
        <Link
          className="mt-3 inline-flex rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          href={`/operations-control/${detail.id}/locating`}
        >
          Manage locating
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end">
        <Link
          className="inline-flex rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          href={`/operations-control/${detail.id}/locating`}
        >
          Manage locating
        </Link>
      </div>
      <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Status</dt>
          <dd className="mt-1">
            <StatusBadge value={locating.status} />
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Responsible party</dt>
          <dd className="font-medium">{locating.responsibleParty ?? "Not assigned"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Planned route</dt>
          <dd className="font-medium">{locating.plannedRoute ?? "Not set"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Last known position</dt>
          <dd className="font-medium">{locating.lastKnownPosition ?? "Not set"}</dd>
        </div>
      </dl>
    </div>
  );
}

function DispatchSection({ detail }: { detail: ReleaseEvidenceDetail }) {
  const dispatch = detail.dispatchPackage;

  if (!dispatch) {
    return (
      <div>
        <p className="text-sm text-zinc-600">No dispatch package exists for this FlightLeg.</p>
        <Link
          className="mt-3 inline-flex rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          href={`/operations-control/${detail.id}/dispatch`}
        >
          Manage dispatch
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end">
        <Link
          className="inline-flex rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          href={`/operations-control/${detail.id}/dispatch`}
        >
          Manage dispatch
        </Link>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold">Weather briefing</p>
          <p className="mt-2 text-sm text-zinc-700">
            {dispatch.weatherBriefing?.routeSummary ?? "No weather snapshot linked."}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {toDateTimeLabel(dispatch.weatherBriefing?.briefingAt ?? null)}
          </p>
        </article>
        <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold">NOTAM snapshot</p>
          <p className="mt-2 text-sm text-zinc-700">
            {dispatch.notamSnapshot?.affectedStationCodes ?? "No NOTAM snapshot linked."}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {toDateTimeLabel(dispatch.notamSnapshot?.capturedAt ?? null)}
          </p>
        </article>
        <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold">Flight plan</p>
          <p className="mt-2 text-sm text-zinc-700">
            {dispatch.flightPlanReference?.routeText ?? "No flight plan reference linked."}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {dispatch.flightPlanReference?.externalReference ?? "No external reference"}
          </p>
        </article>
      </div>
    </div>
  );
}

function AirworthinessSection({ detail }: { detail: ReleaseEvidenceDetail }) {
  const aircraft = detail.aircraftAssignments[0]?.aircraft ?? null;

  if (!aircraft) {
    return (
      <p className="text-sm text-zinc-600">
        No aircraft assignment is available for this FlightLeg.
      </p>
    );
  }

  const configuration = aircraft.configurations[0] ?? null;
  const release = aircraft.airworthinessReleases[0] ?? null;
  const maintenanceEvent = aircraft.maintenanceEvents[0] ?? null;
  const capabilityCodes = aircraft.capabilities
    .map((capability) => capability.capabilityCode)
    .join(", ");

  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold">Aircraft configuration</p>
          <p className="mt-2 text-sm text-zinc-700">
            {configuration?.configurationLabel ?? "No active configuration"}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Seats {configuration?.passengerSeatCount ?? aircraft.seats ?? "not set"} | Empty
            weight {configuration?.emptyWeight?.toString() ?? "not set"} | CG{" "}
            {configuration?.emptyWeightCg ?? "not set"}
          </p>
        </article>
        <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold">Airworthiness release</p>
          <p className="mt-2 text-sm text-zinc-700">
            {release?.releaseNumber ?? "No released airworthiness record"}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Released {toDateTimeLabel(release?.releasedAt ?? null)} | Expires{" "}
            {toDateTimeLabel(release?.expiresAt ?? null)}
          </p>
        </article>
        <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold">Capabilities</p>
          <p className="mt-2 text-sm text-zinc-700">
            {capabilityCodes || "No active capability records"}
          </p>
        </article>
        <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold">Latest maintenance event</p>
          <p className="mt-2 text-sm text-zinc-700">
            {maintenanceEvent
              ? `${maintenanceEvent.maintenanceNumber} | ${maintenanceEvent.eventType}`
              : "No completed maintenance event"}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Completed {toDateTimeLabel(maintenanceEvent?.completedAt ?? null)} | RTS{" "}
            {toDateTimeLabel(maintenanceEvent?.returnToServiceAt ?? null)}
          </p>
        </article>
      </div>

      {aircraft.discrepancies.length > 0 || aircraft.deferrals.length > 0 ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <article className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Open/deferred discrepancies</p>
            {aircraft.discrepancies.length === 0 ? (
              <p className="mt-2">None.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {aircraft.discrepancies.map((discrepancy) => (
                  <li key={discrepancy.discrepancyNumber}>
                    {discrepancy.discrepancyNumber}: {discrepancy.title} (
                    {discrepancy.status})
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Active deferrals</p>
            {aircraft.deferrals.length === 0 ? (
              <p className="mt-2">None.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {aircraft.deferrals.map((deferral) => (
                  <li key={deferral.deferralNumber}>
                    {deferral.deferralNumber}: {deferral.discrepancy.title}
                    {deferral.dueAt ? ` due ${toDateTimeLabel(deferral.dueAt)}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      ) : null}
    </div>
  );
}

function SnapshotSection({ detail }: { detail: ReleaseEvidenceDetail }) {
  const dispatch = detail.dispatchPackage;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-md border border-zinc-200 bg-zinc-950 p-3 text-zinc-100">
        <p className="text-sm font-semibold">Weather raw snapshot</p>
        <pre className="mt-3 max-h-72 overflow-auto text-xs text-zinc-200">
          {formatJson(dispatch?.weatherBriefing?.rawSnapshot)}
        </pre>
      </article>
      <article className="rounded-md border border-zinc-200 bg-zinc-950 p-3 text-zinc-100">
        <p className="text-sm font-semibold">NOTAM raw snapshot</p>
        <pre className="mt-3 max-h-72 overflow-auto text-xs text-zinc-200">
          {formatJson(dispatch?.notamSnapshot?.rawSnapshot)}
        </pre>
      </article>
    </div>
  );
}

export default async function ReleaseEvidenceDetailPage({ params, searchParams }: PageProps) {
  const [{ flightLegId }, queryParams] = await Promise.all([params, searchParams]);
  const detail = await getReleaseEvidenceDetail(flightLegId);
  const now = new Date();

  if (!detail) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link className="text-sm font-medium text-sky-700 hover:text-sky-900" href="/operations-control">
              Back to Operations Control
            </Link>
            <Link
              className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
              href={`/operations-control/${detail.id}/edit`}
            >
              Edit FlightLeg
            </Link>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Release Evidence Detail
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {detail.flightNumber ?? "Unnumbered FlightLeg"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Read-only evidence packet for {detail.departureStation.code} to{" "}
            {detail.arrivalStation.code}, scheduled {toDateTimeLabel(detail.scheduledDeparture)}.
          </p>
        </header>

        {firstSearchParam(queryParams.releaseError) ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {firstSearchParam(queryParams.releaseError)}
          </div>
        ) : null}

        {firstSearchParam(queryParams.snapshotError) ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {firstSearchParam(queryParams.snapshotError)}
          </div>
        ) : null}

        {firstSearchParam(queryParams.snapshotMessage) ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {firstSearchParam(queryParams.snapshotMessage)}
          </div>
        ) : null}

        {firstSearchParam(queryParams.packageError) ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {firstSearchParam(queryParams.packageError)}
          </div>
        ) : null}

        {firstSearchParam(queryParams.packageMessage) ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {firstSearchParam(queryParams.packageMessage)}
          </div>
        ) : null}

        <SummaryGrid detail={detail} />

        <SectionGroup
          description="Primary evidence actions and release controls for this FlightLeg. Release actions remain warning-only."
          id="command-center"
          title="Command Center"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <ReleaseEvidenceActionPanel detail={detail} now={now} />
            <ReleaseControlActions detail={detail} />
          </div>
        </SectionGroup>

        <SectionNavigation />

        <SectionGroup
          description="Live warning-only checklist and explicit preview snapshot capture."
          id="readiness"
          title="Readiness"
        >
          <ReleaseReadinessChecklist detail={detail} />
        </SectionGroup>

        <SectionGroup
          description="Historical preview snapshots and release-control audit events for this FlightLeg."
          id="release-history"
          title="Release History"
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <RecentReleaseSnapshots detail={detail} />
            <ReleaseAuditTimeline detail={detail} />
          </div>
        </SectionGroup>

        <SectionGroup
          description="Read-only ReleasePackage completeness preview. Package capture remains deferred."
          id="release-package"
          title="Release Package"
        >
          <ReleasePackagePreview detail={detail} />
        </SectionGroup>

        <SectionGroup
          description="Assigned-aircraft airworthiness context. Warnings do not block release actions yet."
          id="airworthiness"
          title="Aircraft / Airworthiness"
        >
          <SectionCard
            title="Airworthiness"
            description="Read-only assigned-aircraft airworthiness context. Warnings do not block release actions yet."
          >
            <AirworthinessSection detail={detail} />
          </SectionCard>
        </SectionGroup>

        <SectionGroup
          description="Detailed read-only snapshots for the manual evidence workflows attached to this FlightLeg."
          id="evidence-details"
          title="Evidence Details"
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title="Manifest"
              description="Passenger manifest snapshot attached to this FlightLeg."
            >
              <ManifestSection detail={detail} />
            </SectionCard>

            <SectionCard
              title="Weight And Balance"
              description="Read-only W&B runs linked to this FlightLeg."
            >
              <WeightBalanceSection detail={detail} />
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title="Flight Locating"
              description="Flight-following and locating status for the leg."
            >
              <LocatingSection detail={detail} />
            </SectionCard>

            <SectionCard
              title="Dispatch Package"
              description="Weather, NOTAM, and flight-plan references linked to the dispatch package."
            >
              <DispatchSection detail={detail} />
            </SectionCard>
          </div>
        </SectionGroup>

        <SectionGroup
          description="Raw demo snapshot payloads. Provider integrations remain deferred."
          id="raw-reference-data"
          title="Raw Reference Data"
        >
          <SectionCard
            title="Captured Snapshots"
            description="Raw demo snapshot payloads. Provider integrations remain deferred."
          >
            <SnapshotSection detail={detail} />
          </SectionCard>
        </SectionGroup>
      </div>
    </main>
  );
}
