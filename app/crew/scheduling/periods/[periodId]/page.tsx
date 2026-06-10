import { CrewScheduleEntryStatus, CrewSchedulePeriodStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archiveSchedulePeriodAction,
  updateSchedulePeriodAction,
} from "@/app/crew/scheduling/periods/actions";
import {
  countEntriesByStatus,
  CrewSchedulePeriodDetail,
  getCrewSchedulePeriodDetail,
} from "@/lib/crew-schedule-period-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    periodId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

type RequestRow = CrewSchedulePeriodDetail["requests"][number];
type EntryRow = CrewSchedulePeriodDetail["scheduleEntries"][number];

function toDate(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function toInputDate(value: Date | null): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

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

function Field({
  defaultValue,
  label,
  name,
  required = false,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function StatusSelect({ defaultValue }: { defaultValue: CrewSchedulePeriodStatus }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Status</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={
          defaultValue === CrewSchedulePeriodStatus.PUBLISHED
            ? CrewSchedulePeriodStatus.DRAFTING
            : defaultValue
        }
        name="status"
        required
      >
        <option value={CrewSchedulePeriodStatus.BID_OPEN}>Bid open</option>
        <option value={CrewSchedulePeriodStatus.DRAFTING}>Drafting</option>
        <option value={CrewSchedulePeriodStatus.ARCHIVED}>Archived</option>
      </select>
    </label>
  );
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function statusBadgeClasses(status: CrewSchedulePeriodStatus | CrewScheduleEntryStatus): string {
  const statusValue = String(status);

  if (statusValue === "PUBLISHED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === CrewSchedulePeriodStatus.BID_OPEN) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === CrewSchedulePeriodStatus.DRAFTING || status === CrewScheduleEntryStatus.DRAFT) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function crewName(crewMember: { firstName: string; lastName: string }): string {
  return `${crewMember.firstName} ${crewMember.lastName}`;
}

function RequestCard({ request }: { request: RequestRow }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          className="font-semibold text-sky-700 hover:text-sky-900"
          href={`/crew/${request.crewMember.id}`}
        >
          {crewName(request.crewMember)}
        </Link>
        <span className="text-xs text-zinc-500">#{request.crewMember.employeeNumber}</span>
        <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
          {formatStatus(request.requestType)}
        </span>
        <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
          {formatStatus(request.status)}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        {toDate(request.startDate)} - {toDate(request.endDate)}
        {request.preferredDutyStatus ? ` | ${formatStatus(request.preferredDutyStatus)}` : ""}
      </p>
      {request.requestedPattern ? (
        <p className="mt-1 text-xs text-zinc-500">Pattern: {request.requestedPattern.name}</p>
      ) : null}
      {request.requestedSwapCrewMember ? (
        <p className="mt-1 text-xs text-zinc-500">
          Swap requested with {crewName(request.requestedSwapCrewMember)}
        </p>
      ) : null}
      {request.requestNotes ? <p className="mt-2 text-sm text-zinc-700">{request.requestNotes}</p> : null}
    </article>
  );
}

function EntryRowView({ entry }: { entry: EntryRow }) {
  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="px-3 py-2.5">
        <Link
          className="font-semibold text-sky-700 hover:text-sky-900"
          href={`/crew/${entry.crewMember.id}`}
        >
          {crewName(entry.crewMember)}
        </Link>
        <div className="text-xs text-zinc-500">#{entry.crewMember.employeeNumber}</div>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">{toDate(entry.date)}</td>
      <td className="px-3 py-2.5 text-zinc-700">{formatStatus(entry.dutyStatus)}</td>
      <td className="px-3 py-2.5 text-zinc-700">
        {toDateTime(entry.startsAt)} - {toDateTime(entry.endsAt)}
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        {entry.station ? `${entry.station.code} - ${entry.station.city}` : "No station"}
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(
            entry.status,
          )}`}
        >
          {formatStatus(entry.status)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        {entry.sourceRequest ? formatStatus(entry.sourceRequest.requestType) : "No request"}
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        {entry.rotationPattern?.name ?? "No pattern"}
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        {entry.generatedCrewSchedule ? "Linked" : "Deferred"}
      </td>
    </tr>
  );
}

export default async function CrewSchedulePeriodDetailPage({ params, searchParams }: PageProps) {
  const { periodId } = await params;
  const queryParams = await searchParams;
  const period = await getCrewSchedulePeriodDetail(periodId);
  const error = firstSearchParam(queryParams.error);

  if (!period) {
    notFound();
  }

  const entryCounts = countEntriesByStatus(period);
  const distinctPatternCount = new Set(
    period.scheduleEntries.flatMap((entry) => (entry.rotationPattern ? [entry.rotationPattern.id] : [])),
  ).size;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                className="text-sm font-semibold text-sky-700 hover:text-sky-900"
                href="/crew/scheduling/periods"
              >
                Back to schedule periods
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Crew Scheduling Admin
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                {period.name}
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                {toDate(period.startsAt)} - {toDate(period.endsAt)} | key {period.periodKey}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(
                  period.status,
                )}`}
              >
                {formatStatus(period.status)}
              </span>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling"
              >
                Crew planner
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling/patterns"
              >
                Rotation patterns
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

        <section className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-semibold">Schedule-period workflow boundary</p>
          <p className="mt-1">
            This page edits the schedule-period container only. It does not publish
            schedules, generate schedule entries, review requests, apply patterns, or
            create aircraft assignments.
          </p>
        </section>

        {error ? (
          <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Requests</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{period.requests.length}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Draft entries</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{entryCounts.draft}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Published entries</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{entryCounts.published}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Patterns used</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{distinctPatternCount}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Bid window</p>
            <p className="mt-2 text-sm font-semibold">
              {toDate(period.bidOpenAt)} - {toDate(period.bidCloseAt)}
            </p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Edit period</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Publishing and schedule-entry generation remain deferred.
              </p>
            </div>
            {period.status !== CrewSchedulePeriodStatus.ARCHIVED ? (
              <form action={archiveSchedulePeriodAction.bind(null, period.id)}>
                <button
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  type="submit"
                >
                  Archive period
                </button>
              </form>
            ) : null}
          </div>
          <form
            action={updateSchedulePeriodAction.bind(null, period.id)}
            className="mt-4 grid gap-4 lg:grid-cols-2"
          >
            <Field defaultValue={period.periodKey} label="Period key" name="periodKey" required />
            <Field defaultValue={period.name} label="Name" name="name" required />
            <Field
              defaultValue={toInputDate(period.startsAt)}
              label="Start date"
              name="startsAt"
              required
              type="date"
            />
            <Field
              defaultValue={toInputDate(period.endsAt)}
              label="End date"
              name="endsAt"
              required
              type="date"
            />
            <Field
              defaultValue={toInputDate(period.bidOpenAt)}
              label="Bid open date"
              name="bidOpenAt"
              type="date"
            />
            <Field
              defaultValue={toInputDate(period.bidCloseAt)}
              label="Bid close date"
              name="bidCloseAt"
              type="date"
            />
            <StatusSelect defaultValue={period.status} />
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Notes</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
                defaultValue={period.notes ?? ""}
                name="notes"
              />
            </label>
            <div className="lg:col-span-2">
              <button
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                type="submit"
              >
                Save period
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Recent requests</h2>
          {period.requests.length === 0 ? (
            <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No requests found for this period.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {period.requests.slice(0, 8).map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Schedule entries</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Future schedule-building rows. Current crew planner reads still use
            existing `CrewSchedule` rows.
          </p>
          {period.scheduleEntries.length === 0 ? (
            <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No schedule entries found for this period.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Crew</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Duty</th>
                    <th className="px-3 py-2 font-medium">Times</th>
                    <th className="px-3 py-2 font-medium">Station</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Request</th>
                    <th className="px-3 py-2 font-medium">Pattern</th>
                    <th className="px-3 py-2 font-medium">CrewSchedule bridge</th>
                  </tr>
                </thead>
                <tbody>
                  {period.scheduleEntries.map((entry) => (
                    <EntryRowView entry={entry} key={entry.id} />
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
