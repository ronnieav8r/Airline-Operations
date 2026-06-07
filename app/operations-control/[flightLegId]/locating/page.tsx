import { FlightLocatingStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  saveFlightLocatingAction,
  setFlightLocatingStatusAction,
} from "@/app/operations-control/[flightLegId]/locating/actions";
import {
  FlightLocatingWorkflowData,
  getFlightLocatingWorkflowData,
} from "@/lib/flight-locating-workflow-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    flightLegId: string;
  }>;
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

function statusClasses(status: FlightLocatingStatus | null): string {
  if (
    status === FlightLocatingStatus.FILED ||
    status === FlightLocatingStatus.ACTIVE ||
    status === FlightLocatingStatus.CLOSED
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === FlightLocatingStatus.NOT_STARTED) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === FlightLocatingStatus.OVERDUE) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function StatusBadge({ status }: { status: FlightLocatingStatus | null }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
        status,
      )}`}
    >
      {status ?? "Missing"}
    </span>
  );
}

function Field({
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
      <input
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
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
        className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
      />
    </label>
  );
}

function StatusActionButton({
  flightLegId,
  label,
  status,
}: {
  flightLegId: string;
  label: string;
  status: FlightLocatingStatus;
}) {
  const action = setFlightLocatingStatusAction.bind(null, flightLegId, status);

  return (
    <form action={action}>
      <button
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function readinessWarnings(record: FlightLocatingWorkflowData["flightLocatingRecord"]): string[] {
  const warnings: string[] = [];

  if (!record) {
    return ["No flight locating record has been created."];
  }

  if (!record.responsibleParty) {
    warnings.push("Responsible party is missing.");
  }

  if (!record.plannedRoute) {
    warnings.push("Planned route is missing.");
  }

  if (record.status === FlightLocatingStatus.ACTIVE && !record.lastKnownPosition) {
    warnings.push("Active locating record has no last known position.");
  }

  return warnings;
}

export default async function FlightLocatingWorkflowPage({ params, searchParams }: PageProps) {
  const [{ flightLegId }, queryParams] = await Promise.all([params, searchParams]);
  const detail = await getFlightLocatingWorkflowData(flightLegId);

  if (!detail) {
    notFound();
  }

  const record = detail.flightLocatingRecord;
  const saveAction = saveFlightLocatingAction.bind(null, flightLegId);
  const warnings = readinessWarnings(record);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="text-sm font-medium text-sky-700 hover:text-sky-900"
              href={`/operations-control/${detail.id}`}
            >
              Back to FlightLeg detail
            </Link>
            <Link className="text-sm font-medium text-zinc-700 hover:text-zinc-950" href="/operations-control">
              Operations Control
            </Link>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Flight Locating
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {detail.flightNumber ?? "Unnumbered FlightLeg"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Locating record for {detail.departureStation.code} to {detail.arrivalStation.code},
            scheduled {toDateTimeLabel(detail.scheduledDeparture)}.
          </p>
        </header>

        {firstSearchParam(queryParams.error) ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {firstSearchParam(queryParams.error)}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Status</p>
            <div className="mt-2">
              <StatusBadge status={record?.status ?? null} />
            </div>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Activated</p>
            <p className="mt-2 text-sm font-medium">{toDateTimeLabel(record?.activatedAt ?? null)}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Closed</p>
            <p className="mt-2 text-sm font-medium">{toDateTimeLabel(record?.closedAt ?? null)}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Warnings</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{warnings.length}</p>
          </article>
        </section>

        {warnings.length > 0 ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Warning-first locating readiness</p>
            <ul className="mt-2 space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Status transitions</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Manual status controls only. Overdue automation and position history remain deferred.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusActionButton
                flightLegId={flightLegId}
                label="Mark Filed"
                status={FlightLocatingStatus.FILED}
              />
              <StatusActionButton
                flightLegId={flightLegId}
                label="Mark Active"
                status={FlightLocatingStatus.ACTIVE}
              />
              <StatusActionButton
                flightLegId={flightLegId}
                label="Mark Closed"
                status={FlightLocatingStatus.CLOSED}
              />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Locating details</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Save creates the locating record if one does not exist.
          </p>
          <form action={saveAction} className="mt-4 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                defaultValue={record?.responsibleParty}
                label="Responsible party"
                name="responsibleParty"
              />
              <Field
                defaultValue={record?.lastKnownPosition}
                label="Last known position"
                name="lastKnownPosition"
              />
            </div>
            <TextArea defaultValue={record?.plannedRoute} label="Planned route" name="plannedRoute" />
            <TextArea defaultValue={record?.notes} label="Notes" name="notes" />
            <div>
              <button
                className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                type="submit"
              >
                Save locating record
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
