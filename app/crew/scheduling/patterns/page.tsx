import { DutyStatus } from "@prisma/client";
import Link from "next/link";

import {
  createRotationPatternAction,
  createRotationPatternDayAction,
  deleteRotationPatternDayAction,
  toggleRotationPatternActiveAction,
  updateRotationPatternAction,
  updateRotationPatternDayAction,
} from "@/app/crew/scheduling/patterns/actions";
import {
  CrewRotationPatternAdminData,
  CrewRotationPatternAdminItem,
  getCrewRotationPatternAdminData,
} from "@/lib/crew-rotation-pattern-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

type PatternDay = CrewRotationPatternAdminItem["days"][number];

const DUTY_STATUSES = [
  DutyStatus.ON_DUTY,
  DutyStatus.RESERVE,
  DutyStatus.OFF_DUTY,
  DutyStatus.VACATION,
  DutyStatus.SICK,
  DutyStatus.TRAINING,
  DutyStatus.DEADHEADING,
];

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function formatMinutes(value: number | null): string {
  if (value === null) {
    return "";
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function patternBadgeClasses(isActive: boolean): string {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function Field({
  defaultValue,
  label,
  min,
  name,
  required = false,
  type = "text",
}: {
  defaultValue?: string | number;
  label: string;
  min?: number;
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
        min={min}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextArea({
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

function DutyStatusSelect({ defaultValue }: { defaultValue?: DutyStatus }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Duty status</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? DutyStatus.ON_DUTY}
        name="dutyStatus"
        required
      >
        {DUTY_STATUSES.map((status) => (
          <option key={status} value={status}>
            {formatStatus(status)}
          </option>
        ))}
      </select>
    </label>
  );
}

function StationSelect({
  defaultValue,
  stationOptions,
}: {
  defaultValue?: string | null;
  stationOptions: CrewRotationPatternAdminData["stationOptions"];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Station</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name="stationId"
      >
        <option value="">No station</option>
        {stationOptions.map((station) => (
          <option key={station.id} value={station.id}>
            {station.code} - {station.city}
          </option>
        ))}
      </select>
    </label>
  );
}

function PatternHeaderForm({ pattern }: { pattern?: CrewRotationPatternAdminItem }) {
  return (
    <>
      <Field defaultValue={pattern?.patternKey} label="Pattern key" name="patternKey" required />
      <Field defaultValue={pattern?.name} label="Name" name="name" required />
      <Field
        defaultValue={pattern?.cycleLengthDays ?? 14}
        label="Cycle length days"
        min={1}
        name="cycleLengthDays"
        required
        type="number"
      />
      <label className="flex items-center gap-2 pt-7 text-sm font-medium text-zinc-700">
        <input
          className="h-4 w-4 rounded border-zinc-300"
          defaultChecked={pattern?.isActive ?? true}
          name="isActive"
          type="checkbox"
        />
        Active pattern
      </label>
      <TextArea defaultValue={pattern?.description} label="Description" name="description" />
      <TextArea defaultValue={pattern?.notes} label="Notes" name="notes" />
    </>
  );
}

function PatternDayForm({
  action,
  day,
  maxDay,
  stationOptions,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  day?: PatternDay;
  maxDay: number;
  stationOptions: CrewRotationPatternAdminData["stationOptions"];
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-6">
      <Field
        defaultValue={day?.dayNumber}
        label="Day"
        min={1}
        name="dayNumber"
        required
        type="number"
      />
      <DutyStatusSelect defaultValue={day?.dutyStatus} />
      <StationSelect defaultValue={day?.stationId} stationOptions={stationOptions} />
      <Field
        defaultValue={formatMinutes(day?.startsAtMinutes ?? null)}
        label="Start"
        name="startsAt"
        type="time"
      />
      <Field
        defaultValue={formatMinutes(day?.endsAtMinutes ?? null)}
        label="End"
        name="endsAt"
        type="time"
      />
      <div className="flex items-end">
        <button
          className="w-full rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          type="submit"
        >
          {submitLabel}
        </button>
      </div>
      <div className="lg:col-span-6">
        <TextArea defaultValue={day?.notes} label={`Notes (day 1-${maxDay})`} name="notes" />
      </div>
    </form>
  );
}

function PatternCard({
  pattern,
  stationOptions,
}: {
  pattern: CrewRotationPatternAdminItem;
  stationOptions: CrewRotationPatternAdminData["stationOptions"];
}) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-950">{pattern.name}</h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${patternBadgeClasses(
                pattern.isActive,
              )}`}
            >
              {pattern.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Key {pattern.patternKey} | {pattern.cycleLengthDays} day cycle | {pattern.days.length} day rows
          </p>
          {pattern.description ? <p className="mt-2 text-sm text-zinc-600">{pattern.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-700">
            {pattern._count.requests} request{pattern._count.requests === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-700">
            {pattern._count.scheduleEntries} entr{pattern._count.scheduleEntries === 1 ? "y" : "ies"}
          </span>
          <form action={toggleRotationPatternActiveAction.bind(null, pattern.id, !pattern.isActive)}>
            <button
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
              type="submit"
            >
              {pattern.isActive ? "Deactivate" : "Reactivate"}
            </button>
          </form>
        </div>
      </div>

      <form
        action={updateRotationPatternAction.bind(null, pattern.id)}
        className="mt-4 grid gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-2"
      >
        <PatternHeaderForm pattern={pattern} />
        <div className="lg:col-span-2">
          <button
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            type="submit"
          >
            Save pattern
          </button>
        </div>
      </form>

      <section className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Pattern days</h3>
        <div className="mt-3 grid gap-3">
          {pattern.days.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              No day rows defined yet.
            </p>
          ) : (
            pattern.days.map((day) => (
              <div className="grid gap-2" key={day.id}>
                <PatternDayForm
                  action={updateRotationPatternDayAction.bind(null, pattern.id, day.id)}
                  day={day}
                  maxDay={pattern.cycleLengthDays}
                  stationOptions={stationOptions}
                  submitLabel="Save day"
                />
                <form action={deleteRotationPatternDayAction.bind(null, pattern.id, day.id)}>
                  <button
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900"
                    type="submit"
                  >
                    Delete day {day.dayNumber}
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Add day row</h3>
        <div className="mt-3">
          <PatternDayForm
            action={createRotationPatternDayAction.bind(null, pattern.id)}
            maxDay={pattern.cycleLengthDays}
            stationOptions={stationOptions}
            submitLabel="Add day"
          />
        </div>
      </section>
    </article>
  );
}

export default async function CrewRotationPatternsPage({ searchParams }: PageProps) {
  const data = await getCrewRotationPatternAdminData();
  const queryParams = await searchParams;
  const error = firstSearchParam(queryParams.error);

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
                Rotation Patterns
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Manage reusable crew schedule templates. Applying patterns to
                schedule entries remains deferred.
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
                href="/crew/scheduling/periods"
              >
                Schedule periods
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
          <p className="font-semibold">Pattern workflow boundary</p>
          <p className="mt-1">
            These templates do not create schedule entries, publish schedules,
            review requests, or assign crew to aircraft.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Patterns</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{data.patterns.length}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{data.activePatterns}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Inactive</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{data.inactivePatterns}</p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create rotation pattern</h2>
          <form action={createRotationPatternAction} className="mt-4 grid gap-4 lg:grid-cols-2">
            <PatternHeaderForm />
            <div className="lg:col-span-2">
              <button
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                type="submit"
              >
                Create pattern
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-4">
          {data.patterns.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No rotation patterns found.
            </p>
          ) : (
            data.patterns.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                stationOptions={data.stationOptions}
              />
            ))
          )}
        </section>
      </div>
    </main>
  );
}
