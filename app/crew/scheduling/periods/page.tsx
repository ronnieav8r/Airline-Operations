import { CrewSchedulePeriodStatus } from "@prisma/client";
import Link from "next/link";

import {
  CrewSchedulePeriodListItem,
  getCrewSchedulePeriodAdminData,
} from "@/lib/crew-schedule-period-queries";

export const dynamic = "force-dynamic";

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

export default async function CrewSchedulePeriodsPage() {
  const data = await getCrewSchedulePeriodAdminData();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
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
                href="/crew"
              >
                Crew roster
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-semibold">Read-only planning boundary</p>
          <p className="mt-1">
            These pages show the new scheduling foundation. They do not create schedules,
            publish periods, review requests, or assign crew to aircraft.
          </p>
        </section>

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
