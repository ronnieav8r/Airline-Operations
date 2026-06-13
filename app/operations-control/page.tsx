import {
  FlightLocatingStatus,
  ManifestStatus,
  OperatingPart,
  ReleaseStatus,
  WeightBalanceStatus,
} from "@prisma/client";
import Link from "next/link";

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

type GroupByMode = "release" | "schedule" | "aircraft";
type ReleaseFilter = "all" | "planned" | "released" | "cancelled-voided" | "no-release";
type EvidenceFilter = "all" | "ready" | "needs-attention" | "missing";
type PartFilter = "all" | OperatingPart;

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

const GROUP_BY_OPTIONS: Array<{ label: string; value: GroupByMode }> = [
  { label: "Release state", value: "release" },
  { label: "Schedule window", value: "schedule" },
  { label: "Aircraft", value: "aircraft" },
];

const RELEASE_FILTER_OPTIONS: Array<{ label: string; value: ReleaseFilter }> = [
  { label: "All releases", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "Released", value: "released" },
  { label: "Cancelled / voided", value: "cancelled-voided" },
  { label: "No release", value: "no-release" },
];

const EVIDENCE_FILTER_OPTIONS: Array<{ label: string; value: EvidenceFilter }> = [
  { label: "All evidence", value: "all" },
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

function toDateTimeLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatOperatingPart(part: OperatingPart): string {
  return part.replace("PART_", "Part ");
}

function formatReleaseStatus(status: ReleaseStatus | null): string {
  return status ?? "NO RELEASE";
}

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseGroupBy(value: string | string[] | undefined): GroupByMode {
  const firstValue = firstSearchParam(value);
  return firstValue === "schedule" || firstValue === "aircraft" ? firstValue : "release";
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

  if (merged.groupBy !== "release") {
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

function evidenceBadgeClasses(ready: boolean): string {
  if (ready) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
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
        description: "Scheduled before today or already completed.",
        key: "past",
        label: "Past / Completed",
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

  const groups: BoardGroup[] = [
    {
      description: "Release is planned and still needs operational attention.",
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
      description: "No release record or non-standard active release state.",
      key: "needs-attention",
      label: "Needs Attention",
      records: filteredRecords.filter((record) => {
        const status = record.release?.status ?? null;
        return !status;
      }),
    },
    {
      description: "Cancelled or voided release records.",
      key: "closed-other",
      label: "Closed / Other",
      records: filteredRecords.filter(
        (record) =>
          record.release?.status === ReleaseStatus.CANCELLED ||
          record.release?.status === ReleaseStatus.VOIDED,
      ),
    },
  ];

  return groups.filter((group) => group.records.length > 0);
}

function aircraftOptions(records: OperationsControlRecordRead[]) {
  return Array.from(
    new Set(records.map((record) => record.leg?.aircraft?.tailNumber ?? "Unassigned")),
  ).sort();
}

function sourceLabel(record: OperationsControlRecordRead): string {
  if (record.readSource === "FLIGHT_LEG") {
    return "FlightLeg read";
  }

  if (record.readSource === "LEG_MISSING_FALLBACK_FLIGHT") {
    return "Fallback Flight read";
  }

  return "Unassigned";
}

function sourceClasses(record: OperationsControlRecordRead): string {
  if (record.readSource === "FLIGHT_LEG") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (record.readSource === "LEG_MISSING_FALLBACK_FLIGHT") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function EvidenceCell({ record }: { record: OperationsControlRecordRead }) {
  const evidence = record.leg?.releaseEvidence;

  if (!evidence) {
    return <span className="text-zinc-400">No FlightLeg evidence</span>;
  }

  const dispatchReady =
    evidence.dispatchPackageReady &&
    evidence.weatherSnapshotReady &&
    evidence.notamSnapshotReady &&
    Boolean(evidence.flightPlanStatus);

  return (
    <div className="min-w-52 space-y-1.5">
      <div className="flex flex-wrap gap-1">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${evidenceBadgeClasses(
            Boolean(evidence.manifestStatus),
          )}`}
        >
          Manifest {evidence.manifestStatus ?? "missing"} ({evidence.manifestItemCount})
        </span>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${evidenceBadgeClasses(
            Boolean(evidence.weightBalanceStatus),
          )}`}
        >
          W&B {evidence.weightBalanceStatus ?? "missing"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${evidenceBadgeClasses(
            Boolean(evidence.locatingStatus),
          )}`}
        >
          Locate {evidence.locatingStatus ?? "missing"}
        </span>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${evidenceBadgeClasses(
            dispatchReady,
          )}`}
        >
          Dispatch {dispatchReady ? "ready" : "partial"}
        </span>
      </div>
      {record.leg?.id ? (
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex text-xs font-medium text-sky-700 hover:text-sky-900"
            href={`/operations-control/${record.leg.id}`}
          >
            View evidence detail
          </Link>
          {record.readSource === "FLIGHT_LEG" ? (
            <Link
              className="inline-flex text-xs font-medium text-zinc-700 hover:text-zinc-950"
              href={`/operations-control/${record.leg.id}/edit`}
            >
              Edit
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
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
          : "inline-flex rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
      }
      href={href}
    >
      {label}
    </Link>
  );
}

function ActionCell({ record }: { record: OperationsControlRecordRead }) {
  if (!record.leg?.id || record.readSource !== "FLIGHT_LEG") {
    return <span className="text-xs text-zinc-400">No FlightLeg actions</span>;
  }

  const detailHref = `/operations-control/${record.leg.id}`;

  return (
    <div className="min-w-64">
      <div className="flex flex-wrap gap-2">
        <ActionLink href={detailHref} label="Detail" primary />
        <ActionLink href={`${detailHref}/edit`} label="Edit" />
        <ActionLink href={`${detailHref}/manifest`} label="Manifest" />
        <ActionLink href={`${detailHref}/weight-balance`} label="W&B" />
        <ActionLink href={`${detailHref}/locating`} label="Locating" />
        <ActionLink href={`${detailHref}/dispatch`} label="Dispatch" />
      </div>
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
          ? "inline-flex rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
          : "inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
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
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function WorkbenchControls({
  aircraft,
  filters,
}: {
  aircraft: string[];
  filters: WorkbenchFilters;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Operations Workbench</h2>
            <p className="text-sm text-zinc-600">
              Filterable board for scanning release state, evidence gaps, schedule,
              and aircraft context. Filters are URL-driven and shareable.
            </p>
          </div>
          <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href="/operations-control">
            Reset filters
          </Link>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <FilterGroup label="Group by">
            {GROUP_BY_OPTIONS.map((option) => (
              <FilterPill
                active={filters.groupBy === option.value}
                href={controlHref(filters, { groupBy: option.value })}
                key={option.value}
                label={option.label}
              />
            ))}
          </FilterGroup>
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
    </section>
  );
}

function routeLabel(record: OperationsControlRecordRead): string {
  if (record.leg?.departureStation && record.leg.arrivalStation) {
    return `${record.leg.departureStation.code} -> ${record.leg.arrivalStation.code}`;
  }

  return "Route not assigned";
}

function WorkbenchCard({ record }: { record: OperationsControlRecordRead }) {
  const detailHref = record.leg?.id ? `/operations-control/${record.leg.id}` : null;
  const evidenceState = evidenceStateLabel(record);

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {detailHref && record.readSource === "FLIGHT_LEG" ? (
            <Link className="text-lg font-semibold text-sky-700 hover:text-sky-900" href={detailHref}>
              {record.leg?.flightNumber ?? "Unassigned"}
            </Link>
          ) : (
            <p className="text-lg font-semibold text-zinc-900">
              {record.leg?.flightNumber ?? "Unassigned"}
            </p>
          )}
          <p className="mt-1 text-sm text-zinc-600">{routeLabel(record)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {record.leg?.scheduledDeparture
              ? toDateTimeLabel(record.leg.scheduledDeparture)
              : "Not scheduled"}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(
              record.release?.status ?? null,
            )}`}
          >
            {formatReleaseStatus(record.release?.status ?? null)}
          </span>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${evidenceBadgeClasses(
              evidenceState === "Ready",
            )}`}
          >
            Evidence {evidenceState}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Aircraft</dt>
          <dd className="font-medium">
            {record.leg?.aircraft
              ? `${record.leg.aircraft.tailNumber} (${record.leg.aircraft.type})`
              : "Unassigned"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Operating part</dt>
          <dd className="font-medium">{formatOperatingPart(record.operatingAuthority.operatingPart)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Controller</dt>
          <dd className="font-medium">{record.controllingEntity}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Read source</dt>
          <dd>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${sourceClasses(
                record,
              )}`}
            >
              {sourceLabel(record)}
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <EvidenceCell record={record} />
      </div>

      <div className="mt-4">
        <ActionCell record={record} />
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
    <section className="space-y-4">
      {groups.map((group) => (
        <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4" key={group.key}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{group.label}</h2>
              <p className="text-sm text-zinc-600">{group.description}</p>
            </div>
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
              {group.records.length} record(s)
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {group.records.map((record) => (
              <WorkbenchCard key={record.id} record={record} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

function FlightCell({ record }: { record: OperationsControlRecordRead }) {
  if (!record.leg) {
    return (
      <div>
        <p className="font-medium text-zinc-900">Unassigned</p>
        <p className="text-xs text-amber-700">No linked flight leg</p>
      </div>
    );
  }

  return (
    <div>
      {record.readSource === "FLIGHT_LEG" && record.leg.id ? (
        <Link
          className="font-medium text-sky-700 hover:text-sky-900"
          href={`/operations-control/${record.leg.id}`}
        >
          {record.leg.flightNumber}
        </Link>
      ) : (
        <p className="font-medium text-zinc-900">{record.leg.flightNumber}</p>
      )}
      <p className="text-xs text-zinc-500">{record.leg.status}</p>
      <span
        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${sourceClasses(
          record,
        )}`}
      >
        {sourceLabel(record)}
      </span>
    </div>
  );
}

export default async function OperationsControlPage({ searchParams }: PageProps) {
  const [data, queryParams] = await Promise.all([
    getFlightLegOperationsControlData(),
    searchParams,
  ]);
  const filters = parseFilters(queryParams);
  const boardGroups = buildWorkbenchGroups(data.records, filters, new Date());
  const aircraft = aircraftOptions(data.records);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Operations Control
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Authority and Release Board
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Control view for the governing authority, controlling entity, release
                state, aircraft, and scheduled leg timing in effect.
              </p>
            </div>
            <Link
              className="inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
              href="/operations-control/new"
            >
              New FlightLeg
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Total control records</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.totalControlRecords}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Released</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.released}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Planned</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.planned}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Other release states</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.otherReleaseStates}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">FlightLeg reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.flightLegReads}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Fallback reads</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.fallbackFlightReads}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Manifests ready</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.manifestReadyOrLocked}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">W&B calculated</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.weightBalanceCalculatedOrApproved}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Locating filed/active</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.locatingFiledOrActiveOrClosed}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Dispatch packages</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.dispatchPackagesReady}
            </p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Authority mix</h2>
              <p className="text-sm text-zinc-600">
                Control records grouped by operating part.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {data.summary.authorityMix.map((bucket) => (
              <div
                className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                key={bucket.part}
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {formatOperatingPart(bucket.part)}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{bucket.count}</p>
              </div>
            ))}
          </div>
        </section>

        <WorkbenchControls aircraft={aircraft} filters={filters} />

        <WorkbenchBoard groups={boardGroups} />

        <section className="rounded-md border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Control records</h2>
              <p className="text-sm text-zinc-600">
                Flight-linked operating authority and release details.
              </p>
            </div>
          </div>

          {data.records.length === 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">No operational-control records found.</p>
              <p className="mt-1">
                This page is ready for runtime data, but there are no control records
                to display in the connected database.
              </p>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Flight</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                    <th className="px-3 py-2 font-medium">Operator</th>
                    <th className="px-3 py-2 font-medium">Operating part</th>
                    <th className="px-3 py-2 font-medium">Authority revision</th>
                    <th className="px-3 py-2 font-medium">Controlling entity</th>
                    <th className="px-3 py-2 font-medium">Release</th>
                    <th className="px-3 py-2 font-medium">Evidence</th>
                    <th className="px-3 py-2 font-medium">Route</th>
                    <th className="px-3 py-2 font-medium">Aircraft</th>
                    <th className="px-3 py-2 font-medium">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((record) => (
                    <tr className="border-b border-zinc-100 align-top" key={record.id}>
                      <td className="px-3 py-2.5">
                        <FlightCell record={record} />
                      </td>
                      <td className="px-3 py-2.5">
                        <ActionCell record={record} />
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-zinc-900">{record.operator.name}</p>
                        <p className="font-mono text-xs text-zinc-500">{record.operator.code}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-zinc-900">
                          {formatOperatingPart(record.operatingAuthority.operatingPart)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {record.operatingAuthority.displayName}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-zinc-900">
                          {record.authorityRevision.revisionLabel}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Effective {toDateTimeLabel(record.authorityRevision.effectiveStart)}
                        </p>
                      </td>
                      <td className="min-w-48 px-3 py-2.5 text-zinc-700">
                        {record.controllingEntity}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${releaseBadgeClasses(
                            record.release?.status ?? null,
                          )}`}
                        >
                          {formatReleaseStatus(record.release?.status ?? null)}
                        </span>
                        {record.release?.releasedAt ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            {toDateTimeLabel(record.release.releasedAt)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <EvidenceCell record={record} />
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700">
                        {record.leg?.departureStation && record.leg.arrivalStation ? (
                          <>
                            {record.leg.departureStation.code}
                            {" -> "}
                            {record.leg.arrivalStation.code}
                          </>
                        ) : (
                          <span className="text-zinc-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {record.leg?.aircraft ? (
                          <>
                            <p className="font-mono text-zinc-800">
                              {record.leg.aircraft.tailNumber}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {record.leg.aircraft.type}
                            </p>
                          </>
                        ) : (
                          <span className="text-zinc-400">Not assigned</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">
                        {record.leg?.scheduledDeparture ? (
                          toDateTimeLabel(record.leg.scheduledDeparture)
                        ) : (
                          <span className="text-zinc-400">Not scheduled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
