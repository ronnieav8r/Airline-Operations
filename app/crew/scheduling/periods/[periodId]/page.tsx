import { CrewScheduleEntryStatus, CrewSchedulePeriodStatus, DutyStatus, TimeOffRequestStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archiveSchedulePeriodAction,
  cancelScheduleEntryAction,
  createScheduleEntryAction,
  updateScheduleEntryAction,
  updateSchedulePeriodAction,
} from "@/app/crew/scheduling/periods/actions";
import {
  countEntriesByStatus,
  CrewSchedulePeriodDetail,
  CrewScheduleEntryWorkflowOptions,
  getCrewScheduleEntryWorkflowOptions,
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
type EntryOptions = CrewScheduleEntryWorkflowOptions;

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

function toInputDateTime(value: Date | null): string {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

function SelectField({
  children,
  defaultValue,
  label,
  name,
  required = false,
}: {
  children: React.ReactNode;
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
      >
        {children}
      </select>
    </label>
  );
}

function TextareaField({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <textarea
        className="mt-1 min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
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

function sameDay(first: Date, second: Date): boolean {
  return toInputDate(first) === toInputDate(second);
}

function entryWindow(entry: EntryRow): { end: Date; start: Date } {
  const start = entry.startsAt ?? entry.date;
  const end = entry.endsAt ?? new Date(entry.date.getTime() + 24 * 60 * 60 * 1000);

  return { end, start };
}

function rangesOverlap(firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date | null): boolean {
  const normalizedSecondEnd = secondEnd ?? new Date(secondStart.getTime() + 24 * 60 * 60 * 1000);

  return firstStart < normalizedSecondEnd && normalizedSecondEnd > firstStart && secondStart < firstEnd;
}

function scheduleEntryWarnings(entry: EntryRow, allEntries: EntryRow[]): string[] {
  const warnings: string[] = [];
  const { end, start } = entryWindow(entry);
  const overlappingEntries = allEntries.filter(
    (candidate) =>
      candidate.id !== entry.id &&
      candidate.status !== CrewScheduleEntryStatus.CANCELLED &&
      candidate.crewMember.id === entry.crewMember.id &&
      sameDay(candidate.date, entry.date),
  );

  if (overlappingEntries.length > 0) {
    warnings.push("Another schedule entry exists for this crew member on this date.");
  }

  const overlappingTimeOff = entry.crewMember.timeOffRequests.filter(
    (request) =>
      (request.status === TimeOffRequestStatus.PENDING ||
        request.status === TimeOffRequestStatus.APPROVED) &&
      rangesOverlap(start, end, request.startDate, request.endDate),
  );

  if (overlappingTimeOff.length > 0) {
    warnings.push("Pending or approved time off overlaps this draft entry.");
  }

  const overlappingSimpleSchedules = entry.crewMember.schedules.filter((schedule) =>
    sameDay(schedule.date, entry.date),
  );

  if (overlappingSimpleSchedules.length > 0) {
    warnings.push("Existing CrewSchedule block exists on this date.");
  }

  const overlappingAircraftAssignments = entry.crewMember.assignments.filter((assignment) =>
    rangesOverlap(start, end, assignment.startsAt, assignment.endsAt),
  );

  if (overlappingAircraftAssignments.length > 0) {
    warnings.push("Aircraft-block assignment overlaps this planning entry.");
  }

  if (entry.crewMember.qualifications.length === 0) {
    warnings.push("No qualifications are recorded for this crew member.");
  }

  if (entry.crewMember.employmentStatus !== "ACTIVE") {
    warnings.push(`Crew member employment status is ${formatStatus(entry.crewMember.employmentStatus)}.`);
  }

  return warnings;
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

function CrewMemberOptions({ options }: { options: EntryOptions }) {
  return (
    <>
      <option value="">Select crew member</option>
      {options.activeCrewMembers.map((crewMember) => (
        <option key={crewMember.id} value={crewMember.id}>
          {crewName(crewMember)} #{crewMember.employeeNumber}
        </option>
      ))}
    </>
  );
}

function StationOptions({ options }: { options: EntryOptions }) {
  return (
    <>
      <option value="">No station</option>
      {options.stations.map((station) => (
        <option key={station.id} value={station.id}>
          {station.code} - {station.city}
        </option>
      ))}
    </>
  );
}

function RequestOptions({ options }: { options: EntryOptions }) {
  return (
    <>
      <option value="">No source request</option>
      {options.period?.requests.map((request) => (
        <option key={request.id} value={request.id}>
          {crewName(request.crewMember)} - {formatStatus(request.requestType)} ({formatStatus(request.status)})
        </option>
      ))}
    </>
  );
}

function PatternOptions({ options }: { options: EntryOptions }) {
  return (
    <>
      <option value="">No pattern</option>
      {options.activePatterns.map((pattern) => (
        <option key={pattern.id} value={pattern.id}>
          {pattern.name}
        </option>
      ))}
    </>
  );
}

function DutyStatusOptions() {
  return (
    <>
      {Object.values(DutyStatus).map((status) => (
        <option key={status} value={status}>
          {formatStatus(status)}
        </option>
      ))}
    </>
  );
}

function ScheduleEntryForm({
  action,
  entry,
  options,
}: {
  action: (formData: FormData) => void | Promise<void>;
  entry?: EntryRow;
  options: EntryOptions;
}) {
  return (
    <form action={action} className="grid gap-3 lg:grid-cols-4">
      <SelectField
        defaultValue={entry?.crewMember.id}
        label="Crew member"
        name="crewMemberId"
        required
      >
        <CrewMemberOptions options={options} />
      </SelectField>
      <Field defaultValue={toInputDate(entry?.date ?? null)} label="Date" name="date" required type="date" />
      <SelectField defaultValue={entry?.dutyStatus} label="Duty status" name="dutyStatus" required>
        <DutyStatusOptions />
      </SelectField>
      <SelectField defaultValue={entry?.station?.id} label="Station" name="stationId">
        <StationOptions options={options} />
      </SelectField>
      <Field
        defaultValue={toInputDateTime(entry?.startsAt ?? null)}
        label="Start time"
        name="startsAt"
        type="datetime-local"
      />
      <Field
        defaultValue={toInputDateTime(entry?.endsAt ?? null)}
        label="End time"
        name="endsAt"
        type="datetime-local"
      />
      <SelectField
        defaultValue={entry?.sourceRequest?.id}
        label="Source request"
        name="sourceRequestId"
      >
        <RequestOptions options={options} />
      </SelectField>
      <SelectField
        defaultValue={entry?.rotationPattern?.id}
        label="Rotation pattern"
        name="rotationPatternId"
      >
        <PatternOptions options={options} />
      </SelectField>
      <div className="lg:col-span-4">
        <TextareaField defaultValue={entry?.notes} label="Notes" name="notes" />
      </div>
      <div className="lg:col-span-4">
        <button
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          type="submit"
        >
          {entry ? "Save draft entry" : "Create draft entry"}
        </button>
      </div>
    </form>
  );
}

function EntryRowView({
  allEntries,
  entry,
  options,
  periodId,
}: {
  allEntries: EntryRow[];
  entry: EntryRow;
  options: EntryOptions;
  periodId: string;
}) {
  const warnings = scheduleEntryWarnings(entry, allEntries);

  return (
    <>
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
      <tr className="border-b border-zinc-100 bg-zinc-50 align-top">
        <td className="px-3 py-3" colSpan={9}>
          {warnings.length > 0 ? (
            <ul className="mb-3 grid gap-2 text-xs text-amber-900 md:grid-cols-2">
              {warnings.map((warning) => (
                <li className="rounded-md border border-amber-200 bg-amber-50 p-2" key={warning}>
                  {warning}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
              No warning-only planning conflicts found for this entry.
            </p>
          )}
          {entry.status === CrewScheduleEntryStatus.DRAFT ? (
            <div className="grid gap-3">
              <ScheduleEntryForm
                action={updateScheduleEntryAction.bind(null, periodId, entry.id)}
                entry={entry}
                options={options}
              />
              <form action={cancelScheduleEntryAction.bind(null, periodId, entry.id)}>
                <button
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                  type="submit"
                >
                  Cancel draft entry
                </button>
              </form>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Only draft entries can be edited or cancelled in this workflow.
            </p>
          )}
        </td>
      </tr>
    </>
  );
}

export default async function CrewSchedulePeriodDetailPage({ params, searchParams }: PageProps) {
  const { periodId } = await params;
  const queryParams = await searchParams;
  const [period, entryOptions] = await Promise.all([
    getCrewSchedulePeriodDetail(periodId),
    getCrewScheduleEntryWorkflowOptions(periodId),
  ]);
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
            This page can edit the schedule-period container and draft schedule
            entries. It does not publish schedules, generate legacy CrewSchedule rows,
            review requests, apply patterns, or create aircraft assignments.
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

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" id="schedule-entries">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Schedule entries</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Manual draft planning rows. Current crew planner reads still use
                existing CrewSchedule rows until a later visibility slice.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            Draft entries are availability planning only. They do not assign crew to
            aircraft and do not create CrewSchedule bridge rows.
          </div>
          <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-base font-semibold text-zinc-950">Create draft entry</h3>
            <div className="mt-3">
              <ScheduleEntryForm
                action={createScheduleEntryAction.bind(null, period.id)}
                options={entryOptions}
              />
            </div>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Existing entries remain visible below, including cancelled history.
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
                    <EntryRowView
                      allEntries={period.scheduleEntries}
                      entry={entry}
                      key={entry.id}
                      options={entryOptions}
                      periodId={period.id}
                    />
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
