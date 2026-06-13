import { CrewSchedulePeriodStatus } from "@prisma/client";
import Link from "next/link";

import { createSchedulePeriodAction } from "@/app/crew/scheduling/periods/actions";
import {
  CrewSchedulePeriodListItem,
  getCrewSchedulePeriodAdminData,
} from "@/lib/crew-schedule-period-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

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

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function statusBadgeClasses(status: CrewSchedulePeriodStatus): string {
  if (status === CrewSchedulePeriodStatus.BID_OPEN) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === CrewSchedulePeriodStatus.DRAFTING) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === CrewSchedulePeriodStatus.PUBLISHED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function Field({
  label,
  name,
  required = false,
  type = "text",
}: {
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
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function StatusSelect() {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Status</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={CrewSchedulePeriodStatus.BID_OPEN}
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

function PeriodCard({ period }: { period: CrewSchedulePeriodListItem }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-950">{period.name}</h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(
                period.status,
              )}`}
            >
              {formatStatus(period.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {toDate(period.startsAt)} - {toDate(period.endsAt)} | key {period.periodKey}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Bid window: {toDate(period.bidOpenAt)} - {toDate(period.bidCloseAt)}
          </p>
          {period.notes ? <p className="mt-2 text-sm text-zinc-600">{period.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-700">
            {period._count.requests} request{period._count.requests === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-700">
            {period._count.scheduleEntries} entr{period._count.scheduleEntries === 1 ? "y" : "ies"}
          </span>
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
            href={`/crew/scheduling/periods/${period.id}`}
          >
            Period detail
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function CrewSchedulePeriodsPage({ searchParams }: PageProps) {
  const data = await getCrewSchedulePeriodAdminData();
  const queryParams = await searchParams;
  const error = firstSearchParam(queryParams.error);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Crew Scheduling Admin
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Schedule Periods
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Read-only visibility into schedule periods, bid windows, request counts,
                and draft schedule entries. Publishing and schedule writes remain deferred.
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
            These pages create and edit schedule-period containers only. They do not
            publish schedules, generate schedule entries, review requests, or assign crew.
          </p>
        </section>

        {error ? (
          <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Total periods</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.totalPeriods}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Bid open</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.bidOpenPeriods}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Drafting</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.draftingPeriods}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Published</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.publishedPeriods}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active patterns</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{data.activePatternCount}</p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create schedule period</h2>
          <form action={createSchedulePeriodAction} className="mt-4 grid gap-4 lg:grid-cols-2">
            <Field label="Period key" name="periodKey" required />
            <Field label="Name" name="name" required />
            <Field label="Start date" name="startsAt" required type="date" />
            <Field label="End date" name="endsAt" required type="date" />
            <Field label="Bid open date" name="bidOpenAt" type="date" />
            <Field label="Bid close date" name="bidCloseAt" type="date" />
            <StatusSelect />
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Notes</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
                name="notes"
              />
            </label>
            <div className="lg:col-span-2">
              <button
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                type="submit"
              >
                Create period
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-3">
          {data.periods.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No schedule periods found. The schema foundation is ready, but no period rows
              exist in this database yet.
            </p>
          ) : (
            data.periods.map((period) => <PeriodCard key={period.id} period={period} />)
          )}
        </section>
      </div>
    </main>
  );
}
