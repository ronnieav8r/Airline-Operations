import { TimeOffRequestStatus, TimeOffRequestType } from "@prisma/client";
import Link from "next/link";

import {
  createTimeOffRequestAction,
  reviewTimeOffRequestAction,
} from "@/app/crew/scheduling/time-off/actions";
import { TimeOffCoverageImpactPanel } from "@/components/time-off-coverage-impact";
import {
  TimeOffWorkflowData,
  TimeOffWorkflowFilters,
  TimeOffWorkflowRequest,
  getTimeOffWorkflowData,
} from "@/lib/time-off-workflow-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    crewMember?: string | string[];
    error?: string | string[];
    from?: string | string[];
    requestType?: string | string[];
    status?: string | string[];
    to?: string | string[];
  }>;
};

const REQUEST_TYPES = [
  TimeOffRequestType.VACATION,
  TimeOffRequestType.SICK,
  TimeOffRequestType.PERSONAL,
  TimeOffRequestType.TRAINING,
  TimeOffRequestType.OTHER,
];

const STATUS_ORDER = [
  TimeOffRequestStatus.PENDING,
  TimeOffRequestStatus.APPROVED,
  TimeOffRequestStatus.DENIED,
  TimeOffRequestStatus.CANCELLED,
];

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatInputDate(value: Date | null): string {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

function parseFilters(queryParams: Awaited<PageProps["searchParams"]>): TimeOffWorkflowFilters {
  const fromDate = parseInputDate(firstSearchParam(queryParams.from));
  const toDate = parseInputDate(firstSearchParam(queryParams.to));

  return {
    crewMemberId: firstSearchParam(queryParams.crewMember) ?? "all",
    fromDate,
    requestType: oneOf(
      firstSearchParam(queryParams.requestType),
      ["all", ...REQUEST_TYPES] as const,
      "all",
    ),
    status: oneOf(
      firstSearchParam(queryParams.status),
      ["all", ...STATUS_ORDER] as const,
      "all",
    ),
    toDate: toDate ? addDays(toDate, 1) : null,
  };
}

function buildTimeOffHref(filters: TimeOffWorkflowFilters): string {
  const params = new URLSearchParams();

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.crewMemberId !== "all") {
    params.set("crewMember", filters.crewMemberId);
  }
  if (filters.requestType !== "all") {
    params.set("requestType", filters.requestType);
  }
  if (filters.fromDate) {
    params.set("from", formatInputDate(filters.fromDate));
  }
  if (filters.toDate) {
    params.set("to", formatInputDate(addDays(filters.toDate, -1)));
  }

  const query = params.toString();
  return query ? `/crew/scheduling/time-off?${query}` : "/crew/scheduling/time-off";
}

