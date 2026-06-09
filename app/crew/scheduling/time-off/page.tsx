import { TimeOffRequestStatus, TimeOffRequestType } from "@prisma/client";
import Link from "next/link";

import {
  createTimeOffRequestAction,
  reviewTimeOffRequestAction,
} from "@/app/crew/scheduling/time-off/actions";
import {
  TimeOffWorkflowData,
  TimeOffWorkflowRequest,
  getTimeOffWorkflowData,
} from "@/lib/time-off-workflow-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
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
  status,
  variant = "primary",
}: {
  label: string;
  requestId: string;
  status: TimeOffRequestStatus;
  variant?: "primary" | "secondary";
}) {
  return (
    <form action={reviewTimeOffRequestAction.bind(null, requestId, status)}>
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

function RequestCard({ request }: { request: TimeOffWorkflowRequest }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
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
        <div className="flex flex-wrap gap-2">
          {request.status === TimeOffRequestStatus.PENDING ? (
            <>
              <ReviewButton
                label="Approve"
                requestId={request.id}
                status={TimeOffRequestStatus.APPROVED}
              />
              <ReviewButton
                label="Deny"
                requestId={request.id}
                status={TimeOffRequestStatus.DENIED}
                variant="secondary"
              />
              <ReviewButton
                label="Cancel"
                requestId={request.id}
                status={TimeOffRequestStatus.CANCELLED}
                variant="secondary"
              />
            </>
          ) : null}
          {request.status === TimeOffRequestStatus.APPROVED ? (
            <ReviewButton
              label="Cancel approved"
              requestId={request.id}
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
  const data = await getTimeOffWorkflowData();
  const queryParams = await searchParams;
  const error = firstSearchParam(queryParams.error);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
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
          <h2 className="text-lg font-semibold">Create time-off request</h2>
          <form action={createTimeOffRequestAction} className="mt-4 grid gap-4 lg:grid-cols-2">
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
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
