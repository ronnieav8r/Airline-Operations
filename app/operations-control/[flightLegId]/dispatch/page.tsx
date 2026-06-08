import { DispatchPackageStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  markDispatchPackageReadyAction,
  markDispatchPackageReviewedAction,
  saveManualDispatchPackageAction,
  voidDispatchPackageAction,
} from "@/app/operations-control/[flightLegId]/dispatch/actions";
import {
  DispatchPackageWorkflowData,
  getDispatchPackageWorkflowData,
} from "@/lib/dispatch-package-workflow-queries";

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

function toDateTimeInputValue(value: Date | null): string {
  if (!value) {
    return "";
  }

  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function jsonNotes(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const notes = (value as { notes?: unknown }).notes;
  return typeof notes === "string" ? notes : "";
}

function Field({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
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
  defaultValue?: string;
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

function statusClasses(status: DispatchPackageStatus | null): string {
  if (status === DispatchPackageStatus.READY || status === DispatchPackageStatus.REVIEWED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === DispatchPackageStatus.VOIDED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function StatusBadge({ status }: { status: DispatchPackageStatus | null }) {
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

function readinessWarnings(detail: DispatchPackageWorkflowData): string[] {
  const dispatch = detail.dispatchPackage;
  const warnings: string[] = [];

  if (!dispatch) {
    return ["No dispatch package has been saved."];
  }

  if (dispatch.status === DispatchPackageStatus.VOIDED) {
    warnings.push("Dispatch package is voided.");
  }

  if (!dispatch.weatherBriefing?.routeSummary) {
    warnings.push("Weather route summary is missing.");
  }

  if (!dispatch.notamSnapshot?.affectedStationCodes) {
    warnings.push("NOTAM affected station codes are missing.");
  }

  if (!dispatch.flightPlanReference?.externalReference) {
    warnings.push("Flight-plan external reference is missing.");
  }

  if (!dispatch.flightPlanReference?.routeText) {
    warnings.push("Flight-plan route text is missing.");
  }

  return warnings;
}

function SummaryCards({ detail, warnings }: { detail: DispatchPackageWorkflowData; warnings: string[] }) {
  const dispatch = detail.dispatchPackage;

  return (
    <section className="grid gap-3 md:grid-cols-5">
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-500">Dispatch package</p>
        <div className="mt-2">
          <StatusBadge status={dispatch?.status ?? null} />
        </div>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-500">Weather briefing</p>
        <p className="mt-2 text-sm font-medium">
          {toDateTimeLabel(dispatch?.weatherBriefing?.briefingAt ?? null)}
        </p>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-500">Flight plan</p>
        <p className="mt-2 text-sm font-medium">
          {dispatch?.flightPlanReference?.externalReference ?? "Not set"}
        </p>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-500">Reviewed</p>
        <p className="mt-2 text-sm font-medium">{toDateTimeLabel(dispatch?.reviewedAt ?? null)}</p>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-500">Warnings</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{warnings.length}</p>
      </article>
    </section>
  );
}

function DispatchReviewActions({
  dispatch,
  flightLegId,
}: {
  dispatch: DispatchPackageWorkflowData["dispatchPackage"];
  flightLegId: string;
}) {
  const markReady = markDispatchPackageReadyAction.bind(null, flightLegId);
  const markReviewed = markDispatchPackageReviewedAction.bind(null, flightLegId);
  const voidPackage = voidDispatchPackageAction.bind(null, flightLegId);

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dispatch review state</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Review is a workflow state only. It is not a legal signature or FlightLeg release.
          </p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-zinc-500">Ready</dt>
              <dd className="font-medium">{toDateTimeLabel(dispatch?.readyAt ?? null)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Reviewed</dt>
              <dd className="font-medium">{toDateTimeLabel(dispatch?.reviewedAt ?? null)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Voided</dt>
              <dd className="font-medium">{toDateTimeLabel(dispatch?.voidedAt ?? null)}</dd>
            </div>
          </dl>
          {dispatch?.reviewNotes ? (
            <p className="mt-3 text-sm text-zinc-600">Review notes: {dispatch.reviewNotes}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <form action={markReady}>
            <button
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              disabled={!dispatch || dispatch.status === DispatchPackageStatus.READY}
              type="submit"
            >
              Mark Ready
            </button>
          </form>
          <form action={markReviewed} className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
            <label className="block">
              <span className="text-xs font-medium text-zinc-600">Review notes</span>
              <textarea
                className="mt-1 min-h-16 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-950"
                name="reviewNotes"
              />
            </label>
            <button
              className="mt-2 w-full rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              disabled={!dispatch || dispatch.status !== DispatchPackageStatus.READY}
              type="submit"
            >
              Mark Reviewed
            </button>
          </form>
          <form action={voidPackage}>
            <button
              className="w-full rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              disabled={!dispatch || dispatch.status === DispatchPackageStatus.VOIDED}
              type="submit"
            >
              Void Package
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default async function DispatchPackageWorkflowPage({ params, searchParams }: PageProps) {
  const [{ flightLegId }, queryParams] = await Promise.all([params, searchParams]);
  const detail = await getDispatchPackageWorkflowData(flightLegId);

  if (!detail) {
    notFound();
  }

  const dispatch = detail.dispatchPackage;
  const saveAction = saveManualDispatchPackageAction.bind(null, flightLegId);
  const warnings = readinessWarnings(detail);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
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
            Manual Dispatch Package
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {detail.flightNumber ?? "Unnumbered FlightLeg"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Manual dispatch evidence for {detail.departureStation.code} to{" "}
            {detail.arrivalStation.code}, scheduled {toDateTimeLabel(detail.scheduledDeparture)}.
          </p>
        </header>

        {firstSearchParam(queryParams.error) ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {firstSearchParam(queryParams.error)}
          </div>
        ) : null}

        <SummaryCards detail={detail} warnings={warnings} />

        <DispatchReviewActions dispatch={dispatch} flightLegId={flightLegId} />

        {warnings.length > 0 ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Warning-first dispatch readiness</p>
            <ul className="mt-2 space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Manual dispatch evidence</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Save updates the linked dispatch package. Provider integrations and release gating remain
            deferred.
          </p>
          <form action={saveAction} className="mt-4 grid gap-5">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="font-semibold text-zinc-900">Weather briefing</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field
                  defaultValue={dispatch?.weatherBriefing?.provider ?? ""}
                  label="Weather provider"
                  name="weatherProvider"
                />
                <Field
                  defaultValue={toDateTimeInputValue(dispatch?.weatherBriefing?.briefingAt ?? new Date())}
                  label="Briefing time"
                  name="briefingAt"
                  type="datetime-local"
                />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <TextArea
                  defaultValue={dispatch?.weatherBriefing?.routeSummary ?? ""}
                  label="Route weather summary"
                  name="routeSummary"
                />
                <TextArea
                  defaultValue={jsonNotes(dispatch?.weatherBriefing?.rawSnapshot)}
                  label="Weather notes"
                  name="weatherNotes"
                />
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="font-semibold text-zinc-900">NOTAM snapshot</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field
                  defaultValue={dispatch?.notamSnapshot?.affectedStationCodes ?? ""}
                  label="Affected station codes"
                  name="affectedStationCodes"
                />
                <TextArea
                  defaultValue={jsonNotes(dispatch?.notamSnapshot?.rawSnapshot)}
                  label="NOTAM notes"
                  name="notamNotes"
                />
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="font-semibold text-zinc-900">Flight plan reference</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field
                  defaultValue={dispatch?.flightPlanReference?.provider ?? ""}
                  label="Flight-plan provider"
                  name="flightPlanProvider"
                />
                <Field
                  defaultValue={dispatch?.flightPlanReference?.externalReference ?? ""}
                  label="External reference"
                  name="externalReference"
                />
                <Field
                  defaultValue={toDateTimeInputValue(dispatch?.flightPlanReference?.filedAt ?? null)}
                  label="Filed time"
                  name="filedAt"
                  type="datetime-local"
                />
                <Field
                  defaultValue={dispatch?.flightPlanReference?.status ?? ""}
                  label="Flight-plan status"
                  name="flightPlanStatus"
                />
              </div>
              <div className="mt-3">
                <TextArea
                  defaultValue={dispatch?.flightPlanReference?.routeText ?? ""}
                  label="Route text"
                  name="routeText"
                />
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="font-semibold text-zinc-900">Dispatch package notes</h3>
              <div className="mt-3">
                <TextArea
                  defaultValue={jsonNotes(dispatch?.performanceData)}
                  label="Performance or dispatch notes"
                  name="performanceNotes"
                />
              </div>
            </div>

            <div>
              <button
                className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                type="submit"
              >
                Save dispatch package
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
