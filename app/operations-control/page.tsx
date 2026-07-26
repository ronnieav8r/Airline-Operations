import {
  FlightLegStatus,
  FlightLocatingStatus,
  FlightPhaseStatus,
  ManifestStatus,
  OperatingPart,
  ReleaseStatus,
  WeightBalanceStatus,
} from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  getFlightLegOperationsControlData,
  OperationsControlRecordRead,
} from "@/lib/flightleg-operations-control-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    aircraft?: string | string[];
    evidence?: string | string[];
    groupBy?: string | string[];
    part?: string | string[];
    release?: string | string[];
  }>;
};

type GroupByMode = "phase" | "release" | "schedule" | "aircraft";
type ReleaseFilter = "all" | "planned" | "released" | "cancelled-voided" | "no-release";
type EvidenceFilter = "all" | "ready" | "needs-attention" | "missing";
type PartFilter = "all" | OperatingPart;
type Tone = "good" | "warn" | "missing" | "neutral";

type WorkbenchFilters = {
  aircraft: string;
  evidence: EvidenceFilter;
  groupBy: GroupByMode;
  part: PartFilter;
  release: ReleaseFilter;
};

type BoardGroup = {
  description: string;
  key: string;
  label: string;
  records: OperationsControlRecordRead[];
};

type PhaseItem = {
  href?: string;
  label: string;
  state: string;
  tone: Tone;
};

const GROUP_BY_OPTIONS: Array<{ label: string; value: GroupByMode }> = [
  { label: "Phase", value: "phase" },
  { label: "Release", value: "release" },
  { label: "Schedule", value: "schedule" },
  { label: "Aircraft", value: "aircraft" },
];

const RELEASE_FILTER_OPTIONS: Array<{ label: string; value: ReleaseFilter }> = [
  { label: "All", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "Released", value: "released" },
  { label: "Cancelled / voided", value: "cancelled-voided" },
  { label: "No release", value: "no-release" },
];

const EVIDENCE_FILTER_OPTIONS: Array<{ label: string; value: EvidenceFilter }> = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Needs attention", value: "needs-attention" },
  { label: "Missing", value: "missing" },
];

const PART_FILTER_OPTIONS: Array<{ label: string; value: PartFilter }> = [
  { label: "All parts", value: "all" },
  { label: "Part 91", value: OperatingPart.PART_91 },
  { label: "Part 91K", value: OperatingPart.PART_91K },
  { label: "Part 135", value: OperatingPart.PART_135 },
];

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseGroupBy(value: string | string[] | undefined): GroupByMode {
  const firstValue = firstSearchParam(value);

  if (firstValue === "release" || firstValue === "schedule" || firstValue === "aircraft") {
    return firstValue;
  }

  return "phase";
}

function parseReleaseFilter(value: string | string[] | undefined): ReleaseFilter {
  const firstValue = firstSearchParam(value);

  if (
    firstValue === "planned" ||
    firstValue === "released" ||
    firstValue === "cancelled-voided" ||
    firstValue === "no-release"
  ) {
    return firstValue;
  }

  return "all";
}

function parseEvidenceFilter(value: string | string[] | undefined): EvidenceFilter {
  const firstValue = firstSearchParam(value);

  if (firstValue === "ready" || firstValue === "needs-attention" || firstValue === "missing") {
    return firstValue;
  }

  return "all";
}

function parsePartFilter(value: string | string[] | undefined): PartFilter {
  const firstValue = firstSearchParam(value);

  if (
    firstValue === OperatingPart.PART_91 ||
    firstValue === OperatingPart.PART_91K ||
    firstValue === OperatingPart.PART_135
  ) {
    return firstValue;
  }

  return "all";
}

function parseFilters(searchParams: Awaited<PageProps["searchParams"]>): WorkbenchFilters {
  return {
    aircraft: firstSearchParam(searchParams.aircraft) ?? "all",
    evidence: parseEvidenceFilter(searchParams.evidence),
    groupBy: parseGroupBy(searchParams.groupBy),
    part: parsePartFilter(searchParams.part),
    release: parseReleaseFilter(searchParams.release),
  };
}

