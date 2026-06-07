import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AirworthinessReleaseStatus,
  FlightLocatingStatus,
  ManifestStatus,
  ReleaseStatus,
  WeightBalanceStatus,
} from "@prisma/client";

import {
  cancelFlightLegReleaseAction,
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
  const locatingReady =
    !!locating &&
    (locating.status === FlightLocatingStatus.FILED ||
      locating.status === FlightLocatingStatus.ACTIVE ||
      locating.status === FlightLocatingStatus.CLOSED);
  const dispatchReady = !!dispatch && !!weather && !!notam && !!flightPlan;
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
          message={locating ? `Locating status is ${locating.status}.` : "No locating record has been created."}
          status={locatingReady ? "Ready" : locating ? "Needs attention" : "Missing"}
          tone={locatingReady ? "good" : locating ? "warn" : "missing"}
        />
        <EvidenceActionCard
          href={`/operations-control/${detail.id}/dispatch`}
          label="Dispatch package"
          message={
            dispatchReady
              ? "Weather, NOTAM, and flight-plan evidence are linked."
              : "Dispatch evidence is incomplete."
          }
          status={dispatchReady ? "Ready" : dispatch ? "Needs attention" : "Missing"}
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

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
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

        <SummaryGrid detail={detail} />

        <ReleaseEvidenceActionPanel detail={detail} now={now} />

        <ReleaseReadinessChecklist detail={detail} />

        <RecentReleaseSnapshots detail={detail} />

        <ReleaseControlActions detail={detail} />

        <SectionCard
          title="Airworthiness"
          description="Read-only assigned-aircraft airworthiness context. Warnings do not block release actions yet."
        >
          <AirworthinessSection detail={detail} />
        </SectionCard>

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

        <SectionCard
          title="Captured Snapshots"
          description="Raw demo snapshot payloads. Provider integrations remain deferred."
        >
          <SnapshotSection detail={detail} />
        </SectionCard>
      </div>
    </main>
  );
}