function activeFilterLabels(
  filters: TimeOffWorkflowFilters,
  crewOptions: TimeOffWorkflowData["filterCrewOptions"],
): string[] {
  const labels: string[] = [];

  if (filters.status !== "all") {
    labels.push(`Status ${formatStatus(filters.status)}`);
  }
  if (filters.crewMemberId !== "all") {
    labels.push(crewOptions.find((crewMember) => crewMember.id === filters.crewMemberId)?.label ?? "Selected crew");
  }
  if (filters.requestType !== "all") {
    labels.push(`Type ${formatStatus(filters.requestType)}`);
  }
  if (filters.fromDate) {
    labels.push(`From ${formatInputDate(filters.fromDate)}`);
  }
  if (filters.toDate) {
    labels.push(`To ${formatInputDate(addDays(filters.toDate, -1))}`);
  }

  return labels.length > 0 ? labels : ["All requests"];
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

function statusBadgeClasses(status: TimeOffRequestStatus): string {
  if (status === TimeOffRequestStatus.APPROVED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === TimeOffRequestStatus.PENDING) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === TimeOffRequestStatus.DENIED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function crewName(request: TimeOffWorkflowRequest): string {
  return `${request.crewMember.firstName} ${request.crewMember.lastName}`;
}

function CrewMemberSelect({ crewOptions }: { crewOptions: TimeOffWorkflowData["crewOptions"] }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Crew member</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        name="crewMemberId"
        required
      >
        <option value="">Select crew member</option>
        {crewOptions.map((crewMember) => (
          <option key={crewMember.id} value={crewMember.id}>
            {crewMember.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RequestTypeSelect() {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Request type</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        name="requestType"
        required
      >
        {REQUEST_TYPES.map((requestType) => (
          <option key={requestType} value={requestType}>
            {formatStatus(requestType)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateTimeField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        name={name}
        required
        type="datetime-local"
      />
    </label>
  );
}

function ReviewButton({
  label,
  requestId,
  returnTo,
  status,
  variant = "primary",
}: {
  label: string;
  requestId: string;
  returnTo: string;
  status: TimeOffRequestStatus;
  variant?: "primary" | "secondary";
}) {
  return (
    <form action={reviewTimeOffRequestAction.bind(null, requestId, status)}>
      <input name="returnTo" type="hidden" value={returnTo} />
      <button
        className={
          variant === "primary"
            ? "rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            : "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        }
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function ConflictWarnings({ request }: { request: TimeOffWorkflowRequest }) {
  if (request.conflictWarnings.length === 0) {
    return (
      <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        No warning-only conflicts found for this request.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">Warning-only conflicts</p>
      <ul className="mt-2 space-y-1">
        {request.conflictWarnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

function RequestCard({ request, returnTo }: { request: TimeOffWorkflowRequest; returnTo: string }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(14rem,1fr)_minmax(22rem,1.35fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="text-lg font-semibold text-sky-700 hover:text-sky-900"
              href={`/crew/${request.crewMember.id}`}
            >
              {crewName(request)}
            </Link>
            <span className="text-xs text-zinc-500">#{request.crewMember.employeeNumber}</span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(
                request.status,
              )}`}
            >
              {formatStatus(request.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Base {request.crewMember.baseStation.code} | {formatStatus(request.requestType)}
          </p>
          <p className="mt-1 text-sm text-zinc-700">
            {toDateTime(request.startDate)} - {toDateTime(request.endDate)}
          </p>
          {request.reviewedAt ? (
            <p className="mt-1 text-xs text-zinc-500">Reviewed {toDateTime(request.reviewedAt)}</p>
          ) : null}
          {request.reason ? <p className="mt-2 text-sm text-zinc-600">{request.reason}</p> : null}
        </div>
        <TimeOffCoverageImpactPanel impacts={request.coverageImpact} variant="compact" />
        <div className="flex flex-wrap gap-2 xl:justify-end">
          {request.status === TimeOffRequestStatus.PENDING ? (
            <>
              <ReviewButton
                label="Approve"
                requestId={request.id}
                returnTo={returnTo}
                status={TimeOffRequestStatus.APPROVED}
              />
              <ReviewButton
                label="Deny"
                requestId={request.id}
                returnTo={returnTo}
                status={TimeOffRequestStatus.DENIED}
                variant="secondary"
              />
              <ReviewButton
                label="Cancel"
                requestId={request.id}
                returnTo={returnTo}
                status={TimeOffRequestStatus.CANCELLED}
                variant="secondary"
              />
            </>
          ) : null}
          {request.status === TimeOffRequestStatus.APPROVED ? (
            <ReviewButton
              label="Cancel approved"
              requestId={request.id}
              returnTo={returnTo}
              status={TimeOffRequestStatus.CANCELLED}
              variant="secondary"
            />
          ) : null}
        </div>
      </div>
      <ConflictWarnings request={request} />
    </article>
  );
}

export default async function TimeOffWorkflowPage({ searchParams }: PageProps) {
  const queryParams = await searchParams;
  const filters = parseFilters(queryParams);
  const data = await getTimeOffWorkflowData(filters);
  const error = firstSearchParam(queryParams.error);
  const returnTo = buildTimeOffHref(filters);
  const activeFilters = activeFilterLabels(filters, data.filterCrewOptions);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Crew Scheduling
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Time-Off Requests
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Ops/admin request entry and review for simple absence tracking.
                Conflict checks are warning-only and approval does not write schedules
                or aircraft assignments.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling"
              >
                Crew planner
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew"
              >
                Crew roster
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </section>
        ) : null}

        <section className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-semibold">Workflow boundary</p>
          <p className="mt-1">
            This workflow updates only `TimeOffRequest`. It does not write schedules,
            publish periods, assign crew, enforce duty/rest, or block releases.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_ORDER.map((status) => (
            <article className="rounded-md border border-zinc-200 bg-white p-4" key={status}>
              <p className="text-sm text-zinc-500">{formatStatus(status)}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary[status]}</p>
            </article>
          ))}
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Queue filters</h2>
              <p className="text-sm text-zinc-600">
                Filter the request queue without changing workflow behavior.
              </p>
            </div>
            <Link
              className="text-sm font-semibold text-sky-700 hover:text-sky-900"
              href="/crew/scheduling/time-off"
            >
              Reset filters
            </Link>
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5" method="GET">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Status
              </span>
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
                defaultValue={filters.status}
                name="status"
              >
                <option value="all">All statuses</option>
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Crew member
              </span>
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
                defaultValue={filters.crewMemberId}
                name="crewMember"
              >
                <option value="all">All crew</option>
                {data.filterCrewOptions.map((crewMember) => (
                  <option key={crewMember.id} value={crewMember.id}>
                    {crewMember.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Type
              </span>
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
                defaultValue={filters.requestType}
                name="requestType"
              >
                <option value="all">All types</option>
                {REQUEST_TYPES.map((requestType) => (
                  <option key={requestType} value={requestType}>
                    {formatStatus(requestType)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                From
              </span>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
                defaultValue={formatInputDate(filters.fromDate)}
                name="from"
                type="date"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                To
              </span>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm"
                defaultValue={filters.toDate ? formatInputDate(addDays(filters.toDate, -1)) : ""}
                name="to"
                type="date"
              />
            </label>
            <div className="md:col-span-2 lg:col-span-5">
              <button
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                type="submit"
              >
                Apply filters
              </button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {activeFilters.map((label) => (
              <span
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700"
                key={label}
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create time-off request</h2>
          <form action={createTimeOffRequestAction} className="mt-4 grid gap-4 lg:grid-cols-2">
            <input name="returnTo" type="hidden" value={returnTo} />
            <CrewMemberSelect crewOptions={data.crewOptions} />
            <RequestTypeSelect />
            <DateTimeField label="Start date/time" name="startDate" />
            <DateTimeField label="End date/time" name="endDate" />
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Reason or notes</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
                name="reason"
              />
            </label>
            <div className="lg:col-span-2">
              <button
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                type="submit"
              >
                Create pending request
              </button>
            </div>
          </form>
        </section>

        {STATUS_ORDER.map((status) => (
          <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4 shadow-sm" key={status}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{formatStatus(status)}</h2>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(
                  status,
                )}`}
              >
                {data.requestsByStatus[status].length} request
                {data.requestsByStatus[status].length === 1 ? "" : "s"}
              </span>
            </div>
            {data.requestsByStatus[status].length === 0 ? (
              <p className="mt-3 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
                No {formatStatus(status).toLowerCase()} requests.
              </p>
            ) : (
              <div className="mt-3 grid gap-3">
                {data.requestsByStatus[status].map((request) => (
                  <RequestCard key={request.id} request={request} returnTo={returnTo} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