function controlHref(filters: WorkbenchFilters, nextFilters: Partial<WorkbenchFilters>): string {
  const merged = { ...filters, ...nextFilters };
  const params = new URLSearchParams();

  if (merged.groupBy !== "phase") {
    params.set("groupBy", merged.groupBy);
  }

  if (merged.release !== "all") {
    params.set("release", merged.release);
  }

  if (merged.evidence !== "all") {
    params.set("evidence", merged.evidence);
  }

  if (merged.part !== "all") {
    params.set("part", merged.part);
  }

  if (merged.aircraft !== "all") {
    params.set("aircraft", merged.aircraft);
  }

  const query = params.toString();
  return query ? `/operations-control?${query}` : "/operations-control";
}

function toDateTimeLabel(value: Date | null): string {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatEnum(value: string | null | undefined): string {
  if (!value) {
    return "Missing";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatOperatingPart(part: OperatingPart): string {
  return part.replace("PART_", "Part ");
}

function routeLabel(record: OperationsControlRecordRead): string {
  if (record.leg?.departureStation && record.leg.arrivalStation) {
    return `${record.leg.departureStation.code} -> ${record.leg.arrivalStation.code}`;
  }

  return "Route not assigned";
}

function identityLabel(record: OperationsControlRecordRead): string {
  const flightNumber = record.leg?.flightNumber ?? "Unassigned";
  const legNumber = record.leg?.legNumber ? ` / Leg ${record.leg.legNumber}` : "";
  const tripNumber = record.leg?.trip?.tripNumber ? `Trip ${record.leg.trip.tripNumber}` : "No trip";

  return `${flightNumber}${legNumber} (${tripNumber})`;
}

function customerLabel(record: OperationsControlRecordRead): string {
  return (
    record.customer?.name ??
    record.leg?.trip?.customerName ??
    "Customer not assigned"
  );
}

function aircraftLabel(record: OperationsControlRecordRead): string {
  if (!record.leg?.aircraft) {
    return "No tail";
  }

  return `${record.leg.aircraft.tailNumber} (${record.leg.aircraft.type})`;
}

function releaseTone(status: ReleaseStatus | null): Tone {
  if (status === ReleaseStatus.RELEASED) {
    return "good";
  }

  if (status === ReleaseStatus.PLANNED) {
    return "warn";
  }

  if (status === ReleaseStatus.CANCELLED || status === ReleaseStatus.VOIDED) {
    return "neutral";
  }

  return "missing";
}

function toneClasses(tone: Tone): string {
  if (tone === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "warn") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (tone === "missing") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function dispatchEvidenceReady(record: OperationsControlRecordRead): boolean {
  const evidence = record.leg?.releaseEvidence;

  return Boolean(
    evidence?.dispatchPackageReady &&
      evidence.weatherSnapshotReady &&
      evidence.notamSnapshotReady &&
      evidence.flightPlanStatus,
  );
}

function evidenceReady(record: OperationsControlRecordRead): boolean {
  const evidence = record.leg?.releaseEvidence;

  return Boolean(
    evidence &&
      (evidence.manifestStatus === ManifestStatus.READY ||
        evidence.manifestStatus === ManifestStatus.LOCKED) &&
      (evidence.weightBalanceStatus === WeightBalanceStatus.CALCULATED ||
        evidence.weightBalanceStatus === WeightBalanceStatus.APPROVED) &&
      (evidence.locatingStatus === FlightLocatingStatus.FILED ||
        evidence.locatingStatus === FlightLocatingStatus.ACTIVE ||
        evidence.locatingStatus === FlightLocatingStatus.CLOSED) &&
      dispatchEvidenceReady(record),
  );
}

function evidenceMissing(record: OperationsControlRecordRead): boolean {
  const evidence = record.leg?.releaseEvidence;

  return (
    !evidence ||
    !evidence.manifestStatus ||
    !evidence.weightBalanceStatus ||
    !evidence.locatingStatus ||
    !evidence.dispatchPackageReady
  );
}

function evidenceStateLabel(record: OperationsControlRecordRead): "Ready" | "Needs attention" | "Missing" {
  if (evidenceReady(record)) {
    return "Ready";
  }

  if (evidenceMissing(record)) {
    return "Missing";
  }

  return "Needs attention";
}

function recordMatchesFilters(record: OperationsControlRecordRead, filters: WorkbenchFilters) {
  const releaseStatus = record.release?.status ?? null;

  if (filters.release === "planned" && releaseStatus !== ReleaseStatus.PLANNED) {
    return false;
  }

  if (filters.release === "released" && releaseStatus !== ReleaseStatus.RELEASED) {
    return false;
  }

  if (
    filters.release === "cancelled-voided" &&
    releaseStatus !== ReleaseStatus.CANCELLED &&
    releaseStatus !== ReleaseStatus.VOIDED
  ) {
    return false;
  }

  if (filters.release === "no-release" && releaseStatus) {
    return false;
  }

  if (filters.evidence === "ready" && !evidenceReady(record)) {
    return false;
  }

  if (filters.evidence === "missing" && !evidenceMissing(record)) {
    return false;
  }

  if (filters.evidence === "needs-attention" && (evidenceReady(record) || evidenceMissing(record))) {
    return false;
  }

  if (filters.part !== "all" && record.operatingAuthority.operatingPart !== filters.part) {
    return false;
  }

  if (filters.aircraft !== "all") {
    const tailNumber = record.leg?.aircraft?.tailNumber ?? "Unassigned";

    if (tailNumber !== filters.aircraft) {
      return false;
    }
  }

  return true;
}

function scheduleGroupKey(record: OperationsControlRecordRead, now: Date): string {
  const scheduledDeparture = record.leg?.scheduledDeparture;

  if (!scheduledDeparture) {
    return "unscheduled";
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  if (scheduledDeparture >= startOfToday && scheduledDeparture < startOfTomorrow) {
    return "today";
  }

  if (scheduledDeparture >= startOfTomorrow) {
    return "upcoming";
  }

  return "past";
}

function phaseGroupKey(record: OperationsControlRecordRead, now: Date): string {
  const legStatus = record.leg?.status;
  const departure = record.leg?.scheduledDeparture;
  const releaseStatus = record.release?.status ?? null;
  const preflightWindowEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  if (
    legStatus === FlightLegStatus.COMPLETE ||
    legStatus === FlightLegStatus.CANCELLED ||
    record.leg?.postflightStatus === FlightPhaseStatus.COMPLETE
  ) {
    return "postflight-complete";
  }

  if (legStatus === FlightLegStatus.ENROUTE || record.leg?.actualDeparture) {
    return "enroute";
  }

  if (
    releaseStatus !== ReleaseStatus.RELEASED &&
    legStatus !== FlightLegStatus.RELEASED
  ) {
    return "needs-release-review";
  }

  if (
    legStatus === FlightLegStatus.RELEASED ||
    legStatus === FlightLegStatus.READY_FOR_RELEASE ||
    (departure && departure <= preflightWindowEnd)
  ) {
    return "preflight-active";
  }

  return "ready-released";
}

function buildWorkbenchGroups(
  records: OperationsControlRecordRead[],
  filters: WorkbenchFilters,
  now: Date,
): BoardGroup[] {
  const filteredRecords = records.filter((record) => recordMatchesFilters(record, filters));

  if (filters.groupBy === "schedule") {
    const groups: BoardGroup[] = [
      {
        description: "Scheduled for the current local day.",
        key: "today",
        label: "Today",
        records: filteredRecords.filter((record) => scheduleGroupKey(record, now) === "today"),
      },
      {
        description: "Scheduled after today.",
        key: "upcoming",
        label: "Upcoming",
        records: filteredRecords.filter((record) => scheduleGroupKey(record, now) === "upcoming"),
      },
      {
        description: "Scheduled before today, completed, or waiting on closeout.",
        key: "past",
        label: "Past / Complete",
        records: filteredRecords.filter((record) => scheduleGroupKey(record, now) === "past"),
      },
      {
        description: "No scheduled departure is available.",
        key: "unscheduled",
        label: "Unscheduled",
        records: filteredRecords.filter((record) => scheduleGroupKey(record, now) === "unscheduled"),
      },
    ];

    return groups.filter((group) => group.records.length > 0);
  }

  if (filters.groupBy === "aircraft") {
    const tailNumbers = Array.from(
      new Set(filteredRecords.map((record) => record.leg?.aircraft?.tailNumber ?? "Unassigned")),
    ).sort();

    return tailNumbers.map((tailNumber) => ({
      description:
        tailNumber === "Unassigned"
          ? "Records without an assigned aircraft."
          : "Records assigned to this aircraft.",
      key: tailNumber,
      label: tailNumber,
      records: filteredRecords.filter(
        (record) => (record.leg?.aircraft?.tailNumber ?? "Unassigned") === tailNumber,
      ),
    }));
  }

  if (filters.groupBy === "release") {
    const groups: BoardGroup[] = [
      {
        description: "Release is planned and still needs operational review.",
        key: "planned",
        label: "Planned",
        records: filteredRecords.filter((record) => record.release?.status === ReleaseStatus.PLANNED),
      },
      {
        description: "FlightLegs marked released.",
        key: "released",
        label: "Released",
        records: filteredRecords.filter((record) => record.release?.status === ReleaseStatus.RELEASED),
      },
      {
        description: "No release record is attached yet.",
        key: "needs-attention",
        label: "No Release",
        records: filteredRecords.filter((record) => !record.release?.status),
      },
      {
        description: "Cancelled or voided release records.",
        key: "closed-other",
        label: "Cancelled / Voided",
        records: filteredRecords.filter(
          (record) =>
            record.release?.status === ReleaseStatus.CANCELLED ||
            record.release?.status === ReleaseStatus.VOIDED,
        ),
      },
    ];

    return groups.filter((group) => group.records.length > 0);
  }

  const groups: BoardGroup[] = [
    {
      description: "Release, evidence, or FlightLeg control work should be reviewed before moving forward.",
      key: "needs-release-review",
      label: "Needs Release Review",
      records: filteredRecords.filter((record) => phaseGroupKey(record, now) === "needs-release-review"),
    },
    {
      description: "Released or ready records outside the immediate preflight window.",
      key: "ready-released",
      label: "Ready / Released",
      records: filteredRecords.filter((record) => phaseGroupKey(record, now) === "ready-released"),
    },
    {
      description: "Released FlightLegs close to departure or actively being prepared.",
      key: "preflight-active",
      label: "Preflight Active",
      records: filteredRecords.filter((record) => phaseGroupKey(record, now) === "preflight-active"),
    },
    {
      description: "FlightLegs underway or carrying active flight-following context.",
      key: "enroute",
      label: "Enroute",
      records: filteredRecords.filter((record) => phaseGroupKey(record, now) === "enroute"),
    },
    {
      description: "Completed, cancelled, or postflight-closeout records.",
      key: "postflight-complete",
      label: "Postflight / Complete",
      records: filteredRecords.filter((record) => phaseGroupKey(record, now) === "postflight-complete"),
    },
  ];

  return groups.filter((group) => group.records.length > 0);
}

function aircraftOptions(records: OperationsControlRecordRead[]) {
  return Array.from(
    new Set(records.map((record) => record.leg?.aircraft?.tailNumber ?? "Unassigned")),
  ).sort();
}

function phaseItems(record: OperationsControlRecordRead): PhaseItem[] {
  const legId = record.leg?.id;
  const evidence = record.leg?.releaseEvidence;
  const aircraft = record.leg?.aircraft;
  const manifestReady =
    evidence?.manifestStatus === ManifestStatus.READY ||
    evidence?.manifestStatus === ManifestStatus.LOCKED;
  const weightBalanceReady =
    evidence?.weightBalanceStatus === WeightBalanceStatus.CALCULATED ||
    evidence?.weightBalanceStatus === WeightBalanceStatus.APPROVED;
  const locatingReady =
    evidence?.locatingStatus === FlightLocatingStatus.FILED ||
    evidence?.locatingStatus === FlightLocatingStatus.ACTIVE ||
    evidence?.locatingStatus === FlightLocatingStatus.CLOSED;
  const mxCount =
    (aircraft?.openDiscrepancyCount ?? 0) +
    (aircraft?.activeDeferralCount ?? 0) +
    (aircraft?.openMaintenanceEventCount ?? 0);
  const crewCount = record.leg?.crewAssignments.length ?? 0;

  return [
    {
      href: legId ? `/operations-control/${legId}` : undefined,
      label: "Ops Release",
      state: formatEnum(record.release?.status ?? null),
      tone: releaseTone(record.release?.status ?? null),
    },
    {
      href: legId ? `/operations-control/${legId}` : undefined,
      label: "Preflight",
      state: record.leg?.preflightStatus === FlightPhaseStatus.COMPLETE ? "Complete" : "Open",
      tone: record.leg?.preflightStatus === FlightPhaseStatus.COMPLETE ? "good" : "neutral",
    },
    {
      href: legId ? `/operations-control/${legId}` : undefined,
      label: "Postflight",
      state: record.leg?.postflightStatus === FlightPhaseStatus.COMPLETE ? "Complete" : "Open",
      tone: record.leg?.postflightStatus === FlightPhaseStatus.COMPLETE ? "good" : "neutral",
    },
    {
      href: legId ? `/operations-control/${legId}/manifest` : undefined,
      label: "Manifest",
      state: evidence?.manifestStatus ? `${formatEnum(evidence.manifestStatus)} (${evidence.manifestItemCount})` : "Missing",
      tone: manifestReady ? "good" : evidence?.manifestStatus ? "warn" : "missing",
    },
    {
      href: legId ? `/operations-control/${legId}/fuel` : undefined,
      label: "Fuel",
      state: record.leg?.releaseFuel
        ? record.leg.releaseFuel.fueledReady
          ? "Ready"
          : "Recorded"
        : "Missing",
      tone: record.leg?.releaseFuel?.fueledReady ? "good" : record.leg?.releaseFuel ? "warn" : "missing",
    },
    {
      href: legId ? `/operations-control/${legId}/weight-balance` : undefined,
      label: "W&B",
      state: formatEnum(evidence?.weightBalanceStatus),
      tone: weightBalanceReady ? "good" : evidence?.weightBalanceStatus ? "warn" : "missing",
    },
    {
      href: legId ? `/operations-control/${legId}/locating` : undefined,
      label: "Following",
      state: formatEnum(evidence?.locatingStatus),
      tone: locatingReady ? "good" : evidence?.locatingStatus ? "warn" : "missing",
    },
    {
      href: aircraft ? `/aircraft/${aircraft.id}/airworthiness` : undefined,
      label: "MX",
      state: aircraft ? (mxCount > 0 ? `${mxCount} open` : "Clear") : "No tail",
      tone: aircraft ? (mxCount > 0 ? "warn" : "good") : "neutral",
    },
    {
      href: aircraft ? `/aircraft/${aircraft.id}/crew` : undefined,
      label: "Crew",
      state: crewCount > 0 ? `${crewCount} assigned` : "Missing",
      tone: crewCount >= 2 ? "good" : crewCount === 1 ? "warn" : "missing",
    },
  ];
}

function strongestWarning(record: OperationsControlRecordRead): { label: string; tone: Tone } {
  const evidence = record.leg?.releaseEvidence;
  const aircraft = record.leg?.aircraft;
  const mxCount =
    (aircraft?.openDiscrepancyCount ?? 0) +
    (aircraft?.activeDeferralCount ?? 0) +
    (aircraft?.openMaintenanceEventCount ?? 0);

  if (record.readSource !== "FLIGHT_LEG") {
    return { label: "No linked FlightLeg evidence", tone: "warn" };
  }

  if (!record.release?.status) {
    return { label: "No release record attached", tone: "missing" };
  }

  if (record.release.status === ReleaseStatus.PLANNED) {
    return { label: "Release planned, review still open", tone: "warn" };
  }

  if (!evidence?.manifestStatus || evidence.manifestItemCount === 0) {
    return { label: "Manifest missing or empty", tone: "missing" };
  }

  if (!evidence.weightBalanceStatus) {
    return { label: "Weight and balance missing", tone: "missing" };
  }

  if (!record.leg?.releaseFuel) {
    return { label: "Release fuel not recorded", tone: "missing" };
  }

  if (record.leg.releaseFuel.fueledReady !== true) {
    return { label: "Fuel recorded, ready flag not confirmed", tone: "warn" };
  }

  if (!evidence.locatingStatus) {
    return { label: "Flight following not started", tone: "missing" };
  }

  if (!dispatchEvidenceReady(record)) {
    return { label: "Dispatch package evidence incomplete", tone: "warn" };
  }

  if ((record.leg?.crewAssignments.length ?? 0) === 0) {
    return { label: "No crew assigned", tone: "missing" };
  }

  if ((record.leg?.crewAssignments.length ?? 0) === 1) {
    return { label: "Crew coverage appears partial", tone: "warn" };
  }

  if (mxCount > 0) {
    return { label: `${mxCount} aircraft issue(s) to review`, tone: "warn" };
  }

  return { label: "No high-signal warning", tone: "good" };
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function FilterPill({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={
        active
          ? "inline-flex rounded-md border border-zinc-950 bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white"
          : "inline-flex rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
      }
      href={href}
    >
      {label}
    </Link>
  );
}

function FilterGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-zinc-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function WorkbenchToolbar({
  aircraft,
  filters,
}: {
  aircraft: string[];
  filters: WorkbenchFilters;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-800">Board</span>
          {GROUP_BY_OPTIONS.map((option) => (
            <FilterPill
              active={filters.groupBy === option.value}
              href={controlHref(filters, { groupBy: option.value })}
              key={option.value}
              label={option.label}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
              Filters
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-[min(92vw,760px)] rounded-md border border-zinc-200 bg-white p-3 shadow-lg">
              <div className="grid gap-3 md:grid-cols-2">
                <FilterGroup label="Release">
                  {RELEASE_FILTER_OPTIONS.map((option) => (
                    <FilterPill
                      active={filters.release === option.value}
                      href={controlHref(filters, { release: option.value })}
                      key={option.value}
                      label={option.label}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup label="Evidence">
                  {EVIDENCE_FILTER_OPTIONS.map((option) => (
                    <FilterPill
                      active={filters.evidence === option.value}
                      href={controlHref(filters, { evidence: option.value })}
                      key={option.value}
                      label={option.label}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup label="Operating part">
                  {PART_FILTER_OPTIONS.map((option) => (
                    <FilterPill
                      active={filters.part === option.value}
                      href={controlHref(filters, { part: option.value })}
                      key={option.value}
                      label={option.label}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup label="Aircraft">
                  <FilterPill
                    active={filters.aircraft === "all"}
                    href={controlHref(filters, { aircraft: "all" })}
                    label="All aircraft"
                  />
                  {aircraft.map((tailNumber) => (
                    <FilterPill
                      active={filters.aircraft === tailNumber}
                      href={controlHref(filters, { aircraft: tailNumber })}
                      key={tailNumber}
                      label={tailNumber}
                    />
                  ))}
                </FilterGroup>
              </div>
            </div>
          </details>
          <Link className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="/operations-control">
            Reset
          </Link>
          <Link className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800" href="/flights?panel=new-flight">
            New FlightLeg
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ children, tone }: { children: ReactNode; tone: Tone }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${toneClasses(tone)}`}>
      {children}
    </span>
  );
}

function PhaseStrip({ items }: { items: PhaseItem[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const content = (
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.68rem] font-semibold ${toneClasses(item.tone)}`}>
            <span>{item.label}</span>
            <span className="font-medium opacity-75">{item.state}</span>
          </span>
        );

        if (item.href) {
          return (
            <Link className="hover:opacity-80" href={item.href} key={item.label}>
              {content}
            </Link>
          );
        }

        return <span key={item.label}>{content}</span>;
      })}
    </div>
  );
}

function WorkflowLinks({ record }: { record: OperationsControlRecordRead }) {
  if (!record.leg?.id || record.readSource !== "FLIGHT_LEG") {
    return <span className="text-xs text-zinc-400">No FlightLeg workflow links</span>;
  }

  const detailHref = `/operations-control/${record.leg.id}`;
  const links = [
    { href: detailHref, label: "Detail" },
    { href: `${detailHref}/manifest`, label: "Manifest" },
    { href: `${detailHref}/dispatch`, label: "Dispatch" },
    { href: `${detailHref}/locating`, label: "Locating" },
    { href: `${detailHref}/weight-balance`, label: "W&B" },
    { href: `${detailHref}/fuel`, label: "Fuel" },
    { href: `${detailHref}/edit`, label: "Edit" },
  ];

  return (
    <details className="relative">
      <summary className="inline-flex cursor-pointer list-none rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
        Actions
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-44 rounded-md border border-zinc-200 bg-white p-1.5 shadow-lg">
        {links.map((link) => (
          <Link
            className="block rounded px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

function WorkbenchRow({ record }: { record: OperationsControlRecordRead }) {
  const detailHref = record.leg?.id && record.readSource === "FLIGHT_LEG" ? `/operations-control/${record.leg.id}` : null;
  const warning = strongestWarning(record);

  return (
    <article className="rounded-md border border-zinc-200 bg-white px-3 py-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[11rem_minmax(13rem,1fr)_minmax(24rem,2fr)_13rem] xl:items-center">
        <div>
          <p className="text-xs font-medium text-zinc-500">{toDateTimeLabel(record.leg?.scheduledDeparture ?? null)}</p>
          <p className="mt-1 font-mono text-sm font-semibold text-zinc-900">{routeLabel(record)}</p>
          <p className="mt-1 text-xs text-zinc-500">{record.leg?.status ? formatEnum(record.leg.status) : "No FlightLeg"}</p>
        </div>

        <div className="min-w-0">
          {detailHref ? (
            <Link className="block truncate text-sm font-semibold text-sky-700 hover:text-sky-900" href={detailHref}>
              {identityLabel(record)}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-zinc-900">{identityLabel(record)}</p>
          )}
          <p className="mt-1 truncate text-xs text-zinc-600">{customerLabel(record)}</p>
          <p className="mt-1 truncate text-xs text-zinc-500">{aircraftLabel(record)}</p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge tone={releaseTone(record.release?.status ?? null)}>
              Release {formatEnum(record.release?.status ?? null)}
            </StatusBadge>
            <StatusBadge tone={evidenceReady(record) ? "good" : evidenceMissing(record) ? "missing" : "warn"}>
              Evidence {evidenceStateLabel(record)}
            </StatusBadge>
            <StatusBadge tone={warning.tone}>{warning.label}</StatusBadge>
          </div>
          <PhaseStrip items={phaseItems(record)} />
        </div>

        <div className="flex items-center justify-between gap-2 xl:justify-end">
          {detailHref ? (
            <Link className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800" href={detailHref}>
              Detail
            </Link>
          ) : (
            <span className="text-xs text-zinc-400">No detail</span>
          )}
          <WorkflowLinks record={record} />
        </div>
      </div>
    </article>
  );
}

function WorkbenchBoard({ groups }: { groups: BoardGroup[] }) {
  if (groups.length === 0) {
    return (
      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">No records match the selected workbench filters.</p>
        <p className="mt-1">Reset filters to return to the full Operations Control board.</p>
        <Link
          className="mt-3 inline-flex rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          href="/operations-control"
        >
          Show all records
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {groups.map((group) => (
        <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={group.key}>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">{group.label}</h2>
              <p className="text-xs text-zinc-600">{group.description}</p>
            </div>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
              {group.records.length} record(s)
            </span>
          </div>
          <div className="space-y-2">
            {group.records.map((record) => (
              <WorkbenchRow key={record.id} record={record} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

function ControlRecordsTable({
  records,
  totalRecords,
}: {
  records: OperationsControlRecordRead[];
  totalRecords: number;
}) {
  if (records.length === 0) {
    const hasSourceRecords = totalRecords > 0;

    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">
          {hasSourceRecords ? "No records match the current table filters." : "No operational-control records found."}
        </p>
        <p className="mt-1">
          {hasSourceRecords
            ? "Use Reset or Show all records to return to the full Operations Control board."
            : "This page is ready for runtime data, but there are no control records to display."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500">
            <th className="px-3 py-2 font-medium">FlightLeg</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Authority</th>
            <th className="px-3 py-2 font-medium">Release</th>
            <th className="px-3 py-2 font-medium">Strongest warning</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const warning = strongestWarning(record);
            return (
              <tr className="border-b border-zinc-100 align-top" key={record.id}>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-zinc-900">{identityLabel(record)}</p>
                  <p className="text-xs text-zinc-500">
                    {toDateTimeLabel(record.leg?.scheduledDeparture ?? null)} | {routeLabel(record)}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-zinc-700">{customerLabel(record)}</td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-zinc-900">{formatOperatingPart(record.operatingAuthority.operatingPart)}</p>
                  <p className="text-xs text-zinc-500">{record.controllingEntity}</p>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge tone={releaseTone(record.release?.status ?? null)}>
                    {formatEnum(record.release?.status ?? null)}
                  </StatusBadge>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge tone={warning.tone}>{warning.label}</StatusBadge>
                </td>
                <td className="px-3 py-2.5">
                  <WorkflowLinks record={record} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function OperationsControlPage({ searchParams }: PageProps) {
  const [data, queryParams] = await Promise.all([
    getFlightLegOperationsControlData(),
    searchParams,
  ]);
  const filters = parseFilters(queryParams);
  const now = new Date();
  const filteredRecords = data.records.filter((record) => recordMatchesFilters(record, filters));
  const boardGroups = buildWorkbenchGroups(data.records, filters, now);
  const aircraft = aircraftOptions(data.records);
  const needsReviewCount = data.records.filter((record) => phaseGroupKey(record, now) === "needs-release-review").length;
  const enrouteCount = data.records.filter((record) => phaseGroupKey(record, now) === "enroute").length;
  const warningsCount = data.records.filter((record) => strongestWarning(record).tone !== "good").length;

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-4 text-zinc-950 sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-3">
        <header className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500">Operations Control</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight">FlightLeg Workbench</h1>
          </div>
          <p className="max-w-3xl text-sm text-zinc-600">
            Phase-grouped dispatch board for release review, preflight, enroute, and closeout work.
            Readiness signals remain warning-first.
          </p>
        </header>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <SummaryTile label="Records" value={data.summary.totalControlRecords} />
          <SummaryTile label="Needs release" value={needsReviewCount} />
          <SummaryTile label="Released" value={data.summary.released} />
          <SummaryTile label="Enroute" value={enrouteCount} />
          <SummaryTile label="Warnings" value={warningsCount} />
          <SummaryTile label="Filtered" value={filteredRecords.length} />
        </section>

        <WorkbenchToolbar aircraft={aircraft} filters={filters} />

        <WorkbenchBoard groups={boardGroups} />

        <section className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Record Detail Table</h2>
              <p className="text-xs text-zinc-600">Supporting authority, release, and workflow links for the current filter set.</p>
            </div>
          </div>
          <ControlRecordsTable records={filteredRecords} totalRecords={data.records.length} />
        </section>
      </div>
    </main>
  );
}
